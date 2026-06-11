/**
 * AttackPathDiagram — CISO interactive attack path
 * ------------------------------------------------
 * Five layered columns (Business Process → Application → Device → Network →
 * Threat) drawn from real org data via /api/attack-path. SVG edges connect
 * adjacent layers. Click any node to trace its full path: every node sharing
 * a business process lights up, the rest dims, and a detail panel opens.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const INK = '#0f172a', INK_2 = '#475569', INK_3 = '#94a3b8', HAIRLINE = '#e2e8f0';
const LAYER_TONE = { process: '#1f5fa8', app: '#4f9fd8', device: '#3e7a34', network: '#7c6f3a', threat: '#9E3B32' };
const SEV = { Critical: '#9E3B32', High: '#A85B2E', Medium: '#B07C2E', Low: '#6E7F49' };
const THREAT_ICON = { ransomware: '⛓', phishing: '✉', insider: '☉', supply_chain: '⛓', misconfig: '▢' };

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3001';
  return { token, organizationId, apiUrl };
}

const usd = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v}`);

export default function AttackPathDiagram(props) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null); // node id being traced
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(1040);
  const { token, organizationId, apiUrl } = resolveCtx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    setLoading(true); setError(null);
    fetch(`${apiUrl}/api/attack-path?org_id=${encodeURIComponent(organizationId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [apiUrl, organizationId, token]);

  useEffect(() => {
    const onResize = () => { if (wrapRef.current) setWidth(wrapRef.current.clientWidth); };
    onResize(); window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data]);

  // Layout geometry — positions for every node, keyed by id.
  const layout = useMemo(() => {
    if (!data) return null;
    const COLS = data.layers.length;
    const colGap = width / COLS;
    const NODE_W = Math.min(176, colGap - 28);
    const NODE_H = 46, V_GAP = 14, TOP = 54;
    const pos = {};
    let maxRows = 0;
    data.layers.forEach((layer, ci) => {
      const cx = ci * colGap + colGap / 2;
      maxRows = Math.max(maxRows, layer.nodes.length);
      layer.nodes.forEach((nd, ri) => {
        pos[nd.id] = { x: cx - NODE_W / 2, cx, y: TOP + ri * (NODE_H + V_GAP), w: NODE_W, h: NODE_H, layer: layer.id, node: nd };
      });
    });
    const height = TOP + maxRows * (NODE_H + V_GAP) + 20;
    return { pos, NODE_W, NODE_H, colGap, height, COLS };
  }, [data, width]);

  // The set of node ids highlighted when tracing — anything sharing a process.
  const traced = useMemo(() => {
    if (!active || !data) return null;
    const all = data.layers.flatMap((l) => l.nodes);
    const src = all.find((nd) => nd.id === active);
    if (!src) return null;
    const ps = new Set(src.procs || []);
    const ids = new Set(all.filter((nd) => (nd.procs || []).some((p) => ps.has(p))).map((nd) => nd.id));
    ids.add(active);
    return ids;
  }, [active, data]);

  const onLeaf = useCallback((id) => setActive((cur) => (cur === id ? null : id)), []);

  if (loading) return <div style={{ padding: 28, color: INK_3, fontSize: 13 }}>Mapping attack paths from live data…</div>;
  if (error || !data) return (
    <div style={{ padding: 28, color: SEV.Critical, fontSize: 13 }}>Could not build the attack path: {error || 'no data'}</div>
  );

  const empty = data.counts.processes + data.counts.threats === 0;
  const activeNode = active && layout && layout.pos[active] ? layout.pos[active].node : null;

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            CISO · Attack Path Analysis
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>Process → Application → Device → Network → Threat</h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, maxWidth: 680, lineHeight: 1.55 }}>
            How a threat reaches each crown-jewel process, mapped from your live business processes, assets, and threat
            scenarios. Click any node to trace its full path; click again to clear.
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20, fontSize: 11, color: INK_2 }}>
          <div style={{ fontSize: 19, fontWeight: 600, color: SEV.Critical, fontVariantNumeric: 'tabular-nums' }}>{usd(data.totalExposure)}</div>
          <div style={{ fontSize: 10, color: INK_3 }}>exposure across {data.counts.processes} processes · {data.counts.threats} threats</div>
        </div>
      </div>

      {empty ? (
        <div style={{ padding: '40px 0', color: INK_3, fontSize: 13 }}>
          No business processes or threats are mapped for this organization yet. Complete setup (process selection,
          application mapping) and the attack path will populate from your data.
        </div>
      ) : (
        <div ref={wrapRef} style={{ position: 'relative', marginTop: 8, overflowX: 'auto' }}>
          {layout && (
            <svg width={width} height={layout.height} style={{ display: 'block' }}>
              {/* Column headers */}
              {data.layers.map((layer, ci) => {
                const cx = ci * layout.colGap + layout.colGap / 2;
                return (
                  <g key={layer.id}>
                    <text x={cx} y={20} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={LAYER_TONE[layer.id]}
                      style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{layer.label}</text>
                    <text x={cx} y={34} textAnchor="middle" fontSize="9" fill={INK_3}>{layer.nodes.length}</text>
                  </g>
                );
              })}
              {/* Edges */}
              {data.edges.map((e, i) => {
                const a = layout.pos[e.from], b = layout.pos[e.to];
                if (!a || !b) return null;
                const lit = traced ? (traced.has(e.from) && traced.has(e.to)) : false;
                const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
                const mx = (x1 + x2) / 2;
                return (
                  <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                    fill="none" stroke={lit ? SEV.Critical : '#dde3ea'} strokeWidth={lit ? 1.8 : 1}
                    opacity={traced && !lit ? 0.25 : 1} />
                );
              })}
              {/* Nodes */}
              {data.layers.flatMap((layer) => layer.nodes.map((nd) => {
                const p = layout.pos[nd.id];
                const tone = LAYER_TONE[layer.id];
                const dim = traced && !traced.has(nd.id);
                const isActive = active === nd.id;
                const sevColor = nd.criticality ? SEV[nd.criticality] : nd.impact ? SEV[nd.impact] : tone;
                const sub =
                  layer.id === 'process' ? (nd.exposure ? usd(nd.exposure) : nd.criticality) :
                  layer.id === 'app' || layer.id === 'device' ? (nd.vulnCritical ? `${nd.vulnCritical}C/${nd.vulnHigh}H vulns` : nd.supported === false ? 'End-of-life' : (nd.assetType || 'application')) :
                  layer.id === 'network' ? `${(nd.deviceIds || []).length} device(s)` :
                  `${nd.probability}% · ${nd.impact}`;
                return (
                  <g key={nd.id} onClick={() => onLeaf(nd.id)} style={{ cursor: 'pointer' }} opacity={dim ? 0.32 : 1}>
                    <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={4}
                      fill={isActive ? `${tone}14` : '#fff'} stroke={isActive ? tone : HAIRLINE} strokeWidth={isActive ? 2 : 1} />
                    <rect x={p.x} y={p.y} width={3.5} height={p.h} rx={2} fill={sevColor} />
                    <text x={p.x + 11} y={p.y + 19} fontSize="11" fontWeight="600" fill={INK}>
                      {layer.id === 'threat' && THREAT_ICON[nd.threatType] ? `${THREAT_ICON[nd.threatType]} ` : ''}
                      {trunc(nd.label, p.w)}
                    </text>
                    <text x={p.x + 11} y={p.y + 34} fontSize="9" fill={INK_3}>{trunc(String(sub), p.w)}</text>
                  </g>
                );
              }))}
            </svg>
          )}
        </div>
      )}

      {/* Trace detail */}
      {activeNode && (
        <div style={{ marginTop: 12, border: `1px solid ${HAIRLINE}`, borderTop: `2px solid ${LAYER_TONE[activeNode.layer]}`, borderRadius: 4, background: '#fafbfc', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: LAYER_TONE[activeNode.layer], textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 8 }}>{activeNode.layer}</span>
              {activeNode.label}
            </div>
            <button onClick={() => setActive(null)} style={ghostBtn}>Clear trace</button>
          </div>
          <div style={{ fontSize: 12, color: INK_2, marginTop: 6, lineHeight: 1.55 }}>{traceSentence(data, activeNode, traced)}</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: `1px solid ${HAIRLINE}`, flexWrap: 'wrap' }}>
        {Object.entries(LAYER_TONE).map(([k, c]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: INK_2, textTransform: 'capitalize' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: c, display: 'inline-block' }} />{k}
          </span>
        ))}
        <span style={{ fontSize: 10.5, color: INK_3, marginLeft: 'auto' }}>Left edge color = severity · click a node to trace the path</span>
      </div>
    </div>
  );
}

function trunc(s, w) { const max = Math.floor((w - 16) / 6.1); return String(s).length > max ? String(s).slice(0, max - 1) + '…' : s; }

function traceSentence(data, node, traced) {
  if (!traced) return '';
  const byLayer = (lid) => data.layers.find((l) => l.id === lid).nodes.filter((nd) => traced.has(nd.id));
  const names = (lid, k) => byLayer(lid).slice(0, k).map((x) => x.label).join(', ') + (byLayer(lid).length > k ? `, +${byLayer(lid).length - k} more` : '');
  const procs = byLayer('process'), threats = byLayer('threat');
  const exp = procs.reduce((s, p) => s + (p.exposure || 0), 0);
  return `This path links ${procs.length} business process(es)${procs.length ? ` (${names('process', 2)})` : ''} through ${byLayer('app').length} app(s), ${byLayer('device').length} device(s), and ${byLayer('network').length} network zone(s) to ${threats.length} threat(s)${threats.length ? ` (${names('threat', 2)})` : ''}. Quantified exposure on this path: ${usd(exp)}.`;
}

const ghostBtn = { background: '#fff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 3, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500 };
