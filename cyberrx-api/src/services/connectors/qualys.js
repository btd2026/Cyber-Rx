'use strict';

/**
 * Qualys VMDR connector (read-only, HTTP Basic over the classic FO API).
 * Fills vuln_sla_pct — the remediation rate of high/critical detections,
 * computed as fixed / (active + fixed) across host detections. The FO API
 * returns XML, parsed with fast-xml-parser. Built to the documented Qualys VM
 * detection contract; validate against a real subscription with a read-only API
 * user before relying on it.
 */

const { XMLParser } = require('fast-xml-parser');
const { http, nowIso } = require('./http');

const parser = new XMLParser({ ignoreAttributes: true });
const base = (creds) => String(creds.baseUrl || (creds.pod ? `https://qualysapi.${creds.pod}.apps.qualys.com` : '')).replace(/\/+$/, '');
const authH = (creds) => ({
  Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`,
  'X-Requested-With': 'CyberRx',
});

async function getXml(creds, path) {
  const r = await http(`${base(creds)}${path}`, { headers: authH(creds) });
  if (!r || !r.ok) throw new Error(`Qualys returned HTTP ${r ? r.status : '?'}`);
  return parser.parse(await r.text());
}

// Walk the detection XML into a flat array of DETECTION nodes (single node or list).
function detections(doc) {
  const hosts = doc && doc.HOST_LIST_VM_DETECTION_OUTPUT && doc.HOST_LIST_VM_DETECTION_OUTPUT.RESPONSE
    && doc.HOST_LIST_VM_DETECTION_OUTPUT.RESPONSE.HOST_LIST
    && doc.HOST_LIST_VM_DETECTION_OUTPUT.RESPONSE.HOST_LIST.HOST;
  const hostArr = !hosts ? [] : Array.isArray(hosts) ? hosts : [hosts];
  const out = [];
  for (const h of hostArr) {
    const list = h.DETECTION_LIST && h.DETECTION_LIST.DETECTION;
    if (!list) continue;
    (Array.isArray(list) ? list : [list]).forEach((d) => out.push(d));
  }
  return out;
}

async function test(creds) {
  if (!base(creds) || !creds.username || !creds.password) throw new Error('Qualys pod (or base URL), username and password are required.');
  // about.php is the lightweight authenticated probe for the FO API.
  await getXml(creds, '/api/2.0/fo/asset/host/?action=list&truncation_limit=1');
  return { ok: true, detail: 'Authenticated to the Qualys FO API.' };
}

async function fetchSignals(creds) {
  const signals = [];
  // High/critical (severity 4-5) detection remediation rate.
  try {
    const doc = await getXml(creds, '/api/2.0/fo/asset/host/vm/detection/?action=list&severities=4-5&show_reopened_info=1&truncation_limit=1000');
    const dets = detections(doc);
    if (dets.length) {
      const fixed = dets.filter((d) => String(d.STATUS).toUpperCase() === 'FIXED').length;
      signals.push({ key: 'vuln_sla_pct', value: Math.round((fixed / dets.length) * 100), asOf: nowIso(), raw: { detections: dets.length, fixed } });
    }
  } catch (_) { /* confirm the API user can read host detections */ }
  if (!signals.length) throw new Error('Authenticated, but no readable signals — confirm there are high/critical detections and the user can read them.');
  return { signals, meta: { vendor: 'Qualys VMDR' } };
}

module.exports = {
  key: 'qualys', label: 'Qualys VMDR', vendor: 'Qualys', category: 'Vulnerability Management',
  signals: ['vuln_sla_pct'],
  scopes: ['VM read (Manager/Reader API access)'],
  fields: [
    { key: 'pod', label: 'Platform pod (e.g. qg3 — https://qualysapi.qg3.apps.qualys.com)' },
    { key: 'baseUrl', label: 'Base URL (optional — overrides pod)', optional: true },
    { key: 'username', label: 'API username' },
    { key: 'password', label: 'API password', secret: true },
  ],
  test, fetchSignals,
};
