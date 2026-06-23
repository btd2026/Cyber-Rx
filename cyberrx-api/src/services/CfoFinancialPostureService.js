'use strict';

/**
 * CfoFinancialPostureService — CFO Sub-tab 1: Financial Position (Current State).
 *
 * The CFO's "current state" is the dollar size of cyber risk on the balance
 * sheet: net/gross/insurance exposure, where that exposure concentrates across
 * crown-jewel applications, quantified loss scenarios (FAIR-style), the return
 * security spend produces (exposure bought down per dollar), what changed since
 * last period, and a finance-language brief (with voice) — all over visibility
 * confidence so we never overstate what we can see.
 *
 * Built from the shared substrate (ExecDashboardService.loadCtx) + the business-
 * weighted allocation in CfoQuantService, so every figure traces to the same
 * risk register / financial model the rest of the suite sees.
 */

const logger = require('../utils/logger');
const Cfo = require('./CfoQuantService');

const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

async function getPosture(orgId) {
  const Exec = require('./ExecDashboardService');
  let c = {};
  try { c = await Exec.loadCtx(orgId); } catch (e) { logger.debug('cfo posture loadCtx failed', { error: e.message }); }
  const f = c.financial || {};
  const r = c.risks || {};
  const rm = c.remediation || {};

  const grossExposure = Number(f.grossExposure) || 0;
  const netExposure = Number(f.netExposure) || 0;
  const insuranceCoverage = Number(f.insuranceCoverage) || 0;
  const coverageRatio = f.coverageRatio != null ? Number(f.coverageRatio) : (grossExposure ? Math.round((insuranceCoverage / grossExposure) * 100) : 0);
  const costToRemediate = Number(f.costToRemediate) || 0;
  const critical = Number(r.critical) || 0;
  const overdue = Number(rm.overdue) || 0;

  // Business-weighted allocation + unified assessment score (shared with the
  // Exposure ($) panel so the two views never disagree).
  let byApp = [], assessmentScore = null, tier1Apps = 0;
  try {
    const roi = await Cfo.roiSummary(orgId);
    byApp = (roi.byApp || []).slice(0, 8);
    assessmentScore = roi.assessmentScore;
    tier1Apps = roi.tier1Apps || 0;
  } catch (e) { logger.debug('cfo posture roiSummary failed', { error: e.message }); }

  // Quantified loss scenarios — FAIR-style annual likelihood × loss magnitude,
  // same demo factors the dashboard layout uses.
  const ale = Math.round(grossExposure * 0.22); // annualized loss expectancy
  const scen = (name, freq, share) => ({ scenario: name, freq: Math.round(freq * 100), sle: Math.round(grossExposure * share), ale: Math.round(grossExposure * share * freq) });
  const lossScenarios = [
    scen('Major PHI data breach', 0.15, 0.6),
    scen('Ransomware / business interruption', 0.20, 0.35),
    scen('Third-party / clearinghouse breach', 0.25, 0.2),
    scen('Insider data misuse', 0.10, 0.12),
  ].sort((a, b) => b.ale - a.ale);

  // Return on security spend — exposure bought down per dollar invested.
  const removed = Math.max(0, grossExposure - netExposure);
  const riskReducedPerDollar = costToRemediate > 0 ? Number((removed / costToRemediate).toFixed(1)) : null;

  // Top dollar risks (open risks ranked by financial exposure).
  const topDollarRisks = (r.top || [])
    .filter((x) => (Number(x.financialExposure) || 0) > 0)
    .slice(0, 5)
    .map((x) => ({ name: x.title, exposure: Number(x.financialExposure) || 0, severity: x.severity, owner: x.owner || x.remediationOwner || 'unassigned' }));

  // Financial posture score: assessment quality blended with how much exposure is
  // actually transferred, penalized for unfunded critical risk and slipping work.
  const base = assessmentScore != null ? assessmentScore : 60;
  const overall = clamp(base * 0.55 + coverageRatio * 0.45 - critical * 5 - overdue * 1.5, 20, 96);

  // What changed since last period (directional).
  const whatChanged = [];
  if (coverageRatio > 0 && coverageRatio < 50) whatChanged.push({ dir: 'down', text: `Insurance offsets only ${coverageRatio}% of gross exposure — ${usd(netExposure)} stays retained on the balance sheet.` });
  if (critical > 0) whatChanged.push({ dir: 'down', text: `${critical} critical risk${critical === 1 ? '' : 's'} carr${critical === 1 ? 'ies' : 'y'} quantified financial exposure.` });
  if (removed > 0) whatChanged.push({ dir: 'up', text: `Remediation has bought down ${usd(removed)} of gross exposure to date.` });
  if (overdue > 0) whatChanged.push({ dir: 'down', text: `${overdue} remediation task${overdue === 1 ? '' : 's'} overdue — exposure isn't being retired on schedule.` });
  if (!whatChanged.length) whatChanged.push({ dir: 'flat', text: 'No material change to the financial exposure position since last period.' });

  // Visibility confidence (shared service).
  let visibility = null;
  try { visibility = await require('./VisibilityService').assess(orgId); } catch (_) {}

  // Finance-language brief, identical in text and voice.
  const topApp = byApp[0];
  const worst = lossScenarios[0];
  const sentences = [
    `Cyber risk on the balance sheet is ${usd(grossExposure)} gross, with ${usd(insuranceCoverage)} transferred to insurance (${coverageRatio}% of gross) and ${usd(netExposure)} retained net.`,
    assessmentScore != null
      ? `The financial posture scores ${overall} of 100 — a blend of an assessment score of ${assessmentScore} and how much exposure is actually transferred.`
      : `The financial posture scores ${overall} of 100, driven mostly by how much exposure is actually transferred.`,
  ];
  if (topApp) sentences.push(`Exposure concentrates on ${topApp.name}, carrying about ${usd(topApp.weightedExposure)} of the retained total.`);
  if (worst) sentences.push(`The largest modeled loss is ${worst.scenario.toLowerCase()} at roughly ${usd(worst.ale)} annualized.`);
  if (riskReducedPerDollar != null) sentences.push(`Security spend is producing about $${riskReducedPerDollar} of exposure bought down per dollar invested.`);
  const brief = sentences.join(' ');

  const verdict = overall >= 80 ? 'well-funded against the risk it carries' : overall >= 55 ? 'adequately funded, with real gaps to close' : 'under-funded against the exposure it carries';
  const narration = `Here is my read: the balance sheet is ${verdict}. Gross cyber exposure is ${usd(grossExposure)}, insurance absorbs ${coverageRatio}% of it, and ${usd(netExposure)} stays retained. ` +
    (coverageRatio < 50
      ? `What I'd watch is the transfer ratio — under half of gross is insured, so a severe event lands largely on us. `
      : `Transfer is working in our favor — insurance carries the majority of a severe event. `) +
    (riskReducedPerDollar != null
      ? `On the spend side, every dollar of remediation is buying down about $${riskReducedPerDollar} of exposure, which is the number I'd take to the board to defend the program's budget.`
      : `I'd connect remediation cost data so we can show exposure bought down per dollar — that's the number that defends the budget.`);

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    overall,
    grossExposure, netExposure, insuranceCoverage, coverageRatio, assessmentScore, tier1Apps,
    ale, removed, costToRemediate, riskReducedPerDollar,
    byApp, lossScenarios, topDollarRisks,
    whatChanged, visibility, brief, narration,
    note: 'Exposure is read from the financial-impact model; loss scenarios are FAIR-style estimates (annual likelihood × loss magnitude). Connect actuarial / claims data to replace the modeled factors.',
  };
}

module.exports = { getPosture };
