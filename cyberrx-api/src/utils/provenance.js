'use strict';

/**
 * provenance — one source of truth for how a number's origin and trustworthiness
 * is described to the customer. Every executive-facing metric carries a
 * provenance envelope so a CISO can see, at a glance, whether a figure is real
 * telemetry, a derived estimate, a model output, or sample/demo data.
 *
 *   mode:       'live'     directly measured (connected system or attested intake)
 *               'derived'  computed from other live signals
 *               'modeled'  produced by a Nerion model (e.g. loss Monte Carlo)
 *               'demo'     sample/placeholder — the org hasn't supplied input yet
 *   source:     human-readable origin ('Okta', 'CISA KEV', 'Posture engine', ...)
 *   confidence: 0–100, how much to trust the value (defaulted by mode, tunable)
 *   asOf:       when the underlying data was captured (null for demo)
 *   lineage:    short formula for derived values ('from EDR coverage gap')
 */

const MODES = ['live', 'derived', 'modeled', 'demo'];
const DEFAULT_CONFIDENCE = { live: 92, derived: 65, modeled: 45, demo: 15 };
const LABEL = { live: 'Live', derived: 'Derived', modeled: 'Modeled', demo: 'Demo' };

const clampConf = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

// Build a single provenance envelope.
function prov(mode, source, opts = {}) {
  const m = MODES.includes(mode) ? mode : 'modeled';
  return {
    mode: m,
    source: source || (m === 'demo' ? 'Sample data' : m === 'modeled' ? 'Nerion model' : 'Unspecified'),
    confidence: clampConf(opts.confidence != null ? opts.confidence : DEFAULT_CONFIDENCE[m]),
    asOf: opts.asOf || null,
    lineage: opts.lineage || null,
  };
}

// Roll up a set of envelopes into one representative envelope (for a section or
// domain): the dominant mode leads, confidence is averaged, and the full mix is
// preserved so a popover can show "70% live · 20% derived · 10% demo".
function aggregate(provs, source) {
  const counts = { live: 0, derived: 0, modeled: 0, demo: 0 };
  let cSum = 0, n = 0, asOf = null;
  (provs || []).forEach((p) => {
    if (!p || counts[p.mode] == null) return;
    counts[p.mode]++; cSum += p.confidence || 0; n++;
    if (p.asOf && (!asOf || p.asOf > asOf)) asOf = p.asOf;
  });
  const total = n || 1;
  // Dominant mode for the headline chip; ties resolve toward the lower-trust mode
  // (walk lowest→highest trust with a strict >) so we never overstate freshness.
  let dominant = 'demo', max = -1;
  ['demo', 'modeled', 'derived', 'live'].forEach((m) => { if (counts[m] > max) { max = counts[m]; dominant = m; } });
  const pc = (a) => Math.round((a / total) * 100);
  return {
    mode: dominant, source: source || 'Mixed sources',
    confidence: n ? Math.round(cSum / n) : 0, asOf,
    total: n, counts,
    pct: { live: pc(counts.live), derived: pc(counts.derived), modeled: pc(counts.modeled), demo: pc(counts.demo) },
  };
}

module.exports = { prov, aggregate, MODES, DEFAULT_CONFIDENCE, LABEL };
