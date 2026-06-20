'use strict';

/**
 * Tenable.io connector (read-only API keys). Derives patch_pct / vuln_sla_pct as
 * the share of assets with no critical/high vulnerability ("clean asset rate"),
 * plus the critical-vulnerability count. Built to the documented workbenches API;
 * validate against a real container before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

function authHeader(creds) { return { 'X-ApiKeys': `accessKey=${creds.accessKey};secretKey=${creds.secretKey}`, Accept: 'application/json' }; }

async function test(creds) {
  if (!creds.accessKey || !creds.secretKey) throw new Error('Tenable access key and secret key are required.');
  const base = (creds.baseUrl || 'https://cloud.tenable.com').replace(/\/$/, '');
  await jsonOrThrow(await http(`${base}/workbenches/assets/info`, { headers: authHeader(creds) }), 'Tenable');
  return { ok: true, detail: 'Authenticated to Tenable.io.' };
}

async function fetchSignals(creds) {
  const base = (creds.baseUrl || 'https://cloud.tenable.com').replace(/\/$/, '');
  const H = authHeader(creds);
  const info = await jsonOrThrow(await http(`${base}/workbenches/assets/info`, { headers: H }), 'Tenable');
  const totalAssets = (info.info && info.info.total) || 0;
  // Assets carrying a critical or high vulnerability (severity 4 = critical, 3 = high).
  const vuln = await jsonOrThrow(await http(`${base}/workbenches/assets/vulnerabilities?filter.0.filter=severity&filter.0.quality=eq&filter.0.value=4`, { headers: H }), 'Tenable');
  const withCrit = (vuln.total_asset_count != null ? vuln.total_asset_count : (vuln.assets ? vuln.assets.length : 0)) || 0;
  const signals = [{ key: 'critical_vuln_assets', value: withCrit, asOf: nowIso(), raw: { totalAssets } }];
  if (totalAssets > 0) {
    const cleanRate = Math.max(0, Math.min(100, Math.round((1 - withCrit / totalAssets) * 100)));
    signals.push({ key: 'patch_pct', value: cleanRate, asOf: nowIso(), raw: { totalAssets, withCrit } });
    signals.push({ key: 'vuln_sla_pct', value: cleanRate, asOf: nowIso(), raw: { totalAssets, withCrit } });
  }
  return { signals, meta: { vendor: 'Tenable.io', totalAssets } };
}

module.exports = {
  key: 'tenable', label: 'Tenable.io', vendor: 'Tenable', category: 'Vulnerability',
  signals: ['patch_pct', 'vuln_sla_pct', 'critical_vuln_assets'],
  scopes: ['Read-only API key (Basic user)'],
  fields: [
    { key: 'accessKey', label: 'Access key', secret: true },
    { key: 'secretKey', label: 'Secret key', secret: true },
    { key: 'baseUrl', label: 'API base URL (default https://cloud.tenable.com)', optional: true },
  ],
  test, fetchSignals,
};
