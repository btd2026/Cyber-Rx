'use strict';

/**
 * TenantConfigService — per-tenant overridable defaults (enterprise requirement:
 * opinionated defaults, fully overridable). Ships sensible defaults for fast
 * time-to-value; every default (risk appetite, scoring weights, frameworks, risk
 * taxonomy) is configurable per org and read by the engine.
 *
 * Storage: tenant_config(org_id, config JSONB). Reads deep-merge DEFAULTS so new
 * default keys appear for existing tenants without a migration.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const DEFAULTS = {
  appetite: {
    // Risks at or above this severity are "above appetite" (Key Risks hero set).
    riskThreshold: 'High',
    maxCriticalOpen: 0, maxHighOpen: 3, maxOverdueRemediation: 3,
    // Decision-queue: surface a decision when modeled 30-day exploit p >= this.
    decisionLikelihoodPct: 25,
  },
  scoringWeights: { coverage: 0.40, compliance: 0.30, timeliness: 0.20, exceptionQuality: 0.10 },
  frameworks: ['nist_csf_2_0'], // base framework(s); industry overlay adds more
  taxonomy: ['ransomware', 'data_exfil', 'business_disruption', 'fraud'],
};

function deepMerge(base, over) {
  if (Array.isArray(over)) return over.slice();
  if (over && typeof over === 'object') {
    const out = Array.isArray(base) ? {} : { ...(base || {}) };
    for (const k of Object.keys(over)) out[k] = deepMerge(base ? base[k] : undefined, over[k]);
    return out;
  }
  return over === undefined ? base : over;
}

async function ensure() {
  try { await db.query(`CREATE TABLE IF NOT EXISTS tenant_config (org_id TEXT PRIMARY KEY, config JSONB DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT now())`); }
  catch (e) { logger.debug('tenant_config ensure failed', { error: e.message }); }
}

async function get(orgId) {
  await ensure();
  let stored = {};
  try { const r = await db.query('SELECT config FROM tenant_config WHERE org_id=$1', [orgId]); if (r[0]) stored = r[0].config || {}; }
  catch (e) { logger.debug('tenant_config read fallback', { error: e.message }); }
  return { config: deepMerge(DEFAULTS, stored), defaults: DEFAULTS, overridden: Object.keys(stored || {}) };
}

async function set(orgId, patch) {
  await ensure();
  const cur = (await get(orgId)).config;
  const merged = deepMerge(cur, patch || {});
  // Persist only the delta from DEFAULTS so "defaults" stays live for future keys.
  const delta = diff(DEFAULTS, merged);
  try { await db.query(`INSERT INTO tenant_config (org_id, config, updated_at) VALUES ($1,$2,now()) ON CONFLICT (org_id) DO UPDATE SET config=$2, updated_at=now()`, [orgId, JSON.stringify(delta)]); }
  catch (e) { logger.warn('tenant_config write failed', { error: e.message }); throw e; }
  return get(orgId);
}

// Keep only values that differ from defaults (shallow-ish, one level into objects).
function diff(def, val) {
  const out = {};
  for (const k of Object.keys(val)) {
    if (JSON.stringify(val[k]) !== JSON.stringify(def[k])) out[k] = val[k];
  }
  return out;
}

module.exports = { get, set, DEFAULTS };
