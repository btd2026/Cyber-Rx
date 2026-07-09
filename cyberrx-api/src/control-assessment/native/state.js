'use strict';

/**
 * native/state — computes Nerion's assessment STATE for a CIS/SOC 2 control from
 * its Nerion-authored evidence test + what the tenant actually has configured and
 * evidenced. Kept pure so it is testable and never invents a conclusion.
 *
 * States (see copyrightSafety.STATE):
 *   No native test yet          — no Nerion-authored test for this control id.
 *   Native test defined         — logic exists; inputs not yet configured.
 *   Ready for assessment        — required connectors/documents/scope/denominator are in place.
 *   Assessed                    — Nerion evaluated evidence over a review period.
 *   Operating effectiveness assessed — enough telemetry/document operating evidence over time.
 *   Not Enough Evidence         — required evidence missing (never shown as Assessed).
 */

const { STATE } = require('./copyrightSafety');

// entry: a Nerion-authored native assessment definition
//   { control_id, native_test, required_connector_telemetry[], required_document_evidence[],
//     required_denominator, required_scope, ... }
// ctx: what the tenant has
//   { connectedCapabilities:Set|[], uploadedDocumentTypes:Set|[], denominatorConfigured:bool,
//     scopeConfigured:bool, result:{ assessed:bool, notEnough:bool, operatingEffectiveness:bool } }
function has(set, v) { return (set instanceof Set) ? set.has(v) : (Array.isArray(set) ? set.indexOf(v) >= 0 : false); }
function every(arr, fn) { return (arr || []).every(fn); }

function readiness(entry, ctx) {
  ctx = ctx || {};
  const telemetryOk = every(entry.required_connector_telemetry, (c) => has(ctx.connectedCapabilities, c));
  const docsOk = every(entry.required_document_evidence, (d) => has(ctx.uploadedDocumentTypes, d));
  const denomOk = !entry.required_denominator || !!ctx.denominatorConfigured;
  const scopeOk = !entry.required_scope || !!ctx.scopeConfigured;
  const missing = [];
  (entry.required_connector_telemetry || []).forEach((c) => { if (!has(ctx.connectedCapabilities, c)) missing.push('connector:' + c); });
  (entry.required_document_evidence || []).forEach((d) => { if (!has(ctx.uploadedDocumentTypes, d)) missing.push('document:' + d); });
  if (entry.required_denominator && !ctx.denominatorConfigured) missing.push('denominator');
  if (entry.required_scope && !ctx.scopeConfigured) missing.push('scope');
  return { ready: telemetryOk && docsOk && denomOk && scopeOk, missing };
}

function stateOf(entry, ctx) {
  ctx = ctx || {};
  if (!entry || !entry.native_test) return { state: STATE.NO_NATIVE_TEST, ready: false, missing_requirements: [] };
  const r = readiness(entry, ctx);
  const res = ctx.result || {};
  if (res.assessed) {
    if (res.notEnough) return { state: STATE.NOT_ENOUGH_EVIDENCE, ready: r.ready, missing_requirements: r.missing };
    if (res.operatingEffectiveness) return { state: STATE.OPERATING_EFFECTIVENESS_ASSESSED, ready: r.ready, missing_requirements: r.missing };
    return { state: STATE.ASSESSED, ready: r.ready, missing_requirements: r.missing };
  }
  return { state: r.ready ? STATE.READY_FOR_ASSESSMENT : STATE.NATIVE_TEST_DEFINED, ready: r.ready, missing_requirements: r.missing };
}

module.exports = { stateOf, readiness };
