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
    options: { both: 95, 'in-house': 90, retainer: 70, none: 10 } },
  { key: 'rs_co_notify',    category: 'RS.CO', doc: 'Breach notification procedures',
    question: 'Are breach-notification procedures documented (OCR, CMS, state AGs)?',
    options: { yes: 90, partial: 55, no: 10 } },
  { key: 'rc_rp_drtest',    category: 'RC.RP', doc: 'DR test report / BCP-DR plan',
    question: 'When was your last full disaster-recovery test?',
    options: { 'within-12mo': 90, 'over-12mo': 50, never: 10 } },
  { key: 'rc_co_comms',     category: 'RC.CO', doc: 'Recovery communication plan',
    question: 'Is there a recovery communication plan covering members, regulators, and media?',
    options: { yes: 90, no: 10 } },
  // Intake fallbacks for the platform-data categories, so a brand-new org gets
  // a fully populated scorecard at setup; live data takes over as it lands.
  { key: 'id_am_inventory', category: 'ID.AM', doc: 'CMDB export / asset inventory',
    question: 'Do you maintain a complete asset inventory (CMDB) covering hardware, software, and cloud?',
    options: { complete: 90, partial: 55, none: 10 } },
  { key: 'id_ra_assessment', category: 'ID.RA', doc: 'Annual risk assessment report',
    question: 'Do you conduct a formal cyber risk assessment (e.g. NIST SP 800-30)?',
    options: { annual: 90, occasional: 55, never: 10 } },
  { key: 'rs_mi_process',   category: 'RS.MI', doc: 'Remediation SLA policy',
    question: 'Is there a formal remediation process with tracked owners and due dates?',
    options: { formal: 90, 'ad-hoc': 50, none: 10 } },
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
    sources: ['Asset inventory / CMDB (live)', 'Intake fallback: id_am_inventory'], evidenceKeys: ['id_am_inventory'],
    score: (c) => {
      const t = n(c.assets.total);
      if (!t) return answerScore(c, 'id_am_inventory'); // intake fallback until assets land
      const supported = (t - n(c.assets.eol)) / t;        // share not end-of-life
      const clean = n(c.assets.clean) / t;                // share with no crit/high vulns
      return clamp(supported * 50 + clean * 25 + n(c.assets.avg_patch) * 0.25);
    } },
  { id: 'ID.RA', fn: 'ID', name: 'Risk Assessment', mode: 'auto',
    sources: ['Risk register (live)', 'Intake fallback: id_ra_assessment'], evidenceKeys: ['id_ra_assessment'],
    score: (c) => {
      const t = n(c.risks.total);
      if (!t) return answerScore(c, 'id_ra_assessment'); // intake fallback until risks land
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
    sources: ['Remediation tasks (live)', 'Intake fallback: rs_mi_process'], evidenceKeys: ['rs_mi_process'],
    score: (c) => {
      const open = n(c.tasks.open);
      if (!open && !n(c.tasks.overdue)) return answerScore(c, 'rs_mi_process'); // intake fallback
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
// Inherent risk (1.0–5.0): how much is at stake for this org, independent of
// controls — scaled from PHI records held, premium revenue, and membership.
// Log interpolation between small-plan and national-carrier anchors.
// ---------------------------------------------------------------------------
function logInterp(value, lo, hi) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return null;
  const t = (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo));
  return Math.max(1, Math.min(5, 1 + t * 4));
}

function computeInherentRisk(I) {
  const parts = [
    { w: 0.4, v: logInterp(I.phi_records, 1e5, 5e7) },   // 100K → 50M PHI records
    { w: 0.3, v: logInterp(I.revenue, 1e8, 1e11) },      // $100M → $100B revenue
    { w: 0.3, v: logInterp(I.member_count, 5e4, 1e7) },  // 50K → 10M members
  ].filter((p) => p.v != null);
  if (!parts.length) return null;
  const wsum = parts.reduce((s, p) => s + p.w, 0);
  return Math.round((parts.reduce((s, p) => s + p.v * p.w, 0) / wsum) * 100) / 100;
}

// Compact label for chart points: "Blue Cross Blue Shield of Massachusetts"
// → BCBSM, "Cigna Healthcare" → CH. Editable later via the admin DB page.
function deriveAbbrev(name) {
  const words = String(name || '').replace(/[^a-zA-Z\s]/g, ' ').split(/\s+/)
    .filter((w) => w && !['of', 'the', 'and', 'demo'].includes(w.toLowerCase()));
  if (!words.length) return '—';
  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 8).toUpperCase();
}

async function persistScorecard(orgId, assessment) {
  try {
    const orgRows = await safeRows(`SELECT name FROM orgs WHERE id=$1`, [orgId]);
    const name = (orgRows[0] || {}).name || orgId;
    const fns = {};
    assessment.functions.forEach((f) => { fns[f.id] = f.maturity; });
    await db.query(
      `INSERT INTO csf_scorecards
         (id, organization_id, org_name, abbrev, overall, tier, tier_label, inherent_risk,
          functions, assessed_categories, total_categories, generated_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
       ON CONFLICT (organization_id) DO UPDATE SET
         org_name=EXCLUDED.org_name,
         abbrev=COALESCE(csf_scorecards.abbrev, EXCLUDED.abbrev),
         overall=EXCLUDED.overall, tier=EXCLUDED.tier, tier_label=EXCLUDED.tier_label,
         inherent_risk=EXCLUDED.inherent_risk, functions=EXCLUDED.functions,
         assessed_categories=EXCLUDED.assessed_categories,
         total_categories=EXCLUDED.total_categories,
         generated_at=NOW(), updated_at=NOW()`,
      [
        `csfsc_${orgId}`, orgId, name, deriveAbbrev(name),
        assessment.overall.maturity, assessment.overall.tier || null, assessment.overall.label || null,
        assessment.inherentRisk, JSON.stringify(fns),
        assessment.assessedCategories, assessment.totalCategories,
      ]
    );
  } catch (err) {
    logger.warn('Failed to persist CSF scorecard snapshot', { orgId, error: err.message });
  }
}

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

  const assessment = {
    framework: 'NIST CSF 2.0',
    organizationId: orgId,
    generatedAt: new Date().toISOString(),
    lastToolSync: ctx.lastSync,
    overall: { maturity: overall, ...tierOf(overall) },
    inherentRisk: computeInherentRisk(ctx.I),
    assessedCategories: allAssessed.length,
    totalCategories: categories.length,
    autoCount: categories.filter((c) => c.mode === 'auto').length,
    partialCount: categories.filter((c) => c.mode === 'partial').length,
    manualCount: categories.filter((c) => c.mode === 'manual').length,
    functions,
  };

  // Keep the systemwide rankings store current.
  await persistScorecard(orgId, assessment);

  return assessment;
}

/**
 * Systemwide rankings: every organization's latest scorecard.
 * With refresh=true (or when the store is empty) every org's assessment is
 * recomputed from its live data first.
 */
async function getRankings({ refresh = false } = {}) {
  let rows = await safeRows(`SELECT * FROM csf_scorecards ORDER BY overall DESC NULLS LAST`);
  if (refresh || !rows.length) {
    const orgs = await safeRows(`SELECT id FROM orgs WHERE id <> '_defaults' LIMIT 50`);
    for (const o of orgs) {
      try { await getAssessment(o.id); } catch (err) {
        logger.warn('Rankings recompute failed for org', { orgId: o.id, error: err.message });
      }
    }
    rows = await safeRows(`SELECT * FROM csf_scorecards ORDER BY overall DESC NULLS LAST`);
  }
  return rows.map((r, i) => ({
    rank: r.overall == null ? null : i + 1,
    organizationId: r.organization_id,
    name: r.org_name,
    abbrev: r.abbrev,
    overall: r.overall == null ? null : Number(r.overall),
    tier: r.tier,
    tierLabel: r.tier_label,
    inherentRisk: r.inherent_risk == null ? null : Number(r.inherent_risk),
    functions: typeof r.functions === 'string' ? JSON.parse(r.functions || '{}') : (r.functions || {}),
    assessedCategories: r.assessed_categories,
    totalCategories: r.total_categories,
    generatedAt: r.generated_at,
  }));
}

// ---------------------------------------------------------------------------
// Zadkiel — the NIST CSF document review agent (runs after intake).
// Reviews every evidence item (answer + any uploaded document) against the
// CSF category's requirements and returns a score, findings, and concrete
// recommendations to address the gaps.
// ---------------------------------------------------------------------------
const REVIEW_GUIDANCE = {
  gv_po_policy:     { req: 'GV.PO requires a board-approved information security policy reviewed at least annually.', fix: 'Update the policy, route it to the board for approval, and set an annual review date.' },
  gv_rm_appetite:   { req: 'GV.RM requires a board-approved cyber risk appetite statement guiding risk decisions.', fix: 'Finalize the appetite statement and obtain board sign-off.' },
  gv_rr_roles:      { req: 'GV.RR requires a named security leader with documented roles and authorities.', fix: 'Charter the CISO role formally and document security responsibilities.' },
  gv_ov_board:      { req: 'GV.OV expects at least quarterly cybersecurity reporting to the board.', fix: 'Establish a recurring quarterly board security briefing.' },
  gv_oc_context:    { req: 'GV.OC requires documented mission, stakeholder, and regulatory context.', fix: 'Document organizational context and the applicable regulatory landscape.' },
  gv_sc_vendors:    { req: 'GV.SC requires security assessments of all critical vendors.', fix: 'Extend vendor security assessments to every critical vendor (see Vendor Assurance).' },
  id_am_inventory:  { req: 'ID.AM requires a complete asset inventory across hardware, software, and cloud.', fix: 'Complete the CMDB; import the application catalog in Setup Step 3.' },
  id_ra_assessment: { req: 'ID.RA requires a formal, recurring cyber risk assessment (e.g. NIST SP 800-30).', fix: 'Schedule an annual NIST SP 800-30 risk assessment.' },
  id_im_pir:        { req: 'ID.IM requires post-incident reviews feeding a lessons-learned process.', fix: 'Make post-incident reviews mandatory for P1/P2 incidents.' },
  pr_ds_encryption: { req: 'PR.DS requires PHI encrypted at rest and in transit.', fix: 'Close the encryption gaps — prioritize systems holding PHI at rest.' },
  pr_ds_dlp:        { req: 'PR.DS expects Data Loss Prevention for PHI.', fix: 'Deploy DLP coverage for PHI repositories and egress channels.' },
  pr_ir_resilience: { req: 'PR.IR requires tested backups and redundancy for critical systems.', fix: 'Test backup restoration and add redundancy for crown-jewel systems.' },
  de_ae_soc:        { req: 'DE.AE expects continuous (24x7) security-operations monitoring.', fix: 'Extend monitoring to 24x7 — in-house or via a managed SOC.' },
  rs_ma_irplan:     { req: 'RS.MA requires a documented IR plan exercised at least annually.', fix: 'Run a tabletop exercise within the next 12 months and document results.' },
  rs_an_forensics:  { req: 'RS.AN requires incident analysis / forensics capability.', fix: 'Establish an IR retainer or in-house forensics capability.' },
  rs_co_notify:     { req: 'RS.CO requires documented breach-notification procedures (OCR, CMS, state AGs).', fix: 'Document notification procedures with timelines per regulator.' },
  rs_mi_process:    { req: 'RS.MI requires a formal remediation process with tracked owners and due dates.', fix: 'Stand up tracked remediation with owners and SLAs.' },
  rc_rp_drtest:     { req: 'RC.RP requires a full disaster-recovery test at least annually.', fix: 'Schedule and document a full DR test.' },
  rc_co_comms:      { req: 'RC.CO requires a recovery communication plan for members, regulators, and media.', fix: 'Draft and approve a recovery communication plan.' },
};

async function reviewDocuments(orgId) {
  const rows = await safeRows(
    `SELECT question_key, answer, doc_name FROM csf_evidence WHERE organization_id=$1`, [orgId]);
  const byKey = {};
  rows.forEach((r) => { byKey[r.question_key] = r; });

  const reviews = EVIDENCE_QUESTIONS.map((q) => {
    const ev = byKey[q.key] || {};
    const guidance = REVIEW_GUIDANCE[q.key] || { req: '', fix: 'Provide this evidence.' };
    const score = ev.answer != null && ev.answer in q.options ? q.options[ev.answer] : null;
    const findings = [];
    const recommendations = [];
    if (score == null) {
      findings.push('No answer provided during intake — the category cannot be assessed.');
      recommendations.push(`Answer this item (and upload the ${q.doc}) on the CSF scorecard. ${guidance.fix}`);
    } else {
      if (score < 50) { findings.push(`Current state does not meet the requirement. ${guidance.req}`); recommendations.push(guidance.fix); }
      else if (score < 75) { findings.push(`Partially meets the requirement. ${guidance.req}`); recommendations.push(guidance.fix); }
      if (!ev.doc_name && score >= 50) {
        findings.push(`Attested but no supporting document on file (expected: ${q.doc}).`);
        recommendations.push(`Upload the ${q.doc} so the attestation is evidence-backed.`);
      }
    }
    return {
      key: q.key, category: q.category, question: q.question,
      answer: ev.answer || null, document: ev.doc_name || null,
      score, status: score == null ? 'Not assessed' : score >= 75 ? 'Meets' : score >= 50 ? 'Partial' : 'Gap',
      requirement: guidance.req, findings, recommendations,
    };
  });

  const actionable = reviews.filter((r) => r.recommendations.length);
  const scored = reviews.filter((r) => r.score != null);
  return {
    agent: 'Zadkiel', framework: 'NIST CSF 2.0', organizationId: orgId,
    reviewedAt: new Date().toISOString(),
    documentsOnFile: reviews.filter((r) => r.document).length,
    answered: scored.length, total: reviews.length,
    overallScore: scored.length ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length) : null,
    gaps: reviews.filter((r) => r.status === 'Gap').length,
    partials: reviews.filter((r) => r.status === 'Partial').length,
    recommendations: actionable.flatMap((r) => r.recommendations.map((rec) => ({ category: r.category, recommendation: rec }))),
    reviews,
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

module.exports = { getAssessment, getRankings, getQuestions, saveEvidence, reviewDocuments, gatherContext, CATEGORIES, EVIDENCE_QUESTIONS };
