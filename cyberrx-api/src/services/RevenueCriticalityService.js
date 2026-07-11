'use strict';

/**
 * RevenueCriticalityService — advisory "does this process bring money?" scoring.
 *
 * This produces a SUGGESTION only (spec §3, docs/CROWNJEWEL_PIPELINE_REVENUE_GATE.md §2).
 * A human confirms it in onboarding / the CFO persona; nothing here writes a confirmation.
 *
 * Pure, deterministic, explainable — no LLM, no DB, no randomness. Every score carries a
 * per-signal `basis` breakdown that sums to the score, so the ranking is auditable. Mirrors
 * the shape/discipline of CriticalityService (crown-jewel scoring).
 *
 * Signals (each normalized 0..1, combined by weight):
 *   - financial:  entered annual revenue/financial_impact, log-scaled vs the org's largest process
 *   - function:   membership in a revenue-bearing business function/level (order-to-cash, billing, …)
 *   - name:       revenue verbs/nouns in the process name
 * Confidence is mechanical: how many independent signals actually fired.
 */

const num = (name, def) => { const v = parseFloat(process.env[name]); return Number.isFinite(v) ? v : def; };

// Tunable in one place (env-overridable), like config/criticality.js.
const WEIGHTS = () => ({
  financial: num('REVCRIT_W_FINANCIAL', 0.55), // strongest — an entered dollar figure
  function: num('REVCRIT_W_FUNCTION', 0.30), // revenue-function membership
  name: num('REVCRIT_W_NAME', 0.15), // name heuristic (weakest)
});
// At/above this advisory score a process is SUGGESTED as revenue-bearing (still needs confirmation).
const SUGGEST_THRESHOLD = () => num('REVCRIT_SUGGEST', 0.5);

const round = (n) => Math.round(n * 1000) / 1000;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
function toNum(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  // strip currency symbols / commas / suffixes like "12M", "1.4B", "250k"
  const s = String(v).trim().toLowerCase().replace(/[$,\s]/g, '');
  const m = s.match(/^(-?\d*\.?\d+)([kmb])?$/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  if (m[2] === 'k') n *= 1e3; else if (m[2] === 'm') n *= 1e6; else if (m[2] === 'b') n *= 1e9;
  return n;
}

// Revenue-bearing function / name vocabulary — industry-agnostic, our own words.
const REVENUE_TERMS = [
  'revenue', 'sales', 'billing', 'invoic', 'order-to-cash', 'order to cash', 'quote-to-cash',
  'payment', 'collections', 'premium', 'checkout', 'e-commerce', 'ecommerce', 'commerce',
  'subscription', 'renewal', 'booking', 'reservation', 'fulfil', 'merchant', 'point of sale',
  'point-of-sale', 'pos ', 'trading', 'settlement', 'underwrit', 'claims', 'disburse', 'monetiz',
];
function termHit(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  return REVENUE_TERMS.some((k) => t.includes(k));
}

/**
 * Advisory score for one process, given the org's largest financial figure for normalization.
 * @param {object} proc  { name, function?, level?, financial_impact?|revenue?|value?, criticality? }
 * @param {object} ctx   { maxFinancial?: number }  // largest financial figure across the org's processes
 * @returns {{ score:number, suggested:boolean, confidence:number, basis:object, signals:object }}
 */
function scoreProcess(proc = {}, ctx = {}) {
  const w = WEIGHTS();
  const financialRaw = toNum(proc.financial_impact != null ? proc.financial_impact
    : proc.revenue != null ? proc.revenue
      : proc.value);
  const maxFinancial = toNum(ctx.maxFinancial) || 0;

  // financial signal: log-scaled against the org's largest process figure (so a $2B process and a
  // $2M process don't both saturate). No figure entered → this signal simply does not fire.
  let financial = 0;
  if (financialRaw > 0 && maxFinancial > 0) {
    financial = clamp01(Math.log10(1 + financialRaw) / Math.log10(1 + maxFinancial));
  } else if (financialRaw > 0) {
    financial = 0.6; // a figure exists but no org max to scale against — a moderate positive signal
  }

  // function signal: is the process in a revenue-bearing function / is its level a revenue function?
  const fnText = `${proc.function || ''} ${proc.level || ''}`;
  const fnSignal = termHit(fnText) ? 1 : 0;

  // name signal: revenue vocabulary in the process name.
  const nameSignal = termHit(proc.name) ? 1 : 0;

  const basis = {
    financial: round(w.financial * financial),
    function: round(w.function * fnSignal),
    name: round(w.name * nameSignal),
  };
  const score = round(clamp01(basis.financial + basis.function + basis.name));

  // confidence = fraction of the independent signals that actually fired (mechanical, not a vibe).
  const fired = (financial > 0 ? 1 : 0) + fnSignal + nameSignal;
  const confidence = round(fired / 3);

  return {
    score,
    suggested: score >= SUGGEST_THRESHOLD(),
    confidence,
    basis,
    signals: { financial: round(financial), function: fnSignal, name: nameSignal, financial_usd: financialRaw },
  };
}

/**
 * Rank a set of processes by advisory revenue-criticality. Pure — computes the org max internally.
 * @param {object[]} processes
 * @returns {object[]} each proc echoed with { revenue_criticality_score, revenue_criticality_basis,
 *                     suggested, confidence } — DESC by score. Never sets criticality_confirmed.
 */
function rankProcesses(processes = []) {
  const list = Array.isArray(processes) ? processes : [];
  const maxFinancial = list.reduce((m, p) => {
    const v = toNum(p && (p.financial_impact != null ? p.financial_impact : p.revenue != null ? p.revenue : p.value));
    return v > m ? v : m;
  }, 0);
  return list
    .map((p) => {
      const r = scoreProcess(p, { maxFinancial });
      return {
        ...p,
        revenue_criticality_score: r.score,
        revenue_criticality_basis: r.basis,
        suggested: r.suggested,
        confidence: r.confidence,
        // pass through the confirmation state unchanged; scoring never confirms.
        criticality_confirmed: !!p.criticality_confirmed,
      };
    })
    .sort((a, b) => b.revenue_criticality_score - a.revenue_criticality_score);
}

module.exports = {
  scoreProcess,
  rankProcesses,
  // exported so the gate + tests read the same knobs
  WEIGHTS,
  SUGGEST_THRESHOLD,
  _toNum: toNum,
  _termHit: termHit,
};
