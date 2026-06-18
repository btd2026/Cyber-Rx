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

// Map a control's implementation status to a fallback per-framework verdict.
function statusFromImpl(impl) {
  switch (String(impl || '')) {
    case 'Implemented': return 'met';
    case 'Partial': return 'partial';
    case 'Planned': case 'None': return 'gap';
    default: return 'not_assessed';
  }
}

// Each compiler framework id maps to the framework ids that real assessment
// evidence (assessment_result / control_assessment / controls.framework) may use.
const FW_ALIASES = {
  nist_csf_2_0: ['nist_csf_2_0', 'nist_csf_2', 'NIST-CSF'],
  nist_800_53_r5: ['nist_800_53_r5', 'nist_800_53', 'NIST-800-53'],
  cis_v8: ['cis_v8', 'cis_v8_1', 'CIS-v8'],
  iso_27001: ['iso_27001', 'ISO-27001'],
  soc_2: ['soc_2', 'SOC2'],
};
function normStatus(s) {
  const x = String(s || '').toLowerCase();
  if (x === 'met') return 'met';
  if (/partial/.test(x)) return 'partial';
  if (/not met|gap|fail/.test(x)) return 'gap';
  return null;
}
const scoreFor = (st, given) => (given != null ? Number(given) : st === 'met' ? 100 : st === 'partial' ? 50 : st === 'gap' ? 0 : null);

// Build the independent per-framework evidence lookup for an org: for each
// framework alias, the requirement-level verdicts from assessment_result first,
// then the document review (control_assessment). NO framework reads another's.
async function loadEvidence(orgId) {
  const [ar, ca] = await Promise.all([
    rows(`SELECT framework_id, requirement_id, status, score FROM assessment_result WHERE organization_id=$1`, [orgId]),
    rows(`SELECT framework_id, requirement_id, status, reviewed_at FROM control_assessment WHERE org_id=$1 ORDER BY reviewed_at DESC NULLS LAST`, [orgId]),
  ]);
  // key: `${aliasFrameworkId}::${requirementId}` -> { status, score, source }
  const map = new Map();
  ar.forEach((r) => { const st = normStatus(r.status); if (st) map.set(`${r.framework_id}::${r.requirement_id}`, { status: st, score: scoreFor(st, r.score), source: 'assessment' }); });
  ca.forEach((r) => { const k = `${r.framework_id}::${r.requirement_id}`; if (map.has(k)) return; const st = normStatus(r.status); if (st) map.set(k, { status: st, score: scoreFor(st, null), source: 'document' }); });
  return map;
}
// Independent verdict for one control against one framework.
function verdict(evidence, framework, control) {
  const reqId = String(control.control_id || '');
  for (const alias of (FW_ALIASES[framework] || [framework])) {
    const hit = evidence.get(`${alias}::${reqId}`);
    if (hit) return hit;
  }
  const st = statusFromImpl(control.implementation_status);
  return { status: st, score: scoreFor(st, control.effectiveness_score != null ? control.effectiveness_score : null), source: 'implementation' };
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
  const controls = await rows(`SELECT id, control_id, implementation_status, effectiveness_score FROM controls WHERE organization_id=$1`, [orgId]);
  const evidence = await loadEvidence(orgId);
  const tally = {}; FRAMEWORKS.forEach((fw) => { tally[fw] = { met: 0, partial: 0, gap: 0, not_assessed: 0 }; });
  let written = 0;
  for (const c of controls) {
    for (const fw of FRAMEWORKS) {
      // Independent per-framework verdict from that framework's own evidence;
      // no framework reads another's result (no crosswalk).
      const v = verdict(evidence, fw, c);
      const id = `cfa_${orgId}_${c.id}_${fw}`;
      await rows(
        `INSERT INTO control_framework_assessment (id, organization_id, control_id, framework, requirement_ref, status, score, evidence_ref, assessed_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
         ON CONFLICT (id) DO UPDATE SET requirement_ref=EXCLUDED.requirement_ref, status=EXCLUDED.status, score=EXCLUDED.score, evidence_ref=EXCLUDED.evidence_ref, assessed_at=NOW()`,
        [id, orgId, c.id, fw, c.control_id || null, v.status, v.score, v.source]);
      written++; tally[fw][v.status] = (tally[fw][v.status] || 0) + 1;
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

// ---- per-framework posture + gaps + remediation (live, from the assessment) --
async function posture(orgId) {
  const cfa = await rows(
    `SELECT a.framework, a.status, a.score, a.requirement_ref, c.id AS control_id, c.title, c.implementation_status
       FROM control_framework_assessment a
       LEFT JOIN controls c ON c.id=a.control_id AND c.organization_id=a.organization_id
      WHERE a.organization_id=$1`, [orgId]);
  const perFramework = FRAMEWORKS.map((fw) => {
    const rowsFw = cfa.filter((r) => r.framework === fw);
    const t = { met: 0, partial: 0, gap: 0, not_assessed: 0, not_applicable: 0 };
    rowsFw.forEach((r) => { t[r.status] = (t[r.status] || 0) + 1; });
    const assessed = t.met + t.partial + t.gap;
    const gaps = rowsFw.filter((r) => r.status === 'gap' || r.status === 'partial')
      .map((r) => ({ controlId: r.control_id, requirementRef: r.requirement_ref, title: r.title || r.requirement_ref || r.control_id, status: r.status }))
      .sort((a, b) => (a.status === 'gap' ? 0 : 1) - (b.status === 'gap' ? 0 : 1));
    return { framework: fw, label: FRAMEWORK_LABEL[fw], ...t, assessed, posture: postureOf(t), gaps };
  });
  // Remediation: a control that is a gap/partial in multiple frameworks is the
  // highest-leverage fix (one control closes several framework gaps).
  const byControl = new Map();
  cfa.forEach((r) => {
    if (r.status !== 'gap' && r.status !== 'partial') return;
    const key = r.control_id || r.requirement_ref; if (!key) return;
    if (!byControl.has(key)) byControl.set(key, { controlId: r.control_id, title: r.title || r.requirement_ref || r.control_id, frameworks: [], worst: 'partial' });
    const e = byControl.get(key); e.frameworks.push(r.framework); if (r.status === 'gap') e.worst = 'gap';
  });
  const remediation = Array.from(byControl.values())
    .map((e) => ({ ...e, frameworkCount: e.frameworks.length, action: `${e.worst === 'gap' ? 'Implement' : 'Strengthen'} "${e.title}" — closes ${e.frameworks.length} framework gap(s) (${e.frameworks.join(', ')}).` }))
    .sort((a, b) => (b.worst === 'gap' ? 1 : 0) - (a.worst === 'gap' ? 1 : 0) || b.frameworkCount - a.frameworkCount)
    .slice(0, 20);
  return { organizationId: orgId, generatedAt: new Date().toISOString(), crosswalk: false, perFramework, remediation, totals: { controls: new Set(cfa.map((r) => r.control_id)).size } };
}

module.exports = { assembleChain, run, latestRun, posture, FRAMEWORKS, FRAMEWORK_LABEL };
