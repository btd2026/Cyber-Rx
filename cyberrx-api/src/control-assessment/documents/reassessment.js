'use strict';

/**
 * reassessment — decides WHEN a document control must be re-assessed and emits a
 * reassessment event describing why, with a diff of the old vs new verdict.
 *
 * Triggers (any one fires a reassessment):
 *   upload         — a new document supplied for a control that had none.
 *   replace        — a new content hash supersedes the prior version.
 *   delete         — the active document was removed → control loses its evidence.
 *   hash_change    — same document_type re-uploaded with different content.
 *   expire         — the document has passed its freshness window.
 *   stale_review   — last_review_date is older than the review cadence.
 *   scope_change   — the control's in-scope systems/population changed.
 *
 * A reassessment does NOT trust the prior conclusion — it re-runs assess and
 * records what changed. Expiry/staleness are time-based and must be evaluated on
 * a schedule even without an upload.
 */

const { assessDocument } = require('./assess');

const TRIGGER = {
  UPLOAD: 'upload', REPLACE: 'replace', DELETE: 'delete', HASH_CHANGE: 'hash_change',
  EXPIRE: 'expire', STALE_REVIEW: 'stale_review', SCOPE_CHANGE: 'scope_change',
};

/**
 * shouldReassess(prev, next) → { reassess, triggers[] }
 * prev/next carry the minimal facts needed to decide, so this is pure.
 * prev: { hash, active, expired, stale_review, scope_key } | null
 * next: { hash, active, expired, stale_review, scope_key } | null
 */
function shouldReassess(prev, next) {
  const triggers = [];
  if (!prev && next && next.active) triggers.push(TRIGGER.UPLOAD);
  if (prev && !next) triggers.push(TRIGGER.DELETE);
  if (prev && next && prev.active && !next.active) triggers.push(TRIGGER.DELETE);
  if (prev && next && prev.hash && next.hash && prev.hash !== next.hash) {
    triggers.push(TRIGGER.HASH_CHANGE); triggers.push(TRIGGER.REPLACE);
  }
  if (next && next.expired && (!prev || !prev.expired)) triggers.push(TRIGGER.EXPIRE);
  if (next && next.stale_review && (!prev || !prev.stale_review)) triggers.push(TRIGGER.STALE_REVIEW);
  if (prev && next && prev.scope_key != null && next.scope_key != null && prev.scope_key !== next.scope_key) triggers.push(TRIGGER.SCOPE_CHANGE);
  return { reassess: triggers.length > 0, triggers: [...new Set(triggers)] };
}

function diffAssessments(prevResult, nextResult) {
  const fields = ['status', 'evidence_layer', 'evidence_strength', 'control_design_score', 'operating_effectiveness_score', 'overall_score', 'has_operating_evidence', 'design_threshold_met', 'expired'];
  const changes = {};
  fields.forEach((f) => {
    const a = prevResult ? prevResult[f] : undefined;
    const b = nextResult ? nextResult[f] : undefined;
    if (a !== b) changes[f] = { from: a === undefined ? null : a, to: b === undefined ? null : b };
  });
  return changes;
}

/**
 * reassess(input, prevResult, now) → reassessment event object.
 * input is the same shape assessDocument takes. prevResult is the last stored
 * assessment (or null). Produces the new assessment + the trigger diff.
 */
function reassess(input, prevResult, now) {
  const nextResult = assessDocument(Object.assign({}, input, { now: now != null ? now : input.now }));
  const prevFacts = prevResult ? {
    hash: prevResult.hash, active: true, expired: prevResult.expired,
    stale_review: prevResult.reviewed === false, scope_key: prevResult.scope_key || null,
  } : null;
  const nextFacts = {
    hash: nextResult.hash, active: true, expired: nextResult.expired,
    stale_review: nextResult.reviewed === false, scope_key: input.scope_key || null,
  };
  const decision = shouldReassess(prevFacts, nextFacts);
  return {
    reassessed_at: nextResult.assessed_at,
    framework_key: input.framework_key || null,
    control_id: input.control_id || null,
    triggers: decision.reassess ? decision.triggers : (prevResult ? [] : [TRIGGER.UPLOAD]),
    changed: diffAssessments(prevResult, nextResult),
    previous_status: prevResult ? prevResult.status : null,
    new_status: nextResult.status,
    assessment: nextResult,
  };
}

module.exports = { TRIGGER, shouldReassess, diffAssessments, reassess };
