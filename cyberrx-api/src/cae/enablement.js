'use strict';

/**
 * cae/enablement — INTERNAL. Given an org's connected tools, decide which
 * controls can be automatically tested vs. need manual evidence. The mapping
 * logic is never exposed to users (they only see results downstream).
 *
 * A control is testable when at least one of its RESOLVED tool-map entries is
 * satisfied: a mapped tool is connected, or a mapped category has any connected
 * tool. Otherwise the control is `needs_manual_evidence`.
 */

const db = require('../utils/db');

// Tools (and their categories) the org has connected + healthy.
async function connectedContext(orgId) {
  const rows = await db.query(
    `SELECT c.tool_name, t.category
       FROM cae_connection c
       LEFT JOIN cae_tool t ON t.name = c.tool_name
      WHERE c.org_id=$1 AND c.status='connected'`, [orgId]);
  const tools = new Set(); const categories = new Set();
  for (const r of rows) { if (r.tool_name) tools.add(r.tool_name); if (r.category) categories.add(r.category); }
  return { tools, categories };
}

// Returns [{ id, framework, control_id, control_name, assessment_method, enabled, reason, evidence_tools }]
async function computeEnablement(orgId, frameworks) {
  const { tools, categories } = await connectedContext(orgId);
  const params = [];
  let where = '';
  if (Array.isArray(frameworks) && frameworks.length) { params.push(frameworks); where = 'WHERE c.framework = ANY($1)'; }

  const controls = await db.query(
    `SELECT c.id, c.framework, c.control_id, c.control_name, c.assessment_method
       FROM cae_control c ${where} ORDER BY c.framework, c.control_id`, params);

  const maps = await db.query(
    `SELECT m.control_pk, m.match_type, m.tool_name, m.category, m.resolved
       FROM cae_control_tool_map m ${where ? 'JOIN cae_control c ON c.id=m.control_pk WHERE c.framework = ANY($1)' : ''}`,
    params);
  const byControl = new Map();
  for (const m of maps) { if (!byControl.has(m.control_pk)) byControl.set(m.control_pk, []); byControl.get(m.control_pk).push(m); }

  return controls.map((c) => {
    const rows = byControl.get(c.id) || [];
    const evidenceTools = [];
    let enabled = false;
    for (const m of rows) {
      if (!m.resolved) continue;
      if (m.match_type === 'tool' && tools.has(m.tool_name)) { enabled = true; evidenceTools.push(m.tool_name); }
      else if (m.match_type === 'category' && categories.has(m.category)) { enabled = true; }
    }
    return {
      id: c.id, framework: c.framework, control_id: c.control_id, control_name: c.control_name,
      assessment_method: c.assessment_method,
      enabled, reason: enabled ? 'testable' : 'needs_manual_evidence',
      evidence_tools: Array.from(new Set(evidenceTools)),
    };
  });
}

async function summary(orgId, frameworks) {
  const list = await computeEnablement(orgId, frameworks);
  const byFw = {};
  for (const c of list) {
    byFw[c.framework] = byFw[c.framework] || { total: 0, testable: 0, manual: 0 };
    byFw[c.framework].total++;
    if (c.enabled) byFw[c.framework].testable++; else byFw[c.framework].manual++;
  }
  return { total: list.length, byFramework: byFw };
}

module.exports = { computeEnablement, connectedContext, summary };
