'use strict';

/**
 * CostMeter — accumulates token usage + estimated cost per scan, broken down by
 * stage (§3 cost telemetry). Reads the Anthropic `usage` object and tracks the
 * cache-read ratio so we can monitor that prompt caching is actually hitting.
 */

const { estCost } = require('../../config/pricing');

// Normalize an Anthropic usage object to our flat shape.
function normalizeUsage(u = {}) {
  return {
    input: Number(u.input_tokens) || 0,
    output: Number(u.output_tokens) || 0,
    cached_read: Number(u.cache_read_input_tokens) || 0,
    cache_creation: Number(u.cache_creation_input_tokens) || 0,
  };
}

class CostMeter {
  constructor() { this.stages = {}; }

  /** Record one model call's usage under a stage label. */
  record(stage, model, usage, { batch = false } = {}) {
    const u = normalizeUsage(usage);
    const s = (this.stages[stage] = this.stages[stage] || { calls: 0, input: 0, output: 0, cached_read: 0, cache_creation: 0, est_cost_usd: 0 });
    s.calls += 1; s.input += u.input; s.output += u.output; s.cached_read += u.cached_read; s.cache_creation += u.cache_creation;
    s.est_cost_usd += estCost(model, { input: u.input + u.cache_creation, output: u.output, cached_read: u.cached_read }, { batch });
    return this;
  }

  totals() {
    const t = { calls: 0, input: 0, output: 0, cached_read: 0, cache_creation: 0, est_cost_usd: 0 };
    for (const s of Object.values(this.stages)) {
      t.calls += s.calls; t.input += s.input; t.output += s.output;
      t.cached_read += s.cached_read; t.cache_creation += s.cache_creation; t.est_cost_usd += s.est_cost_usd;
    }
    t.est_cost_usd = Math.round(t.est_cost_usd * 1e6) / 1e6;
    const totalIn = t.input + t.cached_read;
    t.cache_read_ratio = totalIn ? Math.round((t.cached_read / totalIn) * 1000) / 1000 : 0;
    return t;
  }

  /** §4 scan-record token_usage shape + per-stage detail. */
  toScanUsage() {
    const t = this.totals();
    const by_stage = {};
    for (const [k, s] of Object.entries(this.stages)) by_stage[k] = { ...s, est_cost_usd: Math.round(s.est_cost_usd * 1e6) / 1e6 };
    return {
      input: t.input, cached_read: t.cached_read, output: t.output,
      est_cost_usd: t.est_cost_usd, cache_read_ratio: t.cache_read_ratio,
      calls: t.calls, by_stage,
    };
  }
}

module.exports = { CostMeter, normalizeUsage };
