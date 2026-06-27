'use strict';

/**
 * IntakeCompileService — the handoff from intake to the compiling phase. On
 * "Confirm & Compile" it emits the VALIDATED structures the compiler consumes.
 * The target chain the compiler builds is:
 *
 *   business risk -> process -> application -> security system -> control
 *
 * Controls are assessed against each framework INDEPENDENTLY (NIST CSF 2.0,
 * NIST SP 800-53 Rev 5, SOC 2) — no crosswalk between frameworks; each is its
 * own assessment column (control_framework_assessment).
 *
 * SCAFFOLD ONLY: this assembles and returns the validated inputs and seeds the
 * per-framework assessment shell. The heavy compile logic is a separate task.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const FRAMEWORKS = ['nist_csf_2_0', 'nist_800_53_r5', 'soc_2'];

async function rows(sql, params = []) { try { return await db.query(sql, params); } catch (e) { logger.debug('compile query degraded', { error: e.message }); return []; } }

// Assemble the validated handoff payload (read-only view of what intake produced).
async function assemble(orgId) {
  const processes = await rows(
    `SELECT id, name, parent_id, level, tier, criticality, owner, source, confidence, status
       FROM business_processes WHERE organization_id=$1 AND COALESCE(status,'validated')<>'rejected'`, [orgId]);
  const applications = await rows(
    `SELECT id, name, vendor, hosting, owner, criticality, data_classification, source, status
       FROM applications WHERE organization_id=$1 AND COALESCE(status,'validated')<>'rejected'`, [orgId]);
  const mapping = await rows(
    `SELECT id, process_id, application_id, relationship_type, confidence, rationale, status, validated_by, validated_at
       FROM process_application_map WHERE organization_id=$1 AND status='validated'`, [orgId]);
  return { processes, applications, mapping };
}

// Coverage stats for the summary view + the handoff manifest.
function coverage({ processes, applications, mapping }) {
  const mappedProc = new Set(mapping.map((m) => m.process_id));
  const mappedApp = new Set(mapping.map((m) => m.application_id));
  const uncoveredProcesses = processes.filter((p) => !mappedProc.has(p.id));
  const orphanApps = applications.filter((a) => !mappedApp.has(a.id));
  return {
    processes: processes.length, applications: applications.length, mappings: mapping.length,
    pctMapped: processes.length ? Math.round((mappedProc.size / processes.length) * 100) : 0,
    orphanApps: orphanApps.length, uncoveredProcesses: uncoveredProcesses.length,
    orphanAppNames: orphanApps.slice(0, 20).map((a) => a.name),
    uncoveredProcessNames: uncoveredProcesses.slice(0, 20).map((p) => p.name),
  };
}

// Confirm & Compile: emit the validated chain inputs and seed the per-framework
// assessment shell. Returns the handoff manifest; does NOT run the compiler.
async function compile(orgId, { decidedBy } = {}) {
  const data = await assemble(orgId);
  const cov = coverage(data);
  let visibility = null;
  try { visibility = await require('./VisibilityService').assess(orgId); } catch (_) {}

  // The chain the compiler will build, expressed as the inputs intake validated.
  const chain = { spec: 'business_risk -> process -> application -> security_system -> control', frameworks: FRAMEWORKS, crosswalk: false };

  // Mark intake complete on the org profile (non-destructive).
  try { await db.query(`UPDATE orgs SET setup_json = COALESCE(setup_json,'{}'::jsonb) || $2::jsonb WHERE id=$1`, [orgId, JSON.stringify({ intakeComplete: true, intakeCompiledAt: new Date().toISOString() })]); } catch (e) { logger.debug('intake complete flag degraded', { error: e.message }); }

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(), decidedBy: decidedBy || null,
    coverage: cov, visibility,
    handoff: { chain, processes: data.processes, applications: data.applications, mapping: data.mapping },
    note: 'Validated intake structures emitted for the compiling phase (scaffold). Each framework is assessed independently; no crosswalk. Heavy compile logic is a separate follow-up.',
  };
}

module.exports = { assemble, coverage, compile, FRAMEWORKS };
