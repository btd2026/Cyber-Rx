'use strict';

/**
 * statusModel — the THREE-STATUS connector readiness model.
 *
 * Hard principle: authentication success is NOT continuous-control-assessment
 * readiness. Every connector separately proves it can (1) connect, (2) collect the
 * required telemetry, and (3) has enough scoped, fresh, complete evidence to assess
 * its supported controls. Each is tracked and displayed independently.
 *
 * This module maps the connector's configuration + the results of the connection
 * and telemetry checks onto the exact status vocabulary, reusing the per-control
 * readiness engine (readiness.js). It never concludes a control is Effective.
 */

const { buildManifest } = require('./manifest');
const { computeReadiness } = require('./readiness');

const CONNECTION = {
  CONNECTED: 'Connected',
  NOT_CONNECTED: 'Not Connected',
  INVALID: 'Invalid Credentials',
  EXPIRED: 'Expired Token',
  INSUFFICIENT: 'Insufficient Authentication Details',
  ERROR: 'Connection Error',
};
const TELEMETRY = {
  AVAILABLE: 'Telemetry Available',
  PARTIAL: 'Telemetry Partially Available',
  UNAVAILABLE: 'Telemetry Unavailable',
  MISSING_PERMS: 'Missing Required Permissions',
  API_UNREACHABLE: 'API Unreachable',
  NOT_TESTED: 'Collection Not Tested',
};
const CONTROL = {
  READY_OE: 'Ready for Operating Effectiveness Assessment',
  READY_DESIGN: 'Ready for Design Assessment Only',
  PARTIAL: 'Partially Ready',
  NOT_READY: 'Not Ready',
  NOT_ENOUGH: 'Not Enough Evidence',
  NOT_CONFIGURED: 'Not Configured',
};
const OVERALL = { READY: 'Ready', PARTIAL: 'Partially Ready', NOT_READY: 'Not Ready', ERROR: 'Error' };

// ---- connection ----
// check = { ok, error_code } from the connection check; config carries auth presence.
function connectionStatus(config, check) {
  if (check && check.error_code) {
    const c = String(check.error_code).toLowerCase();
    if (c.indexOf('expired') >= 0) return CONNECTION.EXPIRED;
    if (c.indexOf('invalid') >= 0 || c.indexOf('401') >= 0 || c.indexOf('403') >= 0) return CONNECTION.INVALID;
    if (c.indexOf('missing') >= 0 || c.indexOf('insufficient') >= 0) return CONNECTION.INSUFFICIENT;
    return CONNECTION.ERROR;
  }
  if (check && check.ok === true) return CONNECTION.CONNECTED;
  if (check && check.ok === false) return CONNECTION.ERROR;
  // no explicit check → infer from stored auth presence
  return (config.auth_provided && config.auth_provided.length) ? CONNECTION.CONNECTED : CONNECTION.NOT_CONNECTED;
}

// ---- telemetry ----
// A connector needs the union of its controls' required fields. We compare what
// test-collection proved available against what the manifest requires.
function telemetryFacts(manifest, config) {
  const required = new Set();
  (manifest._controls || []).forEach((c) => (c.required_api_fields || []).forEach((f) => required.add(f)));
  const avail = config.telemetry_available || null;
  const availableSignals = avail ? Object.keys(avail).filter((k) => avail[k]) : [];
  const missing = [...required].filter((f) => !(avail && avail[f]));
  return { required: [...required], availableSignals, missing, tested: !!avail };
}

function telemetryStatus(config, facts, check) {
  if (check && check.error_code === 'api_unreachable') return TELEMETRY.API_UNREACHABLE;
  if (config.permissions_sufficient === false) return TELEMETRY.MISSING_PERMS;
  if (!facts.tested) return TELEMETRY.NOT_TESTED;
  if (facts.required.length === 0) return TELEMETRY.NOT_TESTED; // nothing to collect defined
  if (facts.availableSignals.length === 0) return TELEMETRY.UNAVAILABLE;
  if (facts.missing.length === 0) return TELEMETRY.AVAILABLE;
  return TELEMETRY.PARTIAL;
}

// ---- control assessment ----
function controlAssessmentStatus(readiness, connStatus, telStatus) {
  if (!readiness || !readiness.control_readiness || !readiness.control_readiness.length) return CONTROL.NOT_CONFIGURED;
  if (connStatus !== CONNECTION.CONNECTED) return CONTROL.NOT_READY;
  const ready = readiness.ready_controls || [];
  const partial = readiness.partially_ready_controls || [];
  const not = readiness.not_ready_controls || [];
  // fully ready for operating effectiveness if any control cleared every gate
  if (ready.length > 0) return CONTROL.READY_OE;
  // design-only: some control is ready for design/document review (partial with a design connector_status)
  const designOnly = (readiness.control_readiness || []).some((c) => /design/i.test(c.connector_status || ''));
  if (partial.length > 0) return CONTROL.PARTIAL;
  if (designOnly) return CONTROL.READY_DESIGN;
  if (telStatus === TELEMETRY.AVAILABLE || telStatus === TELEMETRY.PARTIAL) return CONTROL.NOT_ENOUGH;
  return CONTROL.NOT_READY;
}

function overallStatus(conn, tel, ctrl, check) {
  if (check && check.error_code === 'api_unreachable') return OVERALL.ERROR;
  if (conn === CONNECTION.ERROR || conn === CONNECTION.INVALID || conn === CONNECTION.EXPIRED) return OVERALL.ERROR;
  if (ctrl === CONTROL.READY_OE) return OVERALL.READY;
  if (ctrl === CONTROL.PARTIAL || ctrl === CONTROL.READY_DESIGN || ctrl === CONTROL.NOT_ENOUGH) return OVERALL.PARTIAL;
  return OVERALL.NOT_READY;
}

function nextSteps(conn, tel, readiness, facts) {
  const steps = [];
  if (conn !== CONNECTION.CONNECTED) steps.push('Connect the tool (valid credentials / OAuth).');
  if (tel === TELEMETRY.MISSING_PERMS) steps.push('Grant the missing read-only permissions.');
  else if (tel === TELEMETRY.NOT_TESTED) steps.push('Run a telemetry collection test.');
  else if (tel === TELEMETRY.PARTIAL && facts.missing.length) steps.push('Provide the missing telemetry: ' + facts.missing.slice(0, 4).join(', ') + '.');
  const req = readiness ? (readiness.missing_requirements || []) : [];
  if (req.indexOf('denominator') >= 0) steps.push('Configure the denominator source.');
  if (req.indexOf('scope') >= 0) steps.push('Configure the assessment scope.');
  if (req.indexOf('review_period') >= 0) steps.push('Set a review period.');
  if (req.indexOf('live_tenant_validation') >= 0) steps.push('Complete live-tenant validation to enable operating-effectiveness conclusions.');
  return steps;
}

/**
 * buildStatus(connectorId, config, checks) → the full three-status readiness object.
 * checks = { connection: {ok,error_code}, telemetry: {error_code} } — optional; when
 * absent, statuses are inferred conservatively from stored config.
 */
function buildStatus(connectorId, config, checks) {
  config = config || {}; checks = checks || {};
  const m = buildManifest(connectorId);
  const now = new Date().toISOString();
  if (!m) return null;

  const conn = connectionStatus(config, checks.connection);
  const facts = telemetryFacts(m, config);
  const tel = telemetryStatus(config, facts, checks.telemetry);
  const readiness = computeReadiness(connectorId, config) || { control_readiness: [], ready_controls: [], partially_ready_controls: [], not_ready_controls: [], missing_requirements: [] };
  const ctrl = controlAssessmentStatus(readiness, conn, tel);
  const overall = overallStatus(conn, tel, ctrl, checks.telemetry);

  const req = readiness.missing_requirements || [];
  return {
    connector_id: connectorId,
    connector_name: m.connector_name,
    connector_category: m.connector_category,
    connection_status: conn,
    telemetry_status: tel,
    control_assessment_status: ctrl,
    overall_status: overall,
    last_connection_check_at: (checks.connection && checks.connection.checked_at) || config.last_connection_check_at || null,
    last_telemetry_check_at: config.last_telemetry_check_at || (facts.tested ? now : null),
    last_control_readiness_check_at: config.last_control_readiness_check_at || now,
    missing_permissions: config.missing_permissions || (config.permissions_sufficient === false ? ['read-only scopes'] : []),
    missing_telemetry: facts.missing,
    missing_denominators: req.indexOf('denominator') >= 0 ? [m.required_denominator_fields && m.required_denominator_fields.length ? m.required_denominator_fields[0].key : 'denominator'] : [],
    missing_scope: req.indexOf('scope') >= 0 ? ['scope'] : [],
    missing_review_period: req.indexOf('review_period') >= 0 ? ['review_period'] : [],
    ready_controls: readiness.ready_controls,
    partially_ready_controls: readiness.partially_ready_controls,
    not_ready_controls: readiness.not_ready_controls,
    live_tenant_validated: !!config.live_tenant_validated,
    control_readiness: readiness.control_readiness,
    next_steps: nextSteps(conn, tel, readiness, facts),
    checked_at: now,
  };
}

module.exports = { buildStatus, connectionStatus, telemetryStatus, telemetryFacts, controlAssessmentStatus, overallStatus, CONNECTION, TELEMETRY, CONTROL, OVERALL };
