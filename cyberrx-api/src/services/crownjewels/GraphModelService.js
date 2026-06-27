'use strict';

/**
 * GraphModelService — assemble the §4 GraphModel (typed nodes + edges) the
 * visualization consumes. Pure; deterministic.
 *
 * Accepts dependency edges from DependencyMappingService and control
 * applications from ControlMappingService in addition to basic entities.
 */

function build({ processes = [], assets = [], risks = [], controls = [], dependencyEdges = [], riskMappings = [] } = {}) {
  const nodes = []; const edges = [];
  const seen = new Set();
  const edgeSeen = new Set();
  const add = (n) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };
  const addEdge = (e) => {
    const k = `${e.source}|${e.target}|${e.type}`;
    if (!edgeSeen.has(k)) { edgeSeen.add(k); edges.push(e); }
  };

  processes.forEach((p) => add({ id: `proc:${p.id}`, type: 'process', label: p.name, attrs: { criticality: p.criticality, score: p.criticality_score || null } }));
  assets.forEach((a) => add({ id: `asset:${a.id}`, type: 'asset', label: a.name, attrs: { crown_jewel_tier: a.crown_jewel_tier || 'none', score: a.criticality_score != null ? a.criticality_score : null, impact_level: a.impact_level || null, exposure: a.exposure || null } }));
  risks.forEach((r) => add({ id: `risk:${r.id}`, type: 'risk', label: r.title || r.name, attrs: { severity: r.severity || null, category: r.category || null, origin: r.origin || null } }));
  controls.forEach((c) => add({ id: `ctrl:${c.framework}:${c.control_id}`, type: 'control', label: `${c.control_id}`, attrs: { gap: c.documentation_status && c.documentation_status !== 'documented', documentation_status: c.documentation_status || 'unknown', framework: c.framework, basis: c.basis || null } }));

  // Dependency edges from DependencyMappingService (preferred over naive asset.business_process_ids)
  if (dependencyEdges.length > 0) {
    for (const de of dependencyEdges) {
      const src = `proc:${de.process_id}`;
      const tgt = `asset:${de.asset_id}`;
      if (seen.has(src) && seen.has(tgt)) {
        addEdge({ source: src, target: tgt, type: 'supports', confidence: de.confidence, origin: de.origin || 'explicit' });
      }
    }
  } else {
    // Fallback: derive from asset.business_process_ids when no explicit edges provided
    assets.forEach((a) => (a.business_process_ids || []).forEach((pid) => {
      if (seen.has(`proc:${pid}`)) addEdge({ source: `proc:${pid}`, target: `asset:${a.id}`, type: 'supports', confidence: 1, origin: 'explicit' });
    }));
  }

  // Risk mappings from RiskMappingService (richer than raw risk.asset_id)
  if (riskMappings.length > 0) {
    for (const rm of riskMappings) {
      const riskNode = `risk:${rm.risk_id}`;
      if (!seen.has(riskNode)) continue;
      if (rm.asset_id && seen.has(`asset:${rm.asset_id}`)) {
        addEdge({ source: riskNode, target: `asset:${rm.asset_id}`, type: 'threatens', confidence: rm.confidence || 0.8, origin: rm.origin || 'register' });
      }
    }
  } else {
    risks.forEach((r) => { if (r.asset_id && seen.has(`asset:${r.asset_id}`)) addEdge({ source: `risk:${r.id}`, target: `asset:${r.asset_id}`, type: 'threatens', confidence: r.confidence || 0.8, origin: r.origin || 'register' }); });
  }

  // Control applications from ControlMappingService
  controls.forEach((c) => {
    if (c.asset_id && seen.has(`asset:${c.asset_id}`)) {
      addEdge({ source: `ctrl:${c.framework}:${c.control_id}`, target: `asset:${c.asset_id}`, type: c.risk_id ? 'mitigates' : 'applies_to', confidence: c.confidence || 0.9, origin: c.basis || 'engine' });
    }
  });

  return { nodes, edges };
}

module.exports = { build };
