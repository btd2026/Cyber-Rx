'use strict';

/**
 * evidenceModel — the vocabulary and gating rules for continuous control
 * operating-effectiveness assessment.
 *
 * This module is the authoritative "assessment_control_logic" layer. It has NO
 * knowledge of crosswalks. A control is only ever concluded from its OWN
 * framework-native test against machine-verifiable evidence. Crosswalks
 * (related_control_mapping) are informational only and never reach this file.
 *
 * Core distinction the platform must make about a signal:
 *   RELEVANCE               — telemetry relates to the control, proves nothing.
 *   DESIGN                  — API proves a policy/config/rule/mechanism EXISTS.
 *   OPERATING_EFFECTIVENESS — API proves the control OPERATED over a review period.
 */

const STATUS = {
  EFFECTIVE: 'Effective',
  PARTIALLY_EFFECTIVE: 'Partially Effective',
  INEFFECTIVE: 'Ineffective',
  NOT_TESTED: 'Not Tested',
  NOT_ENOUGH_EVIDENCE: 'Not Enough Evidence',
  NOT_API_TESTABLE: 'Not API-Testable',
  OUT_OF_SCOPE: 'Out of Scope',
};

const EVIDENCE_LAYER = {
  RELEVANCE: 'Relevance',
  DESIGN: 'Design',
  OPERATING_EFFECTIVENESS: 'Operating Effectiveness',
  NONE: 'None',
};

const EVIDENCE_STRENGTH = {
  DIRECT: 'Direct',
  PARTIAL: 'Partial',
  INDICATOR: 'Indicator',
  NOT_EVIDENCE: 'Not Evidence',
};

const ASSESSMENT_TYPE = {
  AUTOMATED: 'automated',
  SEMI_AUTOMATED: 'semi_automated',
  MANUAL_REQUIRED: 'manual_required',
  NOT_API_TESTABLE: 'not_api_testable',
};

const AUDIT_READINESS = {
  AUDIT_READY: 'Audit Ready',
  NEEDS_MORE_EVIDENCE: 'Needs More Evidence',
  NOT_AUDIT_READY: 'Not Audit Ready',
  MANUAL_REVIEW_REQUIRED: 'Manual Review Required',
};

// Evidence weights for scoring. Operating-effectiveness evidence is the only
// thing that fully counts; a bare indicator barely moves the score; anything
// without enough evidence is zero. Not-API-testable is EXCLUDED, not zeroed.
const STRENGTH_WEIGHT = {
  [EVIDENCE_STRENGTH.DIRECT + '|' + EVIDENCE_LAYER.OPERATING_EFFECTIVENESS]: 1.0,
  [EVIDENCE_STRENGTH.DIRECT + '|' + EVIDENCE_LAYER.DESIGN]: 0.75,
  [EVIDENCE_STRENGTH.PARTIAL]: 0.5,
  [EVIDENCE_STRENGTH.INDICATOR]: 0.25,
  [EVIDENCE_STRENGTH.NOT_EVIDENCE]: 0,
};

function scoreFor(strength, layer) {
  if (strength === EVIDENCE_STRENGTH.DIRECT && layer === EVIDENCE_LAYER.OPERATING_EFFECTIVENESS) return 1.0;
  if (strength === EVIDENCE_STRENGTH.DIRECT && layer === EVIDENCE_LAYER.DESIGN) return 0.75;
  if (strength === EVIDENCE_STRENGTH.PARTIAL) return 0.5;
  if (strength === EVIDENCE_STRENGTH.INDICATOR) return 0.25;
  return 0;
}

// ---- evidence-bundle accessors (the enriched signal object) ------------------
// An evidence bundle looks like:
// { signals:{ key:{ value, denominator_source, as_of, scope } }, fields:{ name:val },
//   scope:{ ... }, review_period:{ start, end }|null, freshness_days:n,
//   connector_validation:{ connector:{ live_tenant_validated:bool } } }
function hasSignal(ev, key) { return !!(ev && ev.signals && ev.signals[key] != null && ev.signals[key].value != null); }
function signalDenominatorSource(ev, key) { return (ev && ev.signals && ev.signals[key] && ev.signals[key].denominator_source) || null; }
function field(ev, name) { return ev && ev.fields ? ev.fields[name] : undefined; }
function hasField(ev, name) { const v = field(ev, name); return v !== undefined && v !== null; }
function hasFields(ev, names) { return names.every((n) => hasField(ev, n)); }
function missingFields(ev, names) { return names.filter((n) => !hasField(ev, n)); }
function reviewPeriodDefined(ev) { return !!(ev && ev.review_period && ev.review_period.start && ev.review_period.end); }
function freshEnough(ev, maxDays) { return ev && typeof ev.freshness_days === 'number' && ev.freshness_days <= maxDays; }
function connectorValidated(ev, connectors) {
  if (!ev || !ev.connector_validation) return false;
  return (connectors || []).some((c) => ev.connector_validation[c] && ev.connector_validation[c].live_tenant_validated === true);
}

// ---- result builders ---------------------------------------------------------
function baseResult(def) {
  return {
    framework: def.framework,
    control_id: def.control_id,
    control_name: def.control_name,
    control_objective: def.control_objective || '',
    assessment_status: STATUS.NOT_TESTED,
    evidence_layer: EVIDENCE_LAYER.NONE,
    evidence_strength: EVIDENCE_STRENGTH.NOT_EVIDENCE,
    control_effectiveness_score: 0,
    review_period_start: null,
    review_period_end: null,
    population_source: null,
    population_count: null,
    tested_population_count: null,
    exception_count: null,
    approved_exception_count: null,
    unapproved_exception_count: null,
    missing_required_evidence: [],
    signals_used: [],
    connectors_used: def.supported_connectors || [],
    API_fields_used: [],
    pass_fail_rationale: '',
    what_the_api_proves: '',
    what_the_api_does_not_prove: '',
    additional_evidence_required: [],
    live_tenant_validated: !!def.live_tenant_validated,
    last_evidence_refresh: null,
    audit_readiness: AUDIT_READINESS.NOT_AUDIT_READY,
  };
}

// Convenience terminal results a control test can return.
function notApiTestable(def, rationale) {
  const r = baseResult(def);
  r.assessment_status = STATUS.NOT_API_TESTABLE;
  r.evidence_layer = EVIDENCE_LAYER.NONE;
  r.pass_fail_rationale = rationale;
  r.what_the_api_does_not_prove = 'This control requires human judgment / manual evidence and cannot be concluded from an API.';
  r.audit_readiness = AUDIT_READINESS.MANUAL_REVIEW_REQUIRED;
  return r;
}
function outOfScope(def, rationale) {
  const r = baseResult(def);
  r.assessment_status = STATUS.OUT_OF_SCOPE;
  r.pass_fail_rationale = rationale;
  return r;
}
function notEnough(def, rationale, missing, layerReached) {
  const r = baseResult(def);
  r.assessment_status = STATUS.NOT_ENOUGH_EVIDENCE;
  r.evidence_layer = layerReached || EVIDENCE_LAYER.RELEVANCE;
  r.evidence_strength = EVIDENCE_STRENGTH.NOT_EVIDENCE;
  r.missing_required_evidence = missing || [];
  r.additional_evidence_required = missing || [];
  r.pass_fail_rationale = rationale;
  r.audit_readiness = AUDIT_READINESS.NEEDS_MORE_EVIDENCE;
  return r;
}

/**
 * Finalize a control test's verdict. This is the ONLY place a control can be
 * concluded, and it enforces the hard gate: a control may not be Effective
 * unless every precondition is proven. Any shortfall downgrades the status.
 */
function conclude(def, ev, verdict) {
  const r = baseResult(def);
  Object.assign(r, {
    evidence_layer: verdict.evidence_layer || EVIDENCE_LAYER.RELEVANCE,
    evidence_strength: verdict.evidence_strength || EVIDENCE_STRENGTH.NOT_EVIDENCE,
    signals_used: verdict.signals_used || [],
    API_fields_used: verdict.API_fields_used || [],
    missing_required_evidence: verdict.missing_required_evidence || [],
    additional_evidence_required: verdict.additional_evidence_required || verdict.missing_required_evidence || [],
    pass_fail_rationale: verdict.pass_fail_rationale || '',
    what_the_api_proves: verdict.what_the_api_proves || '',
    what_the_api_does_not_prove: verdict.what_the_api_does_not_prove || '',
    population_source: verdict.population_source || null,
    population_count: verdict.population_count != null ? verdict.population_count : null,
    tested_population_count: verdict.tested_population_count != null ? verdict.tested_population_count : null,
    exception_count: verdict.exception_count != null ? verdict.exception_count : null,
    approved_exception_count: verdict.approved_exception_count != null ? verdict.approved_exception_count : null,
    unapproved_exception_count: verdict.unapproved_exception_count != null ? verdict.unapproved_exception_count : null,
    last_evidence_refresh: verdict.last_evidence_refresh || null,
  });
  if (reviewPeriodDefined(ev)) { r.review_period_start = ev.review_period.start; r.review_period_end = ev.review_period.end; }

  const wantEffective = verdict.status === STATUS.EFFECTIVE;
  // Hard gate for Effective — every one of these must hold.
  const gate = [];
  if (wantEffective) {
    if (verdict.evidence_layer !== EVIDENCE_LAYER.OPERATING_EFFECTIVENESS) gate.push('operating-effectiveness layer not reached');
    if (verdict.evidence_strength !== EVIDENCE_STRENGTH.DIRECT) gate.push('evidence is not Direct');
    if (!reviewPeriodDefined(ev)) gate.push('review period not defined');
    if (!connectorValidated(ev, def.supported_connectors)) gate.push('no live-tenant-validated connector');
    if (def.evidence_freshness_requirement && !freshEnough(ev, def.evidence_freshness_requirement)) gate.push('evidence not fresh enough');
    if ((verdict.missing_required_evidence || []).length) gate.push('required evidence missing');
    if (verdict.unapproved_exception_count) gate.push('unapproved exceptions present');
  }

  if (wantEffective && gate.length) {
    // Downgrade — never overclaim.
    r.assessment_status = (verdict.evidence_layer === EVIDENCE_LAYER.OPERATING_EFFECTIVENESS || verdict.evidence_layer === EVIDENCE_LAYER.DESIGN)
      ? STATUS.PARTIALLY_EFFECTIVE : STATUS.NOT_ENOUGH_EVIDENCE;
    r.pass_fail_rationale = (verdict.pass_fail_rationale ? verdict.pass_fail_rationale + ' ' : '') + 'Not concluded Effective — ' + gate.join('; ') + '.';
    r.evidence_strength = verdict.evidence_strength === EVIDENCE_STRENGTH.DIRECT ? EVIDENCE_STRENGTH.PARTIAL : verdict.evidence_strength;
  } else {
    r.assessment_status = verdict.status;
  }

  r.control_effectiveness_score = (r.assessment_status === STATUS.EFFECTIVE)
    ? 1.0
    : (r.assessment_status === STATUS.PARTIALLY_EFFECTIVE ? scoreFor(r.evidence_strength, r.evidence_layer) : scoreFor(r.evidence_strength, r.evidence_layer));
  if (r.assessment_status === STATUS.INEFFECTIVE) r.control_effectiveness_score = 0;

  // Audit readiness follows the conclusion.
  if (r.assessment_status === STATUS.EFFECTIVE) r.audit_readiness = AUDIT_READINESS.AUDIT_READY;
  else if (r.assessment_status === STATUS.NOT_API_TESTABLE) r.audit_readiness = AUDIT_READINESS.MANUAL_REVIEW_REQUIRED;
  else if (r.assessment_status === STATUS.PARTIALLY_EFFECTIVE) r.audit_readiness = AUDIT_READINESS.NEEDS_MORE_EVIDENCE;
  else if (r.assessment_status === STATUS.INEFFECTIVE) r.audit_readiness = AUDIT_READINESS.NOT_AUDIT_READY;
  else r.audit_readiness = AUDIT_READINESS.NEEDS_MORE_EVIDENCE;
  return r;
}

module.exports = {
  STATUS, EVIDENCE_LAYER, EVIDENCE_STRENGTH, ASSESSMENT_TYPE, AUDIT_READINESS,
  STRENGTH_WEIGHT, scoreFor,
  hasSignal, signalDenominatorSource, field, hasField, hasFields, missingFields,
  reviewPeriodDefined, freshEnough, connectorValidated,
  baseResult, notApiTestable, outOfScope, notEnough, conclude,
};
