'use strict';

/**
 * cae/scoringEngine — Milestone 5. INTERNAL.
 *
 * Turns normalized evidence (cae_evidence) into a scored result (cae_result)
 * using the workbook's Scoring_Model:
 *   Coverage 40 · Compliance 30 · Timeliness 20 · Exception Quality 10
 *   + no-evidence => 0/0 ; + floor rules (e.g. privileged-MFA caps the score).
 *
 * The weighted composite (0–100) is the engine; the row's 0–5 band is the
 * display value. Confidence (0–100) rises when multiple sources agree.
 *
 * Only user-safe summary text is produced here; the formulas/weights never leave
 * the backend (cae_result is projected before reaching users).
 */

const db = require('../utils/db');

const DEFAULT_WEIGHTS = { Coverage: 40, Compliance: 30, Timeliness: 20, 'Exception Quality': 10 };

async function loadWeights() {
  try {
    const rows = await db.query('SELECT component, weight FROM cae_scoring_model');
    const w = {};
    for (const r of rows) if (DEFAULT_WEIGHTS[r.component] != null) w[r.component] = Number(r.weight) || 0;
    return Object.keys(w).length ? { ...DEFAULT_WEIGHTS, ...w } : { ...DEFAULT_WEIGHTS };
  } catch (_) { return { ...DEFAULT_WEIGHTS }; }
}

const ratio = (n, d) => (d > 0 ? Math.max(0, Math.min(1, n / d)) : 0);

// 0–100 weighted composite -> 0–5 band per the workbook's rule.
function band(pct, hasEvidence) {
  if (!hasEvidence) return 0;
  if (pct < 60) return 1;
  if (pct < 80) return 2;
  if (pct < 90) return 3;
  if (pct < 95) return 4;
  return 5;
}

function statusFrom(pct, hasEvidence) {
  if (!hasEvidence) return 'needs_manual_evidence';
  if (pct >= 90) return 'passed';
  if (pct >= 60) return 'partial';
  return 'failed';
}

// Pure scorer. record = a cae_evidence row (or null); control = a cae_control row.
function score(record, control, weights = DEFAULT_WEIGHTS) {
  const hasEvidence = !!(record && record.source_kind === 'api' && record.expected_count > 0);
  if (!hasEvidence) {
    const manual = !record || record.source_kind === 'manual';
    return {
      status: manual ? 'needs_manual_evidence' : 'not_tested',
      score: 0, score_pct: 0, confidence: 0,
      business_risk: `${control.control_name || control.control_id} cannot be automatically verified with the connected tools.`,
      summary_finding: manual ? 'No connected evidence source — manual evidence required.' : 'No evidence collected.',
      recommended_action: 'Connect a supporting tool or provide manual evidence for this control.',
      evidence_source_name: null,
    };
  }
  const coverage = ratio(record.covered_count, record.expected_count);
  const compliance = ratio(record.pass_count, record.covered_count);
  const timeliness = ratio(record.fresh_count, record.covered_count);
  const exception = record.exception_count > 0 ? ratio(record.exception_valid, record.exception_count) : 1;
  const wsum = (weights.Coverage + weights.Compliance + weights.Timeliness + weights['Exception Quality']) || 100;
  let pct = (coverage * weights.Coverage + compliance * weights.Compliance +
    timeliness * weights.Timeliness + exception * weights['Exception Quality']) / wsum * 100;

  // Floor rule: privileged controls without near-complete compliance are capped.
  if (/privileg/i.test(`${control.scoring_rule || ''} ${control.validation_logic || ''}`) && compliance < 0.95) {
    pct = Math.min(pct, 69);                       // band <= 3 regardless of average
  }
  pct = Math.round(pct);

  const sources = Number((record.raw_evidence && record.raw_evidence.source_count) || 1);
  const confidence = Math.min(99, Math.round(40 + sources * 12 + coverage * 30 + timeliness * 18));
  const st = statusFrom(pct, true);
  const pctTxt = (x) => `${Math.round(x * 100)}%`;
  const detection = control.assessment_method === 'detection';

  return {
    status: st, score: band(pct, true), score_pct: pct, confidence,
    business_risk: st === 'passed'
      ? `${control.control_name || control.control_id} is operating effectively.`
      : `Gaps in ${control.control_name || control.control_id} increase exposure${detection ? ' to this attack technique' : ''}.`,
    summary_finding: detection
      ? `Detection coverage ${pctTxt(coverage)} with ${pctTxt(timeliness)} fresh telemetry across ${sources} source(s).`
      : `Coverage ${pctTxt(coverage)}, compliance ${pctTxt(compliance)} across ${sources} source(s).`,
    recommended_action: st === 'passed'
      ? 'Operating effectively — maintain and re-test on the defined cadence.'
      : `Increase coverage and remediate exceptions for ${control.control_name || control.control_id}.`,
    evidence_source_name: record.evidence_source || null,
  };
}

// Score every control of a run and upsert cae_result. Honors human review lock.
async function scoreRun(orgId, runId, frameworks) {
  const weights = await loadWeights();
  const args = [runId];
  let fwClause = '';
  if (Array.isArray(frameworks) && frameworks.length) { args.push(frameworks); fwClause = 'AND c.framework = ANY($2)'; }

  // Join each control to its evidence row for this run (LEFT — manual controls
  // have a 'manual' evidence row from M4; controls with no row score as manual).
  const rows = await db.query(
    `SELECT c.*, e.source_kind, e.expected_count, e.covered_count, e.pass_count, e.fresh_count,
            e.exception_count, e.exception_valid, e.evidence_source, e.raw_evidence
       FROM cae_control c
       LEFT JOIN cae_evidence e ON e.control_id=c.control_id AND e.framework=c.framework AND e.run_id=$1
      WHERE TRUE ${fwClause}`, args);

  let written = 0; const tally = { passed: 0, partial: 0, failed: 0, needs_manual_evidence: 0, not_tested: 0 };
  for (const r of rows) {
    const record = r.source_kind ? {
      source_kind: r.source_kind, expected_count: r.expected_count, covered_count: r.covered_count,
      pass_count: r.pass_count, fresh_count: r.fresh_count, exception_count: r.exception_count,
      exception_valid: r.exception_valid, evidence_source: r.evidence_source, raw_evidence: r.raw_evidence,
    } : null;
    const s = score(record, r, weights);
    tally[s.status] = (tally[s.status] || 0) + 1;
    const id = `${orgId}::${r.framework}::${r.control_id}`;
    await db.query(
      `INSERT INTO cae_result
         (id, org_id, run_id, framework, control_id, control_name, status, score, score_pct, confidence,
          business_risk, summary_finding, evidence_source_name, recommended_action, raw_evidence_ref, computed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
       ON CONFLICT (org_id, framework, control_id) DO UPDATE SET
         run_id=EXCLUDED.run_id, control_name=EXCLUDED.control_name, status=EXCLUDED.status,
         score=EXCLUDED.score, score_pct=EXCLUDED.score_pct, confidence=EXCLUDED.confidence,
         business_risk=EXCLUDED.business_risk, summary_finding=EXCLUDED.summary_finding,
         evidence_source_name=EXCLUDED.evidence_source_name, recommended_action=EXCLUDED.recommended_action,
         raw_evidence_ref=EXCLUDED.raw_evidence_ref, computed_at=NOW()
       WHERE cae_result.reviewed = false`,             // never overwrite a human-reviewed result
      [id, orgId, runId, r.framework, r.control_id, r.control_name, s.status, s.score, s.score_pct,
        s.confidence, s.business_risk, s.summary_finding, s.evidence_source_name, s.recommended_action,
        r.source_kind === 'api' ? `${runId}::${r.id}` : null]);
    written++;
  }
  return { scored: written, tally };
}

module.exports = { score, scoreRun, band, statusFrom };
