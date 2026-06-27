'use strict';

/**
 * ReverseCoverageService — Stage 7 document-driven pass (§2 step 5).
 * For each policy chunk, ask which 800-53 controls it touches. The control-
 * driven pass gives the authoritative per-control verdicts; this reverse pass
 * catches policy content that maps to controls we wouldn't have thought to
 * check, and powers the coverage heatmap. Model output is grounded: returned
 * control ids are kept ONLY if they exist in the loaded corpus.
 *
 * Batchable via an injected classify(chunk) function; the Anthropic client and
 * the valid-id set are injected so this is unit-testable without network.
 */

const logger = require('../../utils/logger');
const models = require('../../config/assessmentModels');

// Public NIST 800-53 family taxonomy (labels only — not the copyrighted control text).
const FAMILIES = {
  AC: 'Access Control', AT: 'Awareness and Training', AU: 'Audit and Accountability',
  CA: 'Assessment, Authorization, and Monitoring', CM: 'Configuration Management', CP: 'Contingency Planning',
  IA: 'Identification and Authentication', IR: 'Incident Response', MA: 'Maintenance', MP: 'Media Protection',
  PE: 'Physical and Environmental Protection', PL: 'Planning', PM: 'Program Management', PS: 'Personnel Security',
  PT: 'PII Processing and Transparency', RA: 'Risk Assessment', SA: 'System and Services Acquisition',
  SC: 'System and Communications Protection', SI: 'System and Information Integrity', SR: 'Supply Chain Risk Management',
};

const SYSTEM = 'You map policy text to the NIST SP 800-53 controls it addresses. Be precise: only list a control if the text ' +
  'genuinely speaks to it. Use base or enhancement ids like AC-2 or AC-2(3).';

function buildReverseRequest(chunk, model) {
  const fam = Object.entries(FAMILIES).map(([k, v]) => `${k}=${v}`).join('; ');
  return {
    model: model || models.triageModel, // cheap model is fine for mapping
    max_tokens: 400,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `800-53 families: ${fam}`, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `POLICY TEXT (section ${chunk.section_ref}):\n${chunk.text}\n\nReturn ONLY JSON: {"controls":["AC-2", ...]} — the 800-53 controls this text addresses (empty if none).` }],
  };
}

const textOf = (m) => ((m && m.content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
function parseIds(text) {
  const s = String(text || ''); const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) return [];
  try { const o = JSON.parse(s.slice(a, b + 1)); return Array.isArray(o.controls) ? o.controls.map(String) : []; }
  catch (_) { return []; }
}

async function classifyChunk(chunk, { anthropic, model, validIds }) {
  if (!anthropic) return [];
  try {
    const resp = await anthropic.messages.create(buildReverseRequest(chunk, model));
    const ids = parseIds(textOf(resp));
    return validIds ? ids.filter((id) => validIds.has(id)) : ids; // ground against the corpus
  } catch (e) { logger.warn(`reverse classify failed (${chunk.section_ref}): ${e.message}`); return []; }
}

/**
 * @param {Array} chunks  document chunks ({section_ref, text})
 * @param {{anthropic, model, validIds:Set}} deps
 * @returns {Promise<{chunkTouches:Array, touchedByControl:Object}>}
 */
async function runReverse(chunks, deps = {}) {
  const chunkTouches = []; const touchedByControl = {};
  for (const chunk of chunks) {
    const controls = await classifyChunk(chunk, deps);
    chunkTouches.push({ section_ref: chunk.section_ref, controls });
    for (const id of controls) (touchedByControl[id] = touchedByControl[id] || []).push(chunk.section_ref);
  }
  return { chunkTouches, touchedByControl };
}

module.exports = { runReverse, classifyChunk, buildReverseRequest, parseIds, FAMILIES };
