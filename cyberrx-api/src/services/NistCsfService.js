'use strict';

/**
 * NistCsfService
 * --------------
 * Computes a live NIST CSF 2.0 maturity assessment — all 6 Functions and 22
 * Categories — from real org data, not hardcoded narrative.
 *
 * Each category is one of:
 *   auto    — scored entirely from connected-system data (metric_inputs synced
 *             from the tool sources, plus the assets/risks/controls/tasks tables)
 *   partial — a live system signal blended with an intake answer
 *   manual  — scored from the CSF evidence interview (answers + optional docs)
 *
 * Manual/partial categories with no evidence collected return score:null and
 * are reported "Not assessed" — the engine never invents a number.
 *
 * Scores are 0–100 internally and surfaced as CSF maturity 1.00–4.00:
 *   maturity = 1 + 3 * score/100
 *   Tier 1 Partial (<1.75) · Tier 2 Risk Informed (<2.50)
 *   Tier 3 Repeatable (<3.25) · Tier 4 Adaptive (>=3.25)
 */

const crypto = require('crypto');
const db = require('../utils/db');
const logger = require('../utils/logger');
const MetricsEngine = require('./MetricsEngine');

// ---------------------------------------------------------------------------
// The CSF evidence interview: every manual input the assessment needs.
// Each answer option maps to a 0–100 maturity contribution.
// ---------------------------------------------------------------------------
const EVIDENCE_QUESTIONS = [
  { key: 'gv_oc_context',   category: 'GV.OC', doc: 'Org context / stakeholder analysis',
    question: 'Do you have documented organizational context — mission, stakeholder expectations, and the regulatory landscape that applies to you?',
    options: { yes: 90, partial: 55, no: 15 } },
  { key: 'gv_rm_appetite',  category: 'GV.RM', doc: 'Risk appetite statement',
    question: 'Is there a board-approved cyber risk appetite statement?',
    options: { yes: 90, draft: 55, no: 15 } },
  { key: 'gv_rr_roles',     category: 'GV.RR', doc: 'CISO charter / role descriptions',
    question: 'Is there a named security leader (CISO) with documented roles, responsibilities, and authorities?',
    options: { yes: 90, informal: 50, no: 10 } },
  { key: 'gv_po_policy',    category: 'GV.PO', doc: 'Information security policy',
    question: 'Is there a board-approved information security policy reviewed in the last 12 months?',
    options: { yes: 90, outdated: 55, no: 10 } },
  { key: 'gv_ov_board',     category: 'GV.OV', doc: 'Board briefing materials',
    question: 'How often does cybersecurity report to the board?',
    options: { quarterly: 95, semiannual: 75, annual: 50, never: 10 } },
  { key: 'gv_sc_vendors',   category: 'GV.SC', doc: 'Vendor assessment reports',
    question: 'Do you conduct security assessments of critical vendors?',
    options: { all: 90, some: 55, none: 10 } },
  { key: 'id_im_pir',       category: 'ID.IM', doc: 'Post-incident review records',
    question: 'Do post-incident reviews feed a lessons-learned process?',
    options: { always: 90, sometimes: 55, never: 10 } },
  { key: 'pr_ds_encryption', category: 'PR.DS', doc: 'Encryption standard / data-flow map',
    question: 'Is PHI encrypted at rest and in transit across your systems?',
    options: { fully: 90, partially: 50, no: 10 } },
  { key: 'pr_ds_dlp',       category: 'PR.DS', doc: 'DLP deployment summary',
    question: 'Is Data Loss Prevention (DLP) deployed for PHI?',
    options: { yes: 90, partial: 55, no: 15 } },
  { key: 'pr_ir_resilience', category: 'PR.IR', doc: 'Backup test results / DR architecture',
    question: 'Are backups tested and critical systems redundant?',
    options: { both: 90, 'backups-only': 55, neither: 10 } },
  { key: 'de_ae_soc',       category: 'DE.AE', doc: 'SOC coverage / MSSP contract',
    question: 'What is your security-operations monitoring coverage?',
    options: { '24x7': 90, 'business-hours': 50, none: 10 } },
  { key: 'rs_ma_irplan',    category: 'RS.MA', doc: 'Incident response plan',
    question: 'Do you have a documented incident response plan, and was a tabletop exercise run in the last 12 months?',
    options: { 'plan-and-tabletop': 95, 'plan-only': 60, none: 10 } },
  { key: 'rs_an_forensics', category: 'RS.AN', doc: 'Forensics retainer / IR runbooks',
    question: 'What incident analysis / forensics capability do you have?',
    options: { 'in-house': 90, retainer: 70, none: 10 } },
  { key: 'rs_co_notify',    category: 'RS.CO', doc: 'Breach notification procedures',
    question: 'Are breach-notification procedures documented (OCR, CMS, state AGs)?',
    options: { yes: 90, partial: 55, no: 10 } },
  { key: 'rc_rp_drtest',    category: 'RC.RP', doc: 'DR test report / BCP-DR plan',
    question: 'When was your last full disaster-recovery test?',
    options: { 'within-12mo': 90, 'over-12mo': 50, never: 10 } },
  { key: 'rc_co_comms',     category: 'RC.CO', doc: 'Recovery communication plan',
    question: 'Is there a recovery communication plan covering members, regulators, and media?',
    options: { yes: 90, no: 10 } },
];

const TIERS = [
  { min: 3.25, tier: 4, label: 'Adaptive' },
  { min: 2.50, tier: 3, label: 'Repeatable' },
  { min: 1.75, tier: 2, label: 'Risk Informed' },
  { min: 0,    tier: 1, label: 'Partial' },
];

function toMaturity(score) {
  if (score == null) return null;
  return Math.round((1 + 3 * (Math.max(0, Math.min(100, score)) / 100)) * 100) / 100;
}
function tierOf(maturity) {
  if (maturity == null) return null;
  const t = TIERS.find((x) => maturity >= x.min);
  return { tier: t.tier, label: t.label };
}
function clamp(v) { return Math.max(0, Math.min(100, v)); }
function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }

// Average the available components; null when none are available.
function blend(parts) {
  const vals = parts.filter((v) => v != null && Number.isFinite(v));
  if (!vals.length) return null;
  return clamp(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ---------------------------------------------------------------------------
// Context gathering — live system data, all defensive
// ---------------------------------------------------------------------------
async function safeRows(sql, params = []) {
  try { return await db.query(sql, params); } catch (err) {
    logger.debug('NistCsf query degraded', { error: err.message });
    return [];
  }
}

async function gatherContext(orgId) {
  const [assetAgg, riskAgg, ctrlAgg, taskAgg, vendorAgg, legalAgg, evidenceRows, syncRows] = await Promise.all([
    safeRows(`SELECT COUNT(*) total,
                     COUNT(*) FILTER (WHERE supported=false) eol,
                     COALESCE(ROUND(AVG(patch_pct)),0) avg_patch,
                     COUNT(*) FILTER (WHERE COALESCE(vuln_critical,0)=0 AND COALESCE(vuln_high,0)=0) clean
                FROM assets WHERE organization_id=$1`, [orgId]),
    safeRows(`SELECT COUNT(*) total,
                     COUNT(*) FILTER (WHERE status IN ('open','mitigating')) open,
                     COUNT(*) FILTER (WHERE executive_owner IS NOT NULL AND executive_owner<>'') owned,
                     COUNT(*) FILTER (WHERE COALESCE(financial_exposure,0)>0) quantified
                FROM risks WHERE organization_id=$1`, [orgId]),
    safeRows(`SELECT COUNT(*) total,
                     COALESCE(ROUND(AVG(effectiveness_score)),0) avg_eff,
                     COUNT(*) FILTER (WHERE implementation_status='Implemented') implemented
                FROM controls WHERE organization_id=$1`, [orgId]),
    safeRows(`SELECT COUNT(*) FILTER (WHERE status NOT IN ('Completed','Verified','Cancelled')) open,
                     COUNT(*) FILTER (WHERE status NOT IN ('Completed','Verified','Cancelled')
                       AND target_date IS NOT NULL AND target_date < NOW()) overdue
                FROM remediation_tasks WHERE organization_id=$1`, [orgId]),
    safeRows(`SELECT COUNT(*) active,
                     COUNT(*) FILTER (WHERE severity IN ('Critical','High')) severe
                FROM vendor_risk_signals WHERE organization_id=$1 AND status='active'`, [orgId]),
    safeRows(`SELECT COUNT(*) total,
                     COUNT(*) FILTER (WHERE notification_timeline IS NOT NULL AND notification_timeline<>'') timed
                FROM legal_obligations WHERE organization_id=$1`, [orgId]),
    safeRows(`SELECT question_key, answer, doc_name FROM csf_evidence WHERE organization_id=$1`, [orgId]),
    safeRows(`SELECT MAX(updated_at) ts FROM metric_inputs WHERE org_id=$1`, [orgId]),
  ]);

  let I = {};
  try { I = await MetricsEngine.loadInputs(orgId); } catch (_) { I = {}; }

  const evidence = {};
  evidenceRows.forEach((r) => { evidence[r.question_key] = { answer: r.answer, docName: r.doc_name }; });

  return {
    I,
    assets: assetAgg[0] || {},
    risks: riskAgg[0] || {},
    controls: ctrlAgg[0] || {},
    tasks: taskAgg[0] || {},
    vendors: vendorAgg[0] || {},
    legal: legalAgg[0] || {},
    evidence,
    lastSync: (syncRows[0] || {}).ts || null,
  };
}

// Score one manual question from the evidence answers; null when unanswered.
function answerScore(ctx, key) {
  const q = EVIDENCE_QUESTIONS.find((x) => x.key === key);
  const ev = ctx.evidence[key];
  if (!q || !ev || ev.answer == null || !(ev.answer in q.options)) return null;
  return q.options[ev.answer];
}

// ---------------------------------------------------------------------------
// The 22 CSF 2.0 categories — id, function, mode, live sources, and formula.
// ---------------------------------------------------------------------------
const CATEGORIES = [
  // ── GOVERN ────────────────────────────────────────────────────────────────
  { id: 'GV.OC', fn: 'GV', name: 'Organizational Context', mode: 'partial',
    sources: ['Setup profile', 'Intake: gv_oc_context'], evidenceKeys: ['gv_oc_context'],
    score: (c) => blend([
      // Live: an org with a populated risk register + legal obligations has its context mapped in-platform.
      (n(c.risks.total) > 0 && n(c.legal.total) > 0) ? 70 : (n(c.risks.total) > 0 ? 45 : null),
      answerScore(c, 'gv_oc_context'),
    ]) },
  { id: 'GV.RM', fn: 'GV', name: 'Risk Management Strategy', mode: 'partial',
    sources: ['Risk register (live)', 'Intake: gv_rm_appetite'], evidenceKeys: ['gv_rm_appetite'],
    score: (c) => blend([
      n(c.risks.total) > 0 ? clamp(30 + (n(c.risks.owned) / n(c.risks.total)) * 40 + (n(c.risks.quantified) / n(c.risks.total)) * 30) : null,
      answerScore(c, 'gv_rm_appetite'),
    ]) },
  { id: 'GV.RR', fn: 'GV', name: 'Roles, Responsibilities & Authorities', mode: 'manual',
    sources: ['Intake: gv_rr_roles'], evidenceKeys: ['gv_rr_roles'],
    score: (c) => answerScore(c, 'gv_rr_roles') },
  { id: 'GV.PO', fn: 'GV', name: 'Policy', mode: 'manual',
    sources: ['Intake: gv_po_policy'], evidenceKeys: ['gv_po_policy'],
    score: (c) => answerScore(c, 'gv_po_policy') },
  { id: 'GV.OV', fn: 'GV', name: 'Oversight', mode: 'manual',
    sources: ['Intake: gv_ov_board'], evidenceKeys: ['gv_ov_board'],
    score: (c) => answerScore(c, 'gv_ov_board') },
  { id: 'GV.SC', fn: 'GV', name: 'Supply Chain Risk Management', mode: 'partial',
    sources: ['Vendor risk signals (live)', 'Intake: gv_sc_vendors'], evidenceKeys: ['gv_sc_vendors'],
    score: (c) => blend([
      n(c.vendors.active) > 0 || n(c.vendors.severe) > 0
        ? clamp(70 - n(c.vendors.severe) * 12) : null,
      answerScore(c, 'gv_sc_vendors'),
    ]) },

  // ── IDENTIFY ──────────────────────────────────────────────────────────────
  { id: 'ID.AM', fn: 'ID', name: 'Asset Management', mode: 'auto',
    sources: ['Asset inventory / CMDB (live)'], evidenceKeys: [],
    score: (c) => {
      const t = n(c.assets.total);
      if (!t) return null;
      const supported = (t - n(c.assets.eol)) / t;        // share not end-of-life
      const clean = n(c.assets.clean) / t;                // share with no crit/high vulns
      return clamp(supported * 50 + clean * 25 + n(c.assets.avg_patch) * 0.25);
    } },
  { id: 'ID.RA', fn: 'ID', name: 'Risk Assessment', mode: 'auto',
    sources: ['Risk register (live)', 'Findings (live)'], evidenceKeys: [],
    score: (c) => {
      const t = n(c.risks.total);
      if (!t) return null;
      return clamp(35 + (n(c.risks.quantified) / t) * 35 + (n(c.risks.owned) / t) * 30);
    } },
  { id: 'ID.IM', fn: 'ID', name: 'Improvement', mode: 'manual',
    sources: ['Intake: id_im_pir'], evidenceKeys: ['id_im_pir'],
    score: (c) => answerScore(c, 'id_im_pir') },

  // ── PROTECT ───────────────────────────────────────────────────────────────
  { id: 'PR.AA', fn: 'PR', name: 'Identity Management & Access Control', mode: 'auto',
    sources: ['Okta (MFA)', 'CyberArk (PAM)'], evidenceKeys: [],
    score: (c) => (c.I.mfa_pct == null && c.I.pam_pct == null) ? null
      : clamp(n(c.I.mfa_pct) * 0.6 + n(c.I.pam_pct) * 0.4) },
  { id: 'PR.AT', fn: 'PR', name: 'Awareness & Training', mode: 'auto',
    sources: ['LMS (training)', 'KnowBe4 (phishing)'], evidenceKeys: [],
    score: (c) => (c.I.training_pct == null && c.I.phishing_pct == null) ? null
      : clamp(n(c.I.training_pct) * 0.6 + Math.max(0, 100 - n(c.I.phishing_pct) * 8) * 0.4) },
  { id: 'PR.DS', fn: 'PR', name: 'Data Security', mode: 'manual',
    sources: ['Intake: pr_ds_encryption', 'Intake: pr_ds_dlp'], evidenceKeys: ['pr_ds_encryption', 'pr_ds_dlp'],
    score: (c) => blend([answerScore(c, 'pr_ds_encryption'), answerScore(c, 'pr_ds_dlp')]) },
  { id: 'PR.PS', fn: 'PR', name: 'Platform Security', mode: 'auto',
    sources: ['Tenable (patch/vuln SLA)', 'CrowdStrike (EDR)'], evidenceKeys: [],
    score: (c) => (c.I.patch_pct == null && c.I.edr_pct == null) ? null
      : clamp(n(c.I.patch_pct) * 0.4 + n(c.I.vuln_sla_pct) * 0.3 + n(c.I.edr_pct) * 0.3) },
  { id: 'PR.IR', fn: 'PR', name: 'Technology Infrastructure Resilience', mode: 'manual',
    sources: ['Intake: pr_ir_resilience'], evidenceKeys: ['pr_ir_resilience'],
    score: (c) => answerScore(c, 'pr_ir_resilience') },

  // ── DETECT ────────────────────────────────────────────────────────────────
  { id: 'DE.CM', fn: 'DE', name: 'Continuous Monitoring', mode: 'auto',
    sources: ['Splunk (SIEM retention, MTTD)', 'CrowdStrike (EDR)'], evidenceKeys: [],
    score: (c) => (c.I.siem_days == null && c.I.edr_pct == null && c.I.mttd_hrs == null) ? null
      : clamp(Math.min(100, n(c.I.siem_days) / 90 * 100) * 0.4 + n(c.I.edr_pct) * 0.3
            + Math.max(0, 100 - Math.max(0, n(c.I.mttd_hrs) - 24) * 2) * 0.3) },
  { id: 'DE.AE', fn: 'DE', name: 'Adverse Event Analysis', mode: 'partial',
    sources: ['Splunk/ServiceNow (MTTD/MTTR)', 'Intake: de_ae_soc'], evidenceKeys: ['de_ae_soc'],
    score: (c) => blend([
      (c.I.mttd_hrs == null && c.I.mttr_hrs == null) ? null
        : clamp(Math.max(0, 100 - Math.max(0, n(c.I.mttd_hrs) - 24) * 2) * 0.5
              + Math.max(0, 100 - Math.max(0, n(c.I.mttr_hrs) - 4) * 10) * 0.5),
      answerScore(c, 'de_ae_soc'),
    ]) },

  // ── RESPOND ───────────────────────────────────────────────────────────────
  { id: 'RS.MA', fn: 'RS', name: 'Incident Management', mode: 'partial',
    sources: ['ServiceNow (MTTR)', 'Intake: rs_ma_irplan'], evidenceKeys: ['rs_ma_irplan'],
    score: (c) => blend([
      c.I.mttr_hrs == null ? null : clamp(Math.max(0, 100 - Math.max(0, n(c.I.mttr_hrs) - 4) * 10)),
      answerScore(c, 'rs_ma_irplan'),
    ]) },
  { id: 'RS.AN', fn: 'RS', name: 'Incident Analysis', mode: 'manual',
    sources: ['Intake: rs_an_forensics'], evidenceKeys: ['rs_an_forensics'],
    score: (c) => answerScore(c, 'rs_an_forensics') },
  { id: 'RS.CO', fn: 'RS', name: 'Incident Response Reporting & Communication', mode: 'partial',
    sources: ['Legal obligations (live)', 'Intake: rs_co_notify'], evidenceKeys: ['rs_co_notify'],
    score: (c) => blend([
      n(c.legal.total) > 0 ? clamp(40 + (n(c.legal.timed) / n(c.legal.total)) * 50) : null,
      answerScore(c, 'rs_co_notify'),
    ]) },
  { id: 'RS.MI', fn: 'RS', name: 'Incident Mitigation', mode: 'auto',
    sources: ['Remediation tasks (live)'], evidenceKeys: [],
    score: (c) => {
      const open = n(c.tasks.open);
      if (!open && !n(c.tasks.overdue)) return null;
      return clamp(100 - (open ? (n(c.tasks.overdue) / open) * 80 : 0));
    } },

  // ── RECOVER ───────────────────────────────────────────────────────────────
  { id: 'RC.RP', fn: 'RC', name: 'Incident Recovery Plan Execution', mode: 'manual',
    sources: ['Intake: rc_rp_drtest'], evidenceKeys: ['rc_rp_drtest'],
    score: (c) => answerScore(c, 'rc_rp_drtest') },
  { id: 'RC.CO', fn: 'RC', name: 'Incident Recovery Communication', mode: 'manual',
    sources: ['Intake: rc_co_comms'], evidenceKeys: ['rc_co_comms'],
    score: (c) => answerScore(c, 'rc_co_comms') },
];

const FUNCTIONS = [
  { id: 'GV', name: 'Govern' },
  { id: 'ID', name: 'Identify' },
  { id: 'PR', name: 'Protect' },
  { id: 'DE', name: 'Detect' },
  { id: 'RS', name: 'Respond' },
  { id: 'RC', name: 'Recover' },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
async function getAssessment(orgId) {
  const ctx = await gatherContext(orgId);

  const categories = CATEGORIES.map((cat) => {
    let score = null;
    try { score = cat.score(ctx); } catch (_) { score = null; }
    const maturity = toMaturity(score);
    const evidence = (cat.evidenceKeys || []).map((k) => {
      const q = EVIDENCE_QUESTIONS.find((x) => x.key === k);
      const ev = ctx.evidence[k] || null;
      return {
        key: k,
        question: q ? q.question : k,
        suggestedDoc: q ? q.doc : null,
        answered: !!(ev && ev.answer),
        answer: ev ? ev.answer : null,
        docName: ev ? ev.docName : null,
      };
    });
    return {
      id: cat.id,
      fn: cat.fn,
      name: cat.name,
      mode: cat.mode,
      sources: cat.sources,
      maturity,
      ...tierOf(maturity),
      assessed: maturity != null,
      evidence,
      evidenceMissing: evidence.filter((e) => !e.answered).length,
    };
  });

  const functions = FUNCTIONS.map((f) => {
    const cats = categories.filter((c) => c.fn === f.id);
    const assessed = cats.filter((c) => c.maturity != null);
    const maturity = assessed.length
      ? Math.round((assessed.reduce((s, c) => s + c.maturity, 0) / assessed.length) * 100) / 100
      : null;
    return { id: f.id, name: f.name, maturity, ...tierOf(maturity), categories: cats,
      assessedCount: assessed.length, categoryCount: cats.length };
  });

  const allAssessed = categories.filter((c) => c.maturity != null);
  const overall = allAssessed.length
    ? Math.round((allAssessed.reduce((s, c) => s + c.maturity, 0) / allAssessed.length) * 100) / 100
    : null;

  return {
    framework: 'NIST CSF 2.0',
    organizationId: orgId,
    generatedAt: new Date().toISOString(),
    lastToolSync: ctx.lastSync,
    overall: { maturity: overall, ...tierOf(overall) },
    assessedCategories: allAssessed.length,
    totalCategories: categories.length,
    autoCount: categories.filter((c) => c.mode === 'auto').length,
    partialCount: categories.filter((c) => c.mode === 'partial').length,
    manualCount: categories.filter((c) => c.mode === 'manual').length,
    functions,
  };
}

function getQuestions() {
  return EVIDENCE_QUESTIONS.map((q) => ({
    key: q.key, category: q.category, question: q.question,
    options: Object.keys(q.options), suggestedDoc: q.doc,
  }));
}

/** Upsert intake answers: [{key, answer, docName?}] */
async function saveEvidence(orgId, items) {
  const saved = [];
  for (const it of items || []) {
    const q = EVIDENCE_QUESTIONS.find((x) => x.key === it.key);
    if (!q) continue;
    const answer = (it.answer != null && String(it.answer) in q.options) ? String(it.answer) : null;
    if (answer == null && !it.docName) continue;
    const id = `csfev_${orgId}_${it.key}`;
    await db.query(
      `INSERT INTO csf_evidence (id, organization_id, question_key, answer, doc_name, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (organization_id, question_key) DO UPDATE SET
         answer=COALESCE(EXCLUDED.answer, csf_evidence.answer),
         doc_name=COALESCE(EXCLUDED.doc_name, csf_evidence.doc_name),
         updated_at=NOW()`,
      [id, orgId, it.key, answer, it.docName || null]
    );
    saved.push(it.key);
  }
  return saved;
}

module.exports = { getAssessment, getQuestions, saveEvidence, CATEGORIES, EVIDENCE_QUESTIONS };
