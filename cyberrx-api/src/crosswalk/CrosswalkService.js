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

async function status(orgId) {
  const [apps, procs, apm, pcm] = await Promise.all([
    db.query('SELECT COUNT(*)::int n FROM applications WHERE organization_id=$1', [orgId]),
    db.query('SELECT COUNT(*)::int n FROM business_processes WHERE organization_id=$1', [orgId]),
    db.query('SELECT COUNT(DISTINCT application_id)::int n FROM app_process_map WHERE organization_id=$1 AND confirmed=true', [orgId]),
    db.query('SELECT COUNT(DISTINCT process_id)::int n FROM process_capability_map WHERE organization_id=$1 AND confirmed=true', [orgId]),
  ]);
  return { applications: apps[0].n, processes: procs[0].n, appsCrosswalked: apm[0].n, processesCrosswalked: pcm[0].n };
}

module.exports = { suggestAppProcess, confirmAppProcess, suggestProcessCapability, confirmProcessCapability, status, nameScore };
