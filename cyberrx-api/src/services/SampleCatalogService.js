'use strict';

/**
 * SampleCatalogService
 * --------------------
 * Backs the "Use Sample Data" import in Setup step 3 (Map Applications).
 * Seeds an org-scoped application/asset catalog for the chosen healthcare
 * payer profile, mapped to the org's crown-jewel business processes — so the
 * CIO dashboard and the executive agents immediately reflect the import.
 *
 * Idempotent: deterministic ids + ON CONFLICT DO NOTHING; existing business
 * processes are reused (matched by name) rather than duplicated.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const PROFILES = [
  'Commercial Health Plan',
  'Medicare Advantage Plan',
  'Medicaid Managed Care',
  '[ORG] Plan',
];

// Crown-jewel processes every payer profile gets (created only if missing).
const BASE_PROCESSES = [
  { key: 'claims',   name: 'Claims Adjudication',     tier: 'Primary',   criticality: 'Critical', owner: 'CIO', match: 'claims' },
  { key: 'enroll',   name: 'Membership & Enrollment', tier: 'Primary',   criticality: 'Critical', owner: 'CIO', match: 'enroll' },
  { key: 'portal',   name: 'Member Portal',           tier: 'Primary',   criticality: 'High',     owner: 'CIO', match: 'portal' },
  { key: 'payint',   name: 'Payment Integrity',       tier: 'Primary',   criticality: 'Critical', owner: 'CFO', match: 'integrity' },
  { key: 'provider', name: 'Provider Network',        tier: 'Strategic', criticality: 'High',     owner: 'COO', match: 'provider' },
  { key: 'pbm',      name: 'Pharmacy / PBM',          tier: 'Strategic', criticality: 'High',     owner: 'COO', match: 'pbm' },
];

// Shared application catalog. proc -> BASE_PROCESSES key. Fields mirror the
// assets table the CIO dashboard reads.
const BASE_APPS = [
  { slug: 'claims-core',    name: 'Facets Claims Platform',        type: 'server',   proc: 'claims',   crit: 'Critical', tier: 'Tier 1', owner: 'Infrastructure', data: ['PHI'],            supported: true,  vc: 2, vh: 5, patch: 72 },
  { slug: 'enroll-engine',  name: 'Enrollment & Eligibility Engine', type: 'app',    proc: 'enroll',   crit: 'Critical', tier: 'Tier 1', owner: 'App Eng',        data: ['PHI', 'PII'],     supported: true,  vc: 0, vh: 3, patch: 86 },
  { slug: 'member-portal',  name: 'Member Web & Mobile Portal',    type: 'app',      proc: 'portal',   crit: 'High',     tier: 'Tier 2', owner: 'Digital',        data: ['PII'],            supported: true,  vc: 1, vh: 4, patch: 81 },
  { slug: 'edw',            name: 'Enterprise Data Warehouse',     type: 'database', proc: 'payint',   crit: 'Critical', tier: 'Tier 1', owner: 'Data',           data: ['PHI'],            supported: true,  vc: 1, vh: 2, patch: 77 },
  { slug: 'edi-gateway',    name: 'EDI Clearinghouse Connector',   type: 'API',      proc: 'claims',   crit: 'Critical', tier: 'Tier 1', owner: 'EDI',            data: ['PHI'],            supported: true,  vc: 1, vh: 1, patch: 79 },
  { slug: 'provider-portal', name: 'Provider Portal',              type: 'app',      proc: 'provider', crit: 'High',     tier: 'Tier 2', owner: 'Digital',        data: ['PHI'],            supported: true,  vc: 0, vh: 2, patch: 84 },
  { slug: 'prior-auth',     name: 'Prior Authorization (eviCore)', type: 'API',      proc: 'provider', crit: 'High',     tier: 'Tier 2', owner: 'Clinical Ops',   data: ['PHI'],            supported: true,  vc: 0, vh: 1, patch: 88 },
  { slug: 'payint-engine',  name: 'Payment Integrity / FWA Engine', type: 'app',     proc: 'payint',   crit: 'High',     tier: 'Tier 2', owner: 'SIU',            data: ['PHI', 'Financial'], supported: true, vc: 0, vh: 1, patch: 90 },
  { slug: 'contact-center', name: 'Contact Center (Genesys)',      type: 'cloud',    proc: 'portal',   crit: 'Medium',   tier: 'Tier 3', owner: 'Member Services', data: ['PII'],           supported: true,  vc: 0, vh: 2, patch: 85 },
  { slug: 'pbm-interface',  name: 'PBM Interface',                 type: 'API',      proc: 'pbm',      crit: 'High',     tier: 'Tier 2', owner: 'App Eng',        data: ['PHI'],            supported: true,  vc: 0, vh: 2, patch: 83 },
  { slug: 'integ-gateway',  name: 'Provider Integration Gateway (EoL)', type: 'server', proc: 'provider', crit: 'High',  tier: 'Tier 2', owner: 'Infrastructure', data: ['PHI'],            supported: false, vc: 3, vh: 6, patch: 41, eol: '2023-10-10' },
  { slug: 'legacy-imaging', name: 'Legacy Document Imaging (EoL)', type: 'server',   proc: 'claims',   crit: 'Medium',   tier: 'Tier 3', owner: 'Infrastructure', data: ['PHI'],            supported: false, vc: 2, vh: 4, patch: 38, eol: '2024-06-30' },
];

// Profile-specific additions.
const PROFILE_APPS = {
  'Commercial Health Plan': [
    { slug: 'broker-portal', name: 'Broker Quoting Portal', type: 'app', proc: 'enroll', crit: 'Medium', tier: 'Tier 3', owner: 'Sales Ops', data: ['PII'], supported: true, vc: 0, vh: 1, patch: 82 },
  ],
  'Medicare Advantage Plan': [
    { slug: 'edps',  name: 'CMS Encounter Submission (EDPS)', type: 'API', proc: 'claims', crit: 'Critical', tier: 'Tier 1', owner: 'Gov Programs', data: ['PHI'], supported: true, vc: 0, vh: 2, patch: 80 },
    { slug: 'stars', name: 'Stars Quality Analytics',         type: 'app', proc: 'payint', crit: 'High',     tier: 'Tier 2', owner: 'Quality',      data: ['PHI'], supported: true, vc: 0, vh: 1, patch: 87 },
    { slug: 'pde',   name: 'PDE Submission (Part D)',         type: 'API', proc: 'pbm',    crit: 'High',     tier: 'Tier 2', owner: 'Gov Programs', data: ['PHI'], supported: true, vc: 0, vh: 1, patch: 85 },
  ],
  'Medicaid Managed Care': [
    { slug: 'mmis',     name: 'State MMIS Interface',          type: 'API', proc: 'claims', crit: 'Critical', tier: 'Tier 1', owner: 'Gov Programs', data: ['PHI'], supported: true, vc: 1, vh: 2, patch: 74 },
    { slug: 'elig-834', name: '834 Eligibility Feed Processor', type: 'app', proc: 'enroll', crit: 'High',    tier: 'Tier 2', owner: 'EDI',          data: ['PHI', 'PII'], supported: true, vc: 0, vh: 2, patch: 78 },
  ],
  '[ORG] Plan': [
    { slug: 'bluecard', name: 'BlueCard / ITS Gateway',  type: 'API', proc: 'claims', crit: 'Critical', tier: 'Tier 1', owner: 'EDI',          data: ['PHI'], supported: true, vc: 0, vh: 2, patch: 81 },
    { slug: 'fep',      name: 'FEP Claims Interface',    type: 'API', proc: 'claims', crit: 'High',     tier: 'Tier 2', owner: 'Gov Programs', data: ['PHI'], supported: true, vc: 0, vh: 1, patch: 84 },
  ],
};

/**
 * Seed the catalog for an org + profile. Returns { profile, processes, assets, created }.
 */
async function seed(orgId, profile) {
  if (!PROFILES.includes(profile)) {
    const err = new Error(`Unknown profile. Valid: ${PROFILES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  // Ensure the org exists (setup may not have saved it yet).
  await db.query(
    `INSERT INTO orgs (id, name, type) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [orgId, orgId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), profile]);

  // Reuse existing business processes by name where possible; create the rest.
  const existing = await db.query(
    `SELECT id, name FROM business_processes WHERE organization_id = $1`, [orgId]);
  const procIds = {}; // key -> process id
  let processesCreated = 0;
  for (const p of BASE_PROCESSES) {
    const found = existing.find((e) => e.name.toLowerCase().includes(p.match));
    if (found) {
      procIds[p.key] = found.id;
    } else {
      const id = `${orgId}:bp-${p.key}`;
      await db.query(
        `INSERT INTO business_processes (id, name, tier, criticality, owner, organization_id, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
        [id, p.name, p.tier, p.criticality, p.owner, orgId, `Seeded by Sample Data import (${profile})`]);
      procIds[p.key] = id;
      processesCreated++;
    }
  }

  // Insert the application catalog as assets mapped to those processes.
  const apps = [...BASE_APPS, ...(PROFILE_APPS[profile] || [])];
  let assetsCreated = 0;
  for (const a of apps) {
    const id = `${orgId}:app-${a.slug}`;
    const r = await db.pool.query(
      `INSERT INTO assets
         (id, name, type, organization_id, hostname, owner, description,
          business_process_ids, data_classification, criticality, tier,
          supported, end_of_support_date, vuln_critical, vuln_high, patch_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO NOTHING`,
      [id, a.name, a.type, orgId, `${a.slug}.corp`, a.owner,
        `Imported from sample catalog (${profile})`,
        JSON.stringify([procIds[a.proc]]), JSON.stringify(a.data),
        a.crit, a.tier, a.supported, a.eol || null, a.vc, a.vh, a.patch]);
    if (r.rowCount > 0) assetsCreated++;
  }

  logger.info('[sample-catalog] Seeded', { orgId, profile, processesCreated, assetsCreated });
  return {
    profile,
    processes: Object.keys(procIds).length,
    processesCreated,
    assets: apps.length,
    assetsCreated,
  };
}

module.exports = { seed, PROFILES };
