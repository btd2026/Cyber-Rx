'use strict';

/**
 * SAP GRC connector (read-only, SAP GRC Access Control + optional Process
 * Control / Business Integrity Screening OData services).
 *
 * Fills the SOX-ITGC / financial-crime signals the CFO seat reads:
 *   sod_conflicts     — open segregation-of-duties violations from GRC Access
 *                       Control risk analysis (the material-weakness risk)
 *   change_pass_pct   — control-test pass rate from GRC Process Control
 *                       (change-management ITGC) — best effort
 *   payment_anomalies — flagged payment / vendor-master exceptions from
 *                       Business Integrity Screening — best effort
 *
 * Auth is HTTP Basic against the SAP gateway (a read-only GRC display user).
 * sod_conflicts is the primary, always-returned signal; the other two come from
 * optional modules and never fail the sync if unlicensed. Built to the
 * documented SAP GRC OData contract; validate against your GRC configuration
 * (service names / field names vary by release + activation) before relying
 * on it.
 */

const { http, jsonOrThrow, nowIso } = require('./http');

const base = (creds) => String(creds.baseUrl || '').replace(/\/+$/, '');
const authH = (creds) => ({
  Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`,
  Accept: 'application/json',
});
const rows = (j) => (j && j.d && (j.d.results || (Array.isArray(j.d) ? j.d : [j.d]))) || (j && j.value) || [];

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) throw new Error('SAP gateway base URL, username and password are required.');
  await jsonOrThrow(await http(`${base(creds)}/sap/opu/odata/sap/GRAC_RISK_ANALYSIS_SRV/$metadata`, { headers: { ...authH(creds), Accept: 'application/xml' } }), 'SAP GRC');
  return { ok: true, detail: 'Authenticated to the SAP GRC OData service.' };
}

async function fetchSignals(creds) {
  const H = authH(creds);
  const signals = [];
  // Primary — open SoD violations from GRC Access Control.
  try {
    const url = `${base(creds)}/sap/opu/odata/sap/GRAC_RISK_ANALYSIS_SRV/RiskViolationSet?$format=json&$filter=${encodeURIComponent("Status eq 'OPEN'")}`;
    const j = await jsonOrThrow(await http(url, { headers: H }), 'SAP GRC');
    const violations = rows(j);
    signals.push({ key: 'sod_conflicts', value: violations.length, asOf: nowIso(), raw: { openViolations: violations.length } });
  } catch (e) { if (/HTTP 401|HTTP 403/.test(e.message)) throw e; }
  // Best effort — change-control pass rate from Process Control.
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/sap/opu/odata/sap/GRPC_CONTROL_TEST_SRV/ControlTestSet?$format=json`, { headers: H }), 'SAP GRC');
    const tests = rows(j);
    if (tests.length) {
      const passed = tests.filter((t) => /pass|effective|adequate/i.test(String(t.Result || t.Rating || ''))).length;
      signals.push({ key: 'change_pass_pct', value: Math.round((passed / tests.length) * 100), asOf: nowIso(), raw: { tests: tests.length, passed } });
    }
  } catch (_) { /* Process Control not activated — skip */ }
  // Best effort — payment / vendor-master anomalies from Business Integrity Screening.
  try {
    const j = await jsonOrThrow(await http(`${base(creds)}/sap/opu/odata/sap/GRAC_BIS_ALERT_SRV/AlertSet?$format=json&$filter=${encodeURIComponent("Status eq 'OPEN'")}`, { headers: H }), 'SAP GRC');
    const alerts = rows(j);
    signals.push({ key: 'payment_anomalies', value: alerts.length, asOf: nowIso(), raw: { openAlerts: alerts.length } });
  } catch (_) { /* Business Integrity Screening not licensed — skip */ }
  if (!signals.length) throw new Error('Authenticated, but no GRC risk-analysis data was readable — confirm the display user can read the risk-analysis service.');
  return { signals, meta: { vendor: 'SAP GRC' } };
}

module.exports = {
  key: 'sap', label: 'SAP GRC', vendor: 'SAP', category: 'ERP / SOX ITGC',
  signals: ['sod_conflicts', 'change_pass_pct', 'payment_anomalies'],
  scopes: ['GRC Access Control display (read-only)'],
  fields: [
    { key: 'baseUrl', label: 'SAP gateway base URL (https://sap.example.com)' },
    { key: 'username', label: 'GRC display user' },
    { key: 'password', label: 'Password', secret: true },
  ],
  test, fetchSignals,
};
