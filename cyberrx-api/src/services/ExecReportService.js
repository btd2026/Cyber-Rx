'use strict';

/**
 * ExecReportService — STEP D
 * --------------------------
 * Assembles the two executive deliverables entirely from COMPUTED data (the
 * latest validation_run, score_history, technique_coverage, crosswalks, and the
 * existing business-process / risk graph) — never from seeded scores.
 *
 *   cisoPack(orgId, {baseline})  D1 — operational security language:
 *     CSF function scores, 800-53 family compliance vs baseline, CIS IG progress
 *     (pending B3), ATT&CK heat map, failing-control queue + remediation, trends.
 *   croPack(orgId)               D2 — business-risk language only:
 *     top processes by exposure, enterprise risk trend, "what changed", CSF
 *     maturity tier, profile coverage, deltas as business impact.
 *
 * Every number carries the run_id it came from so D3 exports can cite it.
 */

const db = require('../utils/db');
const ValidationRunService = require('./ValidationRunService');
const AttackCoverageService = require('./AttackCoverageService');

const CSF_FUNCTIONS = { GV: 'Govern', ID: 'Identify', PR: 'Protect', DE: 'Detect', RS: 'Respond', RC: 'Recover' };

function tierOf(score) {
  if (score >= 85) return { tier: 4, label: 'Adaptive' };
  if (score >= 65) return { tier: 3, label: 'Repeatable' };
  if (score >= 40) return { tier: 2, label: 'Risk Informed' };
  return { tier: 1, label: 'Partial' };
}
const statusOf = (s) => (s >= 80 ? 'green' : s >= 60 ? 'amber' : 'red');

async function ensureRun(orgId) {
  let latest = await ValidationRunService.latestRun(orgId);
  if (!latest) latest = await ValidationRunService.run(orgId, { trigger: 'auto' });
  return latest;
}

function scopeScores(scores, frameworkId) {
  const out = {};
  scores.filter((s) => s.framework_id === frameworkId).forEach((s) => { out[s.scope] = Number(s.score); });
  return out;
}

// -------------------------------------------------------------- CISO (D1)
async function cisoPack(orgId, { baseline = 'moderate' } = {}) {
  const latest = await ensureRun(orgId);
  const runId = latest.run && latest.run.id;
  const csf = scopeScores(latest.scores, 'nist_csf_2');
  const ctrl = scopeScores(latest.scores, 'nist_800_53_r5');

  const csfFunctions = Object.entries(CSF_FUNCTIONS).map(([id, name]) => ({
    id, name, score: csf[id] != null ? csf[id] : null, status: csf[id] != null ? statusOf(csf[id]) : 'n/a',
  }));

  // 800-53 family compliance (computed score per family) + baseline coverage
  const families = Object.entries(ctrl).filter(([k]) => /^[A-Z]{2}$/.test(k))
    .map(([family, score]) => ({ family, score, status: statusOf(score) }))
    .sort((a, b) => a.score - b.score);

  // Baseline coverage: of controls in the selected baseline, how many have >=1
  // passing mapped check this run.
  const baseCol = baseline === 'low' ? 'low' : baseline === 'high' ? 'high' : 'moderate';
  const baselineRows = await db.query(`
    SELECT r.requirement_id,
      EXISTS (
        SELECT 1 FROM requirement_mappings m JOIN check_results cr
          ON cr.check_id=m.check_id AND cr.run_id=$2 AND cr.org_id=$3 AND cr.status IN ('pass','partial')
        WHERE m.framework_id='nist_800_53_r5' AND m.requirement_id=r.requirement_id
      ) AS covered
    FROM framework_requirements r
    WHERE r.framework_id='nist_800_53_r5' AND r.withdrawn=false AND (r.baselines->>$1)::boolean = true`,
    [baseCol, runId, orgId]);
  const baseTotal = baselineRows.length;
  const baseCovered = baselineRows.filter((r) => r.covered).length;

  // ATT&CK heat map: tactics with technique coverage counts
  const tactics = await db.query(`SELECT id, name, shortname, ordinal FROM attack_tactics ORDER BY ordinal NULLS LAST`);
  const techRows = await db.query(`
    SELECT t.id, t.name, t.tactics, COALESCE(c.status,'none') AS status, c.confidence, c.source_check
    FROM attack_techniques t
    LEFT JOIN technique_coverage c ON c.technique_id=t.id AND c.org_id=$1
    WHERE COALESCE(t.deprecated,false)=false AND COALESCE(t.revoked,false)=false AND t.is_subtechnique=false`, [orgId]);
  const heat = tactics.map((ta) => {
    const techs = techRows.filter((x) => (x.tactics || []).includes(ta.shortname));
    const counts = { prevent: 0, detect: 0, none: 0 };
    techs.forEach((x) => { counts[x.status] = (counts[x.status] || 0) + 1; });
    return { tactic: ta.name, shortname: ta.shortname, total: techs.length, ...counts,
      techniques: techs.map((x) => ({ id: x.id, name: x.name, status: x.status, confidence: x.confidence, source_check: x.source_check })) };
  });
  const attackSummary = await AttackCoverageService.summary(orgId);

  // Failing-control queue: failing checks -> CSF requirements + recommended action
  const failing = await db.query(`
    SELECT cr.check_id, cr.observed, cr.expected, c.tool_id, c.name AS check_name, c.signal,
      (SELECT string_agg(DISTINCT m.requirement_id, ', ') FROM requirement_mappings m
        WHERE m.framework_id='nist_csf_2' AND m.check_id=cr.check_id) AS csf_reqs,
      (SELECT string_agg(DISTINCT m.requirement_id, ', ') FROM requirement_mappings m
        WHERE m.framework_id='nist_800_53_r5' AND m.check_id=cr.check_id) AS ctrl_reqs
    FROM check_results cr JOIN checks c ON c.id=cr.check_id
    WHERE cr.run_id=$1 AND cr.org_id=$2 AND cr.status='fail'
    ORDER BY cr.observed NULLS LAST`, [runId, orgId]);
  const queue = failing.map((f) => ({
    check: f.check_id, tool: f.tool_id, title: f.check_name, observed: f.observed, expected: f.expected,
    csf: f.csf_reqs, controls: f.ctrl_reqs,
    recommendation: recommend(f.signal, f.tool_id),
  }));

  const trendCsf = await ValidationRunService.scoreTrend(orgId, 'nist_csf_2', 'overall', 12);
  const trendCtrl = await ValidationRunService.scoreTrend(orgId, 'nist_800_53_r5', 'overall', 12);

  return {
    runId, generatedAt: new Date().toISOString(), audience: 'CISO',
    csf: { overall: csf.overall != null ? csf.overall : null, functions: csfFunctions },
    nist80053: { overall: ctrl.overall != null ? ctrl.overall : null, families,
      baseline: { name: baseCol, total: baseTotal, covered: baseCovered,
        coveragePct: baseTotal ? Math.round((baseCovered / baseTotal) * 100) : 0 } },
    cis: { status: 'pending', note: 'CIS v8.1 ingestion (B3) is blocked pending the licensed workbook in resources/cis/.' },
    attack: { summary: attackSummary, heat },
    failingQueue: queue,
    trends: { csf: trendCsf.reverse(), nist80053: trendCtrl.reverse() },
    runMeta: latest.run,
  };
}

function recommend(signal, tool) {
  const map = {
    mfa_pct: 'Enforce phishing-resistant MFA for all users; close enrollment gaps in the IdP.',
    pam_pct: 'Vault remaining privileged accounts and enable session monitoring in PAM.',
    edr_pct: 'Deploy EDR to uncovered endpoints and move policies from detect to prevent.',
    patch_pct: 'Tighten patch SLAs for internet-facing and KEV-listed systems.',
    vuln_sla_pct: 'Remediate overdue critical/high vulnerabilities; automate SLA tracking.',
    siem_days: 'Extend log retention for security indexes to meet the monitoring window.',
    training_pct: 'Drive security-awareness completion to target; auto-enroll laggards.',
    mttd_hrs: 'Tune detections and on-call to reduce mean time to detect.',
    mttr_hrs: 'Streamline triage/runbooks to reduce mean time to respond.',
    vendor: 'Re-assess critical suppliers with security findings and require remediation.',
  };
  return map[signal] || `Review the ${tool || 'control'} configuration and bring the signal within threshold.`;
}

// -------------------------------------------------------------- CRO (D2)
async function croPack(orgId) {
  const latest = await ensureRun(orgId);
  const runId = latest.run && latest.run.id;
  const csf = scopeScores(latest.scores, 'nist_csf_2');
  const overall = csf.overall != null ? csf.overall : 0;
  const tier = tierOf(overall);

  // Failing controls this run (native ids) for process exposure.
  const failingControls = new Set(
    (await db.query(`
      SELECT DISTINCT m.requirement_id FROM requirement_mappings m
      JOIN check_results cr ON cr.check_id=m.check_id AND cr.run_id=$1 AND cr.org_id=$2 AND cr.status='fail'
      WHERE m.framework_id='nist_csf_2'`, [runId, orgId])).map((r) => r.requirement_id));

  const critWeight = { Critical: 1.0, High: 0.75, Medium: 0.5, Low: 0.25 };
  const procs = await db.query(`
    SELECT id, name, tier, criticality, governed_by_controls FROM business_processes WHERE organization_id=$1`, [orgId]);
  // financial exposure per process from the risk register
  const riskRows = await db.query(`
    SELECT business_process_ids, financial_exposure FROM risks WHERE organization_id=$1 AND financial_exposure IS NOT NULL`, [orgId]);
  const expById = {};
  riskRows.forEach((r) => { (r.business_process_ids || []).forEach((pid) => { expById[pid] = (expById[pid] || 0) + Number(r.financial_exposure || 0); }); });

  const processes = procs.map((p) => {
    const governed = p.governed_by_controls || [];
    const failed = governed.filter((c) => failingControls.has(c));
    const failRatio = governed.length ? failed.length / governed.length : (failingControls.size ? 0.5 : 0);
    const w = critWeight[p.criticality] || 0.5;
    const exposureScore = Math.round(w * (failed.length ? failRatio * 100 : failRatio * 60));
    return {
      id: p.id, name: p.name, criticality: p.criticality, tier: p.tier,
      governedControls: governed.length, failingControls: failed.length,
      financialExposure: expById[p.id] || 0,
      exposureScore,
      headline: businessHeadline(p.name, failRatio, expById[p.id] || 0),
    };
  }).sort((a, b) => (b.exposureScore - a.exposureScore) || (b.financialExposure - a.financialExposure));

  // "What changed since last board meeting" — delta vs the prior run.
  const runs = await db.query(`SELECT id FROM validation_runs WHERE org_id=$1 AND finished_at IS NOT NULL ORDER BY id DESC LIMIT 2`, [orgId]);
  let changed = null;
  if (runs.length === 2) {
    const prev = scopeScores((await ValidationRunService.getRun(orgId, runs[1].id)).scores, 'nist_csf_2');
    changed = {
      overallDelta: (csf.overall || 0) - (prev.overall || 0),
      byFunction: Object.keys(CSF_FUNCTIONS).map((f) => ({ id: f, name: CSF_FUNCTIONS[f], delta: (csf[f] || 0) - (prev[f] || 0) }))
        .filter((d) => d.delta !== 0),
    };
  }

  // Business-impact framing tied to weakest functions.
  const impacts = businessImpacts(csf);

  // Profile coverage (800-53 Moderate) in plain terms.
  const ciso = await cisoPack(orgId, { baseline: 'moderate' });
  const profile = ciso.nist80053.baseline;

  return {
    runId, generatedAt: new Date().toISOString(), audience: 'CRO/Board',
    postureStatement: `Cybersecurity maturity is Tier ${tier.tier} (${tier.label}). Overall readiness ${overall}/100.`,
    maturityTier: tier,
    enterpriseReadiness: overall,
    topProcesses: processes.slice(0, 8),
    whatChanged: changed,
    businessImpacts: impacts,
    profileCoverage: { name: 'NIST 800-53 Moderate', coveredControls: profile.covered, totalControls: profile.total, coveragePct: profile.coveragePct },
    attackReadiness: ciso.attack.summary,
    runMeta: latest.run,
  };
}

function businessHeadline(name, failRatio, exposure) {
  if (failRatio >= 0.5) return `${name}: control gaps materially elevate disruption and data-loss risk.`;
  if (failRatio > 0) return `${name}: some safeguards below target; residual risk is moderate.`;
  return `${name}: safeguards operating within tolerance.`;
}

function businessImpacts(csf) {
  // Map CSF function weakness to board-legible risk themes (no control IDs / ATT&CK jargon).
  const out = [];
  const lvl = (s) => (s == null ? 'unknown' : s >= 80 ? 'strong' : s >= 60 ? 'adequate' : 'weak');
  out.push({ theme: 'Ransomware readiness', basis: 'Protect + Recover', rating: lvl(Math.min(csf.PR ?? 100, csf.RC ?? 100)),
    statement: 'Our ability to prevent encryption of critical systems and recover operations quickly.' });
  out.push({ theme: 'Data theft exposure', basis: 'Protect + Detect', rating: lvl(Math.min(csf.PR ?? 100, csf.DE ?? 100)),
    statement: 'Likelihood that sensitive member/patient data could be exfiltrated without timely detection.' });
  out.push({ theme: 'Incident response confidence', basis: 'Respond', rating: lvl(csf.RS),
    statement: 'How reliably we contain and manage an incident once detected.' });
  out.push({ theme: 'Third-party & governance risk', basis: 'Govern', rating: lvl(csf.GV),
    statement: 'Oversight, accountability, and supplier-risk management at the enterprise level.' });
  return out;
}

module.exports = { cisoPack, croPack };
