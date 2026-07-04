'use strict';

/**
 * Workday connector (read-only, Report-as-a-Service).
 *
 * Fills sod_conflicts — the number of open segregation-of-duties violations
 * from a Workday custom report you expose as a RaaS JSON endpoint (the standard
 * Workday integration pattern for SOX access controls). The connector reads the
 * report URL you provide (authenticated with an Integration System User via
 * HTTP Basic) and counts its rows. Built to the documented RaaS contract;
 * validate against your configured report before relying on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const reportUrl = (creds) => {
  const u = String(creds.reportUrl || '');
  return u.includes('format=json') ? u : `${u}${u.includes('?') ? '&' : '?'}format=json`;
};
const authH = (creds) => ({ Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`, Accept: 'application/json' });

async function test(creds) {
  if (!creds.reportUrl || !creds.username || !creds.password) throw new Error('Workday report URL, ISU username and password are required.');
  await jsonOrThrow(await http(reportUrl(creds), { headers: authH(creds) }), 'Workday');
  return { ok: true, detail: 'Authenticated to the Workday RaaS report.' };
}

async function fetchSignals(creds) {
  const j = await jsonOrThrow(await http(reportUrl(creds), { headers: authH(creds) }), 'Workday');
  // Workday RaaS wraps rows under "Report_Entry".
  const rows = j.Report_Entry || j.report_entry || (Array.isArray(j) ? j : []);
  return { signals: [{ key: 'sod_conflicts', value: rows.length, asOf: nowIso(), raw: { violations: rows.length } }], meta: { vendor: 'Workday' } };
}

module.exports = {
  key: 'workday', label: 'Workday', vendor: 'Workday', category: 'ERP / SOX ITGC',
  signals: ['sod_conflicts'],
  scopes: ['Integration System User — RaaS report access'],
  fields: [
    { key: 'reportUrl', label: 'SoD-violations RaaS report URL (https://services1.myworkday.com/ccx/service/customreport2/...)' },
    { key: 'username', label: 'Integration System User (ISU)' },
    { key: 'password', label: 'ISU password', secret: true },
  ],
  test, fetchSignals,
};
