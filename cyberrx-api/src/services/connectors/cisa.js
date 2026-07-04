'use strict';

/**
 * CISA Known Exploited Vulnerabilities connector (FREE — public, no auth).
 *
 * A zero-cost, zero-credential live feed: fills exploited_cves — the count of
 * CVEs added to CISA's KEV catalog in the last 30 days (vulnerabilities being
 * actively exploited in the wild right now). Surfaced in the CISO threat panel
 * as "what attackers are exploiting today," alongside the sector actor list.
 *
 * Source: the public KEV JSON at cisa.gov (no API key, no account). Built to the
 * documented KEV feed; the schema is stable and government-published.
 *
 * Cost: FREE. No signup, no key.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const url = (creds) => String(creds.feedUrl || 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');

async function fetchKev(creds) {
  const j = await jsonOrThrow(await http(url(creds), { headers: { Accept: 'application/json' } }), 'CISA KEV');
  const vulns = (j && j.vulnerabilities) || [];
  if (!Array.isArray(vulns) || !vulns.length) throw new Error('CISA KEV feed returned no vulnerabilities.');
  return vulns;
}

async function test(creds) {
  await fetchKev(creds);
  return { ok: true, detail: 'Reached the public CISA KEV catalog (no credentials required).' };
}

async function fetchSignals(creds) {
  const vulns = await fetchKev(creds);
  const cutoff = Date.now() - 30 * 864e5;
  const recent = vulns.filter((v) => { const d = Date.parse(v.dateAdded || ''); return Number.isFinite(d) && d >= cutoff; });
  return { signals: [
    { key: 'exploited_cves', value: recent.length, asOf: nowIso(), raw: { totalKev: vulns.length, addedLast30d: recent.length } },
  ], meta: { vendor: 'CISA KEV' } };
}

module.exports = {
  key: 'cisa', label: 'CISA KEV (free)', vendor: 'CISA', category: 'Threat Intelligence', tier: 'free',
  signals: ['exploited_cves'],
  scopes: ['Public feed — no authentication'],
  fields: [
    { key: 'feedUrl', label: 'KEV feed URL (optional — defaults to the public CISA catalog)', optional: true },
  ],
  test, fetchSignals,
};
