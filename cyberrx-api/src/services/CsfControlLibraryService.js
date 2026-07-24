'use strict';

/**
 * CsfControlLibraryService
 * ------------------------
 * Serves the NIST CSF 2.0 control library and the security-tool API catalog,
 * and computes the two cross-reference tables the app renders:
 *
 *   1. Control → Tools : every CSF subcategory, whether it is automatically
 *      testable (tool API) or manual (evidence requested at setup), and the
 *      list of tools whose API can evidence it.
 *
 *   2. Tool → Controls/API : every security tool, the specific JSON API
 *      call(s) it exposes, and which controls each call evidences (reverse
 *      index built from both the control library and the catalog's own
 *      `controls` arrays so the mapping is consistent).
 *
 * Where the org has already connected a tool (a non-null metric_inputs value
 * for the tool's signal), the control is marked `connected: true` so the UI
 * can show live-vs-available coverage. This is read-only metadata; it does not
 * fabricate scores.
 */

const { FUNCTIONS, CATEGORIES, CONTROLS } = require('../data/nistCsfControlLibrary');
const { TOOLS } = require('../data/securityToolCatalog');
const MetricsEngine = require('./MetricsEngine');
const logger = require('../utils/logger');

const TOOL_BY_ID = {};
TOOLS.forEach((t) => { TOOL_BY_ID[t.id] = t; });

const TEST_LABEL = { auto: 'Automated (tool API)', partial: 'Hybrid (tool + attestation)', manual: 'Manual (evidence at setup)' };

// Reverse index: toolId -> Set(controlId). Union of the control library's
// `tools` arrays and each catalog API's `controls` array.
function buildToolControlIndex() {
  const idx = {};
  const add = (toolId, controlId) => { (idx[toolId] = idx[toolId] || new Set()).add(controlId); };
  CONTROLS.forEach((c) => (c.tools || []).forEach((t) => add(t, c.id)));
  TOOLS.forEach((t) => (t.apis || []).forEach((a) => (a.controls || []).forEach((c) => add(t.id, c))));
  return idx;
}

function toolSummary(toolId, connectedSignals) {
  const t = TOOL_BY_ID[toolId];
  if (!t) return { id: toolId, name: toolId };
  const connected = !!(t.apis || []).some((a) => a.signal && connectedSignals.has(a.signal));
  return { id: t.id, name: t.name, vendor: t.vendor, category: t.category, live: !!t.live, connected };
}

async function getLibrary(orgId) {
  // Which tool signals does this org already feed? (live coverage hint)
  let inputs = {};
  try { inputs = await MetricsEngine.loadInputs(orgId); } catch (e) { logger.debug('CSF library inputs degraded', { error: e.message }); }
  const connectedSignals = new Set(Object.keys(inputs).filter((k) => inputs[k] != null && inputs[k] !== ''));

  const toolIdx = buildToolControlIndex();

  // ---- Table 1: controls with their evidencing tools -----------------------
  const controls = CONTROLS.map((c) => {
    const tools = (c.tools || []).map((id) => toolSummary(id, connectedSignals));
    const connected = tools.some((t) => t.connected);
    return {
      id: c.id, function: c.fn, category: c.cat,
      categoryName: (CATEGORIES.find((x) => x.id === c.cat) || {}).name || c.cat,
      name: c.name,
      intent: c.intent || null,          // plain-English: the risk this control mitigates
      type: c.type || null,              // People | Process | Technology
      test: c.test, testLabel: TEST_LABEL[c.test] || c.test,
      automatable: c.test === 'auto' || c.test === 'partial',
      signal: c.signal,
      tools,
      toolCount: tools.length,
      connected,
      evidenceRequest: c.evidence,
    };
  });

  // ---- Table 2: tools with their concrete API calls ------------------------
  const tools = TOOLS.map((t) => {
    const controlIds = [...(toolIdx[t.id] || new Set())].sort();
    return {
      id: t.id, name: t.name, vendor: t.vendor, category: t.category,
      auth: t.auth, baseUrl: t.baseUrl, docs: t.docs, live: !!t.live,
      connected: (t.apis || []).some((a) => a.signal && connectedSignals.has(a.signal)),
      controls: controlIds,
      controlCount: controlIds.length,
      apis: (t.apis || []).map((a) => ({
        purpose: a.purpose, method: a.method, path: a.path,
        headers: a.headers || {}, sample: a.sample, extract: a.extract,
        signal: a.signal || null, controls: a.controls || [],
      })),
    };
  });

  // ---- Summary -------------------------------------------------------------
  const total = controls.length;
  const auto = controls.filter((c) => c.test === 'auto').length;
  const partial = controls.filter((c) => c.test === 'partial').length;
  const manual = controls.filter((c) => c.test === 'manual').length;
  const connected = controls.filter((c) => c.connected).length;
  const byFunction = FUNCTIONS.map((f) => {
    const fc = controls.filter((c) => c.function === f.id);
    return {
      id: f.id, name: f.name, total: fc.length,
      auto: fc.filter((c) => c.test === 'auto').length,
      partial: fc.filter((c) => c.test === 'partial').length,
      manual: fc.filter((c) => c.test === 'manual').length,
    };
  });

  return {
    framework: 'NIST CSF 2.0',
    organizationId: orgId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalControls: total, automated: auto, hybrid: partial, manual,
      automatableTotal: auto + partial, connectedControls: connected,
      totalTools: tools.length, connectedTools: tools.filter((t) => t.connected).length,
    },
    functions: FUNCTIONS,
    categories: CATEGORIES,
    byFunction,
    controls,
    tools,
  };
}

module.exports = { getLibrary };
