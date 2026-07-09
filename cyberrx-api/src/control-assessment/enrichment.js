'use strict';

/**
 * enrichment — pipeline step 3. Turns raw connector telemetry into an enriched
 * evidence bundle the framework-native tests consume. Enrichment attaches the
 * things telemetry alone lacks: denominator source, scope (incl. ePHI flag),
 * review period, connector live-validation status and freshness. It NEVER
 * invents evidence — absent fields stay absent, which the tests read as
 * Not Enough Evidence.
 */

// rawSignals: array of { key, value, source, as_of, fresh } (from IntegrationService.signalsForOrg)
// context: { denominatorSources:{signalKey:source}, fields:{}, scope:{}, reviewPeriod:{start,end},
//            connectorValidation:{connector:{live_tenant_validated}}, freshnessDays }
function buildEvidence(rawSignals, context) {
  context = context || {};
  const signals = {};
  (rawSignals || []).forEach((s) => {
    if (!s || s.key == null) return;
    signals[s.key] = {
      value: s.value,
      denominator_source: (context.denominatorSources && context.denominatorSources[s.key]) || null,
      as_of: s.as_of || null,
      scope: (context.signalScope && context.signalScope[s.key]) || null,
    };
  });
  return {
    signals,
    fields: context.fields || {},
    scope: context.scope || { ephi_systems_known: false, ephi_in_scope: null },
    review_period: context.reviewPeriod || null,
    connector_validation: context.connectorValidation || {},
    freshness_days: (typeof context.freshnessDays === 'number') ? context.freshnessDays : Infinity,
  };
}

module.exports = { buildEvidence };
