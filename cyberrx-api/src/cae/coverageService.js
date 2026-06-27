'use strict';

/**
 * cae/coverageService — link the systems a tenant selects (Organization Intake →
 * Technology step) to the framework controls each one can evidence, using the
 * private control DB (cae_control_tool_map). Two jobs:
 *   coverageForTools(names)   -> per-tool + aggregate framework coverage (for the UI)
 *   selectTools(orgId, names) -> persist the selection so those controls become
 *                                automated in the assessment engine (enablement)
 *
 * Tool names are reconciled to canonical cae_tool names via the alias map (so
 * "SailPoint IGA" / "CyberArk PAM" / "Entra" resolve correctly).
 */

const db = require('../utils/db');
const { resolve } = require('./aliasMap');

const FW_LABEL = {
  'NIST CSF 2.0': 'NIST CSF 2.0',
  'NIST SP 800-53 Rev. 5': 'NIST 800-53',
  'MITRE ATT&CK Enterprise': 'MITRE ATT&CK',
};

async function toolContext() {
  const tools = await db.query('SELECT DISTINCT name, category FROM cae_tool');
  const toolByLower = new Map();
  const categories = new Set();
  for (const r of tools) { toolByLower.set(r.name.toLowerCase(), r.name); categories.add(r.category); }
  return { toolByLower, categories };
}

// Resolve user-entered tool names to canonical tools / categories.
function resolveTools(names, ctx) {
  return (names || []).map((nm) => {
    const r = resolve(nm, ctx);
    return { input: String(nm), tool_name: r.tool_name || null, category: r.category || null, resolved: !!r.resolved };
  });
}

// Per-tool + aggregate framework coverage for a set of selected tools.
async function coverageForTools(names) {
  const ctx = await toolContext();
  const resolved = resolveTools(names, ctx);
  const toolNames = Array.from(new Set(resolved.filter((r) => r.tool_name).map((r) => r.tool_name)));
  const cats = Array.from(new Set(resolved.filter((r) => r.category).map((r) => r.category)));
  if (!toolNames.length && !cats.length) return { tools: resolved.map((r) => ({ ...r, frameworks: {}, controls: 0 })), aggregate: {}, totalControls: 0 };

  const rows = await db.query(
    `SELECT m.framework, m.control_id, m.tool_name, m.category
       FROM cae_control_tool_map m
      WHERE m.resolved = true AND (m.tool_name = ANY($1) OR m.category = ANY($2))`,
    [toolNames, cats]);

  // Per-tool coverage.
  const tools = resolved.map((t) => {
    const fw = {};
    const seen = new Set();
    for (const r of rows) {
      const hit = (t.tool_name && r.tool_name === t.tool_name) || (t.category && r.category === t.category);
      if (!hit) continue;
      const key = `${r.framework}::${r.control_id}`;
      if (seen.has(key)) continue; seen.add(key);
      const label = FW_LABEL[r.framework] || r.framework;
      fw[label] = (fw[label] || 0) + 1;
    }
    const controls = Object.values(fw).reduce((a, b) => a + b, 0);
    return { input: t.input, tool_name: t.tool_name, resolved: t.resolved, frameworks: fw, controls };
  });

  // Aggregate: distinct controls per framework across all selected tools.
  const agg = {};
  const aggSeen = {};
  for (const r of rows) {
    const label = FW_LABEL[r.framework] || r.framework;
    aggSeen[label] = aggSeen[label] || new Set();
    aggSeen[label].add(r.control_id);
  }
  let total = 0;
  Object.keys(aggSeen).forEach((k) => { agg[k] = aggSeen[k].size; total += aggSeen[k].size; });
  return { tools, aggregate: agg, totalControls: total };
}

// Persist the org's selected tools (replace the set), so enablement counts them.
async function selectTools(orgId, names) {
  const ctx = await toolContext();
  const resolved = resolveTools(names, ctx).filter((r) => r.tool_name); // only mappable tools feed assessment
  await db.query("DELETE FROM cae_selected_tool WHERE org_id=$1 AND source='intake'", [orgId]);
  for (const t of resolved) {
    const cat = (await db.query('SELECT category FROM cae_tool WHERE name=$1 LIMIT 1', [t.tool_name]))[0];
    await db.query(
      `INSERT INTO cae_selected_tool (org_id, tool_name, category, input_name, source)
       VALUES ($1,$2,$3,$4,'intake')
       ON CONFLICT (org_id, tool_name) DO UPDATE SET category=EXCLUDED.category, input_name=EXCLUDED.input_name`,
      [orgId, t.tool_name, cat ? cat.category : null, t.input]);
  }
  const cov = await coverageForTools(names);
  return { selected: resolved.length, ...cov };
}

module.exports = { coverageForTools, selectTools, resolveTools };
