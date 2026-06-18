'use strict';

/**
 * CloPortfolioService — CLO Sub-tab 4: Regulatory & Litigation Portfolio.
 *
 * Open matters, contractual remediation, and compliance initiatives with status
 * and exposure-reduction, predicted vs realized from the shared calibrated
 * project engine. Compliance initiatives are the same portfolio the security
 * side tracks, read through the legal/compliance lens; matters and contractual
 * remediation are modeled (labeled) pending a matter-management feed.
 */

const logger = require('../utils/logger');
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

// Initiatives in these domains read as compliance/regulatory programs.
const COMPLIANCE_DOMAINS = /governance|compliance|data|dlp|privacy|thirdparty|vendor|audit|awareness/i;

async function getPortfolio(orgId) {
  let pf = { projects: [] };
  try { pf = await require('./ProjectPortfolioService').portfolio(orgId); } catch (e) { logger.debug('clo portfolio failed', { error: e.message }); }

  const complianceInitiatives = (pf.projects || []).map((p) => {
    const a = p.analysis || {};
    const isCompliance = COMPLIANCE_DOMAINS.test(`${p.domain || ''} ${p.name || ''}`);
    return {
      id: p.id || p.name, name: p.name, objective: p.objective || '', owner: p.owner,
      status: p.status, percentComplete: p.percentComplete || 0,
      category: isCompliance ? 'Compliance / regulatory' : 'Security (compliance-relevant)',
      predicted: { exposureReduced: a.exposureReduced, postureLift: a.postureLift },
      realized: { exposureReduced: a.realizedExposureReduced, postureLift: a.realizedLift },
      reducesRisks: a.reducesRisks || [],
    };
  });

  // Open matters + contractual remediation — modeled until a matter feed exists.
  const matters = await modeledMatters(orgId);
  const contractual = await contractualRemediation(orgId);

  const rollup = {
    initiatives: complianceInitiatives.length,
    openMatters: matters.length,
    contractualItems: contractual.length,
    predictedExposureReduced: pf.totalExposureReduced,
    realizedExposureReduced: pf.realizedExposureReduced,
    calibration: pf.calibration,
  };
  const narration = `Regulatory and litigation portfolio, General Counsel. ${matters.length} open matter(s), ${contractual.length} contractual remediation item(s), and ${complianceInitiatives.length} compliance-relevant initiative(s). ` +
    `Compliance initiatives are predicted to reduce ${usd(pf.totalExposureReduced || 0)} of exposure, ${usd(pf.realizedExposureReduced || 0)} realized to date` +
    `${pf.calibration != null ? ` (${pf.calibration}% of projection)` : ''}. Matters and contractual items are modeled pending a matter-management feed.`;

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    rollup, matters, contractual, complianceInitiatives, narration,
    note: 'Compliance initiatives and predicted-vs-realized come from the shared calibrated engine; open matters and contractual remediation are modeled (labeled) pending a matter/contract-management feed.',
  };
}

async function modeledMatters(orgId) {
  let triggered = [];
  try { const c = await require('./ExecDashboardService').loadCtx(orgId); triggered = (c.legal && c.legal.triggered) || []; } catch (_) {}
  const out = triggered.slice(0, 3).map((t, i) => ({
    id: `matter_${i}`, name: t.name || 'Regulatory inquiry', type: 'Regulatory', status: 'Monitoring',
    exposure: t.maxPenalty || 0, clock: t.notificationTimeline || 'See obligation', modeled: true,
  }));
  if (!out.length) out.push({ id: 'matter_demo', name: 'No active matters', type: '—', status: 'None open', exposure: 0, clock: '—', modeled: true });
  return out;
}

async function contractualRemediation(orgId) {
  let vendors = [];
  try { const c = await require('./ExecDashboardService').loadCtx(orgId); vendors = (c.vendors && (c.vendors.list || c.vendors.top)) || []; } catch (_) {}
  const out = vendors.slice(0, 3).map((v, i) => ({ id: `contract_${i}`, item: `${v.name || 'Vendor'} — security/BAA terms`, status: 'Remediation in progress', exposureReduction: v.exposure || 0, modeled: true }));
  out.push({ id: 'contract_dpa', item: 'Standard DPA breach-notification clause (72h) across processors', status: 'Rollout', exposureReduction: 0, modeled: true });
  return out;
}

module.exports = { getPortfolio };
