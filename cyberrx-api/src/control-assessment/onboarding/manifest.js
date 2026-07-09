'use strict';

/**
 * manifest — composes a connector's onboarding manifest from (a) its static
 * profile (auth/permissions/tenant/scope/denominator) and (b) the framework-
 * native control registries (which controls it supports and the evidence each
 * needs). The client is asked only for what appears here; the platform derives
 * which controls the tool supports and what telemetry to pull.
 */

const { PROFILES, CATEGORY, AUTH } = require('./connectorProfiles');
const { REGISTRIES } = require('../registries');
let Connectors; try { Connectors = require('../../services/connectors'); } catch (_) { Connectors = null; }

const AREA_BY_CONTROL = {
  'IA-2': 'MFA / Authentication', 'PR.AA-03': 'MFA / Authentication', '164.312(d)': 'MFA / Authentication', '6.3': 'MFA / Authentication',
  'IA-5': 'Authenticator Management', '5.2': 'Authenticator Management',
  'AC-7': 'Failed Login / Lockout',
  'AC-2': 'Account & Identity Lifecycle', '5.1': 'Account & Identity Lifecycle', 'CC6.2': 'Account & Identity Lifecycle', 'PR.AA-01': 'Account & Identity Lifecycle',
  'AC-6': 'Least Privilege / Access', 'PR.AA-05': 'Least Privilege / Access', 'CC6.1': 'Least Privilege / Access', '164.312(a)(1)': 'Least Privilege / Access',
  'SI-4': 'System Monitoring', 'DE.CM-09': 'System Monitoring',
  'AU-6': 'Audit Log Review', '164.312(b)': 'Audit Log Review', '164.308(a)(1)(ii)(D)': 'Audit Log Review',
  'CP-9': 'Backup & Recovery', 'CP-10': 'Backup & Recovery', 'PR.DS-11': 'Backup & Recovery', 'RC.RP-03': 'Backup & Recovery', '164.308(a)(7)': 'Backup & Recovery',
  'CC7.1': 'Vulnerability & Config Monitoring', 'CC8.1': 'Change Management', 'P5.1': 'Privacy',
};
const areaFor = (id) => AREA_BY_CONTROL[id] || 'Security Controls';

const CANNOT_ALONE = {
  'Identity / SSO': 'It cannot prove endpoint, data, or network controls, and coverage % needs an authoritative user directory as the denominator.',
  'Endpoint / EDR': 'It proves sensor coverage and detection; it does not prove containment outcomes or non-endpoint controls, and coverage % needs a CMDB/MDM endpoint denominator.',
  'Vulnerability management': 'It proves vulnerability posture; SLA/exception context and an asset inventory denominator must be supplied.',
  'SIEM / Log analytics': 'Reporting-host counts are not audit-review evidence; log review and an expected-source inventory are required for AU-6.',
  'Privileged access (PAM)': 'It proves vaulting/monitoring; least-privilege appropriateness needs an IGA source.',
  'Access governance / IGA': 'It proves reviews/lifecycle; enforcement at authentication needs the IdP.',
  'Cloud security posture (CSPM)': 'It proves cloud posture; it does not prove identity, endpoint, or data controls.',
  'Backup & disaster recovery': 'Backup existence/immutability does not prove restore integrity — restore-test evidence is required for recovery controls.',
  'Data loss prevention (DLP)': 'It proves data-egress controls; a monitored-population denominator and ePHI scope are required.',
  'Network segmentation / Zero-Trust': 'It proves enforced segmentation; an in-scope workload inventory denominator is required.',
  'Security awareness & email security': 'Training completion needs an assigned-population denominator; email security is a distinct control area from awareness.',
};

function controlsForConnector(key) {
  const out = [];
  Object.keys(REGISTRIES).forEach((fw) => {
    const R = REGISTRIES[fw].REGISTRY;
    Object.keys(R).forEach((id) => { const c = R[id]; if ((c.supported_connectors || []).includes(key)) out.push(Object.assign({ framework_key: fw }, c)); });
  });
  return out;
}

function readinessRule(c) {
  const r = [];
  (c.required_api_fields || []).forEach((fld) => r.push(fld + ' available'));
  if (c.required_denominator_source) r.push('denominator (' + c.required_denominator_source + ') configured');
  if (c.required_scope) r.push('scope defined');
  if (c.required_time_period) r.push('review period configured');
  if ((c.evidence_layer_supported || []).includes('Operating Effectiveness')) r.push('live-tenant validation completed');
  return r;
}

function buildManifest(key) {
  const p = PROFILES[key];
  if (!p) return null;
  const cat = CATEGORY[p.category] || { scope: [], denominator: [], area: p.category };
  const auth = AUTH[p.authTemplate] || AUTH.base_token;
  const controls = controlsForConnector(key);
  let signals = [];
  try { const cm = Connectors && Connectors.get(key); signals = (cm && cm.signals) || []; } catch (_) {}

  const reqTelemetry = new Set(); const optTelemetry = new Set(signals); const evidenceOE = new Set();
  const modelled = controls.map((c) => {
    (c.required_signals || []).forEach((s) => reqTelemetry.add(s));
    (c.optional_signals || []).forEach((s) => optTelemetry.add(s));
    (c.required_api_fields || []).forEach((fld) => evidenceOE.add(fld));
    return {
      framework: c.framework, framework_key: c.framework_key, control_id: c.control_id, control_name: c.control_name,
      area: areaFor(c.control_id), assessment_type: c.assessment_type,
      evidence_layers_supported: c.evidence_layer_supported || [],
      required_api_fields: c.required_api_fields || [],
      required_denominator_source: c.required_denominator_source || null,
      required_scope: c.required_scope || null,
      required_time_period: c.required_time_period || null,
      relevance_signals: c.optional_signals || [],
      control_limitations: c.control_limitations || '',
      readiness_rule: readinessRule(c),
    };
  });

  return {
    connector_id: key, connector_name: p.name, connector_category: p.category, control_area: cat.area,
    supported_control_areas: [...new Set(modelled.map((c) => c.area))],
    supported_framework_controls: modelled.map((c) => ({ framework: c.framework, control_id: c.control_id, control_name: c.control_name })),
    required_auth_fields: auth.auth, required_permissions: p.permissions, required_tenant_fields: auth.tenant,
    required_scope_fields: cat.scope, required_denominator_fields: cat.denominator,
    required_telemetry_signals: [...reqTelemetry], optional_telemetry_signals: [...optTelemetry],
    evidence_required_for_operating_effectiveness: [...evidenceOE],
    validation_checks: ['credentials_valid', 'permissions_sufficient', 'required_fields_accessible', 'telemetry_pullable', 'denominator_present', 'scope_defined', 'evidence_fresh', 'live_tenant_validated'],
    readiness_rules: modelled.reduce((m, c) => { m[c.control_id] = c.readiness_rule; return m; }, {}),
    collection_frequency: 'daily', supported_review_periods: ['30d', '90d', '12m'], live_tenant_validation_required: true,
    what_this_connector_can_prove: modelled.length ? modelled.map((c) => c.area).filter((v, i, a) => a.indexOf(v) === i).join(' · ') : 'Design (document) evidence for its category',
    what_this_connector_cannot_prove_alone: CANNOT_ALONE[p.category] || 'Controls outside its category, and any coverage % without its denominator.',
    _controls: modelled,
  };
}

function listManifests() { return Object.keys(PROFILES).map((k) => { const m = buildManifest(k); delete m._controls; return m; }); }
function connectorsWithControls() { return Object.keys(PROFILES).filter((k) => controlsForConnector(k).length); }

module.exports = { buildManifest, listManifests, controlsForConnector, connectorsWithControls, areaFor };
