/**
 * AttackPathGraph (Papa #10)
 * --------------------------
 * Threat-platform-style animated attack graph: hub-and-spoke clusters (one per
 * device hub), node rings colored by the governing NIST CSF function's current
 * maturity, "Internet exposed" / "Sensitive data" callouts, and animated
 * dash-flow on the exposed attack chain — the Defender-style view of the same
 * /api/attack-path data the lanes diagram uses.
 */

import React, { useState, useEffect, useMemo } from 'react';

const INK = '#0f172a', INK_2 = '#475569', INK_3 = '#94a3b8';
const TIER_COLORS = { 1: '#9E3B32', 2: '#B07C2E', 3: '#6E7F49', 4: '#31604B' };
const EXPOSED = '#E8A33D', SENSITIVE = '#C0392B', NODE_BG = '#3f4750';
// Which CSF function's current state governs each layer's ring color.
const LAYER_FN = { process: 'GV', app: 'PR', device: 'PR', network: 'DE', threat: 'RS' };
const GLYPH = { process: '⬢', app: '◈', device: '🖥', network: '⬡', threat: '⚠', identity: '👤' };

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3001';
  return { token, organizationId, apiUrl };
}

// Small clickable finding badge (control failure) anchored at a node.
function FindingBadge({ x, y, refs, onPick }) {
  return (
    <g>
      {refs.slice(0, 3).map((ref, i) => (
        <g key={ref} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onPick(ref); }}>
          <title>{`${ref} — control failure (click for detail & remediation)`}</title>
          <rect x={x + i * 30} y={y} width={26} height={15} rx={3} fill="#C0392B" />
          <text x={x + i * 30 + 13} y={y + 11} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{ref}</text>
        </g>
      ))}
      {refs.length > 3 && (
        <text x={x + 3 * 30 + 2} y={y + 11} fontSize="9" fontWeight="700" fill="#C0392B">+{refs.length - 3}</text>
      )}
    </g>
  );
}

export default function AttackPathGraph(props) {
  const { graph, onFinding } = props; // /api/attack-path payload supplied by the parent
  const findingByRef = {};
  (graph && graph.findings || []).forEach((f) => { findingByRef[f.ref] = f; });
  const pickFinding = (ref) => { if (onFinding && findingByRef[ref]) onFinding(findingByRef[ref]); };
  const [fnTiers, setFnTiers] = useState({}); // CSF function id -> tier (1-4)
  const { token, organizationId, apiUrl } = resolveCtx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    fetch(`${apiUrl}/api/csf/assessment?org_id=${encodeURIComponent(organizationId)}`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const m = {};
        (d.functions || []).forEach((f) => { m[f.id] = f.tier; });
        setFnTiers(m);
      }).catch(() => {});
  }, [apiUrl, organizationId, token]);

  const ringColor = (node) => {
    if (node.internetExposed && node.sensitiveData) return SENSITIVE;
    if (node.internetExposed) return EXPOSED;
    const tier = fnTiers[LAYER_FN[node.layer]];
    return tier ? TIER_COLORS[tier] : '#6b7280';
  };

  // ── Cluster layout: each device is a hub; its edge-neighbors orbit it. ─────
  const layout = useMemo(() => {
    if (!graph) return null;
    const all = graph.layers.flatMap((l) => l.nodes);
    const byId = {}; all.forEach((nd) => { byId[nd.id] = nd; });
    const neighbors = {};
    graph.edges.forEach((e) => {
      (neighbors[e.from] = neighbors[e.from] || new Set()).add(e.to);
      (neighbors[e.to] = neighbors[e.to] || new Set()).add(e.from);
    });

    let hubs = graph.layers.find((l) => l.id === 'device').nodes.slice(0, 5);
    if (!hubs.length) hubs = graph.layers.find((l) => l.id === 'app').nodes.slice(0, 5);
    const W = 1040, CLUSTER_R = 118, HUB_R = 26, SAT_R = 15;
    const cols = Math.min(hubs.length, 3);
    const rows = Math.ceil(hubs.length / cols) || 1;
    const H = rows * 330 + 60;
    const clusters = hubs.map((hub, i) => {
      const cx = ((i % cols) + 0.5) * (W / cols);
      const cy = (Math.floor(i / cols) + 0.5) * (H / rows);
      const satIds = [...(neighbors[hub.id] || [])].filter((id) => byId[id]).slice(0, 8);
      const sats = satIds.map((id, j) => {
        const a = (j / satIds.length) * Math.PI * 2 - Math.PI / 2;
        return { node: byId[id], x: cx + Math.cos(a) * CLUSTER_R, y: cy + Math.sin(a) * CLUSTER_R };
      });
      return { hub, cx, cy, sats };
    });
    return { W, H, clusters, HUB_R, SAT_R };
  }, [graph]);

  if (!graph || !layout) return null;
  const anyFlagged = graph.layers.flatMap((l) => l.nodes).some((nd) => nd.internetExposed || nd.sensitiveData);

  const Callout = ({ x, y, text, color }) => (
    <g>
      <rect x={x} y={y - 11} rx={9} width={text.length * 5.6 + 16} height={20} fill={color} />
      <text x={x + 8 + (text.length * 5.6) / 2} y={y + 3} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fff">{text}</text>
      <animate attributeName="opacity" values="1;0.55;1" dur="2.2s" repeatCount="indefinite" />
    </g>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${layout.W} ${layout.H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <style>{`.cx-flow { stroke-dasharray: 6 5; animation: cxdash 1.1s linear infinite; } @keyframes cxdash { to { stroke-dashoffset: -22; } }`}</style>
        </defs>

        {layout.clusters.map((cl, ci) => {
          const hubColor = ringColor(cl.hub);
          const hubHot = cl.hub.internetExposed || cl.hub.sensitiveData;
          return (
            <g key={cl.hub.id}>
              {/* Spokes */}
              {cl.sats.map((s, si) => {
                const hot = s.node.internetExposed || s.node.sensitiveData || s.node.layer === 'threat';
                const c = hot ? (s.node.sensitiveData ? SENSITIVE : EXPOSED) : '#c8cfd8';
                return (
                  <line key={si} x1={cl.cx} y1={cl.cy} x2={s.x} y2={s.y}
                    stroke={c} strokeWidth={hot ? 2 : 1.2} className={hot ? 'cx-flow' : undefined} opacity={hot ? 0.95 : 0.8} />
                );
              })}
              {/* Hub */}
              <g>
                {hubHot && (
                  <circle cx={cl.cx} cy={cl.cy} r={layout.HUB_R + 6} fill="none" stroke={ringColor(cl.hub)} strokeWidth="2" opacity="0.6">
                    <animate attributeName="r" values={`${layout.HUB_R + 4};${layout.HUB_R + 12};${layout.HUB_R + 4}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={cl.cx} cy={cl.cy} r={layout.HUB_R} fill={NODE_BG} stroke={hubColor} strokeWidth="3.5" />
                <text x={cl.cx} y={cl.cy + 5} textAnchor="middle" fontSize="15" fill="#fff">{GLYPH[cl.hub.layer] || '▣'}</text>
                <text x={cl.cx} y={cl.cy + layout.HUB_R + 16} textAnchor="middle" fontSize="11" fontWeight="600" fill={INK}>
                  {trunc(cl.hub.label, 26)}
                </text>
                {cl.hub.internetExposed && <Callout x={cl.cx + layout.HUB_R + 6} y={cl.cy - layout.HUB_R} text="Internet exposed" color={EXPOSED} />}
                {cl.hub.sensitiveData && <Callout x={cl.cx + layout.HUB_R + 6} y={cl.cy + layout.HUB_R - 4} text="Sensitive data" color={SENSITIVE} />}
                {cl.hub.findingRefs && <FindingBadge x={cl.cx - 26} y={cl.cy - layout.HUB_R - 22} refs={cl.hub.findingRefs} onPick={pickFinding} />}
              </g>
              {/* Satellites */}
              {cl.sats.map((s, si) => {
                const c = ringColor(s.node);
                const hot = s.node.internetExposed || s.node.sensitiveData;
                return (
                  <g key={`s${si}`}>
                    <title>{`${s.node.label} (${s.node.layer})`}</title>
                    {hot && (
                      <circle cx={s.x} cy={s.y} r={layout.SAT_R + 4} fill="none" stroke={c} strokeWidth="1.5" opacity="0.5">
                        <animate attributeName="r" values={`${layout.SAT_R + 3};${layout.SAT_R + 9};${layout.SAT_R + 3}`} dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle cx={s.x} cy={s.y} r={layout.SAT_R} fill={s.node.layer === 'threat' ? c : NODE_BG} stroke={c} strokeWidth="2.5" />
                    <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="10" fill="#fff">{GLYPH[s.node.layer] || '•'}</text>
                    <text x={s.x} y={s.y + layout.SAT_R + 12} textAnchor="middle" fontSize="8.5" fill={INK_2}>
                      {trunc(s.node.label, 20)}
                    </text>
                    {s.node.sensitiveData && s.node.layer !== 'device' && <Callout x={s.x + layout.SAT_R + 3} y={s.y - layout.SAT_R} text="Sensitive data" color={SENSITIVE} />}
                    {s.node.internetExposed && !s.node.sensitiveData && s.node.layer !== 'device' && <Callout x={s.x + layout.SAT_R + 3} y={s.y - layout.SAT_R} text="Internet exposed" color={EXPOSED} />}
                    {s.node.findingRefs && <FindingBadge x={s.x - 13} y={s.y - layout.SAT_R - 18} refs={s.node.findingRefs} onPick={pickFinding} />}
                  </g>
                );
              })}
            </g>
          );
        })}
        {!layout.clusters.length && (
          <text x={layout.W / 2} y={layout.H / 2} textAnchor="middle" fontSize="13" fill={INK_3}>
            No mapped assets yet — complete application mapping in setup to build the graph.
          </text>
        )}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 10, flexWrap: 'wrap', fontSize: 11, color: INK_2 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Ring = governing NIST CSF function state</span>
        {[1, 2, 3, 4].map((t) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', border: `3px solid ${TIER_COLORS[t]}`, display: 'inline-block' }} />Tier {t}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: EXPOSED, display: 'inline-block' }} />Internet exposed</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: SENSITIVE, display: 'inline-block' }} />Sensitive data</span>
        {anyFlagged && <span style={{ color: INK_3 }}>animated edges = active exposure path</span>}
      </div>
    </div>
  );
}

function trunc(s, n) { return String(s).length > n ? String(s).slice(0, n - 1) + '…' : s; }
