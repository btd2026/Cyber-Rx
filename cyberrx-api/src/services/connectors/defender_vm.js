'use strict';

/**
 * Microsoft Defender Vulnerability Management connector (read-only, OAuth2
 * client-credentials → Microsoft Defender for Endpoint API). Fills patch_pct —
 * the share of onboarded machines with NO critical software CVE. Total machines
 * come from /api/machines; per-machine vulnerabilities come from
 * /api/machines/{id}/vulnerabilities (sampled to bound calls); a machine counts
 * as "patched" when none of its vulnerabilities are severity Critical. Built to
 * the documented Defender for Endpoint API contract
 * (https://learn.microsoft.com/defender-endpoint/api/); validate against a real
 * tenant with an app registration granting Vulnerability.Read.All /
 * Machine.Read.All before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const API = 'https://api.securitycenter.microsoft.com';

async function token(creds) {
  const url = `https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials', client_id: creds.clientId, client_secret: creds.clientSecret,
    scope: 'https://api.securitycenter.microsoft.com/.default',
  });
  const j = await jsonOrThrow(await http(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), 'Microsoft');
  if (!j.access_token) throw new Error('Microsoft: no access token returned.');
  return j.access_token;
}

const authH = (tk) => ({ Authorization: `Bearer ${tk}`, Accept: 'application/json' });

async function test(creds) {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret) {
    throw new Error('Microsoft tenant ID, client ID and client secret are required.');
  }
  const tk = await token(creds);
  await jsonOrThrow(await http(`${API}/api/machines?$top=1`, { headers: authH(tk) }), 'Microsoft');
  return { ok: true, detail: 'Authenticated to the Defender for Endpoint API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = authH(tk);
  const signals = [];
  try {
    const j = await jsonOrThrow(await http(`${API}/api/machines?$top=500`, { headers: H }), 'Microsoft');
    const machines = (j && j.value) || [];
    if (machines.length) {
      const sample = machines.slice(0, 60);
      let checked = 0;
      let clean = 0;
      for (const m of sample) {
        try {
          const vj = await jsonOrThrow(await http(`${API}/api/machines/${m.id}/vulnerabilities`, { headers: H }), 'Microsoft');
          const vulns = (vj && vj.value) || [];
          checked += 1;
          if (!vulns.some((v) => String(v.severity).toLowerCase() === 'critical')) clean += 1;
        } catch (_) { /* skip a machine we can't read */ }
      }
      if (checked) signals.push({ key: 'patch_pct', value: Math.round((clean / checked) * 100), asOf: nowIso(), raw: { totalMachines: machines.length, sampled: checked, clean } });
    }
  } catch (e) { if (/no access token/.test(e.message)) throw e; }
  if (!signals.length) throw new Error('Authenticated, but no machine vulnerability data was readable — confirm Vulnerability.Read.All / Machine.Read.All.');
  return { signals, meta: { vendor: 'Microsoft' } };
}

module.exports = {
  key: 'defender_vm', label: 'Microsoft Defender Vulnerability Management', vendor: 'Microsoft', category: 'Vulnerability management',
  signals: ['patch_pct'],
  scopes: ['Machine.Read.All', 'Vulnerability.Read.All'],
  fields: [
    { key: 'tenantId', label: 'Azure AD tenant ID' },
    { key: 'clientId', label: 'App registration client ID' },
    { key: 'clientSecret', label: 'App registration client secret', secret: true },
  ],
  test, fetchSignals,
};
