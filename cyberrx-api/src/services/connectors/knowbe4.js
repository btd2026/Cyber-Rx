'use strict';

/**
 * KnowBe4 connector (read-only, Bearer reporting-API token). Fills training_pct
 * (security-awareness training completion across enrollments) and phishing_pct
 * (average phish-prone rate across recent simulated campaigns). Built to the
 * documented KnowBe4 Reporting API contract; validate against a real account
 * before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

// Regional API hosts; default US. Override with a full baseUrl if needed.
const HOST = { us: 'https://us.api.knowbe4.com', eu: 'https://eu.api.knowbe4.com', ca: 'https://ca.api.knowbe4.com' };
const base = (creds) => String(creds.baseUrl || HOST[(creds.region || 'us').toLowerCase()] || HOST.us).replace(/\/+$/, '');
const authH = (creds) => ({ Authorization: `Bearer ${creds.apiToken}`, Accept: 'application/json' });

async function test(creds) {
  if (!creds.apiToken) throw new Error('A KnowBe4 reporting API token is required.');
  await jsonOrThrow(await http(`${base(creds)}/v1/account`, { headers: authH(creds) }), 'KnowBe4');
  return { ok: true, detail: 'Authenticated to the KnowBe4 Reporting API.' };
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const b = base(creds);
  const signals = [];
  // Training completion across enrollments.
  try {
    const enrollments = (await jsonOrThrow(await http(`${b}/v1/training/enrollments?per_page=500`, { headers: H }), 'KnowBe4')) || [];
    if (enrollments.length) {
      const completed = enrollments.filter((e) => String(e.status).toLowerCase() === 'completed' || String(e.status).toLowerCase() === 'passed').length;
      signals.push({ key: 'training_pct', value: Math.round((completed / enrollments.length) * 100), asOf: nowIso(), raw: { enrollments: enrollments.length, completed } });
    }
  } catch (_) { /* confirm the token can read training enrollments */ }
  // Phishing resistance: average phish-prone percentage across recent campaigns.
  try {
    const tests = (await jsonOrThrow(await http(`${b}/v1/phishing/security_tests?per_page=50`, { headers: H }), 'KnowBe4')) || [];
    const rates = tests.map((t) => Number(t.phish_prone_percentage)).filter((n) => Number.isFinite(n));
    if (rates.length) {
      const avg = rates.reduce((a, n) => a + n, 0) / rates.length;
      signals.push({ key: 'phishing_pct', value: Math.round(avg * 10) / 10, asOf: nowIso(), raw: { campaigns: rates.length } });
    }
  } catch (_) { /* phishing data optional */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm the token can read training/phishing reports.');
  return { signals, meta: { vendor: 'KnowBe4' } };
}

module.exports = {
  key: 'knowbe4', label: 'KnowBe4', vendor: 'KnowBe4', category: 'Security Awareness',
  signals: ['training_pct', 'phishing_pct'],
  scopes: ['Reporting API (read-only)'],
  fields: [
    { key: 'apiToken', label: 'Reporting API token', secret: true },
    { key: 'region', label: 'Region (us | eu | ca)', optional: true },
    { key: 'baseUrl', label: 'Base URL (optional — overrides region)', optional: true },
  ],
  test, fetchSignals,
};
