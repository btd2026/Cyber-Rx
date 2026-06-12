'use strict';

/**
 * ingest/loadCsf80053.js — STEP B2
 * --------------------------------
 * CSF 2.0 ⇄ SP 800-53 rev 5 crosswalk.
 *
 * No CPRT CSF 2.0 informative-references export is present (see INVENTORY.md),
 * so — per the spec rule — mappings are DERIVED via check-level joins and
 * flagged provisional=true (provenance 'derived'). When the official CPRT
 * export is supplied later, re-run with it to upgrade these to provenance
 * 'NIST CPRT', provisional=false.
 *
 * Method:
 *   1. Map 800-53 telemetry-bearing controls to the engine's signals using a
 *      curated control-intent table (well-known NIST control purposes), then
 *      resolve signals to concrete check_ids and write 800-53
 *      requirement_mappings (coverage 'partial', provenance 'derived').
 *   2. Derive CSF⇄800-53 crosswalks: a CSF subcategory and an 800-53 control
 *      that share ≥1 mapped check are recorded as related (provisional).
 *
 * Provisional pairs are listed in FOLLOW_UPS.md.
 */

const fs = require('fs');
const path = require('path');
const db = require('../utils/db');

const SPOT = path.join(__dirname, '../../../spot-check');
const ROOT = path.join(__dirname, '../../..');

// 800-53 control (base id) -> engine signals it governs. Curated from the
// controls' documented purpose; intentionally conservative (telemetry only).
const CONTROL_SIGNALS = {
  'IA-2': ['mfa_pct'], 'IA-5': ['mfa_pct'], 'AC-7': ['mfa_pct'],
  'AC-2': ['pam_pct'], 'AC-3': ['pam_pct'], 'AC-5': ['pam_pct'], 'AC-6': ['pam_pct'],
  'SI-2': ['patch_pct', 'vuln_sla_pct'], 'RA-5': ['vuln_sla_pct'], 'CM-6': ['patch_pct'],
  'SI-3': ['edr_pct'], 'SI-4': ['edr_pct', 'siem_days'], 'SI-7': ['edr_pct'],
  'AU-2': ['siem_days'], 'AU-6': ['siem_days', 'mttd_hrs'], 'AU-12': ['siem_days'], 'CA-7': ['siem_days'],
  'AT-2': ['training_pct'], 'AT-3': ['training_pct'],
  'IR-4': ['mttr_hrs'], 'IR-5': ['mttd_hrs'], 'IR-6': ['mttr_hrs'],
  'CP-9': [], 'CP-10': [],            // backup/restore — covered by rubric checks, no signal yet
  'SR-6': ['vendor'], 'SR-3': ['vendor'], 'PM-9': ['vendor'],
  'CM-8': ['endpoints'], 'PM-5': ['endpoints'],
};

async function load() {
  fs.mkdirSync(SPOT, { recursive: true });

  // signal -> [check_id]
  const checks = await db.query(`SELECT id, signal FROM checks WHERE signal IS NOT NULL`);
  const checksBySignal = {};
  checks.forEach((c) => { (checksBySignal[c.signal] = checksBySignal[c.signal] || []).push(c.id); });

  // 1) 800-53 requirement -> check mappings (derived). Apply to the base control
  //    and all its enhancements present in the catalog.
  const reqs = await db.query(
    `SELECT requirement_id, parent_id FROM framework_requirements WHERE framework_id='nist_800_53_r5' AND withdrawn=false`);
  const baseOf = (id) => id.replace(/\(\d+\)$/, '');
  let mapped = 0;
  for (const r of reqs) {
    const signals = CONTROL_SIGNALS[baseOf(r.requirement_id)];
    if (!signals || !signals.length) continue;
    const checkIds = new Set();
    signals.forEach((s) => (checksBySignal[s] || []).forEach((id) => checkIds.add(id)));
    for (const cid of checkIds) {
      await db.query(`
        INSERT INTO requirement_mappings (framework_id, requirement_id, check_id, coverage, justification, provenance, provisional)
        VALUES ('nist_800_53_r5',$1,$2,'partial',$3,'derived',true)
        ON CONFLICT (framework_id, requirement_id, check_id) DO NOTHING`,
        [r.requirement_id, cid, `Derived from control intent via shared telemetry signal.`]);
      mapped++;
    }
  }

  // 2) CSF ⇄ 800-53 crosswalk by shared check.
  const csfMaps = await db.query(`SELECT requirement_id, check_id FROM requirement_mappings WHERE framework_id='nist_csf_2'`);
  const ctrlMaps = await db.query(`SELECT requirement_id, check_id FROM requirement_mappings WHERE framework_id='nist_800_53_r5'`);
  const ctrlByCheck = {};
  ctrlMaps.forEach((m) => { (ctrlByCheck[m.check_id] = ctrlByCheck[m.check_id] || new Set()).add(m.requirement_id); });

  const pairCounts = {};        // `${csf}|${ctrl}` -> shared check count
  csfMaps.forEach((m) => {
    (ctrlByCheck[m.check_id] || new Set()).forEach((ctrlId) => {
      const k = `${m.requirement_id}|${ctrlId}`;
      pairCounts[k] = (pairCounts[k] || 0) + 1;
    });
  });

  let xwalks = 0;
  for (const [k, n] of Object.entries(pairCounts)) {
    const [csf, ctrl] = k.split('|');
    await db.query(`
      INSERT INTO requirement_crosswalks (from_framework, from_id, to_framework, to_id, relationship, provenance, provisional, meta)
      VALUES ('nist_csf_2',$1,'nist_800_53_r5',$2,'related','derived',true,$3)
      ON CONFLICT (from_framework, from_id, to_framework, to_id) DO UPDATE SET meta=EXCLUDED.meta`,
      [csf, ctrl, JSON.stringify({ shared_checks: n })]);
    xwalks++;
  }

  // FOLLOW_UPS note for provisional state.
  const followPath = path.join(ROOT, 'FOLLOW_UPS.md');
  const block = [
    '## B2 — CSF 2.0 ⇄ 800-53 mappings are PROVISIONAL',
    '',
    `Derived via check-level joins (no CPRT CSF 2.0 informative-references export present).`,
    `- 800-53 derived requirement→check mappings: **${mapped}**`,
    `- CSF⇄800-53 derived crosswalks: **${xwalks}** (all provisional=true, provenance='derived')`,
    '',
    'To upgrade to OFFICIAL: supply the CPRT CSF 2.0 informative-references export to',
    '`resources/nist/` and re-run B2; mappings become provenance=\'NIST CPRT\', provisional=false.',
    '',
  ].join('\n');
  let existing = ''; try { existing = fs.readFileSync(followPath, 'utf8'); } catch (_) {}
  if (!/B2 — CSF 2.0/.test(existing)) {
    fs.writeFileSync(followPath, existing ? `${existing}\n${block}` : `# FOLLOW-UPS\n\n${block}`);
  }

  // Spot-check: 10 random crosswalks with titles.
  const sample = await db.query(`
    SELECT x.from_id AS csf, cr.title AS csf_title, x.to_id AS ctrl, r.title AS ctrl_title, x.meta
    FROM requirement_crosswalks x
    JOIN framework_requirements cr ON cr.framework_id='nist_csf_2' AND cr.requirement_id=x.from_id
    JOIN framework_requirements r  ON r.framework_id='nist_800_53_r5' AND r.requirement_id=x.to_id
    WHERE x.provenance='derived' ORDER BY random() LIMIT 10`);
  fs.writeFileSync(path.join(SPOT, 'csf_80053.json'), JSON.stringify(sample, null, 2));

  return { control_mappings: mapped, crosswalks: xwalks, provisional: true };
}

module.exports = { load };

if (require.main === module) {
  db.init().then(load).then((r) => { console.log('loadCsf80053:', JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
