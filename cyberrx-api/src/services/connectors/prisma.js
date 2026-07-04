'use strict';

/**
 * Prisma Cloud connector (read-only, Prisma Cloud CSPM API).
 *
 * Fills cspm_pct — cloud-posture compliance from the compliance-posture
 * summary: passed vs failed policy checks across the connected cloud accounts.
 * Auth is the documented /login flow (access key id + secret key → JWT), then
 * GET /compliance/posture. Built to the documented Prisma Cloud contract;
 * validate against a real tenant with a read-only role before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.apiUrl || '').replace(/\/+$/, '');

async function token(creds) {
  const r = await http(`${base(creds)}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: creds.accessKeyId, password: creds.secretKey }),
  });
  const j = await jsonOrThrow(r, 'Prisma Cloud');
  if (!j.token) throw new Error('Prisma Cloud: no token returned.');
  return j.token;
}

async function test(creds) {
  if (!base(creds) || !creds.accessKeyId || !creds.secretKey) throw new Error('Prisma Cloud API URL, access key ID and secret key are required.');
  await token(creds);
  return { ok: true, detail: 'Authenticated to the Prisma Cloud API.' };
}

async function fetchSignals(creds) {
  const tk = await token(creds);
  const H = { 'x-redlock-auth': tk, Accept: 'application/json' };
  const j = await jsonOrThrow(await http(`${base(creds)}/compliance/posture`, { headers: H }), 'Prisma Cloud');
  // The posture summary reports passed/failed resource checks (aggregate).
  const root = j.summary || j;
  const passed = Number(root.totalPassed != null ? root.totalPassed : root.passedResources);
  const failed = Number(root.totalFailed != null ? root.totalFailed : root.failedResources);
  const total = (Number.isFinite(passed) ? passed : 0) + (Number.isFinite(failed) ? failed : 0);
  if (total === 0) throw new Error('Authenticated, but no compliance posture was readable — confirm the role can read compliance posture.');
  return { signals: [{ key: 'cspm_pct', value: Math.round((passed / total) * 100), asOf: nowIso(), raw: { passed, failed, total } }], meta: { vendor: 'Prisma Cloud' } };
}

module.exports = {
  key: 'prisma', label: 'Prisma Cloud', vendor: 'Palo Alto Networks', category: 'Cloud Security Posture (CSPM)',
  signals: ['cspm_pct'],
  scopes: ['Read-only role — compliance posture'],
  fields: [
    { key: 'apiUrl', label: 'Prisma Cloud API URL (https://api.prismacloud.io)' },
    { key: 'accessKeyId', label: 'Access key ID' },
    { key: 'secretKey', label: 'Secret key', secret: true },
  ],
  test, fetchSignals,
};
