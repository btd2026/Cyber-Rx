'use strict';

/**
 * Elastic Security connector (read-only, Kibana API key auth). Fills
 * open_incidents (open detection-engine signals) and siem_log_sources (indices
 * reporting to the cluster). Auth is the documented `Authorization: ApiKey
 * <base64>` header against the Kibana base URL; the log-source count uses the
 * Elasticsearch `_cat/indices` API when an ES URL is provided. Built to the
 * documented Kibana/Elasticsearch contract; validate against a real deployment
 * with a read-only API key before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const kbn = (creds) => String(creds.kibanaUrl || '').replace(/\/+$/, '');
const es = (creds) => String(creds.esUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `ApiKey ${creds.apiKey}`, Accept: 'application/json' });

// Count open signals via the detection-engine search (size 0, exact total).
async function openSignals(creds) {
  const body = JSON.stringify({
    query: { bool: { filter: [{ term: { 'signal.status': 'open' } }] } },
    size: 0, track_total_hits: true,
  });
  const j = await jsonOrThrow(await http(`${kbn(creds)}/api/detection_engine/signals/search`,
    { method: 'POST', headers: { ...authH(creds), 'Content-Type': 'application/json', 'kbn-xsrf': 'nerion' }, body }), 'Elastic');
  const total = j && j.hits && j.hits.total;
  const n = total && typeof total === 'object' ? total.value : total;
  return Number.isFinite(Number(n)) ? Number(n) : null;
}

async function test(creds) {
  if (!creds.kibanaUrl || !creds.apiKey) throw new Error('Elastic: Kibana URL and an API key are required.');
  await jsonOrThrow(await http(`${kbn(creds)}/api/detection_engine/index`,
    { headers: { ...authH(creds), 'kbn-xsrf': 'nerion' } }), 'Elastic');
  return { ok: true, detail: 'Authenticated to the Kibana detection-engine API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  const open = await openSignals(creds);
  if (open != null) signals.push({ key: 'open_incidents', value: Math.round(open), asOf: nowIso(), raw: {} });
  // Best-effort log-source count: indices reporting to the cluster (needs an ES URL).
  try {
    if (es(creds)) {
      const rows = await jsonOrThrow(await http(`${es(creds)}/_cat/indices?format=json&h=index`, { headers: authH(creds) }), 'Elastic');
      if (Array.isArray(rows)) signals.push({ key: 'siem_log_sources', value: rows.length, asOf: nowIso(), raw: {} });
    }
  } catch (_) { /* ES _cat access optional — set esUrl + monitor privileges to enable */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the API key can read detection-engine signals.');
  return { signals, meta: { vendor: 'Elastic' } };
}

module.exports = {
  key: 'elastic', label: 'Elastic Security', vendor: 'Elastic', category: 'SIEM / Log analytics',
  signals: ['open_incidents', 'siem_log_sources'],
  scopes: ['read-only API key (siem/detection read, monitor cluster)'],
  fields: [
    { key: 'kibanaUrl', label: 'Kibana URL (https://<kibana-host>:5601)' },
    { key: 'esUrl', label: 'Elasticsearch URL (optional — enables log-source count)', optional: true },
    { key: 'apiKey', label: 'API key (base64 id:key)', secret: true },
  ],
  test, fetchSignals,
};
