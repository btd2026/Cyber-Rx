'use strict';

/**
 * MetricsEngine
 * -------------
 * Single source of truth for every number shown on the dashboards.
 *
 * Inputs come only from the database:
 *   - metric_inputs ('_defaults' coefficients + per-org values)
 *   - orgs.setup_json (the setup-quiz responses)
 * Every displayed figure is a documented formula over those inputs — there are
 * no magic numbers in the dashboards. Edit a metric_inputs row (or change a
 * setup-quiz answer) and the computed numbers change.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

// Map setup-quiz (orgs.setup_json) field names -> metric_inputs keys, so the
// actual quiz responses override the seeded defaults when they are numeric.
// Includes both the canonical field names and the SetupBot chat's answer keys
// (phiRecs, insDeduct, rbcRatio).
const SETUP_FIELD_MAP = {
  revenue: 'revenue', surplus: 'surplus', ibnr: 'ibnr',
  itBudget: 'it_budget', it_budget: 'it_budget',
  phiRecords: 'phi_records', phi_records: 'phi_records', phiRecs: 'phi_records',
  memberCount: 'member_count', members: 'member_count',
  insLimit: 'ins_limit', cyberInsLimit: 'ins_limit',
  insDeductible: 'ins_deductible', insDeduct: 'ins_deductible',
  rbcRatioCurrent: 'rbc_ratio_current', rbcRatio: 'rbc_ratio_current',
  mfaPct: 'mfa_pct', edrPct: 'edr_pct', siemDays: 'siem_days',
  phishingPct: 'phishing_pct', patchPct: 'patch_pct',
  mttdHrs: 'mttd_hrs', mttrHrs: 'mttr_hrs',
  trainingPct: 'training_pct', pamPct: 'pam_pct', vulnSLApct: 'vuln_sla_pct',
  endpoints: 'endpoints', privAccts: 'priv_accts',
};

// ---------------------------------------------------------------------------
// Setup-answer parsing. The setup chat stores answers as range labels like
// "$2B to $10B", "Under $500M", "1 to 2.5 million", "400 to 500 percent".
// Convert those to usable numbers (range -> midpoint, Under X -> X/2,
// Over X -> X). Anything unparseable returns NaN and is SKIPPED, so a label
// like "Unknown" can never overwrite a good seeded value.
// ---------------------------------------------------------------------------
const SUFFIX = { k: 1e3, m: 1e6, b: 1e9, thousand: 1e3, million: 1e6, billion: 1e9 };

function parseToken(tok) {
  const m = String(tok).trim().toLowerCase().replace(/[$,]/g, '')
    .match(/^(\d+(?:\.\d+)?)\s*(k|m|b|thousand|million|billion)?$/);
  if (!m) return NaN;
  return parseFloat(m[1]) * (SUFFIX[m[2]] || 1);
}

function parseSetupNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (v == null) return NaN;
  let s = String(v).trim();
  if (!s) return NaN;
  // Plain numerics (with commas): "3,000,000"
  if (/^[\d.,]+$/.test(s)) {
    const x = Number(s.replace(/,/g, ''));
    return Number.isFinite(x) ? x : NaN;
  }
  s = s.toLowerCase().replace(/\(.*?\)/g, '').replace(/\bpercent\b/g, '').trim();
  if (/^(no\b|none\b)/.test(s)) return 0; // e.g. "No cyber insurance"
  // Range "X to Y" / "X - Y" -> midpoint; a bare left side inherits the right
  // side's magnitude suffix ("1 to 2.5 million" -> 1M..2.5M).
  let m = s.match(/^(?:between\s+)?(.+?)\s*(?:\bto\b|[-–])\s*(.+)$/);
  if (m) {
    let a = parseToken(m[1]);
    const b = parseToken(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a < b / 1000) {
      const sm = m[2].toLowerCase().match(/(k|m|b|thousand|million|billion)\s*$/);
      if (sm) a *= SUFFIX[sm[1]];
    }
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) return (a + b) / 2;
  }
  m = s.match(/^(?:under|below|less than)\s+(.+)$/);
  if (m) { const x = parseToken(m[1]); return Number.isFinite(x) ? x / 2 : NaN; }
  m = s.match(/^(?:over|above|more than)\s+(.+?)\+?$/);
  if (m) { const x = parseToken(m[1]); return Number.isFinite(x) ? x : NaN; }
  return parseToken(s);
}

function num(v) {
  if (v == null) return NaN;
  if (typeof v === 'number') return v;
  const x = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(x) ? x : NaN;
}

async function safeRows(sql, params = []) {
  try { return await db.query(sql, params); } catch (err) {
    logger.debug('MetricsEngine query degraded', { error: err.message });
    return [];
  }
}

/**
 * Load the flat inputs map for an org: _defaults overlaid by org-specific rows
 * overlaid by mapped numeric setup_json values.
 */
async function loadInputs(orgId) {
  const rows = await safeRows(
    `SELECT org_id, key, value FROM metric_inputs WHERE org_id IN ('_defaults', $1)`, [orgId]);
  const inputs = {};
  // defaults first, then org-specific (so org wins)
  rows.filter((r) => r.org_id === '_defaults').forEach((r) => { inputs[r.key] = Number(r.value); });
  rows.filter((r) => r.org_id === orgId).forEach((r) => { inputs[r.key] = Number(r.value); });

  // Overlay setup-quiz responses so actual answers win. Range labels like
  // "$2B to $10B" are converted to midpoints; unparseable values are skipped.
  const orgRows = await safeRows(`SELECT setup_json FROM orgs WHERE id=$1`, [orgId]);
  const setup = (orgRows[0] && orgRows[0].setup_json) || {};
  Object.entries(SETUP_FIELD_MAP).forEach(([field, key]) => {
    if (setup[field] !== undefined) {
      const v = parseSetupNumber(setup[field]);
      if (Number.isFinite(v)) inputs[key] = v;
    }
  });
  return inputs;
}

// Entity aggregates used by several role computations.
async function loadAggregates(orgId) {
  const [fin, risksBySev, openExposure, controls, processes] = await Promise.all([
    safeRows(`SELECT COALESCE(SUM(total_gross),0) gross, COALESCE(SUM(net_exposure),0) net,
                     COALESCE(SUM(insurance_coverage),0) insured FROM financial_impacts WHERE organization_id=$1`, [orgId]),
    safeRows(`SELECT severity, COUNT(*) n FROM risks WHERE organization_id=$1 AND status IN ('open','mitigating') GROUP BY severity`, [orgId]),
    safeRows(`SELECT COALESCE(SUM(financial_exposure),0) exp, COUNT(*) n FROM risks WHERE organization_id=$1 AND status IN ('open','mitigating')`, [orgId]),
    safeRows(`SELECT COUNT(*) n, COALESCE(ROUND(AVG(effectiveness_score)),0) avg_eff,
                     COUNT(*) FILTER (WHERE implementation_status='Implemented') implemented FROM controls WHERE organization_id=$1`, [orgId]),
    safeRows(`SELECT COUNT(*) n, COUNT(*) FILTER (WHERE criticality='Critical') critical FROM business_processes WHERE organization_id=$1`, [orgId]),
  ]);
  const sev = {}; risksBySev.forEach((r) => { sev[r.severity] = Number(r.n); });
  return {
    finGross: Number((fin[0] || {}).gross || 0),
    finNet: Number((fin[0] || {}).net || 0),
    finInsured: Number((fin[0] || {}).insured || 0),
    riskExposure: Number((openExposure[0] || {}).exp || 0),
    openRisks: Number((openExposure[0] || {}).n || 0),
    critical: sev.Critical || 0, high: sev.High || 0, medium: sev.Medium || 0, low: sev.Low || 0,
    controlsTotal: Number((controls[0] || {}).n || 0),
    controlEffectiveness: Number((controls[0] || {}).avg_eff || 0),
    controlsImplemented: Number((controls[0] || {}).implemented || 0),
    processes: Number((processes[0] || {}).n || 0),
    criticalProcesses: Number((processes[0] || {}).critical || 0),
  };
}

const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;
const M = (x) => Math.round(x / 1e6); // to $M

// --- CFO -------------------------------------------------------------------
function computeCFO(I) {
  const phiRecs = I.phi_records, revB = I.revenue, surplusB = I.surplus,
        ibnrB = I.ibnr, itB = I.it_budget, insLimit = I.ins_limit,
        deductible = I.ins_deductible || 0, rbcCurrent = I.rbc_ratio_current;

  const phiNotifCost = phiRecs * I.phi_notif_per_record;
  const classAction = Math.min(I.breach_classaction_cap, phiRecs * I.breach_classaction_per_record);
  const breachResp = phiNotifCost + I.breach_fixed + classAction;
  const breachRespM = M(breachResp);
  const regulatoryM = M(surplusB * I.regulatory_surplus_pct);
  const fraudM = M(revB * I.fwa_rev_pct + phiRecs * I.phi_darkweb_per_record);
  const reputM = M(revB * I.reput_rev_pct);
  const interruptM = M(revB * I.interrupt_rev_pct + I.interrupt_fixed);
  const legalM = M(deductible + I.legal_fixed);
  const recoveryM = M(itB * I.recovery_it_pct);
  const grossExp = (breachRespM + regulatoryM + fraudM + reputM + interruptM + legalM + recoveryM) * 1e6;
  const netExp = grossExp - insLimit;

  const capitalRisk = r0(phiRecs * I.ponemon_per_record + surplusB * I.regulatory_surplus_pct + revB * I.ops_rev_pct + deductible + I.capital_legal_base);
  const claimsRisk = I.claims_risk, itRisk = I.it_risk;
  const capitalPct = r1(capitalRisk / surplusB * 100);
  const claimsPct = r1(claimsRisk / ibnrB * 100);
  const itPct = r1(itRisk / itB * 100);

  const rbcImpact = r0(capitalRisk / surplusB * 400);
  const rbcRatioPost = rbcCurrent - rbcImpact;
  const rbcStatus = rbcRatioPost < I.rbc_min ? 'critical' : rbcRatioPost < I.rbc_warning ? 'warning' : 'ok';

  const securitySpend = itB * I.security_spend_pct_of_it;
  const rosi = r0((I.avoided_loss - securitySpend) / securitySpend * 100);

  const stressLoss = breachResp + regulatoryM * 1e6 + legalM * 1e6;
  const catastrophicLoss = stressLoss * I.catastrophic_multiplier + ibnrB * I.catastrophic_ibnr_pct;
  const expectedLoss = stressLoss * I.prob_significant_breach + catastrophicLoss * I.prob_catastrophic;

  const exposureBreakdown = [
    { cat: 'Breach Response', exposureM: breachRespM },
    { cat: 'Regulatory Fines', exposureM: regulatoryM },
    { cat: 'Business Interruption', exposureM: interruptM },
    { cat: 'Fraud & Abuse', exposureM: fraudM },
    { cat: 'Reputational / Churn', exposureM: reputM },
    { cat: 'Legal & Extortion', exposureM: legalM },
    { cat: 'IT Recovery', exposureM: recoveryM },
  ];

  return {
    grossExp, netExp, insLimit, securitySpend, rosi, annualLossExp: I.annual_loss_exp,
    capitalRisk, claimsRisk, itRisk, capitalPct, claimsPct, itPct,
    rbcRatioPre: rbcCurrent, rbcImpact, rbcRatioPost, rbcStatus,
    breachRespM, regulatoryM, fraudM, reputM, interruptM, legalM, recoveryM,
    exposureBreakdown,
    scenarios: [
      { id: 'expected', label: 'Expected Annual Loss', prob: 100, loss: expectedLoss },
      { id: 'stress', label: 'Significant PHI Breach', prob: r0(I.prob_significant_breach * 100), loss: stressLoss },
      { id: 'catastrophic', label: 'Catastrophic Event', prob: r0(I.prob_catastrophic * 100), loss: catastrophicLoss },
    ],
    inputsEcho: { phiRecs, revenue: revB, surplus: surplusB, ibnr: ibnrB, itBudget: itB, insLimit, rbcCurrent },
  };
}

// --- CISO -------------------------------------------------------------------
function postureScore(I) {
  const phishResist = Math.max(0, 100 - I.phishing_pct);
  const w = [
    [I.mfa_pct, 0.18], [I.edr_pct, 0.18], [I.patch_pct, 0.14], [phishResist, 0.12],
    [I.training_pct, 0.12], [I.pam_pct, 0.13], [I.vuln_sla_pct, 0.13],
  ];
  const score = w.reduce((s, [v, wt]) => s + (Number.isFinite(v) ? v : 0) * wt, 0);
  return r0(score);
}
function cmmiLevel(score) {
  if (score >= 80) return 5; if (score >= 60) return 4; if (score >= 40) return 3; if (score >= 20) return 2; return 1;
}
function computeCISO(I, agg) {
  const score = postureScore(I);
  return {
    postureScore: score,
    cmmiLevel: cmmiLevel(score),
    controlEffectiveness: agg.controlEffectiveness,
    controlsImplemented: agg.controlsImplemented,
    controlsTotal: agg.controlsTotal,
    openRisks: agg.openRisks, criticalRisks: agg.critical, highRisks: agg.high,
    quantifiedExposure: agg.finGross || agg.riskExposure,
    revenue: I.revenue, memberCount: I.member_count, phiRecords: I.phi_records,
    kpis: {
      mfaPct: I.mfa_pct, edrPct: I.edr_pct, siemDays: I.siem_days, phishingPct: I.phishing_pct,
      patchPct: I.patch_pct, mttdHrs: I.mttd_hrs, mttrHrs: I.mttr_hrs,
      trainingPct: I.training_pct, pamPct: I.pam_pct, vulnSlaPct: I.vuln_sla_pct,
    },
  };
}

// --- CRO --------------------------------------------------------------------
function computeCRO(I, agg) {
  const appetiteBreached = agg.critical;
  const withinAppetite = appetiteBreached === 0;
  return {
    withinAppetite, appetiteBreaches: appetiteBreached,
    openRisks: agg.openRisks, criticalRisks: agg.critical, highRisks: agg.high, mediumRisks: agg.medium,
    quantifiedExposure: agg.finGross || agg.riskExposure,
    netExposure: agg.finNet,
    surplus: I.surplus, phiRecords: I.phi_records, revenue: I.revenue,
    kris: [
      { kri: 'Critical risks open', value: agg.critical, threshold: 0, breached: agg.critical > 0 },
      { kri: 'Patch SLA compliance', value: I.patch_pct, threshold: 90, breached: I.patch_pct < 90, unit: '%' },
      { kri: 'MFA coverage', value: I.mfa_pct, threshold: 95, breached: I.mfa_pct < 95, unit: '%' },
      { kri: 'Phishing failure rate', value: I.phishing_pct, threshold: 5, breached: I.phishing_pct > 5, unit: '%' },
    ],
  };
}

// --- Board ------------------------------------------------------------------
function computeBoard(I, agg, cfo) {
  const insuredPct = cfo.grossExp > 0 ? r0(cfo.insLimit / cfo.grossExp * 100) : 0;
  return {
    netExposure: cfo.netExp, grossExposure: cfo.grossExp, insuredPct,
    postureScore: postureScore(I), controlEffectiveness: agg.controlEffectiveness,
    criticalRisks: agg.critical, rosi: cfo.rosi, rbcRatioPost: cfo.rbcRatioPost, rbcStatus: cfo.rbcStatus,
    // CFO breakdown so the Board financial tab is DB-driven from one call
    breachRespM: cfo.breachRespM, regulatoryM: cfo.regulatoryM, fraudM: cfo.fraudM,
    reputM: cfo.reputM, interruptM: cfo.interruptM, legalM: cfo.legalM, recoveryM: cfo.recoveryM,
    insLimitM: Math.round(cfo.insLimit / 1e6),
  };
}

async function computeRole(role, orgId) {
  const I = await loadInputs(orgId);
  const agg = await loadAggregates(orgId);
  const cfo = computeCFO(I);
  switch (role) {
    case 'cfo': return cfo;
    case 'ciso': return computeCISO(I, agg);
    case 'cro': return computeCRO(I, agg);
    case 'board': return computeBoard(I, agg, cfo);
    default: throw new Error('Unknown role');
  }
}

module.exports = {
  loadInputs, loadAggregates, computeCFO, computeCISO, computeCRO, computeBoard,
  computeRole, postureScore, cmmiLevel, SETUP_FIELD_MAP, parseSetupNumber,
};
