'use strict';
const { http: defaultHttp } = require('../../../services/connectors/http');

// Qualys VMDR (CC7.1) — pulls scan_coverage_denominator (host count),
// open_critical_vulns (open severity-5 detections), vuln_scan_cadence (last VM
// scan recency), config_monitoring_enabled (Policy Compliance module present)
// and remediation_sla_met (true only when no critical is open). The classic FO
// API returns XML, counted here with built-in regex (no XML dep). Documented
// read-only FO contract; validate against a live subscription before trusting.
const authH = (c) => ({ Authorization: 'Basic ' + Buffer.from(String(c.username || '') + ':' + String(c.password || '')).toString('base64'), 'X-Requested-With': 'Nerion' });
const countTag = (xml, tag) => (String(xml).match(new RegExp('<' + tag + '(\\s|>)', 'g')) || []).length;
const recency = (ms) => { const d = Math.max(0, Math.floor((Date.now() - ms) / 864e5)); return d === 0 ? 'last scan today' : 'last scan ' + d + 'd ago'; };

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || (c.pod ? 'https://qualysapi.' + c.pod + '.apps.qualys.com' : '')).replace(/\/+$/, '');
  if (!base || !c.username || !c.password) return {};
  const out = {};
  const text = async (path) => { const r = await H(base + path, { headers: authH(c) }); if (!r || !r.ok) throw new Error('Qualys HTTP ' + (r ? r.status : '?')); return r.text(); };

  // Host inventory in scan scope → denominator.
  try { const n = countTag(await text('/api/2.0/fo/asset/host/?action=list&truncation_limit=5000'), 'HOST'); if (n) out.scan_coverage_denominator = n; } catch (_) {}
  // Open critical (severity 5) host detections → open_critical_vulns.
  try {
    const xml = await text('/api/2.0/fo/asset/host/vm/detection/?action=list&severities=5&status=New,Active,Re-Opened&truncation_limit=1000');
    out.open_critical_vulns = countTag(xml, 'DETECTION');
  } catch (_) {}
  // Most recent VM scan launch → cadence/recency.
  try {
    const xml = await text('/api/2.0/fo/scan/?action=list&type=Scan');
    const dates = (xml.match(/<LAUNCH_DATETIME>([^<]+)<\/LAUNCH_DATETIME>/g) || []).map((s) => Date.parse(s.replace(/<\/?LAUNCH_DATETIME>/g, ''))).filter(Number.isFinite);
    if (dates.length) out.vuln_scan_cadence = recency(Math.max.apply(null, dates));
  } catch (_) {}
  // Policy Compliance module presence → configuration monitoring enabled.
  try { await text('/api/2.0/fo/scan/compliance/?action=list'); out.config_monitoring_enabled = true; } catch (_) {}
  // No open critical ⇒ none past SLA (provable); otherwise SLA is unknown → omit.
  if (out.open_critical_vulns === 0) out.remediation_sla_met = true;
  return out;
}
module.exports = { key: 'qualys', collect };
