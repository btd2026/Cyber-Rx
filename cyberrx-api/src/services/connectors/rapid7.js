'use strict';

/**
 * Rapid7 InsightVM connector (read-only, HTTP Basic auth → InsightVM console
 * REST API v3). Fills patch_pct — the share of assets with NO open critical
 * vulnerability. Each InsightVM asset carries a `vulnerabilities` rollup
 * ({ critical, severe, moderate, total }); patch_pct = assets with critical===0
 * ÷ assets sampled. Built to the documented InsightVM v3 API contract
 * (https://help.rapid7.com/insightvm/en-us/api/); validate against a real
 * console with a read-only user before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({
  Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`,
  Accept: 'application/json',
});

// The console uses a self-signed cert by default; the operator supplies a URL
// they trust. A page of assets returns { resources:[...], page:{ totalResources } }.
async function assetsPage(creds, page, size) {
  const url = `${base(creds)}/api/3/assets?page=${page}&size=${size}`;
  return jsonOrThrow(await http(url, { headers: authH(creds) }), 'Rapid7');
}

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) {
    throw new Error('Rapid7 InsightVM console URL, username and password are required.');
  }
  await assetsPage(creds, 0, 1);
  return { ok: true, detail: 'Authenticated to the InsightVM v3 API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  // Sample assets (bounded pages) and count those free of critical vulns.
  const size = 500;
  let sampled = 0;
  let clean = 0;
  let total = null;
  try {
    for (let page = 0; page < 5; page += 1) {
      const j = await assetsPage(creds, page, size);
      if (total == null) total = j && j.page ? Number(j.page.totalResources) : null;
      const rows = (j && j.resources) || [];
      for (const a of rows) {
        sampled += 1;
        const crit = a.vulnerabilities && Number(a.vulnerabilities.critical);
        if (crit === 0) clean += 1;
      }
      const totalPages = j && j.page ? Number(j.page.totalPages) : 1;
      if (rows.length < size || page + 1 >= totalPages) break;
    }
    if (sampled > 0) {
      signals.push({ key: 'patch_pct', value: Math.round((clean / sampled) * 100), asOf: nowIso(), raw: { totalAssets: total, sampled, clean } });
    }
  } catch (e) { if (/HTTP/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no assets were readable — confirm the user can view assets and their vulnerability rollups.');
  return { signals, meta: { vendor: 'Rapid7' } };
}

module.exports = {
  key: 'rapid7', label: 'Rapid7 InsightVM', vendor: 'Rapid7', category: 'Vulnerability management',
  signals: ['patch_pct'],
  scopes: ['read-only user (asset + vulnerability view)'],
  fields: [
    { key: 'baseUrl', label: 'InsightVM console URL (https://console:3780)' },
    { key: 'username', label: 'Console username' },
    { key: 'password', label: 'Console password', secret: true },
  ],
  test, fetchSignals,
};
