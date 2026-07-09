'use strict';

/**
 * engine — the continuous control operating-effectiveness engine.
 *
 * HARD RULE enforced structurally: a framework is scored ONLY from its own
 * native registry. assessFramework(key) reads REGISTRIES[key] and nothing else.
 * There is no code path that lets one framework's results influence another's —
 * no crosswalk, no inheritance. A CSF score can never create a HIPAA score.
 */

const { REGISTRIES, FRAMEWORK_KEYS } = require('./registries');
const { STATUS } = require('./evidenceModel');

// Run one control's own test against the enriched evidence bundle.
function assessControl(frameworkKey, controlId, evidence) {
  const reg = REGISTRIES[frameworkKey];
  if (!reg) throw new Error('Unknown framework: ' + frameworkKey);
  const ctrl = reg.REGISTRY[controlId];
  if (!ctrl) throw new Error('Unknown control ' + controlId + ' in ' + frameworkKey);
  // `this` is the control definition, so the test reads its own metadata only.
  const result = ctrl.test.call(ctrl, evidence || {});
  result.framework_key = frameworkKey;
  return result;
}

// Assess every control in ONE framework. Never touches another framework.
function assessFramework(frameworkKey, evidence) {
  const reg = REGISTRIES[frameworkKey];
  if (!reg) throw new Error('Unknown framework: ' + frameworkKey);
  const results = Object.keys(reg.REGISTRY).map((id) => assessControl(frameworkKey, id, evidence));
  return { framework: reg.framework, framework_key: frameworkKey, results, score: frameworkScore(results) };
}

// Framework score = mean effectiveness over controls that ARE automatically
// scoreable. Not-API-testable and Out-of-scope are EXCLUDED (flagged, not zeroed).
function frameworkScore(results) {
  const scored = results.filter((r) => r.assessment_status !== STATUS.NOT_API_TESTABLE && r.assessment_status !== STATUS.OUT_OF_SCOPE);
  if (!scored.length) return { value: null, scored: 0, excluded: results.length };
  const sum = scored.reduce((s, r) => s + (Number(r.control_effectiveness_score) || 0), 0);
  return {
    value: Math.round((sum / scored.length) * 1000) / 1000,
    scored: scored.length,
    excluded: results.length - scored.length,
    effective: scored.filter((r) => r.assessment_status === STATUS.EFFECTIVE).length,
    partial: scored.filter((r) => r.assessment_status === STATUS.PARTIALLY_EFFECTIVE).length,
    not_enough: scored.filter((r) => r.assessment_status === STATUS.NOT_ENOUGH_EVIDENCE).length,
    ineffective: scored.filter((r) => r.assessment_status === STATUS.INEFFECTIVE).length,
  };
}

// Assess ALL frameworks — each computed independently, returned side-by-side.
function assessAll(evidence) {
  const out = {};
  for (const key of FRAMEWORK_KEYS) out[key] = assessFramework(key, evidence);
  return out;
}

module.exports = { assessControl, assessFramework, assessAll, frameworkScore, FRAMEWORK_KEYS };
