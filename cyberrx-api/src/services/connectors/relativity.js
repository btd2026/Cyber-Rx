'use strict';

/**
 * Relativity connector (read-only, Relativity Legal Hold REST API).
 *
 * Fills legal_holds — the number of active litigation holds across the
 * Relativity Legal Hold application (defensible preservation for e-discovery).
 * Auth is HTTP Basic (or bearer) against the Relativity REST endpoint; reads the
 * Legal Hold projects and counts those in an active/issued state. Built to the
 * documented Relativity contract; validate against your instance before relying
 * on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({
  Authorization: creds.bearerToken ? `Bearer ${creds.bearerToken}` : `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`,
  'X-CSRF-Header': '-', 'Content-Type': 'application/json', Accept: 'application/json',
});
const holdsUrl = (creds) => `${base(creds)}/Relativity.LegalHold/api/v1/workspaces/${creds.workspaceId}/projects`;
const isActive = (p) => /active|issued|in ?progress|open/i.test(String(p.status || (p.Status && p.Status.name) || ''));

async function test(creds) {
  if (!base(creds) || !creds.workspaceId || (!creds.bearerToken && !(creds.username && creds.password))) {
    throw new Error('Relativity base URL, workspace ID and a bearer token (or username + password) are required.');
  }
  await jsonOrThrow(await http(holdsUrl(creds), { headers: authH(creds) }), 'Relativity');
  return { ok: true, detail: 'Authenticated to the Relativity Legal Hold API.' };
}

async function fetchSignals(creds) {
  const j = await jsonOrThrow(await http(holdsUrl(creds), { headers: authH(creds) }), 'Relativity');
  const projects = j.projects || j.Projects || (Array.isArray(j) ? j : []);
  const active = projects.filter(isActive).length;
  return { signals: [{ key: 'legal_holds', value: active, asOf: nowIso(), raw: { projects: projects.length, active } }], meta: { vendor: 'Relativity' } };
}

module.exports = {
  key: 'relativity', label: 'Relativity', vendor: 'Relativity', category: 'Legal Hold / e-Discovery',
  signals: ['legal_holds'],
  scopes: ['Legal Hold — projects read'],
  fields: [
    { key: 'baseUrl', label: 'Relativity REST URL (https://relativity.example.com)' },
    { key: 'workspaceId', label: 'Legal Hold workspace (artifact) ID' },
    { key: 'bearerToken', label: 'Bearer token (OAuth) — or use username/password', secret: true, optional: true },
    { key: 'username', label: 'Username (if not using a bearer token)', optional: true },
    { key: 'password', label: 'Password (if not using a bearer token)', secret: true, optional: true },
  ],
  test, fetchSignals,
};
