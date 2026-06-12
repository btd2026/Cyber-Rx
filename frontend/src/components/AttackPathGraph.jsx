/**
 * AttackPathGraph — Wiz-style security graph (Papa)
 * -------------------------------------------------
 * A left-to-right attack graph in the style of a threat-platform security
 * graph: Internet → Application Endpoint (app / vendor system) → Instance
 * (device) → Findings (control failures / CVEs) and context (network, threat).
 *
 * Each finding is a control failure expressed as a MITRE ATT&CK technique and
 * the CIS Control that governs it; clicking it opens the right-side detail
 * panel (handled by the parent) with severity, ATT&CK, CIS, source and
 * remediation. Internet-exposed and sensitive-data nodes are flagged, and the
 * exposed attack chain animates.
 */

import React, { useMemo } from 'react';

const INK = '#1e293b', INK_2 = '#475569', INK_3 = '#94a3b8';
const EDGE = '#cbd5e1', EXPOSED = '#E8843A', SENSITIVE = '#C0392B';
const SEV = { Critical: '#C0392B', High: '#E8843A', Medium: '#Ca8a04', Low: '#16a34a', Info: '#64748b' };
const HUB = '#46505c', INTERNET = '#3aa0d8';
const GLYPH = { internet: '🌐', process: '🗄', app: '◑', device: '🖥', network: '☁', threat: '⚠', finding: '⚠' };

export default function AttackPathGraph(props) {
  const { graph, onFinding } = props;
  const findingByRef = {};
  ((graph && graph.findings) || []).forEach((f) => { findingByRef[f.ref] = f; });

  // ── Build the columns of the security graph ────────────────────────────────
  const model = useMemo(() => {
    if (!graph) return null;
    const layer = (id) => (graph.layers.find((l) => l.id === id) || { nodes: [] }).nodes;
    const apps = layer('app').slice(0, 6);
    const devices = layer('device').slice(0, 6);
    const networks = layer('network').slice(0, 4);
    const threats = layer('threat').slice(0, 5);
    const findings = (graph.findings || []).slice(0, 12);

    const COL_X = [70, 300, 540, 820];   // internet · apps · devices · leaves
    const TOP = 40, ROW = 74;
    const internet = { id: '__internet', label: 'Internet', kind: 'internet', x: COL_X[0] };

    const place = (nodes, x) => {
      const h = Math.max(1, nodes.length);
      return nodes.map((nd, i) => ({ ...nd, x, y: TOP + (i + 0.5) * (ROW * (Math.max(nodes.length, 4) / h)) }));
    };
    // Leaves column = findings + networks + threats stacked.
    const leafNodes = [
      ...findings.map((f) => ({ id: 'fnd_' + f.ref, kind: 'finding', label: `${f.ref} · ${f.title}`, severity: f.severity, ref: f.ref })),
      ...networks.map((nw) => ({ ...nw, kind: 'network' })),
      ...threats.map((t) => ({ ...t, kind: 'threat' })),
    ];
    const A = place(apps.map((a) => ({ ...a, kind: 'app' })), COL_X[1]);
    const D = place(devices.map((d) => ({ ...d, kind: 'device' })), COL_X[2]);
    const L = place(leafNodes, COL_X[3]);
    internet.y = TOP + (Math.max(A.length, 1) * ROW) / 2;

    // Edges: internet → exposed apps (or all if none flagged) → devices → leaves.
    const edges = [];
    const exposedApps = A.filter((a) => a.internetExposed);
    (exposedApps.length ? exposedApps : A).forEach((a) => edges.push({ from: internet, to: a, hot: true }));
    A.forEach((a) => D.forEach((d) => { if ((a.procs || []).some((p) => (d.procs || []).includes(p))) edges.push({ from: a, to: d }); }));
    if (!A.length) D.forEach((d) => edges.push({ from: internet, to: d, hot: true }));
    // Each device fans out to its findings + a couple of context leaves.
    const findingNodeByRef = {}; L.forEach((l) => { if (l.kind === 'finding') findingNodeByRef[l.ref] = l; });
    D.forEach((d) => {
      (d.findingRefs || []).forEach((ref) => { if (findingNodeByRef[ref]) edges.push({ from: d, to: findingNodeByRef[ref], hot: true }); });
      L.filter((l) => l.kind !== 'finding' && (l.procs || []).some((p) => (d.procs || []).includes(p))).forEach((l) => edges.push({ from: d, to: l }));
    });
    // Any finding not linked to a device still hangs off the nearest device.
    L.filter((l) => l.kind === 'finding').forEach((l) => {
      if (!edges.some((e) => e.to === l)) { const d = D[0] || internet; edges.push({ from: d, to: l, hot: true }); }
    });

    const allNodes = [internet, ...A, ...D, ...L];
    const height = Math.max(360, TOP + Math.max(A.length, D.length, L.length, 4) * ROW + 40);
    return { internet, nodes: allNodes, edges, height, width: 1000 };
  }, [graph]);

  if (!graph || !model) return null;

  const nodeColor = (nd) => nd.kind === 'internet' ? INTERNET
    : nd.kind === 'finding' ? (SEV[nd.severity] || SENSITIVE)
    : nd.kind === 'threat' ? SENSITIVE
    : nd.internetExposed ? EXPOSED : HUB;
  const r = (nd) => nd.kind === 'internet' ? 26 : (nd.kind === 'finding' || nd.kind === 'network' || nd.kind === 'threat') ? 17 : 22;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${model.width} ${model.height}`} style={{ width: '100%', height: 'auto', display: 'block', background: '#f7fafc', borderRadius: 6 }}>
        <defs>
          <style>{`.cxflow{stroke-dasharray:6 5;animation:cxd 1.1s linear infinite}@keyframes cxd{to{stroke-dashoffset:-22}}`}</style>
          <pattern id="cxdots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#e2e8f0" /></pattern>
        </defs>
        <rect x="0" y="0" width={model.width} height={model.height} fill="url(#cxdots)" />

        {/* Edges */}
        {model.edges.map((e, i) => {
          const x1 = e.from.x + r(e.from), y1 = e.from.y, x2 = e.to.x - r(e.to), y2 = e.to.y;
          const mx = (x1 + x2) / 2;
          const col = e.hot ? (e.to.kind === 'finding' ? (SEV[e.to.severity] || SENSITIVE) : EXPOSED) : EDGE;
          return (
            <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none"
              stroke={col} strokeWidth={e.hot ? 2 : 1.3} className={e.hot ? 'cxflow' : undefined} opacity={e.hot ? 0.95 : 0.7} />
          );
        })}

        {/* Nodes */}
        {model.nodes.map((nd) => {
          const c = nodeColor(nd), rad = r(nd);
          const clickable = nd.kind === 'finding';
          const flagged = nd.internetExposed || nd.sensitiveData || nd.kind === 'finding';
          return (
            <g key={nd.id} style={{ cursor: clickable ? 'pointer' : 'default' }}
              onClick={clickable ? () => { if (onFinding && findingByRef[nd.ref]) onFinding(findingByRef[nd.ref]); } : undefined}>
              <title>{nd.kind === 'finding' ? `${nd.label} (click for ATT&CK / CIS detail & remediation)` : nd.label}</title>
              {flagged && (
                <circle cx={nd.x} cy={nd.y} r={rad + 5} fill="none" stroke={c} strokeWidth="1.5" opacity="0.45">
                  <animate attributeName="r" values={`${rad + 3};${rad + 10};${rad + 3}`} dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0;0.55" dur="2.2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={nd.x} cy={nd.y} r={rad} fill={nd.kind === 'finding' || nd.kind === 'internet' ? c : '#fff'} stroke={c} strokeWidth={nd.kind === 'finding' ? 0 : 3} />
              <text x={nd.x} y={nd.y + (nd.kind === 'internet' ? 8 : 5)} textAnchor="middle" fontSize={nd.kind === 'internet' ? 22 : 14}
                fill={nd.kind === 'finding' ? '#fff' : nd.kind === 'internet' ? '#fff' : c}>{GLYPH[nd.kind] || '•'}</text>
              {nd.kind === 'finding'
                ? <text x={nd.x} y={nd.y + rad + 13} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={c}>{nd.ref}</text>
                : <text x={nd.x} y={nd.y + rad + 13} textAnchor="middle" fontSize="10" fontWeight="600" fill={INK}>{trunc(nd.label, 24)}</text>}
              {/* Exposure / sensitivity callouts */}
              {nd.internetExposed && <Callout x={nd.x + rad + 6} y={nd.y - rad - 4} text="Internet exposed" color={EXPOSED} />}
              {nd.sensitiveData && <Callout x={nd.x + rad + 6} y={nd.y + rad - 2} text="Sensitive data" color={SENSITIVE} />}
            </g>
          );
        })}

        {/* Column headers */}
        {[['Internet', 70], ['Application endpoint', 300], ['Instance', 540], ['Findings · MITRE ATT&CK', 820]].map(([t, x]) => (
          <text key={t} x={x} y={20} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={INK_3} style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t}</text>
        ))}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8, flexWrap: 'wrap', fontSize: 11, color: INK_2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 6, background: SENSITIVE, display: 'inline-block' }} />Finding (control failure → ATT&CK)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 6, background: EXPOSED, display: 'inline-block' }} />Internet exposed</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 6, border: `3px solid ${HUB}`, display: 'inline-block' }} />App / instance</span>
        <span style={{ color: INK_3 }}>Click a finding for ATT&CK technique, CIS control, source &amp; remediation</span>
      </div>
    </div>
  );
}

function Callout({ x, y, text, color }) {
  return (
    <g>
      <rect x={x} y={y - 9} rx={8} width={text.length * 5.4 + 14} height={17} fill={color} />
      <text x={x + 7 + (text.length * 5.4) / 2} y={y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{text}</text>
    </g>
  );
}
function trunc(s, n) { return String(s).length > n ? String(s).slice(0, n - 1) + '…' : s; }
