'use strict';

/**
 * EntityEvidenceService — Layer B of the regional transformation. Stores each entity's
 * control evidence (connected-tool signals + document scores) and RESOLVES it for a scope
 * with inheritance: an entity inherits its region's evidence, which inherits the
 * enterprise's. So a customer connects EMEA's tools / uploads EMEA's policies once, and
 * every EMEA branch reads them unless it has its own (the onboarding "own systems & docs"
 * flag). The cockpit fetches the resolved bundle for whatever scope is selected.
 *
 * Storage is orgs.setup_json.entity_evidence (JSONB, keyed by scope id) — no new table.
 *
 *   parentOf(scopeId)                 -> the region id for an entity, else null
 *   inheritanceChain(scopeId)         -> ['enterprise', <region?>, <scope?>]
 *   merge(chain, byScope)             -> {signals, doc_scores} merged low→high priority
 *   saveEntity(orgId, scopeId, ev)    -> persist one scope's evidence
 *   getAll(orgId)                     -> {scopeId: {signals, doc_scores}}
 *   resolve(orgId, scopeId)           -> the inherited {signals, doc_scores} for a scope
 */
const db = require('../utils/db');

/** An entity id is `<region>_<branch>`; a region id has no underscore. */
function parentOf(scopeId) {
  return (scopeId && scopeId.indexOf('_') > 0) ? scopeId.split('_')[0] : null;
}

/** enterprise → region → entity, in increasing priority (later overrides earlier). */
function inheritanceChain(scopeId) {
  const chain = ['enterprise'];
  const region = parentOf(scopeId);
  if (region && region !== 'enterprise') chain.push(region);
  if (scopeId && scopeId !== 'enterprise' && chain.indexOf(scopeId) < 0) chain.push(scopeId);
  return chain;
}

/** Merge each scope's evidence along the chain — a child key overrides the parent's. */
function merge(chain, byScope) {
  const signals = {};
  const doc_scores = {};
  (chain || []).forEach((id) => {
    const e = byScope && byScope[id];
    if (!e) return;
    if (e.signals) Object.keys(e.signals).forEach((k) => { signals[k] = e.signals[k]; });
    if (e.doc_scores) Object.keys(e.doc_scores).forEach((k) => { doc_scores[k] = e.doc_scores[k]; });
  });
  return { signals, doc_scores };
}

async function getAll(orgId) {
  if (!orgId) throw new Error('orgId is required');
  const r = await db.query('SELECT setup_json FROM orgs WHERE id = $1', [orgId]);
  const row = r && r.rows && r.rows[0];
  const ev = row && row.setup_json && row.setup_json.entity_evidence;
  return (ev && typeof ev === 'object') ? ev : {};
}

async function saveEntity(orgId, scopeId, evidence) {
  if (!orgId) throw new Error('orgId is required');
  if (!scopeId) throw new Error('scopeId is required');
  const clean = {
    signals: (evidence && evidence.signals && typeof evidence.signals === 'object') ? evidence.signals : {},
    doc_scores: (evidence && evidence.doc_scores && typeof evidence.doc_scores === 'object') ? evidence.doc_scores : {},
  };
  await db.query(
    `UPDATE orgs
       SET setup_json = jsonb_set(COALESCE(setup_json, '{}'::jsonb), ARRAY['entity_evidence', $2], $3::jsonb, true)
     WHERE id = $1`,
    [orgId, scopeId, JSON.stringify(clean)],
  );
  return clean;
}

async function resolve(orgId, scopeId) {
  const byScope = await getAll(orgId);
  return merge(inheritanceChain(scopeId || 'enterprise'), byScope);
}

module.exports = { parentOf, inheritanceChain, merge, getAll, saveEntity, resolve };
