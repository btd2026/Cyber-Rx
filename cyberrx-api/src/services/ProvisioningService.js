'use strict';

/**
 * ProvisioningService — REAL post-go-live readiness for the cockpit provisioning
 * screen. There is deliberately NO timer here: `done` is true only when the cockpit
 * can actually render (the same gate the cockpit itself uses — a non-empty
 * crown-jewel summary with economics). Intermediate progress reflects which real
 * sub-parts of the org's picture already exist, so the ring tracks genuine state
 * rather than a fixed animation.
 *
 * Contract (per the provisioning screen):
 *   { pct: 0-100, stageIndex: 0-5, stageLabel, done: boolean, error: null|string }
 *
 * `pct` is a floor for each reached stage; the client clamps it monotonic, so a
 * momentary read that reflects less state can never visibly rewind the ring.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const CrownJewelEngine = require('./crownjewels/CrownJewelEngine');

// Stage labels are locked (must match the screen's checklist). `at` is the pct
// floor a stage reaches once its real work is evidenced.
const STAGES = [
  { at: 20, active: 'Connecting your security stack…', done: 'Security stack connected' },
  { at: 45, active: 'Pulling identity, endpoint & cloud telemetry…', done: 'Telemetry synced' },
  { at: 65, active: 'Importing third-party vendor ratings…', done: 'Vendors imported' },
  { at: 85, active: 'Running your first control assessment…', done: 'Assessment complete' },
  { at: 97, active: 'Analyzing policies & mapping frameworks…', done: 'Frameworks mapped' },
  { at: 100, active: 'Building your executive views…', done: 'Cockpit ready' },
];

// Best-effort scalar count; a missing table / transient error degrades to 0 so a
// status read never throws (the route + client are guarded, but keep this clean).
async function count(sql, params) {
  try { const r = await db.query(sql, params); const row = r && r[0]; return Number(row && (row.n != null ? row.n : row.count)) || 0; }
  catch (_) { return 0; }
}

/**
 * Compute the org's real provisioning status.
 * @param {string} orgId
 * @returns {Promise<{pct:number,stageIndex:number,stageLabel:string,done:boolean,error:(string|null)}>}
 */
async function status(orgId) {
  if (!orgId) return { pct: 0, stageIndex: 0, stageLabel: STAGES[0].active, done: false, error: 'org_required' };

  // The single source of truth for "the cockpit can render" is the same summary
  // the cockpit gates on. Compute it and read its real counts/economics.
  let empty = true; let summary = null;
  try { const out = await CrownJewelEngine.run(orgId); empty = !!out.empty; summary = out.summary || null; }
  catch (e) { logger.debug('provisioning summary failed', { orgId, error: e.message }); }

  const econ = (summary && summary.economics) || {};
  const counts = (summary && summary.counts) || {};
  const ale = Number(econ.ale) || 0;
  const assets = Number(counts.assets) || 0;
  const risks = Number(counts.risks) || 0;
  const crown = Number(counts.crown_jewels) || 0;
  const renderable = !empty && !!summary && (ale > 0 || crown > 0);

  // Extra real signals for intermediate stages (guarded — 0 if absent).
  const controls = await count('SELECT COUNT(*)::int AS n FROM controls WHERE organization_id=$1', [orgId]);
  const vendors = await count('SELECT COUNT(*)::int AS n FROM vendors WHERE organization_id=$1', [orgId]);

  let stageIndex; let pct;
  if (renderable) { stageIndex = 5; pct = 100; }
  else if (controls > 0) { stageIndex = 4; pct = STAGES[3].at; }        // frameworks/policy mapping under way
  else if (crown > 0 || ale > 0) { stageIndex = 3; pct = STAGES[2].at; } // first assessment running
  else if (vendors > 0) { stageIndex = 2; pct = STAGES[1].at; }          // vendors imported
  else if (risks > 0 || assets > 0) { stageIndex = 1; pct = STAGES[0].at; } // inventory/telemetry landed
  else { stageIndex = 0; pct = 6; }

  return { pct, stageIndex, stageLabel: renderable ? STAGES[5].done : STAGES[stageIndex].active, done: renderable, error: null };
}

module.exports = { status, STAGES };
