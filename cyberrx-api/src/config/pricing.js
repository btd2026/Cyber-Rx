'use strict';

/**
 * Per-model token pricing (USD per 1M tokens) for cost telemetry. These are
 * ESTIMATES for observability, not billing — override with PRICING_JSON (a JSON
 * map of model -> {input, output, cached_read}) when rates change. The Batch API
 * is ~50% off; callers pass { batch: true } to halve input+output.
 *
 * cached_read is the price for prompt-cache hits (~10% of base input).
 */

const DEFAULTS = {
  'claude-opus-4-8': { input: 15, output: 75, cached_read: 1.5 },
  'claude-sonnet-4-6': { input: 3, output: 15, cached_read: 0.3 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4, cached_read: 0.08 },
};

function table() {
  if (!process.env.PRICING_JSON) return DEFAULTS;
  try { return { ...DEFAULTS, ...JSON.parse(process.env.PRICING_JSON) }; }
  catch (_) { return DEFAULTS; }
}

function rateFor(model) {
  const t = table();
  return t[model] || t['claude-sonnet-4-6']; // sensible fallback
}

/**
 * @param {string} model
 * @param {{input?:number,output?:number,cached_read?:number}} usage  token counts
 * @param {{batch?:boolean}} [opts]
 * @returns {number} estimated USD
 */
function estCost(model, usage = {}, opts = {}) {
  const r = rateFor(model);
  const disc = opts.batch ? 0.5 : 1;
  const input = (Number(usage.input) || 0) * r.input * disc;
  const output = (Number(usage.output) || 0) * r.output * disc;
  const cached = (Number(usage.cached_read) || 0) * r.cached_read; // cache reads aren't batch-discounted
  return (input + output + cached) / 1e6;
}

module.exports = { DEFAULTS, rateFor, estCost };
