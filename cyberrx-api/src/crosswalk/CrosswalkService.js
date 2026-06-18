'use strict';

/**
 * CrosswalkService — the heart of the product: map each tenant's local apps →
 * processes and local processes → canonical capabilities. Auto-suggests matches
 * with a confidence score; the user confirms/corrects. Confirming an app→process
 * link triggers criticality inheritance (PropagationService).
 *
 * A plan having different processes/apps is configuration handled here by the
 * crosswalk — never a code fork.
 */

const db = require('../utils/db');
const Prop = require('./PropagationService');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const toks = (s) => norm(s).split(' ').filter(Boolean);

function sim(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - dp[m][n] / Math.max(m, n);
}
function overlap(a, b) {
  const A = new Set(toks(a)), B = new Set(toks(b));
  if (!A.size || !B.size) return 0;
  let i = 0; A.forEach((t) => { if (B.has(t)) i++; });
  return i / Math.max(A.size, B.size);
}
// True if every token of the shorter name appears in the longer name.
function contains(a, b) {
  const A = toks(a), B = toks(b);
  if (!A.length || !B.length) return false;
  const [short, longSet] = A.length <= B.length ? [A, new Set(B)] : [B, new Set(A)];
  return short.every((t) => longSet.has(t));
}
// Match score between two names (+ optional hint text on the source side).
function pairScore(source, target) {
  let s = 0.6 * overlap(source, target) + 0.4 * sim(source, target);
  if (contains(source, target)) s = Math.max(s, 0.85); // full token containment = strong
  return s;
}
function nameScore(source, target, hint) {
  const base = Math.max(pairScore(source, target), hint ? pairScore(hint, target) : 0);
  return Math.round(base * 100) / 100;
}

function bestMatches(sourceName, hint, candidates, n = 3) {
  return candidates
    .map((c) => ({ id: c.id, name: c.name, confidence: nameScore(sourceName, c.name, hint) }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, n);
}

// ---- app -> process ---------------------------------------------------------
async function suggestAppProcess(orgId) {
  const apps = await db.query('SELECT id, name FROM applications WHERE organization_id=$1', [orgId]);
  const procs = await db.query('SELECT id, name FROM business_processes WHERE organization_id=$1', [orgId]);
  const confirmed = await db.query('SELECT application_id, process_id FROM app_process_map WHERE organization_id=$1 AND confirmed=true', [orgId]);
  const confSet = new Set(confirmed.map((r) => `${r.application_id}::${r.process_id}`));
  return apps.map((a) => ({
    application: { id: a.id, name: a.name },
    confirmed: confirmed.filter((c) => c.application_id === a.id).map((c) => c.process_id),
    suggestions: bestMatches(a.name, null, procs).map((s) => ({ ...s, alreadyConfirmed: confSet.has(`${a.id}::${s.id}`) })),
  }));
}

async function confirmAppProcess(orgId, applicationId, processId, confirmedBy) {
  await db.query(
    `INSERT INTO app_process_map (organization_id, application_id, process_id, confidence, source, confirmed, confirmed_by, updated_at)
     VALUES ($1,$2,$3,1.0,'user',true,$4,NOW())
     ON CONFLICT (organization_id, application_id, process_id)
     DO UPDATE SET confirmed=true, source='user', confirmed_by=EXCLUDED.confirmed_by, updated_at=NOW()`,
    [orgId, applicationId, processId, confirmedBy || null]);
  const inherited = await Prop.inheritAppCriticality(orgId, applicationId);
  return { ok: true, inherited };
}

// ---- process -> canonical capability ----------------------------------------
async function suggestProcessCapability(orgId) {
  const procs = await db.query('SELECT id, name FROM business_processes WHERE organization_id=$1', [orgId]);
  const caps = await db.query(`SELECT id, name FROM capability WHERE kind='capability'`, []);
  return procs.map((p) => ({
    process: { id: p.id, name: p.name },
    suggestions: bestMatches(p.name, null, caps),
  }));
}

async function confirmProcessCapability(orgId, processId, capabilityId, confirmedBy) {
  await db.query(
    `INSERT INTO process_capability_map (organization_id, process_id, capability_id, confidence, source, confirmed, confirmed_by, updated_at)
     VALUES ($1,$2,$3,1.0,'user',true,$4,NOW())
     ON CONFLICT (organization_id, process_id, capability_id)
     DO UPDATE SET confirmed=true, source='user', confirmed_by=EXCLUDED.confirmed_by, updated_at=NOW()`,
    [orgId, processId, capabilityId, confirmedBy || null]);
  await db.query('UPDATE business_processes SET capability_id=$3, updated_at=NOW() WHERE id=$2 AND organization_id=$1', [orgId, processId, capabilityId]);
  return { ok: true };
}

// ---- AUTO app -> process mapping (LLM, many-to-many) ------------------------
// One application can support several processes and a process can be supported by
// several applications. We ask the LLM to map every app to the processes it
// materially supports; a deterministic name-match is the fallback. The result is
// auto-accepted (used in all downstream calculations) but still editable later.
async function llmMapAppProcess(apps, procs) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = `You map a health-insurance payer's APPLICATIONS to the BUSINESS PROCESSES each one supports.
One application may support MANY processes, and one process may be supported by MANY applications.

APPLICATIONS:\n${apps.map((a) => `- ${a.name}${a.owner ? ` (owner: ${a.owner})` : ''}`).join('\n')}

BUSINESS PROCESSES (use these EXACT names only):\n${procs.map((p) => `- ${p.name}`).join('\n')}

Return ONLY JSON: {"map":[{"app":"<application name>","processes":["<process name>", ...]}]}.
Map an app to every process it materially supports. If none clearly applies, use an empty list.`;
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_REVIEW_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 3000, temperature: 0, messages: [{ role: 'user', content: prompt }],
  });
  const raw = (resp.content || []).map((c) => c.text || '').join('');
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const procByName = new Map(procs.map((p) => [norm(p.name), p]));
  const appByName = new Map(apps.map((a) => [norm(a.name), a]));
  const out = [];
  for (const row of (json.map || [])) {
    const app = appByName.get(norm(row.app));
    if (!app) continue;
    const pids = (row.processes || []).map((pn) => procByName.get(norm(pn))).filter(Boolean)
      .map((p) => ({ id: p.id, confidence: 0.92 }));
    out.push({ application_id: app.id, links: pids });
  }
  return out;
}

function heuristicMapAppProcess(apps, procs) {
  return apps.map((a) => {
    const scored = procs.map((p) => ({ id: p.id, confidence: nameScore(a.name, p.name, a.owner) }))
      .sort((x, y) => y.confidence - x.confidence);
    let links = scored.filter((s) => s.confidence >= 0.5);     // every materially-matching process
    if (!links.length && scored[0] && scored[0].confidence >= 0.3) links = [scored[0]]; // else best guess
    return { application_id: a.id, links };
  });
}

async function autoMapAppsToProcesses(orgId) {
  const apps = await db.query('SELECT id, name, owner FROM applications WHERE organization_id=$1', [orgId]);
  const procs = await db.query('SELECT id, name FROM business_processes WHERE organization_id=$1', [orgId]);
  if (!apps.length || !procs.length) return { mappedApps: 0, links: 0, processes: procs.length, applications: apps.length };

  let assignments = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try { assignments = await llmMapAppProcess(apps, procs); } catch (_) { assignments = null; }
  }
  const source = assignments ? 'llm' : 'heuristic';
  if (!assignments) assignments = heuristicMapAppProcess(apps, procs);

  // Replace prior AUTO links (keep any user-confirmed ones), then insert fresh.
  await db.query(`DELETE FROM app_process_map WHERE organization_id=$1 AND source IN ('llm','heuristic','auto')`, [orgId]);
  let links = 0; const touched = new Set();
  for (const a of assignments) {
    for (const l of a.links) {
      await db.query(
        `INSERT INTO app_process_map (organization_id, application_id, process_id, confidence, source, confirmed, updated_at)
         VALUES ($1,$2,$3,$4,$5,true,NOW())
         ON CONFLICT (organization_id, application_id, process_id)
         DO UPDATE SET confidence=EXCLUDED.confidence, source=EXCLUDED.source, confirmed=true, updated_at=NOW()`,
        [orgId, a.application_id, l.id, l.confidence, source]);
      links++; touched.add(a.application_id);
    }
  }
  // Inherit process criticality (Tier + RTO) onto each mapped application.
  for (const appId of touched) { try { await Prop.inheritAppCriticality(orgId, appId); } catch (_) { /* best effort */ } }

  return { ...(await appProcessGraph(orgId)), source, mappedApps: touched.size, links };
}

// Process → supporting applications, for the visual mapping. Many-to-many.
async function appProcessGraph(orgId) {
  const rows = await db.query(
    `SELECT p.id pid, p.name pname, COALESCE(p.crit_tier, NULL) AS tier, p.rto, a.id aid, a.name aname, m.confidence
       FROM business_processes p
       LEFT JOIN app_process_map m ON m.process_id=p.id AND m.organization_id=p.organization_id
       LEFT JOIN applications a ON a.id=m.application_id
      WHERE p.organization_id=$1
      ORDER BY p.tier NULLS LAST, p.name, a.name`, [orgId]);
  const byProc = new Map();
  for (const r of rows) {
    if (!byProc.has(r.pid)) byProc.set(r.pid, { id: r.pid, name: r.pname, tier: r.tier, rto: r.rto, apps: [] });
    if (r.aid) byProc.get(r.pid).apps.push({ id: r.aid, name: r.aname, confidence: r.confidence != null ? Number(r.confidence) : null });
  }
  const mappedAppIds = new Set(rows.filter((r) => r.aid).map((r) => r.aid));
  const allApps = await db.query('SELECT id, name FROM applications WHERE organization_id=$1', [orgId]);
  const unmappedApps = allApps.filter((a) => !mappedAppIds.has(a.id)).map((a) => ({ id: a.id, name: a.name }));
  return { processes: Array.from(byProc.values()), unmappedApps, counts: { processes: byProc.size, applications: allApps.length, mapped: mappedAppIds.size } };
}

// ===== Step 3 cascade: app -> process with a 3-tier confidence cascade =======
// (a) structured inventory linkage (CMDB business-service / supported-capability /
//     owner) -> source 'inventory', high confidence;
// (b) LLM semantic match for the rest -> mapping + rationale + confidence;
// (c) corroborate with data-classification + owner-org alignment to adjust.
// Mappings are MANY-TO-MANY, persisted as status='proposed' (nothing auto-
// validated); the user validates in a process-centric review.

const CRIT_RANK = { Critical: 0, High: 1, Medium: 2, Moderate: 2, Low: 3 };
const arr = (v) => { try { return Array.isArray(v) ? v : JSON.parse(v || '[]'); } catch (_) { return []; } };

async function cascadeMap(orgId, opts = {}) {
  const apps = (opts.apps && opts.apps.length)
    ? opts.apps
    : await db.query('SELECT id, name, owner, vendor, hosting, data_classification, external_ref, source FROM applications WHERE organization_id=$1', [orgId]);
  // Map to the VALIDATED process/sub-process nodes (exclude function-level rows).
  let procs = await db.query("SELECT id, name, crit_tier, criticality, level, supported_by_systems FROM business_processes WHERE organization_id=$1 AND COALESCE(status,'validated')='validated' AND COALESCE(level,'process')<>'function'", [orgId]);
  if (!procs.length) procs = await db.query("SELECT id, name, crit_tier, criticality, level, supported_by_systems FROM business_processes WHERE organization_id=$1", [orgId]);
  if (!apps.length || !procs.length) return { mappedApps: 0, links: 0, processes: procs.length, applications: apps.length };

  const procByName = new Map(procs.map((p) => [norm(p.name), p]));
  const linkage = opts.linkage || {};               // { appId: [businessServiceName, ...] }

  // (b) semantic layer (LLM many-to-many, heuristic fallback) computed once.
  let semantic = null;
  if (process.env.ANTHROPIC_API_KEY) { try { semantic = await llmMapAppProcess(apps, procs); } catch (_) { semantic = null; } }
  const semSource = semantic ? 'llm' : 'heuristic';
  if (!semantic) semantic = heuristicMapAppProcess(apps, procs);
  const semByApp = new Map(semantic.map((s) => [s.application_id, s.links]));

  const assignments = apps.map((a) => {
    const byProc = new Map();                        // process_id -> link
    const add = (pid, conf, source, rationale) => {
      const prev = byProc.get(pid);
      if (!prev || conf > prev.confidence) byProc.set(pid, { id: pid, confidence: conf, source, rationale });
    };
    // (a) structured inventory linkage.
    const services = (linkage[a.id] || a.businessServices || []).concat(a.supportedCapability ? [a.supportedCapability] : []);
    services.forEach((svc) => {
      const p = procByName.get(norm(svc)) || procs.find((pp) => contains(svc, pp.name));
      if (p) add(p.id, 0.95, 'inventory', `CMDB business-service linkage: "${svc}" → ${p.name}`);
    });
    // (b) semantic matches.
    (semByApp.get(a.id) || []).forEach((l) => {
      const conf = semSource === 'llm' ? 0.8 : Math.min(0.78, l.confidence || 0.6);
      add(l.id, conf, semSource, semSource === 'llm' ? 'LLM semantic match of app to process.' : 'Name/heuristic match of app to process.');
    });
    // (c) corroboration: data-classification + owner-org alignment nudge confidence.
    const appData = arr(a.data_classification).map((d) => String(d).toLowerCase());
    byProc.forEach((l) => {
      if (l.source === 'inventory') return;          // already high-confidence
      let bump = 0; const p = procs.find((pp) => pp.id === l.id);
      if (p && appData.length && /phi|pii|pci|claims|member|financial/.test(`${p.name}`.toLowerCase()) && appData.some((d) => /phi|pii|pci|sensitive|financial/.test(d))) bump += 0.05;
      if (a.owner && p && contains(a.owner, p.name)) bump += 0.05;
      if (bump) { l.confidence = Math.min(0.99, Math.round((l.confidence + bump) * 100) / 100); l.rationale += ' Corroborated by data-classification/owner alignment.'; }
    });
    const links = Array.from(byProc.values()).sort((x, y) => y.confidence - x.confidence);
    return { application_id: a.id, links };
  });

  // Persist proposed mappings (replace prior non-validated cascade links; keep
  // anything the user already validated/rejected).
  await db.query("DELETE FROM app_process_map WHERE organization_id=$1 AND COALESCE(status,'proposed')='proposed'", [orgId]);
  let links = 0; const touched = new Set();
  for (const a of assignments) {
    a.links.forEach((l, idx) => { l.relationship_type = idx === 0 ? 'primary' : 'supporting'; });
    for (const l of a.links) {
      const mid = `${orgId}::${a.application_id}::${l.id}`;
      await db.query(
        `INSERT INTO app_process_map (id, organization_id, application_id, process_id, confidence, source, relationship_type, rationale, status, confirmed, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'proposed',false,NOW())
         ON CONFLICT (organization_id, application_id, process_id)
         DO UPDATE SET id=EXCLUDED.id, confidence=EXCLUDED.confidence, source=EXCLUDED.source,
           relationship_type=EXCLUDED.relationship_type, rationale=EXCLUDED.rationale, status='proposed', updated_at=NOW()`,
        [mid, orgId, a.application_id, l.id, l.confidence, l.source, l.relationship_type, l.rationale]);
      links++; touched.add(a.application_id);
    }
  }
  return { ...(await mappingReview(orgId)), cascade: true, mappedApps: touched.size, links };
}

// Process-centric review: per process its mapped apps (low-confidence first),
// plus gap findings (uncovered processes, orphan apps) and a low-confidence queue.
async function mappingReview(orgId) {
  const rows = await db.query(
    `SELECT p.id pid, p.name pname, p.crit_tier tier, p.criticality, p.rto, p.level,
            a.id aid, a.name aname, a.criticality acrit,
            m.confidence, m.source, m.relationship_type, m.rationale, m.status
       FROM business_processes p
       LEFT JOIN app_process_map m ON m.process_id=p.id AND m.organization_id=p.organization_id AND COALESCE(m.status,'proposed')<>'rejected'
       LEFT JOIN applications a ON a.id=m.application_id
      WHERE p.organization_id=$1 AND COALESCE(p.level,'process')<>'function'
      ORDER BY p.name, m.confidence ASC NULLS LAST`, [orgId]);
  const byProc = new Map();
  for (const r of rows) {
    if (!byProc.has(r.pid)) byProc.set(r.pid, { id: r.pid, name: r.pname, tier: r.tier, criticality: r.criticality, rto: r.rto, apps: [] });
    if (r.aid) byProc.get(r.pid).apps.push({ id: r.aid, name: r.aname, criticality: r.acrit, confidence: r.confidence != null ? Number(r.confidence) : null, source: r.source, relationshipType: r.relationship_type, rationale: r.rationale, status: r.status || 'proposed' });
  }
  const processes = Array.from(byProc.values());
  const mappedAppIds = new Set(rows.filter((r) => r.aid).map((r) => r.aid));
  const allApps = await db.query('SELECT id, name, criticality FROM applications WHERE organization_id=$1', [orgId]);
  const orphanApps = allApps.filter((a) => !mappedAppIds.has(a.id)).map((a) => ({ id: a.id, name: a.name }));
  const uncoveredProcesses = processes.filter((p) => !p.apps.length).map((p) => ({ id: p.id, name: p.name }));
  // Low-confidence review queue (sorted to the top).
  const lowConfidence = [];
  processes.forEach((p) => p.apps.forEach((a) => { if (a.status === 'proposed') lowConfidence.push({ processId: p.id, process: p.name, applicationId: a.id, application: a.name, confidence: a.confidence, source: a.source, rationale: a.rationale }); }));
  lowConfidence.sort((x, y) => (x.confidence || 0) - (y.confidence || 0));
  return {
    processes, orphanApps, uncoveredProcesses, lowConfidence,
    findings: {
      uncoveredProcesses: uncoveredProcesses.length,   // coverage holes / shadow IT
      orphanApps: orphanApps.length,                   // apps with no process
    },
    counts: { processes: processes.length, applications: allApps.length, mapped: mappedAppIds.size, pctMapped: processes.length ? Math.round((processes.filter((p) => p.apps.length).length / processes.length) * 100) : 0 },
  };
}

// Validate one mapping (accept / reject / edit relationship) -> status +
// validated_by/at, ledger log, and criticality propagation on accept.
async function validateMapping(orgId, { applicationId, processId, action, relationshipType, decidedBy }) {
  const status = action === 'reject' || action === 'delete' ? 'rejected' : 'validated';
  await db.query(
    `UPDATE app_process_map SET status=$4, confirmed=$5, relationship_type=COALESCE($6,relationship_type),
       validated_by=$7, validated_at=NOW(), confirmed_by=$7, updated_at=NOW()
     WHERE organization_id=$1 AND application_id=$2 AND process_id=$3`,
    [orgId, applicationId, processId, status, status === 'validated', relationshipType || null, decidedBy || null]);
  try { await require('../services/IntakeLedgerService').record(orgId, { step: 'applications', objectType: 'mapping', objectId: `${applicationId}::${processId}`, action: action || 'accept', changes: { relationshipType }, decidedBy }); } catch (_) {}
  let inherited = null;
  if (status === 'validated') inherited = await propagateCriticality(orgId, applicationId);
  return { ok: true, status, inherited };
}

// App criticality = MAX (most critical) of its VALIDATED mapped processes.
async function propagateCriticality(orgId, applicationId) {
  const ids = applicationId ? [applicationId] : (await db.query('SELECT id FROM applications WHERE organization_id=$1', [orgId])).map((r) => r.id);
  const out = [];
  for (const aid of ids) {
    const rows = await db.query(
      `SELECT p.criticality, p.crit_tier FROM app_process_map m
         JOIN business_processes p ON p.id=m.process_id AND p.organization_id=m.organization_id
        WHERE m.organization_id=$1 AND m.application_id=$2 AND m.status='validated'`, [orgId, aid]);
    if (!rows.length) continue;
    let bestCrit = null, bestTier = null;
    rows.forEach((r) => {
      if (r.criticality && (bestCrit == null || (CRIT_RANK[r.criticality] ?? 9) < (CRIT_RANK[bestCrit] ?? 9))) bestCrit = r.criticality;
      const t = Number(r.crit_tier); if (Number.isFinite(t) && (bestTier == null || t < bestTier)) bestTier = t;
    });
    await db.query('UPDATE applications SET criticality=COALESCE($3,criticality), tier=COALESCE($4,tier), updated_at=NOW() WHERE id=$2 AND organization_id=$1', [orgId, aid, bestCrit, bestTier]);
    out.push({ applicationId: aid, criticality: bestCrit, tier: bestTier });
  }
  return out;
}

async function status(orgId) {
  const [apps, procs, apm, pcm] = await Promise.all([
    db.query('SELECT COUNT(*)::int n FROM applications WHERE organization_id=$1', [orgId]),
    db.query('SELECT COUNT(*)::int n FROM business_processes WHERE organization_id=$1', [orgId]),
    db.query('SELECT COUNT(DISTINCT application_id)::int n FROM app_process_map WHERE organization_id=$1 AND confirmed=true', [orgId]),
    db.query('SELECT COUNT(DISTINCT process_id)::int n FROM process_capability_map WHERE organization_id=$1 AND confirmed=true', [orgId]),
  ]);
  return { applications: apps[0].n, processes: procs[0].n, appsCrosswalked: apm[0].n, processesCrosswalked: pcm[0].n };
}

module.exports = {
  suggestAppProcess, confirmAppProcess, suggestProcessCapability, confirmProcessCapability,
  autoMapAppsToProcesses, appProcessGraph, status, nameScore,
  cascadeMap, mappingReview, validateMapping, propagateCriticality,
};
