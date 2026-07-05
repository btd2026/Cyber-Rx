'use strict';

/**
 * VendorRiskService — pure, deterministic third-party (tier-1 / tier-2) risk math.
 *
 * Every third-party monitoring service scores on its own scale — BitSight 250–900,
 * SecurityScorecard / Black Kite letter grades (A–F) or 0–100, RiskRecon 0–10. This
 * service normalizes ANY of them to a single 0–100 "safer-is-higher" scale so the
 * cockpit shows one comparable number — the same rating on the provider's portal,
 * just on one axis — then bands/colors it on the org's shared coverage color scale,
 * ranks worst-first, and decides when a weekly refresh is due.
 *
 * Pure (no DB, no network) so the normalization every downstream figure depends on
 * is unit-tested.
 */

// Coverage color scale — identical thresholds to the cockpit's capColor(), so a
// vendor bar reads the same as every other % bar in the product.
const BANDS = [
  { min: 90, color: 'good', label: 'strong' },
  { min: 75, color: 'blue', label: 'adequate' },
  { min: 50, color: 'warn', label: 'watch' },
  { min: 0, color: 'crit', label: 'at risk' },
];

const AT_RISK_BELOW = 75; // below adequate = posing risk today
const CRITICAL_BELOW = 50;

// Letter grade → representative 0–100 (mid-band), shared by SecurityScorecard /
// Black Kite / any A–F grader.
const GRADE_PCT = { 'A+': 97, A: 93, 'A-': 90, 'B+': 87, B: 83, 'B-': 80, 'C+': 77, C: 72, 'C-': 68, D: 55, 'D-': 52, F: 35 };

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function round(x) { return x == null ? null : Math.round(x); }

function gradeToPct(grade) {
  if (grade == null) return null;
  const g = String(grade).trim().toUpperCase();
  if (g in GRADE_PCT) return GRADE_PCT[g];
  if (/^[A-F]$/.test(g)) return GRADE_PCT[g] != null ? GRADE_PCT[g] : null;
  return null;
}

/**
 * Normalize a provider's raw rating to 0–100 (higher = safer).
 * @param {number|string} raw   numeric score or letter grade
 * @param {string} provider     securityscorecard | bitsight | blackkite | riskrecon | ...
 */
function normalizeScore(raw, provider) {
  const p = String(provider || '').toLowerCase();
  // Letter grades first (many providers hand back a grade, not a number).
  if (typeof raw === 'string' && !/^\s*\d/.test(raw)) {
    const g = gradeToPct(raw);
    return g == null ? null : g;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (/bitsight/.test(p)) return round(clamp((n - 250) / (900 - 250) * 100, 0, 100)); // 250–900
  if (/riskrecon/.test(p)) return round(clamp(n <= 10 ? n * 10 : n, 0, 100));         // 0–10
  // SecurityScorecard / Black Kite / UpGuard / Panorays already emit 0–100.
  if (n >= 0 && n <= 100) return round(n);
  // Unknown numeric range that looks like a 250–900 rating → treat as BitSight-like.
  if (n > 100 && n <= 900) return round(clamp((n - 250) / (900 - 250) * 100, 0, 100));
  return round(clamp(n, 0, 100));
}

// Score (0–100) → { color, label } on the shared coverage scale.
function band(score) {
  if (score == null || isNaN(score)) return { color: 'muted', label: 'not rated' };
  for (const b of BANDS) if (score >= b.min) return { color: b.color, label: b.label };
  return { color: 'crit', label: 'at risk' };
}

// Normalize a free-text tier to tier1 / tier2 / tier3.
function tierNorm(tier) {
  const t = String(tier == null ? '' : tier).toLowerCase();
  if (/(^|[^0-9])1|tier.?1|critical|strategic/.test(t)) return 'tier1';
  if (/(^|[^0-9])2|tier.?2|important|key/.test(t)) return 'tier2';
  if (/(^|[^0-9])3|tier.?3|low|tail/.test(t)) return 'tier3';
  return 'tier2';
}

/**
 * Build a scored, ranked vendor portfolio.
 * @param {Array} vendors [{ name, tier, domain, score|grade, provider, live, criticality }]
 * @param {Object} opts   { provider, topN }
 */
function scorePortfolio(vendors, opts = {}) {
  const provider = opts.provider || '';
  const list = (Array.isArray(vendors) ? vendors : []).map((v) => {
    const raw = v.score != null ? v.score : v.grade;
    const score = normalizeScore(raw, v.provider || provider);
    const b = band(score);
    return {
      name: v.name || v.vendor || '—',
      domain: v.domain || null,
      tier: tierNorm(v.tier),
      criticality: v.criticality || null,
      score,
      color: b.color,
      band: b.label,
      live: !!v.live,
      provider: v.provider || provider || null,
      at_risk: score != null && score < AT_RISK_BELOW,
      critical: score != null && score < CRITICAL_BELOW,
    };
  });
  // Worst (lowest score) first; unrated sink to the bottom.
  const ranked = list.slice().sort((a, b2) => {
    const av = a.score == null ? 999 : a.score, bv = b2.score == null ? 999 : b2.score;
    return av - bv;
  });
  const rated = ranked.filter((v) => v.score != null);
  const avg = rated.length ? Math.round(rated.reduce((s, v) => s + v.score, 0) / rated.length) : null;
  return {
    provider: provider || null,
    count: list.length,
    tier1: list.filter((v) => v.tier === 'tier1').length,
    tier2: list.filter((v) => v.tier === 'tier2').length,
    at_risk: rated.filter((v) => v.at_risk).length,
    critical: rated.filter((v) => v.critical).length,
    avg_score: avg,
    any_live: list.some((v) => v.live),
    top: ranked.slice(0, opts.topN || 5),
    vendors: ranked,
  };
}

// Weekly-cadence refresh gate. lastMs = epoch of the last successful refresh.
const CADENCE_MS = { daily: 864e5, weekly: 7 * 864e5, monthly: 30 * 864e5 };
function refreshDue(lastMs, cadence, nowMs) {
  const period = CADENCE_MS[String(cadence || 'weekly').toLowerCase()] || CADENCE_MS.weekly;
  if (!lastMs) return true;
  const now = Number(nowMs) || 0;
  return (now - Number(lastMs)) >= period;
}

module.exports = {
  normalizeScore, gradeToPct, band, tierNorm, scorePortfolio, refreshDue,
  BANDS, GRADE_PCT, AT_RISK_BELOW, CRITICAL_BELOW, CADENCE_MS,
};
