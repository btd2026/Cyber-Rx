'use strict';

/**
 * GitHub connector (read-only, org-level, REST API v2022-11-28).
 *
 * Fills the product-security signals the Chief Product seat needs:
 *  - code_scanning_open   — open code-scanning (SAST) alerts across the org:
 *                           GET /orgs/{org}/code-scanning/alerts?state=open
 *  - dependabot_critical  — open CRITICAL Dependabot (SCA) alerts across the org:
 *                           GET /orgs/{org}/dependabot/alerts?state=open&severity=critical
 *
 * Both are documented GitHub REST endpoints (GitHub Advanced Security /
 * Dependabot). Counts are obtained by paging the list (capped) since GitHub
 * returns arrays, not totals. Auth is a PAT or GitHub App token with the
 * `security_events` (and `repo` for private) scope. Built to the documented API
 * contract; validate against a real org with a read-only token before relying
 * on it. If a feature is disabled for the org, its signal is simply omitted.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const api = (c) => String(c.apiUrl || 'https://api.github.com').replace(/\/+$/, '');
function hdr(c) {
  return { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}

// Page the list endpoint and count items (capped so a huge org can't hang us).
async function countList(creds, pathAndQuery, cap = 20) {
  let total = 0, page = 1;
  while (page <= cap) {
    const sep = pathAndQuery.indexOf('?') >= 0 ? '&' : '?';
    const r = await http(`${api(creds)}${pathAndQuery}${sep}per_page=100&page=${page}`, { headers: hdr(creds) });
    const j = await jsonOrThrow(r, 'GitHub');
    if (!Array.isArray(j)) break;
    total += j.length;
    if (j.length < 100) break;
    page += 1;
  }
  return total;
}

async function test(creds) {
  if (!creds.org || !creds.token) throw new Error('GitHub organization and a token (security_events scope) are required.');
  const r = await http(`${api(creds)}/orgs/${encodeURIComponent(creds.org)}`, { headers: hdr(creds) });
  await jsonOrThrow(r, 'GitHub');
  return { ok: true, detail: `Authenticated to the GitHub org “${creds.org}”.` };
}

async function fetchSignals(creds) {
  const org = encodeURIComponent(creds.org);
  const signals = [];
  try {
    const cs = await countList(creds, `/orgs/${org}/code-scanning/alerts?state=open`);
    signals.push({ key: 'code_scanning_open', value: cs, asOf: nowIso(), raw: { state: 'open' } });
  } catch (e) { /* Advanced Security may be disabled for the org */ }
  try {
    const db = await countList(creds, `/orgs/${org}/dependabot/alerts?state=open&severity=critical`);
    signals.push({ key: 'dependabot_critical', value: db, asOf: nowIso(), raw: { severity: 'critical', state: 'open' } });
  } catch (e) { /* Dependabot may be disabled for the org */ }
  if (!signals.length) throw new Error('Authenticated, but neither code-scanning nor Dependabot alerts were readable — enable GitHub Advanced Security / Dependabot and grant the security_events scope.');
  return { signals, meta: { vendor: 'GitHub', org: creds.org } };
}

module.exports = {
  key: 'github', label: 'GitHub', vendor: 'GitHub', category: 'Product Security (DevSecOps)',
  signals: ['code_scanning_open', 'dependabot_critical'],
  scopes: ['security_events', 'repo (private repos)'],
  fields: [
    { key: 'org', label: 'GitHub organization' },
    { key: 'token', label: 'PAT / GitHub App token (security_events)', secret: true },
    { key: 'apiUrl', label: 'API URL (optional — GitHub Enterprise Server)', optional: true },
  ],
  test, fetchSignals,
};
