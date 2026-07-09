'use strict';

/**
 * SentinelOne connector (read-only, ApiToken header → S1 mgmt console API).
 *
 * Fills edr_pct — the share of known endpoints running an ACTIVE, uninfected
 * agent. Uses the documented v2.1 agent-count endpoint: total agents vs.
 * active+healthy (isActive=true, infected=false). Built to the documented
 * SentinelOne API contract; validate against a real console with a read-only
 * API token before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `ApiToken ${creds.token}`, Accept: 'application/json' });

// GET /web/api/v2.1/agents/count → { data: { total: N } }
async function agentCount(creds, query) {
  const url = `${base(creds)}/web/api/v2.1/agents/count${query ? `?${query}` : ''}`;
  const j = await jsonOrThrow(await http(url, { headers: authH(creds) }), 'SentinelOne');
  const n = j && j.data && j.data.total;
  return Number.isFinite(Number(n)) ? Number(n) : null;
}

async function test(creds) {
  if (!base(creds) || !creds.token) throw new Error('SentinelOne console URL and API token are required.');
  await agentCount(creds, '');
  return { ok: true, detail: 'Authenticated to the SentinelOne management API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  try {
    const total = await agentCount(creds, '');
    const healthy = await agentCount(creds, 'isActive=true&infected=false');
    if (total && total > 0 && Number.isFinite(healthy)) {
      signals.push({ key: 'edr_pct', value: Math.round((healthy / total) * 100), asOf: nowIso(), raw: { total, healthy } });
    }
  } catch (e) { if (/HTTP 4|HTTP 5/.test(e.message)) throw e; /* else fall through */ }
  if (!signals.length) throw new Error('Authenticated, but no agent counts were readable — confirm the token can read Endpoints.');
  return { signals, meta: { vendor: 'SentinelOne' } };
}

module.exports = {
  key: 'sentinelone', label: 'SentinelOne', vendor: 'SentinelOne', category: 'Endpoint / EDR',
  signals: ['edr_pct'],
  scopes: ['Endpoints: View'],
  fields: [
    { key: 'baseUrl', label: 'Management console URL (https://xxx.sentinelone.net)' },
    { key: 'token', label: 'API token', secret: true },
  ],
  test, fetchSignals,
};
