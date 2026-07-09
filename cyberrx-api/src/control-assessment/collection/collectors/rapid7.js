'use strict';
const { http: defaultHttp, jsonOrThrow } = require('../../../services/connectors/http');

// Rapid7 InsightVM (CC7.1) — pulls scan_coverage_denominator (asset count),
// open_critical_vulns (sum of per-asset critical rollups over the assets read),
// vuln_scan_cadence (most recent scan) and remediation_sla_met (true only when
// no critical is open AND every asset was covered). Documented console REST v3
// with a read-only user; validate against a live console before trusting.
const authH = (c) => ({ Authorization: 'Basic ' + Buffer.from(String(c.username || '') + ':' + String(c.password || '')).toString('base64'), Accept: 'application/json' });
const recency = (ms) => { const d = Math.max(0, Math.floor((Date.now() - ms) / 864e5)); return d === 0 ? 'last scan today' : 'last scan ' + d + 'd ago'; };

async function collect(ctx) {
  const c = ctx.creds || {};
  const H = ctx.http || defaultHttp;
  const base = String(c.baseUrl || c.base_url || '').replace(/\/+$/, '');
  if (!base || !c.username || !c.password) return {};
  const out = {};
  const get = async (path) => jsonOrThrow(await H(base + path, { headers: authH(c) }), 'Rapid7');

  // Page assets (bounded), summing critical rollups; page.totalResources → denominator.
  try {
    const size = 500; let sampled = 0; let crit = 0; let total = null;
    for (let page = 0; page < 10; page += 1) {
      const j = await get('/api/3/assets?page=' + page + '&size=' + size);
      if (total == null) total = j && j.page ? Number(j.page.totalResources) : null;
      const rows = (j && j.resources) || [];
      for (const a of rows) { sampled += 1; const n = a.vulnerabilities && Number(a.vulnerabilities.critical); if (Number.isFinite(n)) crit += n; }
      const pages = j && j.page ? Number(j.page.totalPages) : 1;
      if (rows.length < size || page + 1 >= pages) break;
    }
    if (Number.isFinite(total)) out.scan_coverage_denominator = total;
    if (sampled > 0) out.open_critical_vulns = crit;
    // SLA is provably met only with full asset coverage and zero criticals.
    if (crit === 0 && sampled > 0 && total != null && sampled >= total) out.remediation_sla_met = true;
  } catch (_) {}
  // Most recent scan → cadence/recency.
  try {
    const j = await get('/api/3/scans?page=0&size=1&sort=startTime,DESC');
    const t = Date.parse((((j && j.resources) || [])[0] || {}).startTime);
    if (Number.isFinite(t)) out.vuln_scan_cadence = recency(t);
  } catch (_) {}
  return out;
}
module.exports = { key: 'rapid7', collect };
