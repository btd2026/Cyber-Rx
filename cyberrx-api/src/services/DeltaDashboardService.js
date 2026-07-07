'use strict';

/**
 * DeltaDashboardService — Board / CLO / CRO oversight tiles (DELTA_Board_CLO_CRO.md).
 * ADDITIVE: does not touch the six existing views. Each tile is gated on its required
 * inputs (via InputCatalogService) and its headline is computed through the existing
 * data seam — real where our platform already holds it (economics = FAIR-style ALE,
 * appetite, insurance, risk register), a labelled illustrative value where a NEW
 * connector (ERM / Legal / Contract / Privacy / Audit / Data-Classification) is not
 * connected yet. `mocked:true` marks the latter so the cockpit labels it.
 *
 * `buildFrom(role, ctx)` is pure (unit-testable); `build(role, orgId)` resolves ctx.
 */

const Catalog = require('./InputCatalogService');

const has = (a) => Array.isArray(a) && a.length > 0;

const usd = (n) => {
  const v = Number(n) || 0; const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
  return '$' + Math.round(v);
};

// Tone: good | warn | crit | muted. Headline is a short business string.
function tile(id, label, satisfied, missing, headline, tone, mocked, detail) {
  return { id, label, satisfied, missing: missing || [], headline: satisfied ? headline : null, tone: satisfied ? (tone || 'muted') : 'muted', mocked: satisfied ? !!mocked : false, detail: satisfied ? (detail || '') : ('Needs: ' + (missing || []).join(', ')) };
}

/**
 * @param {string} role  'board'|'clo'|'cro'
 * @param {{readiness, setup, connectors:Set}} ctx
 */
function buildFrom(role, ctx) {
  const R = ctx.readiness || { widgets: [] };
  const wById = {}; R.widgets.forEach((w) => { wById[w.id] = w; });
  const s = ctx.setup || {};
  const econ = s.economics || {};
  const ap = Number((econ.appetite && econ.appetite.appetite) || econ.appetite) || 0;
  const ale = Number(econ.ale) || 0;
  const tail = Number(econ.tail) || 0;
  const limit = Number(econ.insurance && econ.insurance.limit) || 0;
  const budget = Number(econ.budget) || 0;
  const conn = ctx.connectors || new Set();
  const ermLive = conn.has('erm') || conn.has('archer');
  const grcLive = conn.has('sap') || conn.has('archer') || conn.has('servicenow_grc');
  // A tile is "mocked" when a NEW oversight connector it relies on isn't connected —
  // we substitute our internal economics/register as a labelled proxy.
  const proxy = !ermLive; // ERM is the primary new source across Board/CRO

  const T = (id, fn) => { const w = wById[id] || { satisfied: false, missing: [], label: id }; if (!w.satisfied) return tile(id, w.label, false, w.missing); return fn(w); };

  if (role === 'cro' || role === 'board') {
    const within = ap > 0 ? (tail || ale) <= ap : null;
    var apTile = (id) => T(id, (w) => tile(id, w.label, true,
      [], within == null ? 'Appetite not set' : (within ? 'Within appetite' : 'Over appetite'),
      within == null ? 'muted' : (within ? 'good' : 'crit'), proxy,
      (ap ? ('modeled ' + usd(tail || ale) + ' vs appetite ' + usd(ap)) : 'set a board appetite') + (proxy ? ' · ERM proxy (connect ERM for the enterprise-scale roll-up)' : '')));
  }

  if (role === 'board') {
    return { role, tiles: [
      apTile('board_posture'),
      T('board_toprisks', (w) => tile('board_toprisks', w.label, true, [], ((s.risks || []).length || (s.portfolio ? 1 : 0)) + ' cyber risks tracked', 'warn', !grcLive, 'from the risk register' + (grcLive ? '' : ' · GRC proxy'))),
      T('board_trend', (w) => tile('board_trend', w.label, true, [], (s.trend && s.trend.length ? s.trend.length + ' quarters recorded' : 'baseline'), 'muted', proxy, 'quarter-over-quarter posture')),
      T('board_material', (w) => tile('board_material', w.label, true, [], 'assessed against materiality criteria', 'muted', true, 'connect Incident Mgmt + Legal for live disclosure status')),
      T('board_regexposure', (w) => tile('board_regexposure', w.label, true, [], 'from the regulatory register', 'warn', !grcLive, 'obligations at non-compliant / at-risk')),
      T('board_insurance', (w) => tile('board_insurance', w.label, true, [], limit ? (usd(Math.max(0, (tail || ale) - limit)) + ' uninsured gap') : 'no policy on file', (limit && (tail || ale) > limit) ? 'warn' : 'good', false, 'FAIR exposure ' + usd(tail || ale) + ' vs limit ' + usd(limit))),
      T('board_assurance', (w) => tile('board_assurance', w.label, true, [], 'audit findings', 'muted', !conn.has('internal_audit') && !conn.has('servicenow_grc'), 'open vs overdue cyber findings')),
      T('board_accountability', (w) => tile('board_accountability', w.label, true, [], 'remediation ownership', 'muted', !grcLive, 'owner · due date · days overdue')),
      T('board_investment', (w) => tile('board_investment', w.label, true, [], budget ? (usd(budget) + ' security spend') : 'spend not set', 'muted', true, 'vs benchmark (connect Benchmark Data)')),
    ] };
  }

  if (role === 'cro') {
    return { role, tiles: [
      apTile('cro_appetite'),
      T('cro_toprisks', (w) => tile('cro_toprisks', w.label, true, [], ((s.risks || []).length || 0) + ' cyber-tagged risks', 'warn', proxy, 'by residual score')),
      T('cro_concentration', (w) => tile('cro_concentration', w.label, true, [], 'top-driver concentration', 'warn', proxy, 'shared assets / vendors / SPOFs (FAIR aggregation)')),
      T('cro_quantified', (w) => tile('cro_quantified', w.label, true, [], usd(ale) + ' ALE', ale > 0 ? 'warn' : 'muted', false, 'range ' + usd(ale * 0.6) + '–' + usd(tail || ale * 1.8) + ' (FAIR + BIA)')),
      T('cro_trend', (w) => tile('cro_trend', w.label, true, [], (s.trend && s.trend.length ? s.trend.length + ' periods' : 'baseline'), 'muted', proxy, 'exposure vs tolerance')),
      T('cro_treatment', (w) => tile('cro_treatment', w.label, true, [], 'treat / accept / transfer', 'muted', !grcLive, 'grouped by decision')),
      T('cro_transfer', (w) => tile('cro_transfer', w.label, true, [], (tail || ale) > limit ? 'transfer opportunity' : 'adequately transferred', (tail || ale) > limit ? 'warn' : 'good', false, 'residual ' + usd(tail || ale) + ' vs coverage ' + usd(limit))),
    ] };
  }

  // ---- CEO / CFO / COO / CIO / CTO + CISO assurance/ops ----
  const procs = (s.process_exposure || s.processes || []);
  const rs = s.resilience || {};
  const cap = (s.capabilities || []);
  if (role === 'ceo') {
    return { role, tiles: [
      T('ceo_strategic', (w) => tile('ceo_strategic', w.label, true, [], (has(s.strategicInitiatives) ? s.strategicInitiatives.length + ' initiatives tracked' : 'strategy mapped'), 'warn', !conn.has('jira') && !conn.has('servicenow'), 'initiatives with a cyber dependency (PMO × strategy × app map)')),
      T('ceo_business', (w) => tile('ceo_business', w.label, true, [], 'customer-impact watch', 'muted', !conn.has('salesforce') && !conn.has('hubspot'), 'incidents joined to CRM / support impact')),
      T('ceo_decisions', (w) => tile('ceo_decisions', w.label, true, [], 'decisions needing the CEO', 'muted', !grcLive, 'from the GRC decision workflow')),
    ] };
  }
  if (role === 'cfo') {
    return { role, tiles: [
      T('cfo_exposure', (w) => tile('cfo_exposure', w.label, true, [], usd(ale) + ' value at risk', ale > 0 ? 'warn' : 'muted', false, 'FAIR ALE × BIA' + (has(s.assetValuation) ? ' × asset valuation' : ''))),
      T('cfo_investment', (w) => tile('cfo_investment', w.label, true, [], (has(s.initiatives) ? s.initiatives.length + ' investments' : 'portfolio'), 'muted', !conn.has('jira') && !conn.has('servicenow'), 'ranked by risk reduced (PMO × GRC)')),
      T('cfo_decisions', (w) => tile('cfo_decisions', w.label, true, [], 'funding requests', 'muted', !conn.has('jira') && !conn.has('servicenow'), 'from the PMO')),
    ] };
  }
  if (role === 'coo') {
    const atRisk = procs.filter((p) => Number(p.exposure_usd) > 0).length;
    return { role, tiles: [
      T('coo_readiness', (w) => tile('coo_readiness', w.label, true, [], (procs.length ? atRisk + ' of ' + procs.length + ' processes at risk' : 'processes mapped'), atRisk > 0 ? 'warn' : 'good', false, 'BIA × process inventory × CMDB')),
      T('coo_recovery', (w) => tile('coo_recovery', w.label, true, [], (rs.assets ? 'recovery tested' : 'recovery posture'), 'muted', !conn.has('rubrik') && !conn.has('veeam'), 'DR test results × backup coverage')),
      T('coo_decisions', (w) => tile('coo_decisions', w.label, true, [], 'resilience investments', 'muted', true, 'from the DR roadmap')),
    ] };
  }
  if (role === 'cio') {
    return { role, tiles: [
      T('cio_readiness', (w) => tile('cio_readiness', w.label, true, [], 'critical apps needing attention', 'warn', !conn.has('datadog') && !conn.has('dynatrace') && !conn.has('newrelic'), 'APM health × CMDB criticality')),
      T('cio_digital', (w) => tile('cio_digital', w.label, true, [], 'workforce productivity risk', 'muted', !conn.has('intune') && !conn.has('defender'), 'endpoint + collaboration posture')),
      T('cio_decisions', (w) => tile('cio_decisions', w.label, true, [], 'modernization priorities', 'muted', !conn.has('leanix') && !conn.has('ardoq'), 'from the EA repository')),
    ] };
  }
  if (role === 'cto') {
    return { role, tiles: [
      T('cto_platform', (w) => tile('cto_platform', w.label, true, [], 'platforms at risk', 'warn', !conn.has('leanix') && !conn.has('ardoq'), 'EA repository × CMDB × APM')),
      T('cto_engineering', (w) => tile('cto_engineering', w.label, true, [], 'product vulns in development', 'warn', !conn.has('github') && !conn.has('snyk'), 'SAST / DAST / SCA in the pipeline')),
      T('cto_cloud', (w) => tile('cto_cloud', w.label, true, [], 'cloud exposure', 'warn', !conn.has('wiz') && !conn.has('prisma'), 'CSPM / CWPP across cloud accounts')),
      T('cto_decisions', (w) => tile('cto_decisions', w.label, true, [], 'architecture remediation', 'muted', !grcLive, 'EA repository × GRC')),
    ] };
  }
  if (role === 'ciso') {
    // Only the three assurance/ops widgets render here (Program Health owns the er_* tiles).
    return { role, tiles: [
      T('protection_effectiveness', (w) => tile('protection_effectiveness', w.label, true, [], 'control-family coverage', 'good', !grcLive, 'framework/control assessment scores by business area')),
      T('cyber_operations', (w) => tile('cyber_operations', w.label, true, [], 'active business-impacting incidents', 'muted', !conn.has('splunk') && !conn.has('sentinel'), 'SIEM / SOAR / Incident Mgmt, business-impacting only')),
      T('executive_actions', (w) => tile('executive_actions', w.label, true, [], 'highest-value remediation', 'muted', !grcLive, 'GRC open items by risk-reduced ÷ effort')),
    ] };
  }

  // CLO
  return { role, tiles: [
    T('clo_breach', (w) => tile('clo_breach', w.label, true, [], 'notification obligations', 'warn', !conn.has('data_classification') || !conn.has('legal_matter'), 'incident × data-type × jurisdiction')),
    T('clo_regexposure', (w) => tile('clo_regexposure', w.label, true, [], 'from the regulatory register', 'warn', !grcLive, 'obligations at risk')),
    T('clo_contracts', (w) => tile('clo_contracts', w.label, true, [], 'cyber / SLA clauses at risk', 'warn', !conn.has('contract_lifecycle'), 'from CLM')),
    T('clo_litigation', (w) => tile('clo_litigation', w.label, true, [], 'open cyber / privacy matters', 'warn', !conn.has('legal_matter'), 'by exposure')),
    T('clo_privacy', (w) => tile('clo_privacy', w.label, true, [], 'DSAR backlog · privacy incidents', 'warn', !conn.has('onetrust') && !conn.has('trustarc'), 'from the privacy platform')),
    T('clo_disclosure', (w) => tile('clo_disclosure', w.label, true, [], 'disclosure decisions in review', 'muted', !grcLive, 'GRC workflow × incidents')),
    T('clo_regresponse', (w) => tile('clo_regresponse', w.label, true, [], 'response priorities by deadline', 'muted', false, 'from the regulatory register')),
  ] };
}

async function build(role, orgId) {
  const readiness = await Catalog.readiness(orgId, role);
  const ctx = await Catalog.contextFor(orgId);
  return buildFrom(role, { readiness, setup: ctx.setup, connectors: ctx.connectors });
}

module.exports = { build, buildFrom };
