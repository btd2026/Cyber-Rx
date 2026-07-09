'use strict';

/**
 * collectEvidence — pipeline steps 1–2. Driven by the requirements registry: for
 * the union of required_api_fields across all controls, it asks each connected
 * connector's collector to supply what it can, then assembles an enriched
 * evidence bundle and validates denominator/scope/review-period/freshness.
 *
 * Everything is injectable so it runs in tests without a database or live APIs.
 * A field that no connected+validated connector can supply is simply absent —
 * which the engine reads as Not Enough Evidence.
 */

const { REGISTRIES } = require('../registries');
const { buildEvidence } = require('../enrichment');
const { CONNECTOR_COLLECTORS } = require('./connectorCollectors');

// Union of every required API field the registry demands.
function requiredFields() {
  const set = new Set();
  Object.values(REGISTRIES).forEach((reg) => Object.values(reg.REGISTRY).forEach((c) => (c.required_api_fields || []).forEach((f) => set.add(f))));
  return [...set];
}

// Default review period = the trailing 90 days ending now (caller may override).
function defaultReviewPeriod(now) {
  const end = new Date(now || Date.now());
  const start = new Date(end.getTime() - 90 * 864e5);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * @param {string} orgId
 * @param {object} opts injectable providers (for tests + the route):
 *   connectors        Set/array of connected connector keys
 *   validation        { connector: { live_tenant_validated:bool } }
 *   creds             { connector: credsObject }
 *   signals           raw signals array (relevance)
 *   collectors        override CONNECTOR_COLLECTORS
 *   reviewPeriod, scope, freshnessDays, now
 */
async function collectEvidence(orgId, opts) {
  opts = opts || {};
  const collectors = opts.collectors || CONNECTOR_COLLECTORS;
  const connected = opts.connectors instanceof Set ? opts.connectors : new Set(opts.connectors || []);
  const validation = opts.validation || {};
  const creds = opts.creds || {};
  const signals = opts.signals || [];
  const period = opts.reviewPeriod || defaultReviewPeriod(opts.now);
  const scope = opts.scope || { ephi_systems_known: false, ephi_in_scope: null };

  const wanted = requiredFields();
  const fields = {};
  const report = { review_period: period, connectors_used: [], fields_collected: [], fields_missing: [], connectors_validated: [] };

  // Ask each connected connector's collector for the fields it can prove.
  for (const key of connected) {
    const collect = collectors[key];
    if (!collect) continue;
    report.connectors_used.push(key);
    if (validation[key] && validation[key].live_tenant_validated) report.connectors_validated.push(key);
    try {
      const got = await collect({ orgId, connector: key, creds: creds[key], signals, period });
      Object.keys(got || {}).forEach((f) => {
        if (got[f] !== undefined && got[f] !== null) { fields[f] = got[f]; report.fields_collected.push({ field: f, connector: key }); }
      });
    } catch (e) { report.fields_missing.push({ connector: key, reason: e.message }); }
  }
  // Record which required fields are still missing (drives Not Enough Evidence).
  const present = new Set(Object.keys(fields));
  wanted.forEach((f) => { if (!present.has(f)) report.fields_missing.push({ field: f }); });

  const evidence = buildEvidence(signals, {
    fields, scope, reviewPeriod: period, connectorValidation: validation,
    freshnessDays: opts.freshnessDays != null ? opts.freshnessDays : 30,
  });
  return { evidence, report };
}

module.exports = { collectEvidence, requiredFields, defaultReviewPeriod };
