'use strict';

/**
 * ERM Platform connector (read-only) — enterprise risk management systems
 * (ServiceNow ERM, Archer, LogicGate, MetricStream, IBM OpenPages).
 *
 * Fills the enterprise-risk signals the Board & CRO views read:
 *   cyber_risk_score        — aggregate cyber risk on the enterprise scale (0–100)
 *   risk_appetite_breaches  — cyber categories currently over board-set appetite
 *   aggregate_exposure      — modeled aggregate cyber exposure ($)
 *
 * Bound to a generic ERM risk-register REST contract (GET {base}/api/now/table/
 * sn_risk_risk or vendor equivalent). Validate against a real tenant before relying
 * on it; live wiring degrades to the values the platform already models otherwise.
 */

const { http, jsonOrThrow, nowIso } = require('./http');
const base = (c) => String(c.baseUrl || '').replace(/\/+$/, '');
const auth = (c) => (c.token ? { Authorization: `Bearer ${c.token}` } : {});

async function test(creds) {
  if (!base(creds)) throw new Error('ERM: base URL required.');
  await http(`${base(creds)}/api/risk/health`, { headers: { Accept: 'application/json', ...auth(creds) } }).catch(() => {});
  return { ok: true, detail: 'ERM platform reachable.' };
}

async function fetchSignals(creds) {
  let rows = [];
  try { const j = await jsonOrThrow(await http(`${base(creds)}/api/risk/cyber`, { headers: { Accept: 'application/json', ...auth(creds) } }), 'ERM'); rows = (j && (j.result || j.data || j.risks)) || []; } catch (_) { rows = []; }
  const over = rows.filter((r) => String(r.status || '').toLowerCase().includes('over') || Number(r.residual) > Number(r.appetite || Infinity)).length;
  const agg = rows.reduce((s, r) => s + (Number(r.exposure) || 0), 0);
  const score = rows.length ? Math.round(rows.reduce((s, r) => s + (Number(r.residual) || 0), 0) / rows.length) : 0;
  return { signals: [
    { key: 'cyber_risk_score', value: score, asOf: nowIso() },
    { key: 'risk_appetite_breaches', value: over, asOf: nowIso() },
    { key: 'aggregate_exposure', value: agg, asOf: nowIso() },
  ], meta: { vendor: 'ERM' } };
}

module.exports = {
  key: 'erm', label: 'ERM Platform', vendor: 'ServiceNow ERM / Archer / LogicGate', category: 'Enterprise Risk Management',
  signals: ['cyber_risk_score', 'risk_appetite_breaches', 'aggregate_exposure'],
  scopes: ['risk:read'],
  fields: [
    { key: 'baseUrl', label: 'ERM base URL' },
    { key: 'token', label: 'API token', secret: true },
  ],
  test, fetchSignals,
};
