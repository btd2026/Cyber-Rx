#!/usr/bin/env node
'use strict';

/**
 * Connector TENANT-VALIDATION harness.
 *
 * The connectors are built to each vendor's documented API but carry a
 * "validate against a real tenant before relying on it" caveat. This harness is
 * how you discharge that caveat: point it at real read-only credentials and it
 *   1. authenticates (test),
 *   2. pulls live signals (fetchSignals),
 *   3. checks every signal against the connector's DECLARED catalog and sane
 *      ranges (pct 0-100, counts >= 0, freshness + raw provenance present),
 *   4. maps the signals to the 11 cockpit control-coverage metrics, and
 *   5. prints a RECONCILIATION CHECKLIST — the exact vendor-console figure to
 *      eyeball each derived number against — so a human can sign it off.
 * It writes a JSON report and exits non-zero on any FAIL. It never touches the
 * database and never prints secrets.
 *
 * Usage:
 *   node scripts/validate-connectors.js <creds.json> [connectorKey] [--out report.json]
 *   node scripts/validate-connectors.js --self-test        # verify the harness itself, no creds
 *
 * creds.json: { "<connectorKey>": { ...read-only fields... }, ... }  (KEEP IT GITIGNORED)
 */

const path = require('path');
const fs = require('fs');

// The 11 control-coverage signals the cockpit scores from (mirrors CAP_SIGKEY in
// cockpit.html). Keep in sync. `vuln_sla_pct` is the Qualys fallback for patch_pct.
const CONTROL_SIGNAL = {
  edr_pct: 'EDR', mfa_pct: 'MFA', pam_pct: 'PAM', patch_pct: 'Vuln & Patch', vuln_sla_pct: 'Vuln & Patch',
  training_pct: 'Awareness', siem_log_sources: 'SIEM', cspm_pct: 'CSPM',
  backup_immutable_pct: 'Backup', dlp_pct: 'DLP', seg_pct: 'Segmentation', sspm_pct: 'SSPM',
};

// What each control number should be reconciled against in the vendor console.
const RECON = {
  edr_pct: 'Managed/agented hosts ÷ total in-scope assets (the assetTotal you supplied).',
  mfa_pct: 'Users with MFA registered ÷ total active users.',
  pam_pct: 'Privileged accounts vaulted ÷ discovered privileged accounts.',
  patch_pct: 'Assets with no critical/high vuln ÷ total assets (clean-asset rate).',
  vuln_sla_pct: 'Same clean-asset rate — confirm it matches the VM console dashboard.',
  training_pct: 'Enrollments completed/passed ÷ total enrollments.',
  siem_log_sources: 'Count of active/reporting log sources — compare to the sourcetype/connector inventory.',
  cspm_pct: 'Cloud resources with no critical misconfiguration ÷ total resources.',
  backup_immutable_pct: 'Protected objects on an immutable/locked SLA ÷ total protected objects.',
  dlp_pct: 'Channels/endpoints under an enforced DLP policy ÷ total.',
  seg_pct: 'Workloads under enforced segmentation ÷ total workloads.',
  sspm_pct: 'SaaS apps under active posture management ÷ known SaaS apps.',
};

// ── Pure validators (exported for the self-test / unit tests) ────────────────

function isFiniteNum(v) { return typeof v === 'number' && Number.isFinite(v); }

/** Range + shape check for one emitted signal. Returns { level, issues[] }. */
function checkSignal(sig) {
  const issues = [];
  if (!sig || typeof sig.key !== 'string') return { level: 'FAIL', issues: ['signal has no key'] };
  if (!isFiniteNum(sig.value)) issues.push(`${sig.key}: value is not a finite number (${sig.value})`);
  else if (/_pct$/.test(sig.key) && (sig.value < 0 || sig.value > 100)) issues.push(`${sig.key}: percentage ${sig.value} out of range 0-100`);
  else if (/(_sources|_accts|_findings|_days|_hrs|_minutes|_events_30d|_incidents|_flagged|_sessions_flagged)$/.test(sig.key) && sig.value < 0) issues.push(`${sig.key}: count/duration ${sig.value} is negative`);
  if (!sig.asOf || isNaN(Date.parse(sig.asOf))) issues.push(`${sig.key}: missing/invalid asOf timestamp (freshness unprovable)`);
  if (sig.raw === undefined) issues.push(`${sig.key}: no raw provenance (can't reconcile against the console)`);
  // A missing asOf/raw is a WARN (still usable); a bad value is a FAIL.
  const fail = issues.some((i) => /not a finite|out of range|negative|no key/.test(i));
  return { level: issues.length === 0 ? 'PASS' : (fail ? 'FAIL' : 'WARN'), issues };
}

/** Which of the 11 control metrics this signal set covers. */
function controlCoverage(signals) {
  const covered = {};
  (signals || []).forEach((s) => { if (CONTROL_SIGNAL[s.key]) covered[CONTROL_SIGNAL[s.key]] = s.key; });
  return covered; // { 'SSPM': 'sspm_pct', ... }
}

/** Roll one connector's live result into a validation record. */
function validateResult(catalog, signals) {
  const declared = new Set(catalog.signals || []);
  const emitted = (signals || []).map((s) => s.key);
  const perSignal = (signals || []).map((s) => ({ key: s.key, value: s.value, asOf: s.asOf, hasRaw: s.raw !== undefined, ...checkSignal(s) }));
  const undeclared = emitted.filter((k) => !declared.has(k));
  const declaredMissing = [...declared].filter((k) => !emitted.includes(k));
  const control = controlCoverage(signals);
  const worst = perSignal.some((s) => s.level === 'FAIL') ? 'FAIL' : (perSignal.some((s) => s.level === 'WARN') || undeclared.length ? 'WARN' : 'PASS');
  const recon = Object.entries(control).map(([ctrl, key]) => ({ control: ctrl, signal: key, value: (signals.find((s) => s.key === key) || {}).value, reconcileAgainst: RECON[key] }));
  return {
    status: worst,
    perSignal,
    controlSignals: control,
    undeclaredSignals: undeclared,      // emitted but not in the catalog — catalog drift
    declaredNotEmitted: declaredMissing, // catalog promises it but the tenant returned none
    reconciliation: recon,
  };
}

// ── Live run ─────────────────────────────────────────────────────────────────

async function runOne(connector, creds) {
  const rec = { key: connector.key, label: connector.label, vendor: connector.vendor };
  try {
    const t = await connector.test(creds);
    rec.auth = { ok: true, detail: t && t.detail };
  } catch (e) { rec.auth = { ok: false, error: e.message }; rec.status = 'FAIL'; return rec; }
  try {
    const { signals } = await connector.fetchSignals(creds);
    Object.assign(rec, validateResult(connector, signals || []));
  } catch (e) { rec.status = 'FAIL'; rec.fetchError = e.message; }
  return rec;
}

function printRec(rec) {
  const mark = { PASS: '✓', WARN: '!', FAIL: '✗' }[rec.status] || '?';
  console.log(`\n${mark} ${rec.label} (${rec.key}) — ${rec.status}`);
  if (rec.auth && !rec.auth.ok) { console.log(`    auth FAILED: ${rec.auth.error}`); return; }
  if (rec.fetchError) { console.log(`    fetchSignals FAILED: ${rec.fetchError}`); return; }
  (rec.perSignal || []).forEach((s) => {
    console.log(`    ${{ PASS: '✓', WARN: '!', FAIL: '✗' }[s.level]} ${s.key} = ${s.value}${s.hasRaw ? '' : '  (no raw)'}`);
    s.issues.forEach((i) => console.log(`        - ${i}`));
  });
  if (rec.undeclaredSignals && rec.undeclaredSignals.length) console.log(`    ! emitted but not in catalog: ${rec.undeclaredSignals.join(', ')}`);
  if (rec.declaredNotEmitted && rec.declaredNotEmitted.length) console.log(`    ! declared but tenant returned none: ${rec.declaredNotEmitted.join(', ')}`);
  if (rec.reconciliation && rec.reconciliation.length) {
    console.log('    RECONCILE against the vendor console:');
    rec.reconciliation.forEach((r) => console.log(`      • ${r.control} (${r.signal} = ${r.value}): ${r.reconcileAgainst}`));
  }
}

// ── Self-test: verify the harness logic with synthetic signals, no creds ─────

function selfTest() {
  let fails = 0;
  const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) { fails++; console.log(`✗ ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); } else console.log(`✓ ${name}`); };
  eq('pct in range PASS', checkSignal({ key: 'sspm_pct', value: 75, asOf: new Date().toISOString(), raw: {} }).level, 'PASS');
  eq('pct out of range FAIL', checkSignal({ key: 'sspm_pct', value: 140, asOf: new Date().toISOString(), raw: {} }).level, 'FAIL');
  eq('negative count FAIL', checkSignal({ key: 'siem_log_sources', value: -3, asOf: new Date().toISOString(), raw: {} }).level, 'FAIL');
  eq('missing asOf WARN', checkSignal({ key: 'mfa_pct', value: 90, raw: {} }).level, 'WARN');
  eq('missing raw WARN', checkSignal({ key: 'mfa_pct', value: 90, asOf: new Date().toISOString() }).level, 'WARN');
  eq('non-number FAIL', checkSignal({ key: 'edr_pct', value: 'x', asOf: new Date().toISOString(), raw: {} }).level, 'FAIL');
  eq('control coverage maps sspm', controlCoverage([{ key: 'sspm_pct', value: 75 }, { key: 'sspm_open_findings', value: 3 }]), { SSPM: 'sspm_pct' });
  const v = validateResult({ signals: ['sspm_pct', 'sspm_open_findings'] }, [
    { key: 'sspm_pct', value: 75, asOf: new Date().toISOString(), raw: {} },
    { key: 'sspm_open_findings', value: 3, asOf: new Date().toISOString(), raw: {} },
  ]);
  eq('clean result PASS', v.status, 'PASS');
  eq('control signal detected', v.controlSignals, { SSPM: 'sspm_pct' });
  eq('reconciliation present', v.reconciliation.length, 1);
  const drift = validateResult({ signals: ['sspm_pct'] }, [{ key: 'sspm_pct', value: 75, asOf: new Date().toISOString(), raw: {} }, { key: 'mystery', value: 1, asOf: new Date().toISOString(), raw: {} }]);
  eq('catalog drift → WARN', drift.status, 'WARN');
  eq('undeclared flagged', drift.undeclaredSignals, ['mystery']);
  console.log(`\nself-test: ${fails ? fails + ' FAILED' : 'all passed'}`);
  process.exit(fails ? 1 : 0);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) return selfTest();
  const file = args.find((a) => !a.startsWith('--'));
  const only = args.filter((a) => !a.startsWith('--') && a !== file)[0];
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : 'connector-validation-report.json';
  if (!file) { console.error('Usage: node scripts/validate-connectors.js <creds.json> [connectorKey] [--out report.json]\n       node scripts/validate-connectors.js --self-test'); process.exit(2); }

  let creds;
  try { creds = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
  catch (e) { console.error(`Could not read creds file: ${e.message}`); process.exit(2); }

  const Connectors = require(path.join(__dirname, '..', 'src', 'services', 'connectors'));
  const keys = only ? [only] : Object.keys(creds);
  const report = { validatedAt: new Date().toISOString(), results: [] };
  let fails = 0, warns = 0;

  for (const key of keys) {
    const c = Connectors.get(key);
    if (!c) { console.log(`✗ ${key}: unknown connector`); fails++; continue; }
    if (!creds[key]) { console.log(`– ${key}: no credentials in file, skipped`); continue; }
    const rec = await runOne(c, creds[key]);
    printRec(rec);
    report.results.push(rec);
    if (rec.status === 'FAIL') fails++; else if (rec.status === 'WARN') warns++;
  }

  // Which of the 11 controls got a live, in-range number this run.
  const controlsProven = new Set();
  report.results.forEach((r) => Object.keys(r.controlSignals || {}).forEach((ctrl) => { if (r.status !== 'FAIL') controlsProven.add(ctrl); }));
  report.controlsValidated = [...controlsProven].sort();

  try { fs.writeFileSync(path.resolve(outPath), JSON.stringify(report, null, 2)); console.log(`\nreport written to ${outPath}`); } catch (e) { console.log(`\ncould not write report: ${e.message}`); }
  console.log(`\n${report.results.length - fails - warns} passed, ${warns} warned, ${fails} failed.  Controls validated: ${report.controlsValidated.join(', ') || '(none)'}`);
  process.exit(fails ? 1 : 0);
}

module.exports = { checkSignal, controlCoverage, validateResult, CONTROL_SIGNAL, RECON };

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
