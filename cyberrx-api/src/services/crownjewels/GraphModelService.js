'use strict';

/**
 * GraphModelService — assemble the §4 GraphModel (typed nodes + edges) the
 * visualization consumes. Pure; deterministic.
 */

function build({ processes = [], assets = [], risks = [], controls = [] } = {}) {
  const nodes = []; const edges = [];
  const seen = new Set();
  const add = (n) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

  processes.forEach((p) => add({ id: `proc:${p.id}`, type: 'process', label: p.name, attrs: { criticality: p.criticality, score: p.criticality_score || null } }));
  assets.forEach((a) => add({ id: `asset:${a.id}`, type: 'asset', label: a.name, attrs: { crown_jewel_tier: a.crown_jewel_tier || 'none', score: a.criticality_score != null ? a.criticality_score : null, gap: !!a.gap } }));
  risks.forEach((r) => add({ id: `risk:${r.id}`, type: 'risk', label: r.title || r.name, attrs: { severity: r.severity || null } }));
  controls.forEach((c) => add({ id: `ctrl:${c.framework}:${c.control_id}`, type: 'control', label: `${c.control_id}`, attrs: { gap: c.documentation_status && c.documentation_status !== 'documented', documentation_status: c.documentation_status || 'unknown' } }));

  // process -> asset (supports)
  assets.forEach((a) => (a.business_process_ids || []).forEach((pid) => {
    if (seen.has(`proc:${pid}`)) edges.push({ source: `proc:${pid}`, target: `asset:${a.id}`, type: 'supports', confidence: 1, origin: 'explicit' });
  }));
  // risk -> asset (threatens)
  risks.forEach((r) => { if (r.asset_id && seen.has(`asset:${r.asset_id}`)) edges.push({ source: `risk:${r.id}`, target: `asset:${r.asset_id}`, type: 'threatens', confidence: r.confidence || 0.8, origin: r.origin || 'register' }); });
  // control -> asset (mitigates / applies_to)
  controls.forEach((c) => { if (c.asset_id && seen.has(`asset:${c.asset_id}`)) edges.push({ source: `ctrl:${c.framework}:${c.control_id}`, target: `asset:${c.asset_id}`, type: c.risk_id ? 'mitigates' : 'applies_to', confidence: c.confidence || 0.9, origin: 'engine' }); });

  return { nodes, edges };
}

module.exports = { build };
