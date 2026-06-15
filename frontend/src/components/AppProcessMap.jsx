/**
 * AppProcessMap — visual mapping of each business process to the applications
 * that support it (many-to-many). After the application inventory is uploaded,
 * CyberRX uses the LLM to map every app to the process(es) it supports; this
 * panel renders that mapping and is the source of truth for all downstream
 * criticality and risk calculations.
 *
 * Replaces the old per-app dropdown crosswalk with an executive, visual view.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc';
const tierColor = (t) => (Number(t) === 1 ? '#C0392B' : Number(t) === 2 ? '#B07C2E' : Number(t) === 3 ? '#1d4ed8' : INK3);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl || props.api_url ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function AppProcessMap(props) {
  const { token, orgId, api } = ctx(props);
  const [graph, setGraph] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [view, setView] = useState('graph');   // 'graph' (node-and-connector) | 'list'
  const autoRan = useRef(false);
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const load = useCallback(() => {
    if (!orgId) return Promise.resolve(null);
    return fetch(`${api}/api/crosswalk/app-process/graph?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((g) => { setGraph(g); return g; }).catch(() => null);
  }, [api, orgId, headers]);

  const remap = useCallback(() => {
    if (!orgId) return;
    setBusy(true); setErr(null);
    fetch(`${api}/api/crosswalk/app-process/auto`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId }) })
      .then((r) => r.json()).then((g) => { if (g && g.error) setErr(g.error); else setGraph(g); })
      .catch((e) => setErr(e.message)).finally(() => setBusy(false));
  }, [api, orgId, headers]);

  // Load any existing mapping on mount. Running the LLM mapping is an explicit
  // user action (the "Intelligently map…" button) — never silent/auto.
  useEffect(() => { load(); }, [load]);

  const processes = (graph && graph.processes) || [];
  const unmapped = (graph && graph.unmappedApps) || [];
  const counts = (graph && graph.counts) || {};
  const hasMapping = (counts.mapped || 0) > 0;
  const canMap = (counts.processes || 0) > 0 && (counts.applications || 0) > 0;

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: INK }}>Map applications to the processes they support</div>
        <div style={{ fontSize: 11.5, color: INK2, lineHeight: 1.5, maxWidth: 760 }}>
          CyberRX reads your uploaded application inventory and your confirmed processes and uses AI to map each
          application to the business process(es) it supports. This mapping drives all downstream criticality and risk
          calculations.
        </div>
      </div>
      {err && <div style={{ color: '#C0392B', fontSize: 12, margin: '8px 0' }}>{err}</div>}

      {/* Explicit AI-mapping action — the requested button. */}
      <div style={{ textAlign: 'center', padding: hasMapping ? '0 0 12px' : '22px 0', border: hasMapping ? 'none' : `1px dashed ${HAIR}`, borderRadius: 12, background: hasMapping ? 'transparent' : PANEL, marginBottom: hasMapping ? 4 : 0 }}>
        <button onClick={remap} disabled={busy || !canMap}
          style={{ background: hasMapping ? '#fff' : '#4f46e5', color: hasMapping ? INK : '#fff', border: hasMapping ? `1px solid ${HAIR}` : 'none', borderRadius: 9, padding: hasMapping ? '7px 14px' : '12px 22px', fontSize: hasMapping ? 11.5 : 13.5, fontWeight: 800, cursor: (busy || !canMap) ? 'default' : 'pointer', opacity: (busy || !canMap) ? 0.6 : 1, maxWidth: 460, whiteSpace: 'normal', lineHeight: 1.3 }}>
          {busy ? 'Mapping… reading both files' : hasMapping ? '↻ Re-map with AI' : '🪄 Intelligently map processes to applications that support them'}
        </button>
        {!hasMapping && (
          <div style={{ fontSize: 11, color: INK3, marginTop: 8 }}>
            {canMap ? `AI will analyze ${counts.applications} applications against ${counts.processes} processes.`
              : 'Upload your application inventory above and confirm your processes first.'}
          </div>
        )}
      </div>
      {hasMapping && (
        <div style={{ fontSize: 11, color: INK3, marginBottom: 12 }}>{counts.mapped} of {counts.applications} applications mapped across {counts.processes} processes.</div>
      )}

      {/* Visual mapping (after mapping): node-and-connector graph or list. */}
      {hasMapping && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 0, marginBottom: 10 }}>
            {[['graph', 'Graph'], ['list', 'List']].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} style={{ border: `1px solid ${HAIR}`, background: view === k ? '#0f1b2d' : '#fff', color: view === k ? '#fff' : INK2, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: k === 'graph' ? '6px 0 0 6px' : '0 6px 6px 0' }}>{l}</button>
            ))}
          </div>
          {view === 'graph'
            ? <GraphView processes={processes} />
            : (
              <div style={{ display: 'grid', gap: 12 }}>
                {processes.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'stretch', gap: 0, border: `1px solid ${HAIR}`, borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    <div style={{ width: 230, flexShrink: 0, background: PANEL, borderRight: `1px solid ${HAIR}`, borderLeft: `4px solid ${tierColor(p.tier)}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: INK }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
                        <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', background: tierColor(p.tier), borderRadius: 4, padding: '2px 7px' }}>TIER {p.tier ?? '—'}</span>
                        <span style={{ fontSize: 10, color: INK3 }}>RTO {p.rto || '—'}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: INK3, fontSize: 16, marginRight: 2 }}>→</span>
                      {p.apps.length ? p.apps.map((a) => (
                        <span key={a.id} title={a.confidence != null ? `match ${Math.round(a.confidence * 100)}%` : ''} style={{ fontSize: 11, fontWeight: 600, color: '#1e3a5f', background: '#eaf1fb', border: '1px solid #cfe0f5', borderRadius: 14, padding: '4px 11px' }}>{a.name}</span>
                      )) : <span style={{ fontSize: 11, color: INK3, fontStyle: 'italic' }}>No application mapped yet</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {hasMapping && unmapped.length > 0 && (
        <div style={{ marginTop: 16, border: `1px dashed ${HAIR}`, borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Not yet mapped to a process ({unmapped.length})</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {unmapped.map((a) => <span key={a.id} style={{ fontSize: 11, color: INK2, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 14, padding: '4px 11px' }}>{a.name}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

// Bipartite node-and-connector graph: processes (left) linked to the applications
// (right) that support them, with curved connectors. Many-to-many.
function GraphView({ processes }) {
  const apps = []; const seen = new Set();
  processes.forEach((p) => (p.apps || []).forEach((a) => { if (!seen.has(a.id)) { seen.add(a.id); apps.push(a); } }));
  if (!apps.length) return <div style={{ fontSize: 12, color: INK3, padding: '8px 0' }}>No applications mapped to processes yet.</div>;

  const boxW = 208, boxH = 40, vGap = 14, leftX = 6, colGap = 190, TOP = 22;
  const rightX = leftX + boxW + colGap;
  const width = rightX + boxW + 6;
  const colH = (n) => n * (boxH + vGap) + vGap;
  const height = TOP + Math.max(colH(processes.length), colH(apps.length), 80);
  const yFor = (i, n) => { const avail = height - TOP; return TOP + (avail - colH(n)) / 2 + vGap + i * (boxH + vGap) + boxH / 2; };
  const pY = {}; processes.forEach((p, i) => { pY[p.id] = yFor(i, processes.length); });
  const aY = {}; apps.forEach((a, i) => { aY[a.id] = yFor(i, apps.length); });
  const trunc = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : (s || ''));

  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${HAIR}`, borderRadius: 10, background: '#fff', padding: 4 }}>
      <svg width={width} height={height} style={{ minWidth: width }}>
        <text x={leftX + 2} y={13} fontSize="9" fontWeight="700" fill={INK3} style={{ letterSpacing: '0.08em' }}>PROCESSES</text>
        <text x={rightX + 2} y={13} fontSize="9" fontWeight="700" fill={INK3} style={{ letterSpacing: '0.08em' }}>APPLICATIONS</text>
        {processes.map((p) => (p.apps || []).map((a) => {
          const x1 = leftX + boxW, y1 = pY[p.id], x2 = rightX, y2 = aY[a.id], mx = (x1 + x2) / 2;
          return <path key={p.id + a.id} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="#c7d2e0" strokeWidth={1.4} />;
        }))}
        {processes.map((p) => { const y = pY[p.id] - boxH / 2; return (
          <g key={p.id}>
            <rect x={leftX} y={y} width={boxW} height={boxH} rx={9} fill="#f8fafc" stroke={HAIR} />
            <rect x={leftX} y={y} width={5} height={boxH} rx={2} fill={tierColor(p.tier)} />
            <text x={leftX + 14} y={y + 17} fontSize="11.5" fontWeight="800" fill={INK}>{trunc(p.name, 24)}</text>
            <text x={leftX + 14} y={y + 31} fontSize="8.5" fill={INK3}>TIER {p.tier ?? '—'} · RTO {p.rto || '—'}</text>
          </g>
        ); })}
        {apps.map((a) => { const y = aY[a.id] - boxH / 2; return (
          <g key={a.id}>
            <rect x={rightX} y={y} width={boxW} height={boxH} rx={9} fill="#eaf1fb" stroke="#cfe0f5" />
            <text x={rightX + 14} y={y + 24} fontSize="11.5" fontWeight="600" fill="#1e3a5f">{trunc(a.name, 24)}</text>
          </g>
        ); })}
      </svg>
    </div>
  );
}
