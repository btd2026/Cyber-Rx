'use strict';

/**
 * DocumentDiffService — Stage 8 incremental re-assessment (§3 "incremental
 * re-assessment"). On re-upload of a revised document, diff the new chunks
 * against the prior version (by section_ref + content hash) and compute the
 * minimal work: which sections to re-embed and which controls to re-assess
 * (those whose prior evidence/touches came from changed or removed sections).
 * Unchanged sections — and the controls grounded only in them — are reused.
 * Pure + deterministic.
 */

const crypto = require('crypto');
const hash = (t) => crypto.createHash('sha1').update(String(t || '')).digest('hex');

/** @returns {{added:string[],removed:string[],changed:string[],unchanged:string[]}} */
function diffChunks(prevChunks = [], newChunks = []) {
  const prev = new Map(prevChunks.map((c) => [c.section_ref, hash(c.text)]));
  const next = new Map(newChunks.map((c) => [c.section_ref, hash(c.text)]));
  const added = []; const removed = []; const changed = []; const unchanged = [];
  for (const [ref, h] of next) {
    if (!prev.has(ref)) added.push(ref);
    else if (prev.get(ref) !== h) changed.push(ref);
    else unchanged.push(ref);
  }
  for (const ref of prev.keys()) if (!next.has(ref)) removed.push(ref);
  return { added, removed, changed, unchanged };
}

/**
 * Decide the re-assessment plan.
 * @param {object} diff  output of diffChunks
 * @param {Object<string,string[]>} controlSectionMap  control_id -> section_refs it was grounded in
 *        (union of prior evidence section_refs and reverse-pass touches)
 * @returns {{reembedSections:string[], reassessControls:string[], reason:string, incremental:boolean}}
 */
function plan(diff, controlSectionMap = {}) {
  const touched = new Set([...diff.changed, ...diff.removed]);
  const reembedSections = [...diff.added, ...diff.changed];
  const reassess = new Set();
  for (const [cid, refs] of Object.entries(controlSectionMap)) {
    if ((refs || []).some((r) => touched.has(stripPart(r)) || touched.has(r))) reassess.add(cid);
  }
  // Added sections may newly touch controls we can't know without a reverse pass,
  // so the caller should run the reverse pass over added/changed chunks too.
  const incremental = !(diff.added.length === 0 && diff.changed.length === 0 && diff.removed.length === 0)
    && (diff.unchanged.length > 0);
  return {
    reembedSections,
    reassessControls: [...reassess],
    runReverseOn: reembedSections,
    incremental,
    reason: incremental
      ? `Incremental: ${diff.changed.length} changed, ${diff.added.length} added, ${diff.removed.length} removed; ${diff.unchanged.length} reused.`
      : 'Full re-assessment (no reusable prior chunks).',
  };
}

// section refs may carry a #part suffix (e.g. §4.2#2); compare on the base ref too.
function stripPart(ref) { return String(ref).split('#')[0]; }

module.exports = { diffChunks, plan, hash, stripPart };
