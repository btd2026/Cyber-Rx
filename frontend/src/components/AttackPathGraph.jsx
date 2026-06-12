/**
 * AttackPathGraph — Azure-style security graph (radial clusters)
 * -------------------------------------------------------------
 * Hub-and-spoke resource graph in the style of a cloud security-graph view:
 * dark hub nodes (key systems) with orbiting resource nodes (apps, data,
 * identity, network, public IP), gray arrowed edges, and orange "Internet
 * exposed" / "Sensitive data" callout pills on flagged nodes. The exposed
 * attack chain is highlighted in orange. Fully dynamic from /api/attack-path.
 *
 * Findings (control failures) ride as red nodes/badges; clicking one opens the
 * right-hand MITRE ATT&CK / CIS detail panel (handled by the parent).
 */

import React, { useMemo } from 'react';

const INK = '#1f2733', INK_2 = '#5b6470', INK_3 = '#94a3b8';
const HUB = '#4a5560', SAT = '#5b6470', GRAY_EDGE = '#b8c0c9';
const ORANGE = '#E8631A', ORANGE_SOFT = '#F2A766', RED = '#C0392B';

// Resource glyphs (Azure-ish): storage = cylinder, VM = monitor, etc.
function glyph(kind) {
  switch (kind) {
    case 'process': return '🛢';      // data / storage account
    case 'app': return '◉';           // app service
    case 'device': return '🖥';        // virtual machine / instance
    case 'network': return '⌗';        // network service group
    case 'threat': return '⚠';
    case 'finding': return '!';
    case 'internet': return '🌐';
    default: return '•';
  }
}

export default function AttackPathGraph(props) {
  const { graph, onFinding } = props;
  const findingByRef = {};
  ((graph && graph.findings) || []).forEach((f) => { findingByRef[f.ref] = f; });

  const model = useMemo(() => {
    if (!graph) return null;
    const layer = (id) => (graph.layers.find((l) => l.id === id) || { nodes: [] }).nodes;
    const all = [...layer('process'), ...layer('app'), ...layer('device'), ...layer('network'), ...layer('threat')];
    const byId = {}; all.forEach((n) => { byId[n.id] = n; });
    const neigh = {};
    graph.edges.forEach((e) => { (neigh[e.from] = neigh[e.from] || new Set()).add(e.to); (neigh[e.to] = neigh[e.to] || new Set()).add(e.from); });

    // Hubs = the most-connected devices (fall back to apps/processes).
    let hubs = layer('device');
    if (hubs.length < 2) hubs = [...hubs, ...layer('app')];
    hubs = hubs.sort((a, b) => ((neigh[b.id] || new Set()).size) - ((neigh[a.id] || new Set()).size)).slice(0, 3);
    const hubIds = new Set(hubs.map((h) => h.id));

    const W = 1000, CLUSTER_R = 130, perRow = hubs.length <= 1 ? 1 : 2;
    const rows = Math.ceil(hubs.length / perRow) || 1;
    const H = rows * 360 + 40;
    const pos = {};
    const placed = new Set();
    const clusters = hubs.map((hub, i) => {
      const cx = ((i % perRow) + 0.5) * (W / perRow);
      const cy = (Math.floor(i / perRow) + 0.5) * (H / rows);
      pos[hub.id] = { x: cx, y: cy };
      placed.add(hub.id);
      const sats = [...(neigh[hub.id] || [])].filter((id) => byId[id] && !hubIds.has(id) && !placed.has(id)).slice(0, 8);
      sats.forEach((id, j) => {
        const a = (j / Math.max(sats.length, 1)) * Math.PI * 2 - Math.PI / 2;
        pos[id] = { x: cx + Math.cos(a) * CLUSTER_R, y: cy + Math.sin(a) * CLUSTER_R };
        placed.add(id);
      });
      return { hub, cx, cy, sats: sats.map((id) => byId[id]) };
    });
    // Edges among placed nodes only.
    const edges = graph.edges.filter((e) => pos[e.from] && pos[e.to]).map((e) => ({ from: byId[e.from] || { id: e.from }, to: byId[e.to] || { id: e.to } }));
    const nodes = Object.keys(pos).map((id) => ({ ...(byId[id] || { id }), ...pos[id], isHub: hubIds.has(id) }));
    return { W, H, clusters, edges, nodes, pos };
  }, [graph]);

  if (!graph || !model) return null;
  const flagged = (n) => n.internetExposed || n.sensitiveData || (n.findingRefs && n.findingRefs.length);
  const nodeColor = (n) => n.findingRefs && n.findingRefs.length ? RED : n.sensitiveData ? RED : n.internetExposed ? ORANGE : n.layer === 'threat' ? RED : HUB;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${model.W} ${model.H}`} style={{ width: '100%', height: 'auto', display: 'block', background: '#fff' }}>
        <defs>
          <marker id="cxArrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,3 L0,6 Z" fill={GRAY_EDGE} /></marker>
          <marker id="cxArrowHot" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,3 L0,6 Z" fill={ORANGE} /></marker>
          <style>{`.cxflow{stroke-dasharray:5 4;animation:cxd 1.1s linear infinite}@keyframes cxd{to{stroke-dashoffset:-18}}`}</style>
        </defs>

        {/* Hub-to-hub connectors (faint long links) */}
        {model.clusters.flatMap((a, i) => model.clusters.slice(i + 1).map((b, j) => (
          <line key={`hh${i}${j}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke="#dfe4ea" strokeWidth="1.5" />
        )))}

        {/* Spoke edges with arrowheads */}
        {model.edges.map((e, i) => {
          const a = model.pos[e.from.id], b = model.pos[e.to.id];
          if (!a || !b) return null;
          const hot = flagged(e.to) || flagged(e.from);
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const rA = e.from.isHub ? 30 : 18, rB = e.to.isHub ? 30 : 18;
          const x1 = a.x + dx / len * rA, y1 = a.y + dy / len * rA, x2 = b.x - dx / len * (rB + 5), y2 = b.y - dy / len * (rB + 5);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hot ? ORANGE : GRAY_EDGE} strokeWidth={hot ? 2 : 1.4}
              className={hot ? 'cxflow' : undefined} markerEnd={hot ? 'url(#cxArrowHot)' : 'url(#cxArrow)'} opacity={hot ? 0.95 : 0.85} />
          );
        })}

        {/* Nodes */}
        {model.nodes.map((n) => {
          const rad = n.isHub ? 30 : (n.layer === 'finding' ? 15 : 18);
          const col = nodeColor(n);
          const isFindingHost = n.findingRefs && n.findingRefs.length;
          const clickable = isFindingHost;
          return (
            <g key={n.id} style={{ cursor: clickable ? 'pointer' : 'default' }}
              onClick={clickable ? () => { const ref = n.findingRefs[0]; if (onFinding && findingByRef[ref]) onFinding(findingByRef[ref]); } : undefined}>
              <title>{n.label}{isFindingHost ? ` · ${n.findingRefs.join(', ')} (click for ATT&CK/CIS)` : ''}</title>
              {flagged(n) && (
                <circle cx={n.x} cy={n.y} r={rad + 4} fill="none" stroke={col} strokeWidth="2">
                  <animate attributeName="r" values={`${rad + 2};${rad + 9};${rad + 2}`} dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2.2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={n.x} cy={n.y} r={rad} fill={HUB} stroke={flagged(n) ? col : '#3a434e'} strokeWidth={flagged(n) ? 3 : 1.5} />
              <text x={n.x} y={n.y + (n.isHub ? 7 : 5)} textAnchor="middle" fontSize={n.isHub ? 20 : 14} fill="#fff">{glyph(n.layer)}</text>
              <text x={n.x} y={n.y + rad + 14} textAnchor="middle" fontSize={n.isHub ? 12 : 10.5} fontWeight={n.isHub ? 700 : 500} fill={INK}>{trunc(n.label, n.isHub ? 22 : 18)}</text>
              {/* Finding badges */}
              {isFindingHost && (
                <g>
                  <circle cx={n.x + rad - 2} cy={n.y - rad + 2} r="9" fill={RED} />
                  <text x={n.x + rad - 2} y={n.y - rad + 5.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{n.findingRefs.length}</text>
                </g>
              )}
              {/* Orange callout pills */}
              {n.sensitiveData && <Callout x={n.x + rad + 10} y={n.y - rad - 6} text="Sensitive data" color={RED} />}
              {n.internetExposed && <Callout x={n.x + rad + 10} y={n.y + rad - 2} text="Internet exposed" color={ORANGE} />}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8, flexWrap: 'wrap', fontSize: 11, color: INK_2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 6, background: ORANGE, display: 'inline-block' }} />Internet exposed</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 6, background: RED, display: 'inline-block' }} />Sensitive data / finding</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 6, background: HUB, display: 'inline-block' }} />System / resource</span>
        <span style={{ color: INK_3 }}>Click a node with a red badge for its ATT&amp;CK technique, CIS control &amp; remediation</span>
      </div>
    </div>
  );
}

function Callout({ x, y, text, color }) {
  const w = text.length * 5.6 + 16;
  return (
    <g>
      <path d={`M${x - 6},${y} L${x},${y - 4} L${x},${y + 4} Z`} fill={color} />
      <rect x={x} y={y - 9} rx={9} width={w} height={18} fill={color} />
      <text x={x + w / 2} y={y + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fff">{text}</text>
    </g>
  );
}
function trunc(s, n) { return String(s).length > n ? String(s).slice(0, n - 1) + '…' : s; }
