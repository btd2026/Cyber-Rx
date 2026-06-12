'use strict';

/**
 * AttackCoverageService — STEP C
 * ------------------------------
 * Computes per-technique ATT&CK coverage for an org from the validation run's
 * check results, joined through the CTID ATT&CK⇄800-53 crosswalk.
 *
 * Telemetry-bearing checks are classified prevent vs detect by the tool/signal
 * that produces them:
 *   - prevent : EDR prevention (CrowdStrike/Defender), MFA (Okta/Entra), PAM
 *               (CyberArk), network controls (PAN-OS/Zscaler)
 *   - detect  : SIEM/correlation (Splunk/Sentinel), EDR detections, GuardDuty
 *
 * For each active technique, we gather the 800-53 controls that mitigate it
 * (CTID), then the checks mapped to those controls, then those checks' status
 * in the run. Status precedence prevent > detect > none. Where coverage is
 * established only through control-level mappings (no direct telemetry check),
 * it is recorded as supporting coverage with provenance and lower confidence.
 *
 * Result is stored in technique_coverage(org_id, technique_id, status,
 * confidence, source_check, run_id, supporting, computed_at) and is recomputed
 * inside ValidationRunService.run().
 */

const db = require('../utils/db');

// tool_id / signal -> coverage kind
const PREVENT_TOOLS = new Set(['crowdstrike', 'defender_endpoint', 'sentinelone', 'okta', 'entra_id', 'cyberark', 'sailpoint', 'panorama', 'zscaler', 'prisma_cloud']);
const DETECT_TOOLS = new Set(['splunk', 'sentinel', 'crowdstrike', 'defender_endpoint', 'wiz', 'aws_securityhub']);
const PREVENT_SIGNALS = new Set(['mfa_pct', 'pam_pct', 'edr_pct', 'patch_pct', 'vuln_sla_pct']);
const DETECT_SIGNALS = new Set(['siem_days', 'mttd_hrs', 'mttr_hrs', 'edr_pct']);

function kindFor(toolId, signal) {
  const prevent = PREVENT_TOOLS.has(toolId) || PREVENT_SIGNALS.has(signal);
  const detect = DETECT_TOOLS.has(toolId) || DETECT_SIGNALS.has(signal);
  return { prevent, detect };
}

async function recompute(orgId, runId) {
  // Passing checks in this run, with the tool + signal behind them.
  const passing = await db.query(`
    SELECT cr.check_id, cr.status, c.tool_id, c.signal
    FROM check_results cr JOIN checks c ON c.id=cr.check_id
    WHERE cr.run_id=$1 AND cr.org_id=$2 AND cr.status IN ('pass','partial')`, [runId, orgId]);
  const passByCheck = {}; passing.forEach((r) => { passByCheck[r.check_id] = r; });

  // 800-53 control -> mapped check ids
  const ctrlChecks = {};
  (await db.query(`SELECT requirement_id, check_id FROM requirement_mappings WHERE framework_id='nist_800_53_r5'`))
    .forEach((m) => { (ctrlChecks[m.requirement_id] = ctrlChecks[m.requirement_id] || []).push(m.check_id); });

  // technique -> mitigating controls (CTID), active techniques only.
  const rows = await db.query(`
    SELECT x.from_id AS technique, x.to_id AS control
    FROM requirement_crosswalks x
    JOIN attack_techniques t ON t.id=x.from_id
    WHERE x.provenance='CTID' AND COALESCE(t.deprecated,false)=false AND COALESCE(t.revoked,false)=false`);
  const byTech = {};
  rows.forEach((r) => { (byTech[r.technique] = byTech[r.technique] || new Set()).add(r.control); });

  let prevent = 0, detect = 0, none = 0;
  // clear prior coverage for this org (full recompute)
  await db.query(`DELETE FROM technique_coverage WHERE org_id=$1`, [orgId]);

  for (const [technique, controls] of Object.entries(byTech)) {
    let hasPrevent = false, hasDetect = false, sourceCheck = null;
    const supporting = [];
    for (const ctrl of controls) {
      for (const checkId of ctrlChecks[ctrl] || []) {
        const p = passByCheck[checkId];
        if (!p) continue;
        const k = kindFor(p.tool_id, p.signal);
        if (k.prevent) { hasPrevent = true; sourceCheck = sourceCheck || checkId; }
        if (k.detect) { hasDetect = true; sourceCheck = sourceCheck || checkId; }
        supporting.push({ control: ctrl, check: checkId, tool: p.tool_id, status: p.status });
      }
    }
    const status = hasPrevent ? 'prevent' : hasDetect ? 'detect' : 'none';
    if (status === 'prevent') prevent++; else if (status === 'detect') detect++; else none++;
    // confidence: high when >=2 supporting passing checks, medium for 1, low for none
    const confidence = supporting.length >= 2 ? 'high' : supporting.length === 1 ? 'medium' : 'low';
    await db.query(`
      INSERT INTO technique_coverage (org_id, technique_id, status, confidence, source_check, run_id, supporting)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (org_id, technique_id) DO UPDATE SET status=EXCLUDED.status, confidence=EXCLUDED.confidence,
        source_check=EXCLUDED.source_check, run_id=EXCLUDED.run_id, supporting=EXCLUDED.supporting, computed_at=NOW()`,
      [orgId, technique, status, confidence, sourceCheck, runId, JSON.stringify(supporting.slice(0, 12))]);
  }
  return { techniques: Object.keys(byTech).length, prevent, detect, none };
}

async function summary(orgId) {
  const rows = await db.query(`
    SELECT status, COUNT(*)::int n FROM technique_coverage WHERE org_id=$1 GROUP BY status`, [orgId]);
  const out = { prevent: 0, detect: 0, none: 0 };
  rows.forEach((r) => { out[r.status] = r.n; });
  out.total = out.prevent + out.detect + out.none;
  out.covered = out.prevent + out.detect;
  return out;
}

module.exports = { recompute, summary };
