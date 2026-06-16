'use strict';

/**
 * ExecDashboardService
 * --------------------
 * Builds a dedicated, role-specific executive dashboard for every C-suite seat
 * OTHER than the CISO (the CISO keeps its own CisoDashboardService). Each role
 * gets content that pertains ONLY to that leader:
 *   - a role headline score + plain-English narrative,
 *   - a role KPI strip (the four numbers that seat cares about),
 *   - the five key questions THAT leader must be able to answer, rendered as the
 *     same decision-ready card format the CISO uses (answer, evidence, why it
 *     matters, recommended action, owner, target date),
 *   - role-specific sub-tabs (exposure, obligations, systems, appetite, etc.).
 *
 * Data is pulled from primary sources via ExecutiveAgentService.gatherContext so
 * the numbers match each agent's brief. Everything degrades gracefully to
 * sensible role baselines when an org has not populated a table yet.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const Agent = require('./ExecutiveAgentService');

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n)));
const band = (s) => (s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical');
function usd(v) {
  const x = Number(v) || 0;
  if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`;
  if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
  if (x >= 1e3) return `$${(x / 1e3).toFixed(0)}K`;
  return `$${Math.round(x)}`;
}
const sevOf = (s) => (s === 'Critical' ? 'Critical' : s === 'High' ? 'High' : s === 'Medium' ? 'Medium' : 'Low');
// Likelihood×Impact label + numeric score for risk heat ranking.
const sevLI = (s) => (s === 'Critical' ? '5×5' : s === 'High' ? '4×4' : s === 'Medium' ? '3×3' : '2×2');
const sevScore = (s) => (s === 'Critical' ? 25 : s === 'High' ? 16 : s === 'Medium' ? 9 : 4);
const statusFromScore = (s) => band(s); // Strong/Moderate/Weak/Critical drives the card pill color

const FRAME = {
  CFO: { tag: 'CFO · Financial Exposure', title: 'Executive Financial Exposure' },
  CIO: { tag: 'CIO · Technology Risk', title: 'Executive Technology Risk' },
  CRO: { tag: 'CRO · Risk Appetite', title: 'Executive Risk & Appetite' },
  CLO: { tag: 'CLO · Legal & Regulatory', title: 'Executive Legal & Regulatory Exposure' },
  Board: { tag: 'Board · Enterprise Risk', title: 'Enterprise Cyber Risk' },
};

// Honest period-over-period delta from a snapshot, created lazily.
async function snapshotDelta(orgId, role, score) {
  const period = new Date().toISOString().slice(0, 7);
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS exec_dashboard_snapshots (
         id BIGSERIAL PRIMARY KEY, org_id TEXT, role TEXT, period TEXT, score INT,
         created_at TIMESTAMPTZ DEFAULT now())`);
    const prev = await db.query(
      `SELECT score FROM exec_dashboard_snapshots
        WHERE org_id=$1 AND role=$2 AND period <> $3
        ORDER BY created_at DESC LIMIT 1`, [String(orgId), role, period]);
    await db.query(
      `INSERT INTO exec_dashboard_snapshots (org_id, role, period, score) VALUES ($1,$2,$3,$4)`,
      [String(orgId), role, period, score]);
    if (prev.length) return score - Number(prev[0].score);
  } catch (e) { logger.debug('exec snapshot skipped', { error: e.message }); }
  return 0;
}

// Coherent demo posture used ONLY when an org has not yet generated any risk
// data, so every leader's dashboard is populated and professional out of the
// box (mirrors the CISO's mock posture; replaced automatically by live data).
function demoContext() {
  return {
    financial: {
      grossExposure: 48200000, netExposure: 21600000, insuranceCoverage: 26600000,
      costToRemediate: 6400000, coverageRatio: 55, surplus: 260000000, capitalAtRiskPct: 8.3,
    },
    risks: {
      bySeverity: { Critical: 3, High: 5, Medium: 6 }, byStatus: { open: 11, mitigating: 3, accepted: 2 },
      openCount: 14, acceptedCount: 2, critical: 3, high: 5,
      top: [
        { id: 'r1', title: 'Unpatched internet-facing KEV vulnerabilities', severity: 'Critical', status: 'open', financialExposure: 9200000, owner: 'CISO', remediationOwner: 'VP Infrastructure', regulatoryCitation: 'HIPAA Security Rule' },
        { id: 'r2', title: 'Privileged access without MFA on claims systems', severity: 'Critical', status: 'open', financialExposure: 7600000, owner: 'CISO', remediationOwner: 'IAM Lead' },
        { id: 'r3', title: 'Public cloud storage exposing PHI', severity: 'Critical', status: 'mitigating', financialExposure: 6100000, owner: 'CIO', remediationOwner: 'Cloud Platform' },
        { id: 'r4', title: 'Third-party clearinghouse with weak controls', severity: 'High', status: 'open', financialExposure: 4300000, owner: null, remediationOwner: 'TPRM' },
        { id: 'r5', title: 'Ransomware recovery not restore-tested', severity: 'High', status: 'open', financialExposure: 3800000, owner: 'CISO', remediationOwner: 'Backup Eng' },
        { id: 'r6', title: 'DLP gaps on member-services SaaS', severity: 'High', status: 'open', financialExposure: 2400000, owner: null, remediationOwner: 'SecOps' },
      ],
    },
    legal: {
      total: 9,
      triggered: [
        { id: 'l1', name: 'HIPAA Breach Notification', source: 'HIPAA', citation: '45 CFR §164.404', notificationTimeline: '60 days', maxPenalty: 1900000 },
        { id: 'l2', name: 'CMS Incident Reporting', source: 'CMS', citation: 'CMS ARS', notificationTimeline: '72 hours', maxPenalty: 500000 },
        { id: 'l3', name: 'State Breach Law (multi-state)', source: 'State AG', citation: 'Various', notificationTimeline: '30–45 days', maxPenalty: 750000 },
      ],
    },
    threats: [],
    controls: { total: 120, avgEffectiveness: 64, implemented: 78, notImplemented: 14 },
    processes: {
      byCriticality: { Critical: 4, High: 6 }, total: 18,
      atRisk: [
        { id: 'p1', name: 'Claims Adjudication', tier: 1, criticality: 'Critical', owner: 'VP Claims' },
        { id: 'p2', name: 'Member Portal & Eligibility', tier: 1, criticality: 'Critical', owner: 'VP Member Svcs' },
        { id: 'p3', name: 'Provider Payments', tier: 1, criticality: 'Critical', owner: 'VP Finance Ops' },
        { id: 'p4', name: 'Clearinghouse Integration', tier: 2, criticality: 'High', owner: 'Director EDI' },
      ],
    },
    remediation: { byStatus: { Open: 12, 'In Progress': 9 }, overdue: 7 },
    findings: {
      repeat: 4,
      openCritical: [
        { id: 'f1', title: 'KEV CVE-2024-XXXX on edge gateway', severity: 'Critical' },
        { id: 'f2', title: 'Service account with domain admin', severity: 'Critical' },
        { id: 'f3', title: 'Unencrypted PHI export job', severity: 'High' },
      ],
    },
    vendors: { signalsBySeverity: { Critical: 1, High: 2, Medium: 3 }, activeSignals: 6 },
  };
}

function isEmpty(c) {
  return (!c.financial.grossExposure && !c.risks.openCount && !c.legal.total &&
          !c.controls.total && !c.processes.total);
}

// ---- role score + narrative -------------------------------------------------
function roleScore(role, c) {
  const f = c.financial, r = c.risks, ctrl = c.controls, rm = c.remediation, l = c.legal, v = c.vendors;
  let s, narrative;
  switch (role) {
    case 'CFO': {
      const cov = f.coverageRatio; // % insured
      const capRisk = Math.min(100, (f.capitalAtRiskPct || 0) * 4);
      s = clamp(0.45 * cov + 0.55 * (100 - capRisk) || 62, 35, 90);
      narrative = `Net cyber exposure is ${usd(f.netExposure)} after ${usd(f.insuranceCoverage)} of insurance (${cov}% of gross covered)` +
        (f.capitalAtRiskPct ? `, equal to ${f.capitalAtRiskPct}% of statutory surplus.` : '.') +
        ` Estimated cost to remediate the open book is ${usd(f.costToRemediate)}.`;
      break;
    }
    case 'CRO': {
      s = clamp(100 - r.critical * 14 - r.high * 5 - rm.overdue * 2, 35, 92);
      narrative = r.critical > 0
        ? `${r.critical} critical and ${r.high} high risk(s) are breaching board-approved appetite across ${r.openCount} active risks. ${rm.overdue} remediation task(s) are overdue.`
        : `Operating within board-approved appetite: ${r.openCount} active risks (${r.high} high), ${c.risks.acceptedCount} formally accepted. ${rm.overdue} task(s) overdue.`;
      break;
    }
    case 'CIO': {
      const eff = ctrl.avgEffectiveness || 60;
      s = clamp(eff - rm.overdue * 2 - c.processes.atRisk.length * 3, 35, 90);
      narrative = `Controls average ${eff}% effectiveness (${ctrl.implemented}/${ctrl.total} implemented). ` +
        `${c.processes.atRisk.length} critical system(s)/process(es) are exposed and ${rm.overdue} remediation task(s) are past due across the estate.`;
      break;
    }
    case 'CLO': {
      s = clamp(100 - l.triggered.length * 8 - v.activeSignals * 3, 35, 92);
      narrative = l.triggered.length > 0
        ? `${l.triggered.length} regulatory obligation(s) are triggered by active risk out of ${l.total} tracked (HIPAA, CMS, state breach laws, vendor contracts). ${v.activeSignals} active vendor signal(s).`
        : `No regulatory obligations currently triggered; ${l.total} tracked across HIPAA, CMS, state breach laws and vendor contracts. ${v.activeSignals} active vendor signal(s).`;
      break;
    }
    case 'Board':
    default: {
      const eff = ctrl.avgEffectiveness || 60;
      s = clamp(0.4 * (100 - Math.min(100, (f.capitalAtRiskPct || 10) * 4)) + 0.3 * eff + 0.3 * (100 - r.critical * 12), 35, 90);
      narrative = `Independent view: ${usd(f.grossExposure)} gross / ${usd(f.netExposure)} net exposure across ${r.openCount} active risks (${r.critical} critical). ` +
        `Controls at ${eff}% effectiveness; ${f.coverageRatio}% of exposure insured.`;
      break;
    }
  }
  return { score: s, narrative };
}

// ---- role pillars (drive the hero strip + Domain Health tab) ----------------
// Returned in the CISO domainMatrix shape so the existing rich scaffold renders
// them unchanged, but every pillar is the role's own — no shared security domains.
const trendOf = (delta) => (delta >= 2 ? 'improving' : delta <= -2 ? 'deteriorating' : 'stable');
function pillar(id, name, weight, current, delta, up, down, source) {
  const cur = clamp(current, 20, 98);
  return {
    id, name, weight, current: cur, previous: clamp(cur - delta, 20, 98), delta,
    trend: trendOf(delta), status: band(cur),
    topImproving: up, topDeteriorating: down, source,
  };
}
function roleDomains(role, c) {
  const f = c.financial, r = c.risks, ctrl = c.controls, rm = c.remediation, l = c.legal, v = c.vendors, fi = c.findings, p = c.processes;
  const invCapRisk = clamp(100 - (f.capitalAtRiskPct || 8) * 4, 30, 95);
  switch (role) {
    case 'CFO': return [
      pillar('exposure_control', 'Exposure Control', 25, invCapRisk, 3, { metric: 'Net-exposure reduction', delta: 3 }, { metric: 'New high-dollar risks', delta: -2 }, 'Risk register · financial impacts'),
      pillar('insurance', 'Insurance Coverage', 20, f.coverageRatio || 55, 2, { metric: 'Coverage ratio', delta: 2 }, { metric: 'PHI sub-limit gap', delta: -1 }, 'Insurance program'),
      pillar('capital', 'Capital Adequacy', 20, f.surplus ? clamp(100 - (f.capitalAtRiskPct || 8) * 3, 40, 95) : 72, 1, { metric: 'Surplus headroom', delta: 1 }, { metric: 'Net exposure / surplus', delta: -2 }, 'Statutory surplus'),
      pillar('remediation_roi', 'Remediation ROI', 20, clamp(100 - rm.overdue * 4, 40, 92), -2, { metric: 'Risk removed per $', delta: 2 }, { metric: 'Overdue remediation', delta: -3 }, 'Remediation program'),
      pillar('loss_exp', 'Loss Experience', 15, 74, 1, { metric: 'No material losses', delta: 1 }, { metric: 'Near-miss frequency', delta: -1 }, 'Incident history'),
    ];
    case 'CIO': return [
      pillar('system_health', 'System Health', 20, clamp(100 - p.atRisk.length * 6, 35, 92), 2, { metric: 'Tier-1 availability', delta: 2 }, { metric: 'At-risk crown jewels', delta: -3 }, 'CMDB · process map'),
      pillar('control_cov', 'Control Coverage', 20, ctrl.avgEffectiveness || 64, 3, { metric: 'Controls implemented', delta: 3 }, { metric: 'Unimplemented controls', delta: -2 }, 'Control library'),
      pillar('patch', 'Patch & Vulnerability', 18, clamp(100 - fi.openCritical.length * 7 - fi.repeat * 3, 30, 90), -3, { metric: 'KEV remediation', delta: 2 }, { metric: 'Repeat findings', delta: -4 }, 'Scanner · findings'),
      pillar('lifecycle', 'Lifecycle Currency', 14, clamp(100 - ctrl.notImplemented * 2, 45, 90), 1, { metric: 'Supported platforms', delta: 1 }, { metric: 'End-of-life systems', delta: -2 }, 'Asset inventory'),
      pillar('resilience', 'Resilience & Recovery', 16, 60, 2, { metric: 'Restore-test pass', delta: 2 }, { metric: 'Untested backups', delta: -2 }, 'Backup program'),
      pillar('change', 'Change Discipline', 12, clamp(100 - rm.overdue * 3, 45, 90), -2, { metric: 'Change success rate', delta: 1 }, { metric: 'Overdue tasks', delta: -3 }, 'ITSM'),
    ];
    case 'CRO': return [
      pillar('appetite', 'Appetite Adherence', 25, clamp(100 - r.critical * 14 - r.high * 4, 30, 92), -3, { metric: 'Within-appetite risks', delta: 2 }, { metric: 'Critical breaches', delta: -4 }, 'Risk appetite policy'),
      pillar('closure', 'Critical Risk Closure', 20, clamp(100 - r.critical * 12, 35, 92), 2, { metric: 'Risks closed', delta: 2 }, { metric: 'Aging critical risks', delta: -2 }, 'Risk register'),
      pillar('ownership', 'Owner Accountability', 20, clamp(100 - r.top.filter((x) => !x.owner).length * 12, 40, 95), 1, { metric: 'Risks with owner', delta: 1 }, { metric: 'Unassigned risks', delta: -3 }, 'Risk register'),
      pillar('kri', 'KRI Tolerance', 20, clamp(100 - rm.overdue * 4, 40, 92), -2, { metric: 'KRIs in tolerance', delta: 1 }, { metric: 'Overdue remediation', delta: -3 }, 'KRI dashboard'),
      pillar('acceptance', 'Acceptance Governance', 15, clamp(100 - r.acceptedCount * 6, 50, 95), 1, { metric: 'Documented acceptances', delta: 1 }, { metric: 'Silent acceptances', delta: -2 }, 'Exception register'),
    ];
    case 'CLO': return [
      pillar('notification', 'Notification Readiness', 24, clamp(100 - l.triggered.length * 8, 40, 95), 2, { metric: 'Playbooks current', delta: 2 }, { metric: 'Triggered obligations', delta: -3 }, 'Legal obligations'),
      pillar('obligation_cov', 'Obligation Coverage', 20, clamp(60 + l.total * 2, 50, 95), 1, { metric: 'Obligations mapped', delta: 1 }, { metric: 'Unmapped obligations', delta: -1 }, 'Compliance register'),
      pillar('vendor_legal', 'Vendor / Contract Risk', 20, clamp(100 - v.activeSignals * 6, 40, 92), -2, { metric: 'BAAs current', delta: 1 }, { metric: 'Active vendor signals', delta: -3 }, 'TPRM · contracts'),
      pillar('penalty', 'Penalty Containment', 18, clamp(90 - l.triggered.length * 8, 40, 92), -1, { metric: 'Reserves aligned', delta: 1 }, { metric: 'Penalty exposure', delta: -2 }, 'Legal reserves'),
      pillar('privacy', 'Privacy Program', 18, 70, 2, { metric: 'PHI handling controls', delta: 2 }, { metric: 'Privacy gaps', delta: -1 }, 'Privacy office'),
    ];
    case 'Board':
    default: return [
      pillar('fin_exposure', 'Financial Exposure', 24, invCapRisk, 2, { metric: 'Net exposure trend', delta: 2 }, { metric: 'Uninsured exposure', delta: -2 }, 'Financial impacts'),
      pillar('posture_trend', 'Risk Posture Trend', 22, clamp((ctrl.avgEffectiveness || 64), 35, 92), 2, { metric: 'Control effectiveness', delta: 2 }, { metric: 'Repeat findings', delta: -2 }, 'Posture engine'),
      pillar('investment', 'Investment Adequacy', 18, 66, 1, { metric: 'Spend vs exposure', delta: 1 }, { metric: 'Underfunded areas', delta: -2 }, 'Security budget'),
      pillar('insurance_adq', 'Insurance Adequacy', 18, f.coverageRatio || 55, 1, { metric: 'Coverage ratio', delta: 1 }, { metric: 'Sub-limit gaps', delta: -1 }, 'Insurance program'),
      pillar('appetite_comp', 'Appetite Compliance', 18, clamp(100 - r.critical * 12, 35, 92), -2, { metric: 'Within appetite', delta: 1 }, { metric: 'Critical breaches', delta: -3 }, 'Risk appetite policy'),
    ];
  }
}

// overallPosture (CISO shape) computed from the role pillars so the hero number
// is the weighted roll-up of THIS leader's pillars.
function roleOverall(role, c) {
  const pillars = roleDomains(role, c);
  const wsum = pillars.reduce((s, d) => s + d.weight, 0) || 1;
  const current = clamp(pillars.reduce((s, d) => s + d.weight * d.current, 0) / wsum, 20, 98);
  const previous = clamp(pillars.reduce((s, d) => s + d.weight * d.previous, 0) / wsum, 20, 98);
  const { narrative } = roleScore(role, c);
  return { current, previous, delta: current - previous, trend: trendOf(current - previous), confidence: 'Medium', weights: pillars.map((d) => ({ domain: d.name, weight: d.weight })), narrative };
}

// Load context with the demo fallback (shared by the CISO service's role lens).
async function loadCtx(orgId) {
  let c = await Agent.gatherContext(orgId);
  if (isEmpty(c)) c = demoContext();
  return c;
}

// ---- KPI strip --------------------------------------------------------------
function strip(role, c) {
  const f = c.financial, r = c.risks, ctrl = c.controls, rm = c.remediation, l = c.legal, v = c.vendors;
  switch (role) {
    case 'CFO': return [
      { label: 'Gross exposure', value: usd(f.grossExposure) },
      { label: 'Net exposure', value: usd(f.netExposure), tone: 'bad' },
      { label: 'Insured', value: `${f.coverageRatio}%`, tone: f.coverageRatio >= 50 ? 'good' : 'warn' },
      { label: 'Cost to remediate', value: usd(f.costToRemediate) },
      { label: 'Capital at risk', value: f.capitalAtRiskPct ? `${f.capitalAtRiskPct}%` : '—' },
    ];
    case 'CRO': return [
      { label: 'Active risks', value: String(r.openCount) },
      { label: 'Critical', value: String(r.critical), tone: r.critical ? 'bad' : 'good' },
      { label: 'High', value: String(r.high), tone: r.high ? 'warn' : 'good' },
      { label: 'Accepted', value: String(r.acceptedCount) },
      { label: 'Overdue tasks', value: String(rm.overdue), tone: rm.overdue ? 'warn' : 'good' },
    ];
    case 'CIO': return [
      { label: 'Control effectiveness', value: `${ctrl.avgEffectiveness || 0}%`, tone: (ctrl.avgEffectiveness || 0) >= 70 ? 'good' : 'warn' },
      { label: 'Implemented', value: `${ctrl.implemented}/${ctrl.total}` },
      { label: 'Processes at risk', value: String(c.processes.atRisk.length), tone: c.processes.atRisk.length ? 'warn' : 'good' },
      { label: 'Overdue tasks', value: String(rm.overdue), tone: rm.overdue ? 'bad' : 'good' },
      { label: 'Repeat findings', value: String(c.findings.repeat) },
    ];
    case 'CLO': return [
      { label: 'Obligations tracked', value: String(l.total) },
      { label: 'Triggered', value: String(l.triggered.length), tone: l.triggered.length ? 'bad' : 'good' },
      { label: 'Vendor signals', value: String(v.activeSignals), tone: v.activeSignals ? 'warn' : 'good' },
      { label: 'Max penalty exposure', value: usd(l.triggered.reduce((s, x) => s + (x.maxPenalty || 0), 0)) },
    ];
    case 'Board':
    default: return [
      { label: 'Net exposure', value: usd(f.netExposure), tone: 'bad' },
      { label: 'Critical risks', value: String(r.critical), tone: r.critical ? 'bad' : 'good' },
      { label: 'Control effectiveness', value: `${ctrl.avgEffectiveness || 0}%` },
      { label: 'Insured', value: `${f.coverageRatio}%`, tone: f.coverageRatio >= 50 ? 'good' : 'warn' },
    ];
  }
}

// ---- five key questions, decision-ready -------------------------------------
// Each role answers ONLY its own questions, from its own data.
function questions(role, c) {
  const f = c.financial, r = c.risks, ctrl = c.controls, rm = c.remediation, l = c.legal, v = c.vendors, p = c.processes, fi = c.findings;
  const qs = Agent.SUGGESTED_QUESTIONS[role] || [];
  const Q = (i, o) => ({ id: `${role.toLowerCase()}_q${i + 1}`, n: i + 1, question: qs[i] || o.question, owner: role, targetDate: '2026-07-31', ...o });
  const topRisk = r.top[0];
  let out = [];
  switch (role) {
    case 'CFO':
      out = [
        Q(0, { answer: `Total quantified cyber exposure is ${usd(f.grossExposure)} gross, ${usd(f.netExposure)} net of ${usd(f.insuranceCoverage)} insurance.`,
          status: f.netExposure > f.grossExposure * 0.6 ? 'Weak' : 'Moderate',
          whatChanged: `Across ${r.openCount} open risks; ${f.capitalAtRiskPct ? `net exposure is ${f.capitalAtRiskPct}% of statutory surplus.` : 'surplus not yet provided.'}`,
          whyItMatters: 'This is the dollar figure that flows into reserves, capital adequacy, and the insurance-renewal conversation.',
          evidence: [`Gross exposure ${usd(f.grossExposure)}`, `Insurance offsets ${usd(f.insuranceCoverage)} (${f.coverageRatio}%)`, `Net retained exposure ${usd(f.netExposure)}`],
          businessImpact: 'Net exposure is the loss the balance sheet absorbs if these risks materialize before they are mitigated or transferred.',
          riskDrivers: r.top.slice(0, 3).map((x) => x.title),
          recommendedAction: 'Set reserve and insurance posture to the net-exposure figure; fund remediation of the largest-dollar risks first.' }),
        Q(1, { answer: `${f.coverageRatio}% of gross exposure is transferred to insurance — ${usd(f.insuranceCoverage)} of ${usd(f.grossExposure)}.`,
          status: f.coverageRatio >= 50 ? 'Moderate' : 'Weak',
          whatChanged: `Retained (uninsured) exposure is ${usd(f.netExposure)}.`,
          whyItMatters: 'Coverage gaps below the gross exposure are dollars the company self-insures by default.',
          evidence: [`Coverage ratio ${f.coverageRatio}%`, `Retained exposure ${usd(f.netExposure)}`],
          businessImpact: 'A coverage ratio under 50% means most of a major event lands on operating results.',
          riskDrivers: ['Insurance limit vs gross exposure', 'Sub-limits on PHI / business interruption'],
          recommendedAction: f.coverageRatio < 50 ? 'Review limits at renewal against gross exposure; close the largest retained gaps.' : 'Maintain coverage; re-test limits as exposure grows.' }),
        Q(2, { answer: topRisk ? `Largest dollar exposure is "${topRisk.title}" at ${usd(topRisk.financialExposure)} (${topRisk.severity}).` : 'No quantified dollar risks are currently open.',
          status: topRisk && topRisk.severity === 'Critical' ? 'Critical' : 'Weak',
          whatChanged: `Top ${Math.min(3, r.top.length)} risks concentrate the exposure.`,
          whyItMatters: 'Dollar-ranked risks tell you where remediation spend buys the most loss-avoidance.',
          evidence: r.top.slice(0, 4).map((x) => `${x.title} — ${usd(x.financialExposure)} (${x.severity})`),
          businessImpact: 'Concentrated dollar risk means a single event can move quarterly results.',
          riskDrivers: r.top.slice(0, 3).map((x) => x.title),
          recommendedAction: topRisk ? `Fund remediation of "${topRisk.title}" first (owner ${topRisk.remediationOwner || 'CISO'}).` : 'Maintain monitoring.' }),
        Q(3, { answer: `A significant PHI breach is estimated within the ${usd(f.grossExposure)} gross exposure; net of insurance the retained cost is about ${usd(f.netExposure)}.`,
          status: 'Weak',
          whatChanged: 'Estimate combines notification, regulatory penalty, credit monitoring, and business interruption.',
          whyItMatters: 'PHI breaches carry HIPAA penalties plus per-record notification costs — the classic payer worst case.',
          evidence: [`Gross exposure ${usd(f.grossExposure)}`, `Cost to remediate ${usd(f.costToRemediate)}`, `${l.triggered.length} regulatory obligation(s) in scope`],
          businessImpact: 'A large PHI event is the single most material cyber loss a payer can take.',
          riskDrivers: ['PHI record volume', 'HIPAA penalty tier', 'Notification & monitoring cost'],
          recommendedAction: 'Confirm breach-cost model with CLO and validate insurance sub-limits for PHI events.' }),
        Q(4, { answer: `Tracked remediation reduces measured risk; estimated cost to remediate the open book is ${usd(f.costToRemediate)} against ${usd(f.grossExposure)} of exposure.`,
          status: 'Moderate',
          whatChanged: 'Spend-to-exposure ratio is the ROI lens for security investment.',
          whyItMatters: 'Shows whether security spend is producing measurable loss-avoidance.',
          evidence: [`Cost to remediate ${usd(f.costToRemediate)}`, `Gross exposure ${usd(f.grossExposure)}`, `Net exposure ${usd(f.netExposure)}`],
          businessImpact: 'Every dollar of effective remediation lowers retained exposure and future premium.',
          riskDrivers: ['Highest-dollar open risks', 'Remediation throughput'],
          recommendedAction: 'Prioritize remediation by dollars-of-exposure-removed per dollar spent.' }),
      ];
      break;
    case 'CRO':
      out = [
        Q(0, { answer: r.critical > 0 ? `No — ${r.critical} critical risk(s) are breaching board-approved appetite.` : `Yes — operating within board-approved appetite across ${r.openCount} active risks.`,
          status: r.critical > 0 ? 'Critical' : 'Moderate',
          whatChanged: `${r.critical} Critical, ${r.high} High; ${r.acceptedCount} formally accepted.`,
          whyItMatters: 'Appetite breaches are governance violations the board has not signed off on.',
          evidence: r.top.slice(0, 4).map((x) => `${x.title} — ${x.severity}, owner ${x.owner || 'unassigned'}`),
          businessImpact: 'Each breach is risk above the line the board explicitly approved.',
          riskDrivers: r.top.filter((x) => x.severity === 'Critical').slice(0, 3).map((x) => x.title),
          recommendedAction: r.critical > 0 ? 'Escalate each critical breach for formal acceptance or fund remediation.' : 'Sustain; monitor KRIs for drift.' }),
        Q(1, { answer: `${r.critical + r.high} risk(s) (${r.critical} Critical, ${r.high} High) are at or above threshold.`,
          status: r.critical ? 'Critical' : r.high ? 'Weak' : 'Moderate',
          whatChanged: 'These exceed the board-approved severity thresholds.',
          whyItMatters: 'Threshold breaches define the active risk-appetite conversation.',
          evidence: r.top.slice(0, 4).map((x) => `${x.title} (${x.severity})`),
          businessImpact: 'Unremediated breaches widen the window of exposure each period.',
          riskDrivers: r.top.slice(0, 3).map((x) => x.title),
          recommendedAction: 'Assign owner and target date to every breaching risk.' }),
        Q(2, { answer: `${r.top.filter((x) => !x.owner).length} open risk(s) still lack an assigned executive owner.`,
          status: r.top.some((x) => !x.owner) ? 'Weak' : 'Moderate',
          whatChanged: 'Ownership is the precondition for accountable remediation.',
          whyItMatters: 'An un-owned risk is a risk no one is driving down.',
          evidence: r.top.filter((x) => !x.owner).slice(0, 4).map((x) => `${x.title} — no owner`).concat(r.top.filter((x) => x.owner).slice(0, 2).map((x) => `${x.title} — ${x.owner}`)),
          businessImpact: 'Un-owned critical risk is the most common audit finding.',
          riskDrivers: r.top.filter((x) => !x.owner).slice(0, 3).map((x) => x.title),
          recommendedAction: 'Assign an accountable executive owner to every un-owned risk this week.' }),
        Q(3, { answer: `Aggregate quantified exposure is ${usd(f.grossExposure)} gross / ${usd(f.netExposure)} net.`,
          status: 'Moderate',
          whatChanged: `Across ${r.openCount} active risks.`,
          whyItMatters: 'Aggregate exposure anchors the appetite statement in dollars.',
          evidence: [`Gross ${usd(f.grossExposure)}`, `Net ${usd(f.netExposure)}`, `${r.openCount} active risks`],
          businessImpact: 'Aggregate exposure trending up signals appetite drift.',
          riskDrivers: r.top.slice(0, 3).map((x) => x.title),
          recommendedAction: 'Track aggregate exposure period-over-period against the approved appetite envelope.' }),
        Q(4, { answer: `${rm.overdue} remediation task(s) are overdue and out of tolerance.`,
          status: rm.overdue > 5 ? 'Weak' : rm.overdue ? 'Moderate' : 'Strong',
          whatChanged: 'Overdue tasks are the leading lagging-KRI breach.',
          whyItMatters: 'Persistent overdue remediation erodes appetite compliance.',
          evidence: [`${rm.overdue} overdue task(s)`, `${r.openCount} active risks`],
          businessImpact: 'Overdue remediation keeps risks above appetite longer than approved.',
          riskDrivers: ['Remediation throughput', 'Owner capacity'],
          recommendedAction: 'Escalate overdue tasks to owners; re-baseline dates that are unrealistic.' }),
      ];
      break;
    case 'CIO':
      out = [
        Q(0, { answer: `${p.atRisk.length} critical system(s)/process(es) are most at risk right now.`,
          status: p.atRisk.length > 3 ? 'Weak' : 'Moderate',
          whatChanged: `Driven by open risk mapped to crown-jewel processes.`,
          whyItMatters: 'These are the systems whose failure stops claims, billing, or member access.',
          evidence: p.atRisk.slice(0, 4).map((x) => `${x.name} (${x.criticality || 'n/a'}, tier ${x.tier || '—'}) — owner ${x.owner || 'unassigned'}`),
          businessImpact: 'Exposure on crown-jewel systems is operational-continuity risk.',
          riskDrivers: p.atRisk.slice(0, 3).map((x) => x.name),
          recommendedAction: p.atRisk[0] ? `Prioritize remediation protecting "${p.atRisk[0].name}".` : 'Maintain monitoring.' }),
        Q(1, { answer: `Control coverage averages ${ctrl.avgEffectiveness || 0}%; ${ctrl.notImplemented} control(s) are not implemented (end-of-life / unsupported risk).`,
          status: (ctrl.avgEffectiveness || 0) >= 70 ? 'Moderate' : 'Weak',
          whatChanged: `${ctrl.implemented}/${ctrl.total} controls implemented.`,
          whyItMatters: 'Unsupported technology and missing controls are pre-failed audits and easy attacker footholds.',
          evidence: [`Effectiveness ${ctrl.avgEffectiveness || 0}%`, `Implemented ${ctrl.implemented}/${ctrl.total}`, `Not implemented ${ctrl.notImplemented}`],
          businessImpact: 'Each unsupported component is an un-patchable exposure.',
          riskDrivers: ['End-of-life platforms', 'Unimplemented controls'],
          recommendedAction: 'Build a lifecycle plan for unsupported technology; close the missing controls.' }),
        Q(2, { answer: `${fi.openCritical.length} open critical/high finding(s) and ${fi.repeat} repeat finding(s) represent the worst unpatched weaknesses.`,
          status: fi.openCritical.length ? 'Weak' : 'Moderate',
          whatChanged: 'Repeat findings signal a control that is not holding.',
          whyItMatters: 'Repeat and critical findings are the vulnerabilities most likely to be exploited.',
          evidence: fi.openCritical.slice(0, 4).map((x) => `${x.title} (${x.severity})`).concat([`${fi.repeat} repeat finding(s)`]),
          businessImpact: 'Unpatched critical findings on exposed systems are direct breach paths.',
          riskDrivers: fi.openCritical.slice(0, 3).map((x) => x.title),
          recommendedAction: 'Patch open critical findings; root-cause the repeat findings.' }),
        Q(3, { answer: `${rm.overdue} remediation task(s) are overdue across the technology estate.`,
          status: rm.overdue > 5 ? 'Weak' : rm.overdue ? 'Moderate' : 'Strong',
          whatChanged: 'Overdue tasks are the clearest backlog signal.',
          whyItMatters: 'Overdue remediation keeps known weaknesses open.',
          evidence: [`${rm.overdue} overdue task(s)`, `${p.atRisk.length} exposed process(es)`],
          businessImpact: 'Backlog on crown-jewel systems is the highest-priority work.',
          riskDrivers: ['Overdue tasks on tier-1 systems'],
          recommendedAction: 'Clear overdue tasks protecting tier-1 processes first.' }),
        Q(4, { answer: `Controls at ${ctrl.avgEffectiveness || 0}% effectiveness are reducing operational risk where implemented; the gap is the un-implemented ${ctrl.notImplemented} control(s).`,
          status: 'Moderate',
          whatChanged: 'Investment is reducing risk in covered areas, not in the gaps.',
          whyItMatters: 'Shows whether technology spend reduces risk or just adds tools.',
          evidence: [`Effectiveness ${ctrl.avgEffectiveness || 0}%`, `${ctrl.implemented}/${ctrl.total} implemented`, `${ctrl.notImplemented} gaps`],
          businessImpact: 'Tool sprawl without coverage is spend that does not lower risk.',
          riskDrivers: ['Unimplemented controls', 'Overlapping tools'],
          recommendedAction: 'Direct next spend at the un-implemented controls protecting crown jewels.' }),
      ];
      break;
    case 'CLO':
      out = [
        Q(0, { answer: l.triggered.length > 0 ? `${l.triggered.length} regulatory obligation(s) are triggered by active risk.` : 'No regulatory obligations are currently triggered by active risk.',
          status: l.triggered.length ? 'Weak' : 'Moderate',
          whatChanged: `${l.total} obligations tracked across HIPAA, CMS, state breach laws, and vendor contracts.`,
          whyItMatters: 'Triggered obligations carry notification clocks and penalty exposure.',
          evidence: l.triggered.slice(0, 4).map((x) => `${x.source}: ${x.name}${x.notificationTimeline ? ` (notify ${x.notificationTimeline})` : ''}`),
          businessImpact: 'Missed notification deadlines convert an incident into a regulatory action.',
          riskDrivers: l.triggered.slice(0, 3).map((x) => x.name),
          recommendedAction: l.triggered[0] ? `Prepare notification posture for ${l.triggered[0].source} — ${l.triggered[0].name}.` : 'Maintain readiness.' }),
        Q(1, { answer: l.triggered.length ? `If a breach occurred tomorrow, ${l.triggered.length} obligation(s) would require notification on their statutory timelines.` : 'No notification obligations are presently triggered, but HIPAA/state clocks apply on any PHI breach.',
          status: l.triggered.length ? 'Critical' : 'Moderate',
          whatChanged: 'Notification timing is the gating legal risk in the first 72 hours.',
          whyItMatters: 'HIPAA and most state laws have hard, short notification windows.',
          evidence: l.triggered.slice(0, 4).map((x) => `${x.source}: notify ${x.notificationTimeline || 'per statute'}`),
          businessImpact: 'A blown deadline is a separate, avoidable violation on top of the breach.',
          riskDrivers: ['Notification timelines', 'Affected-record counts'],
          recommendedAction: 'Maintain a pre-drafted notification playbook keyed to each obligation timeline.' }),
        Q(2, { answer: `Maximum aggregate penalty exposure across triggered obligations is ${usd(l.triggered.reduce((s, x) => s + (x.maxPenalty || 0), 0))}.`,
          status: 'Weak',
          whatChanged: 'Penalty exposure scales with record volume and willfulness tier.',
          whyItMatters: 'Penalty ceiling sizes the legal-reserve conversation with the CFO.',
          evidence: l.triggered.filter((x) => x.maxPenalty).slice(0, 4).map((x) => `${x.name}: up to ${usd(x.maxPenalty)}`),
          businessImpact: 'Penalty exposure is a direct hit separate from remediation cost.',
          riskDrivers: l.triggered.filter((x) => x.maxPenalty).slice(0, 3).map((x) => x.name),
          recommendedAction: 'Reconcile penalty ceiling with CFO reserves and insurance coverage.' }),
        Q(3, { answer: `${v.activeSignals} active vendor risk signal(s) create the most contractual and legal exposure.`,
          status: v.activeSignals ? 'Weak' : 'Moderate',
          whatChanged: 'Vendor risk flows back as fourth-party and contractual liability.',
          whyItMatters: 'Vendor breaches with PHI access trigger your obligations too.',
          evidence: [`${v.activeSignals} active vendor signal(s)`, `${l.total} obligations including vendor contracts`],
          businessImpact: 'A vendor incident can trigger your notification and indemnity clauses.',
          riskDrivers: ['Vendors with PHI access', 'BAA / contract gaps'],
          recommendedAction: 'Confirm BAAs and breach-notification clauses for vendors with PHI access.' }),
        Q(4, { answer: `Overall legal risk is ${l.triggered.length ? 'elevated' : 'contained'}: ${l.triggered.length} triggered of ${l.total} obligations.`,
          status: l.triggered.length ? 'Weak' : 'Moderate',
          whatChanged: 'Driven by triggered obligations and active vendor signals.',
          whyItMatters: 'Single view of regulatory standing for the GC.',
          evidence: [`${l.triggered.length}/${l.total} triggered`, `${v.activeSignals} vendor signal(s)`],
          businessImpact: 'Legal posture is the board-facing summary of regulatory standing.',
          riskDrivers: l.triggered.slice(0, 3).map((x) => x.name),
          recommendedAction: 'Brief the board on triggered obligations and notification readiness.' }),
      ];
      break;
    case 'Board':
    default:
      out = [
        Q(0, { answer: r.critical > 0 ? `Yes — ${r.critical} critical risk(s) and ${usd(f.netExposure)} net exposure mean material risk is present.` : `Risk is present but contained: ${usd(f.netExposure)} net exposure, no critical breaches.`,
          status: r.critical ? 'Critical' : 'Moderate',
          whatChanged: `${r.openCount} active risks; ${ctrl.avgEffectiveness || 0}% control effectiveness.`,
          whyItMatters: 'The board needs a plain answer on whether the company is exposed.',
          evidence: [`${r.critical} critical risk(s)`, `Net exposure ${usd(f.netExposure)}`, `Controls ${ctrl.avgEffectiveness || 0}%`],
          businessImpact: 'Material cyber risk is an enterprise risk, not just an IT issue.',
          riskDrivers: r.top.slice(0, 3).map((x) => x.title),
          recommendedAction: 'Confirm critical risks are owned and within approved appetite.' }),
        Q(1, { answer: `Posture is ${band(roleScore('Board', c).score).toLowerCase()} and ${ctrl.avgEffectiveness || 0}% of controls are effective — the trend is tracked period over period.`,
          status: 'Moderate',
          whatChanged: 'Control effectiveness and risk counts are the improvement signals.',
          whyItMatters: 'The board wants to know if the program is getting better.',
          evidence: [`Control effectiveness ${ctrl.avgEffectiveness || 0}%`, `${rm.overdue} overdue task(s)`, `${c.findings.repeat} repeat finding(s)`],
          businessImpact: 'A flat or declining trend signals under-investment.',
          riskDrivers: ['Overdue remediation', 'Repeat findings'],
          recommendedAction: 'Hold management to a measurable quarter-over-quarter improvement target.' }),
        Q(2, { answer: `Remediation of the open book costs ~${usd(f.costToRemediate)} against ${usd(f.grossExposure)} of exposure — the spend-to-exposure lens for adequacy.`,
          status: 'Moderate',
          whatChanged: 'Spend should track the largest-dollar exposures.',
          whyItMatters: 'The board approves the budget; this tells them if it is enough.',
          evidence: [`Cost to remediate ${usd(f.costToRemediate)}`, `Gross exposure ${usd(f.grossExposure)}`, `Insured ${f.coverageRatio}%`],
          businessImpact: 'Under-spend leaves exposure on the balance sheet.',
          riskDrivers: r.top.slice(0, 3).map((x) => x.title),
          recommendedAction: 'Match security investment to quantified exposure, not to peer benchmarks alone.' }),
        Q(3, { answer: `Net financial exposure is ${usd(f.netExposure)} after ${usd(f.insuranceCoverage)} of insurance.`,
          status: 'Weak',
          whatChanged: `${f.coverageRatio}% of gross exposure is transferred.`,
          whyItMatters: 'The single dollar figure of retained cyber risk.',
          evidence: [`Gross ${usd(f.grossExposure)}`, `Insured ${usd(f.insuranceCoverage)}`, `Net ${usd(f.netExposure)}`],
          businessImpact: 'Net exposure is what shareholders ultimately carry.',
          riskDrivers: r.top.slice(0, 3).map((x) => x.title),
          recommendedAction: 'Review whether net exposure is within the board-approved tolerance.' }),
        Q(4, { answer: `Insurance covers ${f.coverageRatio}% of gross exposure; adequacy depends on whether ${usd(f.netExposure)} retained is within appetite.`,
          status: f.coverageRatio >= 50 ? 'Moderate' : 'Weak',
          whatChanged: 'Coverage ratio vs gross exposure is the adequacy test.',
          whyItMatters: 'The board owns the decision on acceptable retained risk.',
          evidence: [`Coverage ${f.coverageRatio}%`, `Retained ${usd(f.netExposure)}`],
          businessImpact: 'Under-insurance converts an event into an earnings event.',
          riskDrivers: ['Coverage limits', 'PHI sub-limits'],
          recommendedAction: 'Direct CFO to test limits against gross exposure at renewal.' }),
      ];
      break;
  }
  return out.map((q) => ({ ...q, confidence: q.confidence || 'Medium', dataSources: q.dataSources || ['CyberRX primary sources'] }));
}

// ---- role-specific sub-tab LAYOUT ------------------------------------------
// Returns the ordered tabs each leader actually manages. `kind` tells the
// frontend how to render: 'qa'/'summary'/'businessrisk'/'domains'/'controls'/
// 'thresholds'/'processes'/'paths'/'hidden'/'rolepanel' reuse the shared CISO
// scaffold components; 'section' renders a role-specific data section embedded
// in the descriptor (metrics/ranked/table/cards/actions).
function roleLayout(role, c) {
  const f = c.financial, r = c.risks, ctrl = c.controls, rm = c.remediation, l = c.legal, v = c.vendors, p = c.processes, fi = c.findings;
  const qa = { key: 'qa', label: 'Current State', kind: 'qa' };
  const summary = { key: 'summary', label: 'Executive Summary', kind: 'summary' };
  const shared = (key, label, kind) => ({ key, label, kind });
  const rolePanel = (label) => ({ key: 'rolepanel', label, kind: 'rolepanel' });
  const sec = (key, label, section) => ({ key, label, kind: 'section', section });
  const actions = (items) => sec('actions', 'Action Now', { type: 'actions', note: 'Ranked by severity and business impact.', items });

  switch (role) {
    case 'CFO': {
      const ale = Math.round(f.grossExposure * 0.22); // annualized loss expectancy (freq × magnitude, demo factor)
      const premium = Math.round(f.grossExposure * 0.03);
      const retention = Math.round(f.grossExposure * 0.02);
      const removed = Math.max(0, f.grossExposure - f.netExposure);
      const scen = (name, freq, share) => ({ scenario: name, freq: `${Math.round(freq * 100)}%`, sle: usd(f.grossExposure * share), ale: usd(f.grossExposure * share * freq) });
      return [qa, summary,
        sec('exposure', 'Financial Exposure ($)', { type: 'metrics', note: 'The dollar size of cyber risk on the balance sheet.', items: [
          { label: 'Gross exposure', value: usd(f.grossExposure), sub: `${r.openCount} open risks` },
          { label: 'Insurance offset', value: usd(f.insuranceCoverage), sub: `${f.coverageRatio}% of gross`, tone: 'good' },
          { label: 'Net retained exposure', value: usd(f.netExposure), sub: 'self-insured by default', tone: 'bad' },
          { label: 'Annualized loss expectancy', value: usd(ale), sub: 'expected yearly loss' },
          { label: 'Capital at risk', value: f.capitalAtRiskPct ? `${f.capitalAtRiskPct}%` : '—', sub: 'of statutory surplus' },
        ] }),
        sec('lossscenarios', 'Loss Scenarios (Quantified)', { type: 'table', note: 'FAIR-style: annual likelihood × loss magnitude per scenario.', columns: [
          { key: 'scenario', label: 'Loss scenario' }, { key: 'freq', label: 'Annual likelihood' }, { key: 'sle', label: 'Single loss' }, { key: 'ale', label: 'Annualized loss' }],
          rows: [scen('Major PHI data breach', 0.15, 0.6), scen('Ransomware / business interruption', 0.20, 0.35), scen('Third-party / clearinghouse breach', 0.25, 0.2), scen('Insider data misuse', 0.10, 0.12)] }),
        sec('dollarrisks', 'Top Dollar Risks', { type: 'ranked', note: 'Open risks ranked by financial exposure.',
          items: r.top.map((x) => ({ name: x.title, sub: `${x.severity} · owner ${x.owner || 'unassigned'}`, score: x.financialExposure, scoreLabel: usd(x.financialExposure), tone: x.severity === 'Critical' ? 'bad' : 'warn', action: `Fund remediation (owner ${x.remediationOwner || 'CISO'}).` })) }),
        sec('insurance', 'Cyber Insurance', { type: 'cards', note: 'Coverage adequacy against quantified exposure.', items: [
          { title: 'Policy limit', tag: usd(f.insuranceCoverage), tagTone: 'good', fields: [{ k: 'Coverage ratio', v: `${f.coverageRatio}% of gross` }, { k: 'Retention / deductible', v: usd(retention) }, { k: 'Annual premium', v: usd(premium) }], action: 'Re-test the limit against gross exposure at renewal.' },
          { title: 'Coverage gap (retained)', tag: usd(f.netExposure), tagTone: 'bad', fields: [{ k: 'Uninsured share', v: `${100 - f.coverageRatio}%` }, { k: 'PHI sub-limit', v: 'Confirm adequacy' }], action: 'Close the largest retained gaps; validate PHI/BI sub-limits.' },
        ] }),
        sec('roi', 'Security Investment & ROI', { type: 'metrics', note: 'Is security spend producing measurable loss-avoidance?', items: [
          { label: 'Cost to remediate', value: usd(f.costToRemediate) },
          { label: 'Exposure removed', value: usd(removed), tone: 'good' },
          { label: 'Risk reduced per $', value: `$${(removed / (f.costToRemediate || 1)).toFixed(1)}`, sub: 'per $ spent' },
          { label: 'Spend vs peer', value: '0.4% of revenue', sub: 'peer median 0.5%', tone: 'warn' },
        ] }),
        sec('capital', 'Capital & Reserves', { type: 'metrics', note: 'Impact on capital adequacy and reserves (payer view).', items: [
          { label: 'Capital at risk', value: f.capitalAtRiskPct ? `${f.capitalAtRiskPct}%` : '—', sub: 'of statutory surplus', tone: 'warn' },
          { label: 'Statutory surplus', value: usd(f.surplus) },
          { label: 'Cyber reserve set', value: usd(Math.round(f.netExposure * 0.5)), sub: 'vs net exposure' },
          { label: 'RBC sensitivity', value: '−3 pts', sub: 'severe-event scenario', tone: 'warn' },
        ] }),
        rolePanel('Exposure ($)'),
        actions(r.top.filter((x) => x.financialExposure > 0).slice(0, 6).map((x, i) => ({ rank: i + 1, action: `Fund remediation of "${x.title}"`, whyNow: `${usd(x.financialExposure)} exposure (${x.severity})`, owner: x.remediationOwner || 'CISO', dueDate: '2026-07-31', severity: sevOf(x.severity), process: x.title }))),
      ];
    }
    case 'CIO': {
      const kev = Math.min(fi.openCritical.length, 3);
      return [qa, summary,
        rolePanel('Systems & Inventory'),
        sec('vulnpatch', 'Vulnerabilities & Patching', { type: 'metrics', note: 'Open technical exposure and how fast we remediate it.', items: [
          { label: 'Critical / high open', value: String(fi.openCritical.length), tone: fi.openCritical.length ? 'bad' : 'good' },
          { label: 'KEV-listed exposed', value: String(kev), tone: kev ? 'bad' : 'good', sub: 'actively exploited' },
          { label: 'Mean time to patch (critical)', value: '9 days', sub: 'target ≤ 7', tone: 'warn' },
          { label: 'Patch compliance', value: '88%', tone: 'warn', sub: 'target ≥ 95%' },
          { label: 'Repeat findings', value: String(fi.repeat), tone: fi.repeat ? 'warn' : 'good' },
        ] }),
        sec('systemsrisk', 'Systems at Risk', { type: 'table', note: 'Crown-jewel systems with open exposure or lifecycle risk.', columns: [
          { key: 'name', label: 'System / process' }, { key: 'criticality', label: 'Criticality' }, { key: 'tier', label: 'Tier' }, { key: 'lifecycle', label: 'Lifecycle' }, { key: 'owner', label: 'Owner' }],
          rows: p.atRisk.map((x, i) => ({ name: x.name, criticality: x.criticality || '—', tier: x.tier || '—', lifecycle: i % 3 === 0 ? 'End-of-life' : 'Supported', owner: x.owner || '— unassigned' })) }),
        sec('controlcov', 'Control Coverage', { type: 'metrics', note: 'How much of the estate the technical controls actually cover.', items: [
          { label: 'Control effectiveness', value: `${ctrl.avgEffectiveness || 0}%`, tone: (ctrl.avgEffectiveness || 0) >= 70 ? 'good' : 'warn' },
          { label: 'Implemented', value: `${ctrl.implemented}/${ctrl.total}` },
          { label: 'Not implemented', value: String(ctrl.notImplemented), tone: ctrl.notImplemented ? 'warn' : 'good' },
          { label: 'Automated controls', value: '62%', sub: 'vs manual effort' },
        ] }),
        sec('resilience', 'Resilience & Recovery', { type: 'metrics', note: 'Can we detect, respond, and recover the technology estate?', items: [
          { label: 'Mean time to detect', value: '5.4 hrs' },
          { label: 'Mean time to respond', value: '18 hrs', tone: 'warn' },
          { label: 'Backup success rate', value: '99.2%', tone: 'good' },
          { label: 'Last restore test', value: '41 days ago', tone: 'warn', sub: 'target ≤ 30' },
          { label: 'Tier-1 availability', value: '99.95%', tone: 'good' },
          { label: 'RTO attainment', value: `2 of ${Math.max(2, p.atRisk.length)} tier-1`, tone: 'warn' },
        ] }),
        sec('backlog', 'Remediation Backlog', { type: 'ranked', note: 'Overdue technical remediation, worst first.', items: p.atRisk.map((x, i) => ({ name: `Remediation on ${x.name}`, sub: `${x.criticality || 'critical'} · tier ${x.tier || '—'}`, score: (p.atRisk.length - i) * 10 + rm.overdue, scoreLabel: `${Math.max(1, rm.overdue - i)} overdue`, tone: i === 0 ? 'bad' : 'warn', action: `Owner ${x.owner || 'CIO'} — clear before next cycle.` })) }),
        actions(p.atRisk.slice(0, 6).map((x, i) => ({ rank: i + 1, action: `Prioritize remediation protecting "${x.name}"`, whyNow: `${x.criticality || 'critical'} system, tier ${x.tier || '—'}`, owner: x.owner || 'CIO', dueDate: '2026-07-20', severity: x.criticality === 'Critical' ? 'Critical' : 'High', process: x.name }))),
      ];
    }
    case 'CRO': {
      const st = r.byStatus || {};
      const unowned = r.top.filter((x) => !x.owner).length;
      const kri = (label, value, tol, note) => ({ title: label, tag: value > tol ? 'Breached' : 'Within', tagTone: value > tol ? (tol === 0 ? 'bad' : 'warn') : 'good', fields: [{ k: 'Current', v: String(value) }, { k: 'Appetite', v: `≤ ${tol}` }], action: note });
      return [qa, summary,
        sec('register', 'Risk Register', { type: 'table', note: `${r.openCount} active risks with owners, scoring, and exposure.`, columns: [
          { key: 'title', label: 'Risk' }, { key: 'severity', label: 'Severity' }, { key: 'li', label: 'L×I' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'exposure', label: 'Exposure' }],
          rows: r.top.map((x) => ({ title: x.title, severity: x.severity, li: sevLI(x.severity), owner: x.owner || '— unassigned', status: x.status || 'open', exposure: usd(x.financialExposure) })) }),
        sec('kri', 'Risk Appetite & KRIs', { type: 'cards', note: 'Board-approved tolerances — green within appetite, red breached.', items: [
          kri('Critical risks open', r.critical, 0, 'Any open critical risk breaches appetite — escalate or accept.'),
          kri('High risks open', r.high, 3, 'Tolerance is ≤ 3 high risks at any time.'),
          kri('Overdue remediation', rm.overdue, 3, 'Overdue treatment is a lagging KRI breach.'),
          kri('Risks without an owner', unowned, 0, 'Every risk must have an accountable owner.'),
          kri('Silent risk acceptances', 2, 0, 'Acceptances without formal board sign-off.'),
        ] }),
        sec('heat', 'Top Risks (Heat)', { type: 'ranked', note: 'Ranked by likelihood × impact.', items: r.top.map((x) => ({ name: x.title, sub: `${x.severity} · ${x.owner || 'unassigned'}`, score: sevScore(x.severity) + (x.financialExposure ? Math.min(20, x.financialExposure / 1e6) : 0), scoreLabel: sevLI(x.severity), tone: x.severity === 'Critical' ? 'bad' : 'warn', action: `Treat or formally accept (owner ${x.owner || 'CRO'}).` })) }),
        sec('treatment', 'Risk Treatment', { type: 'metrics', note: 'Are risks actually being driven down?', items: [
          { label: 'Open (untreated)', value: String(st.open || 0), tone: (st.open || 0) ? 'warn' : 'good' },
          { label: 'Mitigating', value: String(st.mitigating || 0), tone: 'good' },
          { label: 'Accepted', value: String(r.acceptedCount), tone: 'warn' },
          { label: 'Overdue treatments', value: String(rm.overdue), tone: rm.overdue ? 'bad' : 'good' },
        ] }),
        sec('exceptions', 'Acceptance & Exceptions', { type: 'cards', note: 'Risk-acceptance and exception governance.', items: [
          { title: 'Formally accepted risks', tag: String(r.acceptedCount), tagTone: 'warn', fields: [{ k: 'Periodic re-approval', v: 'Required' }], action: 'Confirm each acceptance is current and signed by the risk owner.' },
          { title: 'Expired / undocumented exceptions', tag: '2', tagTone: 'bad', fields: [{ k: 'Action', v: 'Re-approve or remediate' }], action: 'Close out expired exceptions this cycle.' },
        ] }),
        sec('assurance', 'Control Assurance & Audit', { type: 'metrics', note: 'Third-line view — is the program working as designed?', items: [
          { label: 'Controls tested', value: `${Math.round((ctrl.implemented / (ctrl.total || 1)) * 100)}%`, sub: 'assurance coverage' },
          { label: 'Control effectiveness', value: `${ctrl.avgEffectiveness || 0}%`, tone: (ctrl.avgEffectiveness || 0) >= 70 ? 'good' : 'warn' },
          { label: 'Open audit findings', value: String(fi.openCritical.length), tone: fi.openCritical.length ? 'warn' : 'good' },
          { label: 'Repeat findings', value: String(fi.repeat), tone: fi.repeat ? 'bad' : 'good', sub: 'control not holding' },
        ] }),
        rolePanel('Board Pack'),
        actions(r.top.filter((x) => x.severity === 'Critical' || !x.owner).slice(0, 6).map((x, i) => ({ rank: i + 1, action: x.owner ? `Drive decision on "${x.title}"` : `Assign owner for "${x.title}"`, whyNow: `${x.severity}${x.owner ? '' : ', currently unassigned'}`, owner: x.owner || 'CRO', dueDate: '2026-07-15', severity: sevOf(x.severity), process: x.title }))),
      ];
    }
    case 'CLO': return [qa, summary,
      sec('obligations', 'Regulatory Obligations', { type: 'table', note: `${l.triggered.length} of ${l.total} triggered.`, columns: [
        { key: 'name', label: 'Obligation' }, { key: 'source', label: 'Source' }, { key: 'timeline', label: 'Notify within' }, { key: 'penalty', label: 'Max penalty' }],
        rows: (l.triggered.length ? l.triggered : []).map((x) => ({ name: x.name, source: x.source, timeline: x.notificationTimeline || 'per statute', penalty: x.maxPenalty ? usd(x.maxPenalty) : '—' })) }),
      sec('notify', 'Breach Notification', { type: 'cards', note: 'Who we must notify and by when.', items: (l.triggered.length ? l.triggered : []).map((x) => ({ title: x.name, tag: x.source, tagTone: 'warn', fields: [{ k: 'Notify within', v: x.notificationTimeline || 'per statute' }, { k: 'Citation', v: x.citation || '—' }], action: 'Maintain a pre-drafted notification on this timeline.' })) }),
      sec('vendorlegal', 'Vendor & Contract Risk', { type: 'metrics', note: 'Contractual and fourth-party exposure.', items: [
        { label: 'Active vendor signals', value: String(v.activeSignals), tone: v.activeSignals ? 'warn' : 'good' },
        { label: 'Obligations tracked', value: String(l.total) },
      ] }),
      sec('penalty', 'Penalty Exposure', { type: 'metrics', note: 'Ceiling across triggered obligations.', items: [
        { label: 'Max aggregate penalty', value: usd(l.triggered.reduce((s, x) => s + (x.maxPenalty || 0), 0)), tone: 'bad' },
        { label: 'Triggered obligations', value: String(l.triggered.length) },
      ] }),
      rolePanel('Audit Lineage'),
      actions(l.triggered.slice(0, 6).map((x, i) => ({ rank: i + 1, action: `Prepare notification posture for ${x.source} — ${x.name}`, whyNow: `Notify within ${x.notificationTimeline || 'statutory window'}`, owner: 'CLO', dueDate: '2026-07-10', severity: 'High', process: x.name }))),
    ];
    case 'Board':
    default: {
      const eff = ctrl.avgEffectiveness || 64;
      return [qa, summary,
        sec('enterprise', 'Enterprise Exposure ($)', { type: 'metrics', note: 'The enterprise dollar view of cyber risk.', items: [
          { label: 'Net exposure', value: usd(f.netExposure), tone: 'bad' },
          { label: 'Gross exposure', value: usd(f.grossExposure) },
          { label: 'Insured', value: `${f.coverageRatio}%`, tone: f.coverageRatio >= 50 ? 'good' : 'warn' },
          { label: 'Critical risks', value: String(r.critical), tone: r.critical ? 'bad' : 'good' },
        ] }),
        sec('trend', 'Posture Trend', { type: 'metrics', note: 'Are we getting better over time?', items: [
          { label: 'Control effectiveness', value: `${eff}%`, sub: 'prior period 60%', tone: 'good' },
          { label: 'Critical risks', value: String(r.critical), sub: 'prior period 4', tone: 'warn' },
          { label: 'Overdue remediation', value: String(rm.overdue), tone: rm.overdue ? 'warn' : 'good' },
          { label: 'Repeat findings', value: String(fi.repeat), sub: 'control not holding' },
        ] }),
        sec('toprisks', 'Top Enterprise Risks', { type: 'ranked', note: 'The risks the board most needs to track.', items: r.top.map((x) => ({ name: x.title, sub: `${x.severity} · owner ${x.owner || 'unassigned'}`, score: sevScore(x.severity) + (x.financialExposure ? Math.min(20, x.financialExposure / 1e6) : 0), scoreLabel: sevLI(x.severity), tone: x.severity === 'Critical' ? 'bad' : 'warn', action: `Confirm owned and within appetite.` })) }),
        sec('benchmark', 'Peer Benchmark', { type: 'cards', note: 'How we compare to industry peers.', items: [
          { title: 'Security maturity vs peers', tag: 'Below median', tagTone: 'warn', fields: [{ k: 'Us', v: `${eff}%` }, { k: 'Peer median', v: '71%' }], action: 'Close the maturity gap in vulnerability & third-party risk.' },
          { title: 'Cyber spend vs peers', tag: '0.4% of revenue', tagTone: 'warn', fields: [{ k: 'Peer median', v: '0.5% of revenue' }], action: 'Assess whether spend matches quantified exposure.' },
        ] }),
        sec('investment', 'Investment Adequacy', { type: 'cards', note: 'Is spend matched to quantified exposure?', items: [
          { title: 'Spend-to-exposure', tag: `${usd(f.costToRemediate)} / ${usd(f.grossExposure)}`, tagTone: 'warn', fields: [{ k: 'Net retained', v: usd(f.netExposure) }, { k: 'Insured', v: `${f.coverageRatio}%` }], action: 'Match investment to quantified exposure, not peer benchmarks alone.' },
        ] }),
        sec('regulatory', 'Regulatory & Disclosure', { type: 'cards', note: 'Material-incident disclosure and compliance standing.', items: [
          { title: 'Material cyber incidents (FY)', tag: '0', tagTone: 'good', fields: [{ k: 'SEC 8-K Item 1.05 readiness', v: 'Drilled' }, { k: 'HIPAA breach reporting', v: 'Process in place' }], action: 'Maintain 4-business-day disclosure readiness.' },
          { title: 'Regulatory obligations triggered', tag: String(l.triggered.length), tagTone: l.triggered.length ? 'warn' : 'good', fields: [{ k: 'Tracked', v: String(l.total) }], action: 'Brief the board on any triggered obligations.' },
        ] }),
        sec('readiness', 'Crisis & Resilience Readiness', { type: 'metrics', note: 'Could we withstand, recover from, and disclose a major event?', items: [
          { label: 'IR plan last tested', value: 'Q1 2026', tone: 'good' },
          { label: 'Board cyber briefings / yr', value: '4', tone: 'good' },
          { label: 'Tabletop exercises', value: '2 of 3', tone: 'warn' },
          { label: 'Tier-1 RTO met', value: '2 of 4', tone: 'warn' },
        ] }),
        rolePanel('Board Pack'),
        actions([
          { rank: 1, action: 'Confirm cyber risk is within approved appetite', whyNow: r.critical ? `${r.critical} critical risk(s) open` : 'No critical breaches', owner: 'Board / CRO', dueDate: '2026-07-31', severity: r.critical ? 'High' : 'Medium', process: 'Enterprise' },
          { rank: 2, action: 'Review insurance adequacy vs gross exposure', whyNow: `${f.coverageRatio}% insured of ${usd(f.grossExposure)}`, owner: 'Board / CFO', dueDate: '2026-07-31', severity: f.coverageRatio < 50 ? 'High' : 'Medium', process: 'Enterprise' },
        ]),
      ];
    }
  }
}

async function getDashboard(orgId, role) {
  if (!FRAME[role]) throw new Error(`Unsupported role: ${role}`);
  let c = await Agent.gatherContext(orgId);
  if (isEmpty(c)) c = demoContext();
  const { score, narrative } = roleScore(role, c);
  const delta = await snapshotDelta(orgId, role, score);
  return {
    role, organizationId: orgId, generatedAt: new Date().toISOString(),
    hero: {
      ...FRAME[role],
      score, band: band(score), delta,
      trend: delta >= 2 ? 'improving' : delta <= -2 ? 'deteriorating' : 'stable',
      confidence: 'Medium', narrative,
    },
    strip: strip(role, c),
    tabs: roleLayout(role, c),
  };
}

module.exports = { getDashboard, FRAME, roleOverall, roleDomains, roleQuestions: questions, roleLayout, loadCtx, demoContext, isEmpty };
