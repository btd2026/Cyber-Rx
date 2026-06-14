'use strict';

/**
 * ResolverService — entity resolution / dedupe (CIO promise). Reconciles
 * applications that arrive from multiple sources (or with messy names) to a
 * single canonical entity. Idempotent and safe to re-run: merging repoints the
 * crosswalk to the survivor and recomputes its inherited criticality.
 *
 * Pure clustering is unit-tested; merge runs against the DB.
 */

const db = require('../utils/db');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const toks = (s) => norm(s).split(' ').filter(Boolean);

function sim(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0; if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - dp[m][n] / Math.max(m, n);
}
function overlap(a, b) {
  const A = new Set(toks(a)), B = new Set(toks(b));
  if (!A.size || !B.size) return 0;
  let i = 0; A.forEach((t) => { if (B.has(t)) i++; }); return i / Math.max(A.size, B.size);
}
function pairScore(a, b) {
  let s = 0.6 * overlap(a, b) + 0.4 * sim(a, b);
  const A = toks(a), B = toks(b);
  if (A.length && B.length) { const [sh, lo] = A.length <= B.length ? [A, new Set(B)] : [B, new Set(A)]; if (sh.every((t) => lo.has(t))) s = Math.max(s, 0.9); }
  return Math.round(s * 100) / 100;
}

// Cluster items ({id, name, external_ref}) into duplicate groups. Identical
// external_ref => certain match; otherwise name similarity >= threshold.
function clusterDuplicates(items, threshold = 0.85) {
  const groups = [], used = new Set();
  for (let i = 0; i < items.length; i++) {
    if (used.has(items[i].id)) continue;
    const dups = [];
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(items[j].id)) continue;
      const sameRef = items[i].external_ref && items[j].external_ref && norm(items[i].external_ref) === norm(items[j].external_ref);
      const score = sameRef ? 1 : pairScore(items[i].name, items[j].name);
      if (score >= threshold) { dups.push({ id: items[j].id, name: items[j].name, confidence: score }); used.add(items[j].id); }
    }
    if (dups.length) { used.add(items[i].id); groups.push({ survivor: { id: items[i].id, name: items[i].name }, duplicates: dups }); }
  }
  return groups;
}

async function findDuplicateApplications(orgId) {
  const apps = await db.query('SELECT id, name, external_ref FROM applications WHERE organization_id=$1', [orgId]);
  return clusterDuplicates(apps);
}

async function mergeApplications(orgId, survivorId, duplicateIds = []) {
  for (const d of duplicateIds) {
    if (d === survivorId) continue;
    // Repoint crosswalk rows that don't already exist on the survivor, then drop the rest.
    await db.query(
      `UPDATE app_process_map SET application_id=$3
        WHERE organization_id=$1 AND application_id=$2
          AND NOT EXISTS (SELECT 1 FROM app_process_map m2 WHERE m2.organization_id=$1 AND m2.application_id=$3 AND m2.process_id=app_process_map.process_id)`,
      [orgId, d, survivorId]);
    await db.query('DELETE FROM app_process_map WHERE organization_id=$1 AND application_id=$2', [orgId, d]);
    await db.query('DELETE FROM applications WHERE organization_id=$1 AND id=$2', [orgId, d]);
  }
  const inherited = await require('../crosswalk/PropagationService').inheritAppCriticality(orgId, survivorId);
  return { survivorId, merged: duplicateIds.filter((d) => d !== survivorId).length, inherited };
}

module.exports = { pairScore, clusterDuplicates, findDuplicateApplications, mergeApplications };
