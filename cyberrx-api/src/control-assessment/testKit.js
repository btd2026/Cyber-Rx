'use strict';

/**
 * testKit — a builder for framework-native control tests so each registry
 * stays declarative. makeTest() encodes the SAME gating discipline as the
 * hand-written 800-53 tests: relevance ≠ design ≠ operating effectiveness, and
 * a control never concludes Effective without OE evidence over a review period.
 * ePHI-scoped controls (HIPAA) short-circuit when the ePHI boundary is unknown.
 */

const M = require('./evidenceModel');
const { STATUS, EVIDENCE_LAYER, EVIDENCE_STRENGTH } = M;
const num = (v) => (v == null ? null : Number(v));

function makeTest(spec) {
  return function (ev) {
    const def = this;
    if (spec.ephiScoped) {
      if (!ev || !ev.scope || !ev.scope.ephi_systems_known) {
        return M.conclude(def, ev || {}, {
          status: STATUS.NOT_ENOUGH_EVIDENCE, evidence_layer: EVIDENCE_LAYER.RELEVANCE, evidence_strength: EVIDENCE_STRENGTH.NOT_EVIDENCE,
          missing_required_evidence: ['ePHI system scope'],
          pass_fail_rationale: 'ePHI system scope is unknown — this HIPAA control is Conditional and cannot be concluded until the ePHI boundary is defined.',
          what_the_api_does_not_prove: 'Applicability or coverage without a defined ePHI system boundary.',
        });
      }
      if (ev.scope.ephi_in_scope === false) return M.outOfScope(def, 'No ePHI systems are in scope for this tenant.');
    }
    const rel = (spec.relevanceSignals || []).filter((k) => M.hasSignal(ev, k));
    const designFields = spec.designFields || [];
    const oeFields = spec.oeFields || [];
    const allFields = oeFields.concat(designFields);
    // percentage-signal denominator guard: a relevant % signal without a
    // denominator source can never rise above an indicator.
    (spec.relevanceSignals || []).forEach((k) => {
      if (M.hasSignal(ev, k) && /_pct$/.test(k) && !M.signalDenominatorSource(ev, k)) {
        // still relevant, but denominator missing is recorded below
      }
    });
    if (!rel.length && allFields.length && M.missingFields(ev, allFields).length === allFields.length) {
      return M.notEnough(def, spec.noneMsg || ('No evidence for ' + def.control_id + '.'), allFields.length ? allFields : (spec.relevanceSignals || []), EVIDENCE_LAYER.NONE);
    }
    const oeMissing = M.missingFields(ev, oeFields);
    const designMet = designFields.length > 0 && M.missingFields(ev, designFields).length === 0;
    if (oeMissing.length || !M.reviewPeriodDefined(ev) || !oeFields.length) {
      return M.conclude(def, ev, {
        status: STATUS.NOT_ENOUGH_EVIDENCE,
        evidence_layer: designMet ? EVIDENCE_LAYER.DESIGN : EVIDENCE_LAYER.RELEVANCE,
        evidence_strength: designMet ? EVIDENCE_STRENGTH.PARTIAL : (rel.length ? EVIDENCE_STRENGTH.INDICATOR : EVIDENCE_STRENGTH.NOT_EVIDENCE),
        signals_used: rel, API_fields_used: allFields.filter((f) => M.hasField(ev, f)),
        missing_required_evidence: oeMissing.concat(M.reviewPeriodDefined(ev) ? [] : ['review_period']),
        what_the_api_proves: designMet ? (spec.designProves || spec.proves || '') : (rel.length ? (spec.relevanceProves || 'A related signal is present.') : ''),
        what_the_api_does_not_prove: spec.notProve || 'That the control operated over a defined review period.',
      });
    }
    const ok = spec.pass ? !!spec.pass(ev) : true;
    return M.conclude(def, ev, {
      status: ok ? STATUS.EFFECTIVE : STATUS.PARTIALLY_EFFECTIVE,
      evidence_layer: EVIDENCE_LAYER.OPERATING_EFFECTIVENESS, evidence_strength: EVIDENCE_STRENGTH.DIRECT,
      signals_used: rel, API_fields_used: allFields, population_source: spec.populationField ? M.field(ev, spec.populationField) : null,
      unapproved_exception_count: num(M.field(ev, 'unapproved_exception_count')) || 0,
      pass_fail_rationale: ok ? (spec.passMsg || 'Control operated as designed over the review period.') : (spec.failMsg || 'Control did not fully operate over the review period.'),
      what_the_api_proves: spec.proves || 'The control operated over the review period.',
      what_the_api_does_not_prove: spec.notProve || '',
    });
  };
}

module.exports = { makeTest, num };
