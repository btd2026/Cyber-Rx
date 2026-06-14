'use strict';

/**
 * PropagationService — business criticality flows DOWN the chain: an Application
 * inherits the highest tier (1 = most critical) and the tightest RTO of every
 * process it supports. Pure helpers are unit-tested; inheritAppCriticality
 * persists the result onto the application.
 */

const db = require('../utils/db');

// Parse an RTO string ('4h', '24h', '72h', '1d', '1w') to hours for comparison.
function rtoHours(s) {
  if (!s) return Infinity;
  const m = String(s).trim().match(/^(\d+(?:\.\d+)?)\s*([a-z]*)/i);
  if (!m) return Infinity;
  const n = parseFloat(m[1]); const u = (m[2] || 'h').toLowerCase();
  if (u.startsWith('w')) return n * 168;
  if (u.startsWith('d')) return n * 24;
  if (u.startsWith('m') && u !== 'h') return n / 60; // minutes
  return n; // hours
}
function tightestRto(list) {
  let best = null, bestH = Infinity;
  for (const r of (list || [])) { const h = rtoHours(r); if (h < bestH) { bestH = h; best = r; } }
  return best;
}
// Highest criticality tier = smallest tier number present.
function highestTier(list) {
  const nums = (list || []).map(Number).filter((n) => n >= 1);
  return nums.length ? Math.min(...nums) : null;
}

// Recompute one application's inherited tier + RTO from its mapped processes.
async function inheritAppCriticality(orgId, appId) {
  const rows = await db.query(
    `SELECT cp.tier AS tier, cp.rto AS rto
       FROM app_process_map m
       JOIN business_processes bp ON bp.id = m.process_id
       LEFT JOIN criticality_profile cp ON cp.id = bp.criticality_profile_id
      WHERE m.organization_id = $1 AND m.application_id = $2`, [orgId, appId]);
  const tier = highestTier(rows.map((r) => r.tier));
  const rto = tightestRto(rows.map((r) => r.rto));
  await db.query(`UPDATE applications SET tier=$3, rto=$4, updated_at=NOW() WHERE id=$2 AND organization_id=$1`,
    [orgId, appId, tier, rto]);
  return { applicationId: appId, tier, rto, fromProcesses: rows.length };
}

module.exports = { rtoHours, tightestRto, highestTier, inheritAppCriticality };
