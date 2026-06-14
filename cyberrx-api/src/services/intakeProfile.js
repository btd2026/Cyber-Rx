'use strict';

/**
 * intakeProfile — maps the stored Organization Intake answers (orgs.setup_json)
 * into the report data contract: { org_profile, process, technology }.
 *
 * Guardrail: only fields actually present in intake are emitted. Empty strings,
 * empty arrays, and missing keys are dropped so downstream generation never
 * fabricates a value. The current intake captures a subset of the contract; the
 * rest is simply omitted until intake collects it.
 */

const db = require('../utils/db');

// Drop null / empty-string / empty-array values; return undefined if nothing left.
function clean(obj) {
  const o = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    o[k] = v;
  }
  return Object.keys(o).length ? o : undefined;
}

// Coerce a value (array | object map | csv string) into a clean string array.
function arr(v) {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (v && typeof v === 'object') return Object.keys(v);
  if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

// Average unified-assessment score for CSF requirements under given prefixes.
async function csfAvg(orgId, prefixes) {
  const conds = prefixes.map((_, i) => `requirement_id LIKE $${i + 2}`).join(' OR ');
  const rows = await db.query(
    `SELECT AVG(score)::numeric AS s, COUNT(*)::int AS n FROM assessment_result
      WHERE organization_id=$1 AND framework_id='nist_csf_2' AND (${conds})`,
    [orgId, ...prefixes.map((p) => p + '%')]);
  return rows[0] && rows[0].n ? Number(rows[0].s) : null;
}
const govLabel = (s) => (s >= 80 ? 'Optimized' : s >= 65 ? 'Managed' : s >= 50 ? 'Defined' : s >= 35 ? 'Developing' : 'Initial');
const irLabel = (s) => (s >= 75 ? 'Documented and tested' : s >= 45 ? 'Documented, not tested' : 'No formal plan');

// Derive (never self-rank): crown jewels from apps/processes, governance maturity
// from CSF GV evidence, IR capability from CSF RS/RC evidence. Anything without
// evidence yet is simply omitted (no fabrication).
async function deriveFromEvidence(orgId, su) {
  const out = {};
  try {
    const apps = await require('./RiskOutputsService').crownJewels(orgId);
    const names = (apps || []).filter((a) => a.score > 0).slice(0, 5).map((a) => a.name);
    if (names.length) out.crown_jewels = names;
  } catch (_) { /* engine not ready */ }
  if (!out.crown_jewels) {
    const sp = su.selProcs;
    const fb = Array.isArray(sp) ? sp : (sp && typeof sp === 'object' ? Object.keys(sp) : []);
    if (fb.length) out.crown_jewels = fb.slice(0, 8);
  }
  try {
    const gv = await csfAvg(orgId, ['GV.']); if (gv != null) out.governance_maturity = govLabel(gv);
    const ir = await csfAvg(orgId, ['RS.', 'RC.']); if (ir != null) out.incident_response = irLabel(ir);
  } catch (_) { /* no assessment yet */ }
  return out;
}

async function loadIntake(orgId) {
  let su = {};
  try {
    const r = await db.query('SELECT setup_json, name, type FROM orgs WHERE id=$1', [orgId]);
    if (r[0]) {
      su = r[0].setup_json || {};
      if (typeof su === 'string') { try { su = JSON.parse(su); } catch (_) { su = {}; } }
      su._name = r[0].name; su._type = r[0].type;
    }
  } catch (_) { /* sparse intake degrades gracefully */ }

  const g = (...keys) => { for (const k of keys) { if (su[k] != null && su[k] !== '') return su[k]; } return undefined; };
  const cms = g('cmsContract');
  const regs = arr(g('reportingFrameworks', 'regulatoryObligations', 'regulatory_obligations', 'complianceFrameworks'));
  if (cms && /yes|true/i.test(String(cms)) && !regs.some((x) => /cms/i.test(x))) regs.push('CMS');

  // Crown jewels, governance maturity, and IR capability are DERIVED from the
  // org's data + assessment evidence — never self-ranked in the intake.
  const derived = await deriveFromEvidence(orgId, su);

  const org_profile = clean({
    industry: g('industry', 'sector', 'orgType', '_type'),
    sub_sector: g('subSector', 'sub_sector', 'lineOfBusiness'),
    employee_count: g('employees', 'employeeCount', 'employee_count'),
    revenue_band: g('revenueBand', 'revenue_band', 'revenue'),
    geos: arr(g('geos', 'geographies', 'regions')),
    regulatory_obligations: regs,
    crown_jewels: derived.crown_jewels,        // derived from apps/processes
    risk_appetite: g('riskAppetite', 'risk_appetite'),  // leadership stance (asked)
    business_drivers: arr(g('businessDrivers', 'business_drivers')),
  });

  const process = clean({
    governance_maturity: derived.governance_maturity,   // derived from CSF GV evidence
    policies_in_place: arr(g('policiesInPlace', 'policies_in_place', 'policies')),
    incident_response: derived.incident_response,        // derived from CSF RS/RC evidence
    vendor_mgmt: g('vendorMgmt', 'vendor_mgmt'),
    change_mgmt: g('changeMgmt', 'change_mgmt'),
  });

  const technology = clean({
    hosting: g('hosting', 'hostingModel'),
    key_platforms: arr(g('keyPlatforms', 'key_platforms', 'appSel', 'platforms')),
    identity_systems: arr(g('identitySystems', 'identity_systems', 'idp')),
    app_count: g('appCount', 'app_count', 'applications'),
    security_tooling: arr(g('securityTooling', 'security_tooling', 'infraSel', 'vendorSel')),
    attack_surface_notes: g('attackSurfaceNotes', 'attack_surface_notes'),
  });

  const out = {};
  if (org_profile) out.org_profile = org_profile;
  if (process) out.process = process;
  if (technology) out.technology = technology;
  if (su._name) out.client_name = su._name;
  return out;
}

module.exports = { loadIntake };
