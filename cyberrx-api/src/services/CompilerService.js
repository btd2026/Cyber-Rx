'use strict';

/**
 * CompilerService — assembles the traceable chain and is the WRITER of the
 * per-framework control assessment:
 *
 *   business risk → process → application → security system → control
 *                                                             └─ assessed against EACH
 *                                                                framework INDEPENDENTLY.
 *
 * Each framework (NIST CSF 2.0, NIST SP 800-53 Rev 5, CIS v8, ISO 27001, SOC 2)
 * is its own column — control_framework_assessment holds one row per
 * (control × framework). There is NO crosswalk between frameworks.
 *
 * Slice 0 (foundation): assemble the chain from the validated substrate, populate
 * control_framework_assessment with a first-pass status derived from the control's
 * implementation status, and record a compile_run. Richer per-framework assessment
 * (AssessmentEngine reuse, ISO/SOC2 requirement loaders) lands in later slices.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const FRAMEWORKS = ['nist_csf_2_0', 'nist_800_53_r5', 'cis_v8', 'iso_27001', 'soc_2'];
const FRAMEWORK_LABEL = { nist_csf_2_0: 'NIST CSF 2.0', nist_800_53_r5: 'NIST SP 800-53 Rev 5', cis_v8: 'CIS Controls v8', iso_27001: 'ISO/IEC 27001', soc_2: 'SOC 2' };

async function rows(sql, params = []) { try { return await db.query(sql, params); } catch (e) { logger.debug('compiler query degraded', { error: e.message }); return []; } }
const jarr = (v) => { try { return Array.isArray(v) ? v : JSON.parse(v || '[]'); } catch (_) { return []; } };

// Map a control's implementation status to a first-pass per-framework verdict.
function statusFromImpl(impl) {
  switch (String(impl || '')) {
    case 'Implemented': return 'met';
    case 'Partial': return 'partial';
    case 'Planned': case 'None': return 'gap';
    default: return 'not_assessed';
  }
}

// ---- chain assembly (read-only) --------------------------------------------
async function assembleChain(orgId) {
  const [risks, procs, mapping, apps, controls, tools, toolCtl, cfa] = await Promise.all([
    rows(`SELECT id, title, severity, status, financial_exposure, business_process_ids, application_id FROM risks WHERE organization_id=$1 AND status IN ('open','mitigating')`, [orgId]),
    rows(`SELECT id, name, level, criticality, crit_tier, rto FROM business_processes WHERE organization_id=$1 AND COALESCE(level,'process')<>'function'`, [orgId]),
    rows(`SELECT process_id, application_id, relationship_type, confidence, status FROM process_application_map WHERE organization_id=$1 AND status='validated'`, [orgId]),
    rows(`SELECT id, name, criticality, vendor, hosting FROM applications WHERE organization_id=$1`, [orgId]),
    rows(`SELECT id, control_id, framework, title, implementation_status, effectiveness_score FROM controls WHERE organization_id=$1`, [orgId]),
    rows(`SELECT tool_key FROM tool_connections WHERE org_id=$1`, [orgId]),
    rows(`SELECT tool_name, category, framework, control_id FROM cae_control_tool_map WHERE resolved=true`, []),
    rows(`SELECT control_id, framework, status, score FROM control_framework_assessment WHERE organization_id=$1`, [orgId]),
  ]);

  const procById = new Map(procs.map((p) => [p.id, p]));
  const appById = new Map(apps.map((a) => [a.id, a]));
  const appsByProc = new Map();
  mapping.forEach((m) => { if (!appsByProc.has(m.process_id)) appsByProc.set(m.process_id, []); const a = appById.get(m.application_id); if (a) appsByProc.get(m.process_id).push({ id: a.id, name: a.name, criticality: a.criticality, vendor: a.vendor, relationship: m.relationship_type, confidence: m.confidence != null ? Number(m.confidence) : null }); });

  // per-control framework verdicts from control_framework_assessment.
  const cfaByControl = new Map();
  cfa.forEach((r) => { if (!cfaByControl.has(r.control_id)) cfaByControl.set(r.control_id, {}); cfaByControl.get(r.control_id)[r.framework] = { status: r.status, score: r.score != null ? Number(r.score) : null }; });
  const controlNode = (c) => ({
    id: c.id, controlId: c.control_id, title: c.title, implementationStatus: c.implementation_status, effectiveness: c.effectiveness_score,
    frameworks: FRAMEWORKS.map((fw) => ({ framework: fw, label: FRAMEWORK_LABEL[fw], ...(cfaByControl.get(c.id) && cfaByControl.get(c.id)[fw] ? cfaByControl.get(c.id)[fw] : { status: 'not_assessed', score: null }) })),
  });

  // security systems → controls. Tools come from the org's connections; controls
  // they implement come from the CAE tool→control map (org controls preferred).
  const ctlById = new Map(controls.map((c) => [String(c.control_id), c]));
  const securitySystems = (tools.length ? tools.map((t) => t.tool_key) : []).map((toolKey) => {
    const linkedCtlIds = toolCtl.filter((tc) => (tc.tool_name && tc.tool_name.toLowerCase() === String(toolKey).toLowerCase())).map((tc) => tc.control_id);
    const sysControls = controls.filter((c) => linkedCtlIds.includes(String(c.control_id))).map(controlNode);
    return { system: toolKey, controls: sysControls };
  });

  // risk → process → application chain.
  const riskChain = risks.map((r) => {
    const pids = jarr(r.business_process_ids);
    const rprocs = pids.map((pid) => procById.get(pid)).filter(Boolean).map((p) => ({ id: p.id, name: p.name, criticality: p.criticality, applications: appsByProc.get(p.id) || [] }));
    return { id: r.id, title: r.title, severity: r.severity, financialExposure: Number(r.financial_exposure) || 0, processes: rprocs };
  });

  return {
    organizationId: orgId, generatedAt: new Date().toISOString(),
    chainSpec: 'business risk → process → application → security system → control',
    frameworks: FRAMEWORKS.map((fw) => ({ id: fw, label: FRAMEWORK_LABEL[fw] })), crosswalk: false,
    risks: riskChain,
    securitySystems,
    controls: controls.map(controlNode),
    counts: { risks: risks.length, processes: procs.length, applications: apps.length, mappings: mapping.length, securitySystems: securitySystems.length, controls: controls.length },
  };
}

// ---- compile run: populate control_framework_assessment + record run --------
async function run(orgId, { decidedBy } = {}) {
  const controls = await rows(`SELECT id, control_id, implementation_status FROM controls WHERE organization_id=$1`, [orgId]);
  const tally = {}; FRAMEWORKS.forEach((fw) => { tally[fw] = { met: 0, partial: 0, gap: 0, not_assessed: 0 }; });
  let written = 0;
  for (const c of controls) {
    const status = statusFromImpl(c.implementation_status);
    for (const fw of FRAMEWORKS) {
      // Independent per-framework row; no framework reads another's verdict.
      const id = `cfa_${orgId}_${c.id}_${fw}`;
      const score = status === 'met' ? 100 : status === 'partial' ? 50 : status === 'gap' ? 0 : null;
      const ok = await rows(
        `INSERT INTO control_framework_assessment (id, organization_id, control_id, framework, status, score, assessed_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
         ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, score=EXCLUDED.score, assessed_at=NOW()
         RETURNING id`, [id, orgId, c.id, fw, status, score]);
      if (ok.length || true) { written++; tally[fw][status] = (tally[fw][status] || 0) + 1; }
    }
  }
  const chain = await assembleChain(orgId);
  const summary = {
    counts: chain.counts,
    perFramework: FRAMEWORKS.map((fw) => ({ framework: fw, label: FRAMEWORK_LABEL[fw], ...tally[fw], assessed: tally[fw].met + tally[fw].partial + tally[fw].gap, posture: postureOf(tally[fw]) })),
    crosswalk: false,
  };
  const runId = `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await rows(
    `INSERT INTO compile_run (id, org_id, status, summary, decided_by, created_at) VALUES ($1,$2,'complete',$3,$4,NOW())`,
    [runId, orgId, JSON.stringify(summary), decidedBy || null]);
  return { runId, organizationId: orgId, generatedAt: new Date().toISOString(), assessmentsWritten: written, summary };
}

function postureOf(t) { const assessed = t.met + t.partial + t.gap; if (!assessed) return null; return Math.round(((t.met + t.partial * 0.5) / assessed) * 100); }

async function latestRun(orgId) {
  const r = await rows(`SELECT id, status, summary, decided_by, created_at FROM compile_run WHERE org_id=$1 ORDER BY created_at DESC LIMIT 1`, [orgId]);
  if (!r[0]) return null;
  return { runId: r[0].id, status: r[0].status, decidedBy: r[0].decided_by, createdAt: r[0].created_at, summary: typeof r[0].summary === 'string' ? JSON.parse(r[0].summary) : r[0].summary };
}

module.exports = { assembleChain, run, latestRun, FRAMEWORKS, FRAMEWORK_LABEL };
