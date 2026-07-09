'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');

// Tenable.io (CC7.1) — pulls scan_coverage_denominator (assets in the
// container), open_critical_vulns (open severity-4/critical workbench vulns),
// vuln_scan_cadence (most recent scan recency) and remediation_sla_met (true
// only when no critical is open). Documented workbenches/scans API with
// read-only API keys; validate against a live container before trusting.
const authH = (c) => ({ 'X-ApiKeys': 'accessKey=' + (c.accessKey || c.access_key) + ';secretKey=' + (c.secretKey || c.secret_key), Accept: 'application/json' });
const recency = (ms) => { const d = Math.max(0, Math.floor((Date.now() - ms) / 864e5)); return d === 0 ? 'last scan today' : 'last scan ' + d + 'd ago'; };

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  if (!(c.accessKey || c.access_key) || !(c.secretKey || c.secret_key)) return {};
  const base = String(c.baseUrl || c.base_url || 'https://cloud.tenable.com').replace(/\/+$/, '');
  const out = {};
  const get = async (path) => jsonOrThrow(await H(base + path, { headers: authH(c) }), 'Tenable');

  // Asset inventory → denominator.
  try { const j = await get('/workbenches/assets/info'); const n = j && j.info && Number(j.info.total); if (Number.isFinite(n)) out.scan_coverage_denominator = n; } catch (_) {}
  // Open critical (severity 4) vulnerabilities across the estate → open_critical_vulns.
  try {
    const j = await get('/workbenches/vulnerabilities?filter.0.filter=severity&filter.0.quality=eq&filter.0.value=4&date_range=90');
    const n = j && (j.total_vulnerability_count != null ? Number(j.total_vulnerability_count) : (Array.isArray(j.vulnerabilities) ? j.vulnerabilities.length : NaN));
    if (Number.isFinite(n)) out.open_critical_vulns = n;
  } catch (_) {}
  // Most recent completed scan → cadence/recency.
  try {
    const j = await get('/scans');
    const times = ((j && j.scans) || []).map((s) => Number(s.last_modification_date)).filter((t) => Number.isFinite(t) && t > 0);
    if (times.length) out.vuln_scan_cadence = recency(Math.max.apply(null, times) * 1000);
  } catch (_) {}
  // No open critical ⇒ none past SLA (provable); otherwise omit → control stays partial.
  if (out.open_critical_vulns === 0) out.remediation_sla_met = true;
  return out;
}
module.exports = { key: 'tenable', collect };
