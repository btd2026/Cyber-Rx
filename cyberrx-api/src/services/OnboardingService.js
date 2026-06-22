'use strict';

/**
 * OnboardingService — lifecycle for the redesigned 7-phase onboarding journey.
 * -------------------------------------------------------------------------
 * Step 1 (Foundations) scope:
 *   - getOrCreateSession(orgId)        -> the single resumable session for an org
 *   - advance(orgId, toPhase)          -> move to a phase, stamping phase_state
 *   - markPhase(orgId, phase, patch)   -> record started/completed for a phase
 *   - goLive(orgId)                    -> flip status to 'live'
 *   - getCompleteness(orgId)           -> latest completeness breakdown (cached read)
 *
 * The six-dimension completeness CALCULATOR lands in a later build step
 * (CompletenessService); here computeCompleteness() derives a deterministic
 * phase-progress proxy so the stepper has a real number to show immediately.
 * See docs/plans/onboarding-redesign-blueprint.md (§2, §6, §9 step 1).
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

// Ordered phases. Index drives the stepper and the phase-progress proxy.
const PHASES = [
  'business_context',
  'apps_tech',
  'connectors',
  'governance',
  'third_party',
  'scoring',
  'completeness',
];

const DIMENSIONS = [
  'business_context',
  'asset_coverage',
  'connector_coverage',
  'governance_coverage',
  'third_party_coverage',
  'framework_coverage',
];

const EXEC_QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];

function isPhase(p) {
  return PHASES.includes(p);
}

/** Fetch the org's session, creating it on first touch (idempotent). */
async function getOrCreateSession(orgId) {
  const rows = await db.query(
    'SELECT * FROM onboarding_session WHERE organization_id = $1',
    [orgId]
  );
  if (rows.length) return rows[0];

  const id = uuidv4();
  const inserted = await db.query(
    `INSERT INTO onboarding_session (id, organization_id, phase, status, completeness, phase_state)
     VALUES ($1, $2, $3, 'in_progress', 0, $4)
     ON CONFLICT (organization_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [
      id,
      orgId,
      PHASES[0],
      JSON.stringify({ [PHASES[0]]: { started_at: new Date().toISOString() } }),
    ]
  );
  return inserted[0];
}

/** Move the session to a named phase, stamping started_at the first time. */
async function advance(orgId, toPhase) {
  if (!isPhase(toPhase)) {
    const err = new Error(`unknown phase: ${toPhase}`);
    err.status = 400;
    throw err;
  }
  const session = await getOrCreateSession(orgId);
  const state = session.phase_state || {};
  if (!state[toPhase] || !state[toPhase].started_at) {
    state[toPhase] = { ...(state[toPhase] || {}), started_at: new Date().toISOString() };
  }
  const rows = await db.query(
    `UPDATE onboarding_session
        SET phase = $2, phase_state = $3, updated_at = NOW()
      WHERE organization_id = $1
      RETURNING *`,
    [orgId, toPhase, JSON.stringify(state)]
  );
  return rows[0];
}

/** Record progress for a phase (e.g. { completed: true }) without changing the cursor. */
async function markPhase(orgId, phase, patch = {}) {
  if (!isPhase(phase)) {
    const err = new Error(`unknown phase: ${phase}`);
    err.status = 400;
    throw err;
  }
  const session = await getOrCreateSession(orgId);
  const state = session.phase_state || {};
  const prev = state[phase] || {};
  state[phase] = {
    ...prev,
    ...patch,
    ...(patch.completed && !prev.completed_at
      ? { completed_at: new Date().toISOString() }
      : {}),
  };
  const rows = await db.query(
    `UPDATE onboarding_session SET phase_state = $2, updated_at = NOW()
      WHERE organization_id = $1 RETURNING *`,
    [orgId, JSON.stringify(state)]
  );
  return rows[0];
}

/** Flip the journey to 'live'. Allowed at any completeness (honest scoring). */
async function goLive(orgId) {
  await getOrCreateSession(orgId);
  const rows = await db.query(
    `UPDATE onboarding_session
        SET status = 'live', went_live_at = COALESCE(went_live_at, NOW()), updated_at = NOW()
      WHERE organization_id = $1
      RETURNING *`,
    [orgId]
  );
  return rows[0];
}

/**
 * Phase-progress proxy for completeness until the full six-dimension calculator
 * (CompletenessService) ships. Each dimension is scored by whether its owning
 * phase has been completed, so the number is real and monotonic, not random.
 */
function computeCompleteness(session) {
  const state = (session && session.phase_state) || {};
  const phaseDone = (p) => (state[p] && state[p].completed_at ? 100 : 0);

  const dimensions = {
    business_context: phaseDone('business_context'),
    asset_coverage: phaseDone('apps_tech'),
    connector_coverage: phaseDone('connectors'),
    governance_coverage: phaseDone('governance'),
    third_party_coverage: phaseDone('third_party'),
    framework_coverage: phaseDone('scoring'),
  };
  // Weights from blueprint §6 (sum 100): 15/20/20/20/15/10.
  const weights = {
    business_context: 15,
    asset_coverage: 20,
    connector_coverage: 20,
    governance_coverage: 20,
    third_party_coverage: 15,
    framework_coverage: 10,
  };
  let overall = 0;
  for (const d of DIMENSIONS) overall += (dimensions[d] * weights[d]) / 100;

  // Conservative readiness proxy: green once the dimensions a question depends
  // on are complete; amber if partially; red if none. Refined in Step 7.
  const ge = (d) => dimensions[d] >= 100;
  const band = (deps) => {
    const done = deps.filter(ge).length;
    if (done === deps.length) return 'green';
    if (done > 0) return 'amber';
    return 'red';
  };
  const answer_readiness = {
    q1: band(['connector_coverage']),
    q2: band(['framework_coverage', 'governance_coverage']),
    q3: band(['business_context', 'asset_coverage']),
    q4: band(['business_context']),
    q5: band(['business_context']),
    q6: band(['third_party_coverage']),
    q7: band(['asset_coverage']),
    q8: band(['framework_coverage']),
  };

  return { overall: Math.round(overall), dimensions, answer_readiness };
}

/** Compute completeness, persist a history row, and cache onto the session. */
async function recomputeCompleteness(orgId) {
  const session = await getOrCreateSession(orgId);
  const { overall, dimensions, answer_readiness } = computeCompleteness(session);
  const id = uuidv4();
  await db.query(
    `INSERT INTO onboarding_completeness (id, organization_id, overall, dimensions, answer_readiness)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, orgId, overall, JSON.stringify(dimensions), JSON.stringify(answer_readiness)]
  );
  await db.query(
    'UPDATE onboarding_session SET completeness = $2, updated_at = NOW() WHERE organization_id = $1',
    [orgId, overall]
  );
  return { overall, dimensions, answer_readiness };
}

/** Latest completeness breakdown; computes a baseline if none exists yet. */
async function getCompleteness(orgId) {
  const rows = await db.query(
    `SELECT overall, dimensions, answer_readiness, computed_at
       FROM onboarding_completeness
      WHERE organization_id = $1
      ORDER BY computed_at DESC
      LIMIT 1`,
    [orgId]
  );
  if (rows.length) return rows[0];
  return recomputeCompleteness(orgId);
}

module.exports = {
  PHASES,
  DIMENSIONS,
  EXEC_QUESTIONS,
  getOrCreateSession,
  advance,
  markPhase,
  goLive,
  computeCompleteness,
  recomputeCompleteness,
  getCompleteness,
};
