'use strict';

/**
 * BenchmarkService — Phase 7 SCAFFOLD for anonymized cross-tenant benchmarking
 * on the shared canonical capabilities. Flag-gated (CROSS_TENANT_BENCHMARKING)
 * and consent-bounded:
 *   - Tenants opt in (give-to-get): you must consent to see benchmarks.
 *   - k-anonymity: a capability's numbers are suppressed unless at least
 *     MIN_COHORT consenting tenants contribute (no small-cohort de-anonymization).
 *   - A shared dependency (e.g. NASCO) is assessed ONCE and surfaced to every
 *     dependent tenant.
 *
 * This is intentionally a scaffold: structure, gating, and safe aggregation are
 * in place; richer maturity metrics plug in as the assessment data deepens.
 */

const db = require('../utils/db');

const MIN_COHORT = 3;

function isEnabled() { return process.env.CROSS_TENANT_BENCHMARKING === 'true'; }

// Suppress a value unless the cohort is large enough (k-anonymity).
function kAnonymize(value, cohortSize, k = MIN_COHORT) { return cohortSize >= k ? value : null; }

function cohortStats(nums) {
  const a = (nums || []).filter((n) => n != null).map(Number);
  return { count: a.length, avg: a.length ? Math.round((a.reduce((s, n) => s + n, 0) / a.length) * 100) / 100 : null };
}

async function getConsent(orgId) {
  const r = await db.query('SELECT org_id, consented, scope, updated_at FROM benchmark_consent WHERE org_id=$1', [orgId]);
  return r[0] || { org_id: orgId, consented: false, scope: 'capabilities' };
}

async function setConsent(orgId, consented, scope) {
  await db.query(
    `INSERT INTO benchmark_consent (org_id, consented, scope, updated_at) VALUES ($1,$2,$3,NOW())
     ON CONFLICT (org_id) DO UPDATE SET consented=EXCLUDED.consented, scope=EXCLUDED.scope, updated_at=NOW()`,
    [orgId, !!consented, scope || 'capabilities']);
  return getConsent(orgId);
}

// Anonymized per-capability benchmark across consenting tenants (give-to-get).
async function capabilityBenchmark(orgId) {
  const mine = await getConsent(orgId);
  if (!mine.consented) return { enabled: true, consented: false, message: 'Opt in to benchmarking to view anonymized peer data.' };
  const consented = (await db.query('SELECT org_id FROM benchmark_consent WHERE consented=true')).map((r) => r.org_id);
  if (!consented.length) return { enabled: true, consented: true, minCohort: MIN_COHORT, capabilities: [] };

  const rows = await db.query(
    `SELECT pcm.capability_id AS capability_id,
            COUNT(DISTINCT pcm.organization_id)::int AS cohort,
            AVG(cp.tier)::numeric(4,2) AS avg_tier
       FROM process_capability_map pcm
       JOIN business_processes bp ON bp.id = pcm.process_id
       LEFT JOIN criticality_profile cp ON cp.id = bp.criticality_profile_id
      WHERE pcm.confirmed = true AND pcm.organization_id = ANY($1)
      GROUP BY pcm.capability_id`, [consented]);

  const capabilities = rows
    .filter((r) => r.cohort >= MIN_COHORT)           // suppress small cohorts entirely
    .map((r) => ({
      capability_id: r.capability_id,
      cohort: r.cohort,
      avgCriticalityTier: kAnonymize(r.avg_tier != null ? Number(r.avg_tier) : null, r.cohort),
    }));
  return { enabled: true, consented: true, minCohort: MIN_COHORT, cohortTenants: consented.length, capabilities };
}

// Shared dependency assessments relevant to this tenant's dependency graph.
async function sharedDependencyBenchmark(orgId) {
  const refs = (await db.query(
    `SELECT DISTINCT catalog_ref FROM third_party_dependency WHERE organization_id=$1 AND catalog_ref IS NOT NULL`, [orgId])
  ).map((r) => r.catalog_ref);
  if (!refs.length) return { enabled: true, dependencies: [] };
  const rows = await db.query(
    `SELECT catalog_ref, name, score, summary, assessed_at FROM shared_dependency_assessment WHERE catalog_ref = ANY($1) ORDER BY assessed_at DESC`, [refs]);
  return { enabled: true, dependencies: rows };
}

module.exports = { isEnabled, kAnonymize, cohortStats, getConsent, setConsent, capabilityBenchmark, sharedDependencyBenchmark, MIN_COHORT };
