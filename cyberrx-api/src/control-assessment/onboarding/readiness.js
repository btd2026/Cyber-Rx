'use strict';

/**
 * readiness — turns a connector's configuration + validation state into a
 * per-control readiness verdict for CONTINUOUS ASSESSMENT. It never says a
 * control is Effective; it only says whether Nerion has enough to assess it.
 *
 * A connector being connected does NOT make its controls ready. Coverage
 * controls without a denominator are Not Ready. Operating-effectiveness
 * readiness requires live-tenant validation.
 *
 * config = {
 *   auth_provided: [fieldKeys],
 *   permissions_sufficient: bool,        (false when scopes are missing)
 *   missing_permissions: [perm],
 *   denominator_configured: { field: source },
 *   scope_configured: { field: value },
 *   telemetry_available: { fieldOrSignal: true },   // from test-collection
 *   review_period: bool | {start,end},
 *   live_tenant_validated: bool,
 *   last_validation_at, next_collection_at
 * }
 */

const { buildManifest } = require('./manifest');

const READY = 'Ready', PARTIAL = 'Partially Ready', NOT = 'Not Ready';

function tAvail(config, key) { return !!(config.telemetry_available && config.telemetry_available[key]); }
function denomConfigured(config) { return !!(config.denominator_configured && Object.keys(config.denominator_configured).length); }
function scopeConfigured(config) { return !!(config.scope_configured && Object.keys(config.scope_configured).length); }

function controlReadiness(ctrl, config) {
  const reqFields = ctrl.required_api_fields || [];
  const availFields = reqFields.filter((f) => tAvail(config, f));
  const relevance = (ctrl.relevance_signals || []).some((s) => tAvail(config, s));
  const denomNeeded = !!ctrl.required_denominator_source;
  const denomOk = denomConfigured(config);
  const scopeOk = scopeConfigured(config);
  const periodOk = !!config.review_period;
  const permsOk = config.permissions_sufficient !== false;
  const liveOk = !!config.live_tenant_validated;
  const notApiTestable = ctrl.assessment_type === 'not_api_testable';

  const missing = [];
  reqFields.forEach((f) => { if (!tAvail(config, f)) missing.push('telemetry:' + f); });
  if (denomNeeded && !denomOk) missing.push('denominator');
  if (!scopeOk) missing.push('scope');
  if (!periodOk) missing.push('review_period');
  if (!permsOk) missing.push('permissions');
  if (!liveOk) missing.push('live_tenant_validation');

  let status, connectorStatus, message;

  if (notApiTestable) {
    status = PARTIAL; connectorStatus = 'Ready for Design Assessment';
    message = 'Assessed by document / design review, not telemetry.';
  } else if (denomNeeded && !denomOk) {
    status = NOT; connectorStatus = 'Denominator Missing';
    message = 'A denominator source is required before this coverage control can be assessed — configure ' + ctrl.required_denominator_source + '.';
  } else if (!permsOk && availFields.length === 0 && !relevance) {
    status = NOT; connectorStatus = 'Connected with Missing Permissions';
    message = 'Read-only permissions are insufficient to pull this control\'s evidence.';
  } else if (reqFields.length && availFields.length === reqFields.length && scopeOk && periodOk && permsOk) {
    if (liveOk) { status = READY; connectorStatus = 'Ready for Operating Effectiveness Assessment'; message = 'All required evidence is collectable, scoped, denominated and validated.'; }
    else { status = PARTIAL; connectorStatus = 'Telemetry Available'; message = 'Evidence is complete — pending live-tenant validation before an operating-effectiveness conclusion.'; }
  } else if (availFields.length > 0 || relevance) {
    status = PARTIAL; connectorStatus = availFields.length ? 'Telemetry Incomplete' : 'Telemetry Available';
    message = (relevance && availFields.length === 0)
      ? ('Can show ' + (ctrl.relevance_signals[0]) + ' (adoption/coverage indicator), but cannot assess operating effectiveness without ' + reqFields.slice(0, 4).join(', ') + '.')
      : ('Partial evidence collected; still missing ' + reqFields.filter((f) => !tAvail(config, f)).slice(0, 4).join(', ') + '.');
  } else {
    status = NOT; connectorStatus = 'Not Ready';
    message = ctrl.control_limitations || ('No evidence for this control is collectable yet — requires ' + reqFields.slice(0, 3).join(', ') + '.');
  }

  return {
    framework: ctrl.framework, control_id: ctrl.control_id, control_name: ctrl.control_name, area: ctrl.area,
    readiness_status: status, connector_status: connectorStatus,
    evidence_available: availFields, missing_evidence: missing,
    denominator_configured: denomNeeded ? denomOk : true, scope_configured: scopeOk,
    permissions_sufficient: permsOk, live_tenant_validated: liveOk,
    what_this_connector_can_assess: ctrl.area + ' — ' + ctrl.control_name,
    what_requires_another_connector: ctrl.required_denominator_source && !denomOk
      ? ('An authoritative source for: ' + ctrl.required_denominator_source)
      : (message.indexOf('cannot assess operating effectiveness') >= 0 ? 'The full operating-effectiveness evidence fields listed above.' : null),
    message,
  };
}

// Compute readiness for a whole connector.
function computeReadiness(connectorId, config) {
  config = config || {};
  const m = buildManifest(connectorId);
  if (!m) return null;
  const controls = (m._controls || []).map((c) => controlReadiness(c, config));
  const ready = controls.filter((c) => c.readiness_status === READY);
  const partial = controls.filter((c) => c.readiness_status === PARTIAL);
  const not = controls.filter((c) => c.readiness_status === NOT);

  const connected = !!(config.auth_provided && config.auth_provided.length);
  const missingReq = [];
  if (!connected) missingReq.push('connection');
  if (config.permissions_sufficient === false) missingReq.push('permissions');
  if (!denomConfigured(config)) missingReq.push('denominator');
  if (!scopeConfigured(config)) missingReq.push('scope');
  if (!config.review_period) missingReq.push('review_period');
  if (!config.live_tenant_validated) missingReq.push('live_tenant_validation');

  return {
    connector_id: connectorId, connector_name: m.connector_name, connector_category: m.connector_category,
    connection_status: connected ? 'Connected' : 'Not Connected',
    permission_status: config.permissions_sufficient === false ? 'Missing Permissions' : (connected ? 'Sufficient' : 'Unknown'),
    telemetry_status: controls.some((c) => c.evidence_available.length) ? (not.length ? 'Telemetry Incomplete' : 'Telemetry Available') : (config.telemetry_available ? 'Telemetry Incomplete' : 'None'),
    denominator_status: denomConfigured(config) ? 'Configured' : 'Missing',
    scope_status: scopeConfigured(config) ? 'Configured' : 'Missing',
    live_tenant_validated: !!config.live_tenant_validated,
    supported_controls: controls.length,
    ready_controls: ready.map((c) => c.control_id),
    partially_ready_controls: partial.map((c) => c.control_id),
    not_ready_controls: not.map((c) => c.control_id),
    missing_requirements: missingReq,
    control_readiness: controls,
    last_validation_at: config.last_validation_at || null,
    next_collection_at: config.next_collection_at || null,
  };
}

module.exports = { computeReadiness, controlReadiness, READY, PARTIAL, NOT };
