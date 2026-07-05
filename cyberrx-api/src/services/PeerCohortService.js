'use strict';

/**
 * PeerCohortService — anonymous peer-comparison aggregation for the DTNKSHIELD
 * peer benchmark. Participants OPT IN and submit ONLY anonymized fields (overall &
 * per-function CMMI + industry / region / size band — no org name, no inventory,
 * no IPs). This service computes cohort percentiles behind a k-anonymity gate so no
 * single organization can be re-identified. Pure + deterministic (no DB, no
 * network), so the privacy-critical math is unit-tested.
 */

const MIN_COHORT = 5; // never return aggregates for a cohort smaller than this

function round(x) { return x == null ? null : Math.round(x * 100) / 100; }

// Linear-interpolated percentile over a sorted numeric array.
function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo);
}

function stats(vals) {
  const s = (vals || []).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return null;
  return { p25: round(percentile(s, 0.25)), p50: round(percentile(s, 0.5)), p75: round(percentile(s, 0.75)), min: round(s[0]), max: round(s[s.length - 1]) };
}

// Where a value sits in the cohort, as a percentile (0-100).
function percentileOf(value, vals) {
  const s = (vals || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length || !Number.isFinite(Number(value))) return null;
  return Math.round(s.filter((v) => v <= Number(value)).length / s.length * 100);
}

// Revenue → size band (a coarse cohort key, never the raw figure).
function sizeBand(revenue) {
  const r = Number(revenue) || 0;
  if (r >= 100e9) return 'mega'; if (r >= 10e9) return 'large'; if (r >= 1e9) return 'mid'; if (r > 0) return 'small';
  return 'unknown';
}

// Strip a submission to ONLY the allowed anonymized fields — a hard privacy gate so
// nothing identifying is stored even if a client sends more.
function sanitize(sub) {
  sub = sub || {};
  const clamp = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n * 100) / 100)) : null; };
  const fc = {}; const src = sub.function_cmmi || {};
  Object.keys(src).slice(0, 20).forEach((k) => { const v = clamp(src[k]); if (v != null) fc[String(k).slice(0, 60)] = v; });
  return {
    industry: (String(sub.industry || '').trim().toLowerCase().slice(0, 40)) || 'unknown',
    region: (String(sub.region || '').trim().toLowerCase().slice(0, 20)) || 'global',
    size_band: sub.revenue != null ? sizeBand(sub.revenue) : ((String(sub.size_band || '').trim().toLowerCase().slice(0, 20)) || 'unknown'),
    overall_cmmi: clamp(sub.overall_cmmi),
    function_cmmi: fc,
  };
}

/**
 * Aggregate cohort rows into percentiles. Returns { sufficient:false } when the
 * cohort is below MIN_COHORT (k-anonymity), so a lone submitter can't read back
 * their own value. Per-function stats are also gated by cohort size.
 * @param {Array} rows [{ overall_cmmi, function_cmmi:{...} }]
 */
function aggregate(rows, opts = {}) {
  const min = opts.minCohort || MIN_COHORT;
  const list = Array.isArray(rows) ? rows : [];
  if (list.length < min) return { n: list.length, sufficient: false, minCohort: min };
  const overallVals = list.map((r) => Number(r.overall_cmmi)).filter(Number.isFinite);
  const byFn = {};
  list.forEach((r) => { const f = r.function_cmmi || {}; Object.keys(f).forEach((k) => { (byFn[k] = byFn[k] || []).push(Number(f[k])); }); });
  const functions = {};
  Object.keys(byFn).forEach((k) => { if (byFn[k].filter(Number.isFinite).length >= min) functions[k] = stats(byFn[k]); });
  return { n: list.length, sufficient: true, minCohort: min, overall: stats(overallVals), overall_values: overallVals, functions };
}

module.exports = { percentile, stats, percentileOf, sizeBand, sanitize, aggregate, MIN_COHORT };
