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

  // Load existing mapping; if apps + processes exist but nothing is mapped yet,
  // run the LLM mapping automatically (the "next step" after upload).
  useEffect(() => {
    load().then((g) => {
      if (autoRan.current || !g) return;
      const c = g.counts || {};
      if (c.applications > 0 && c.processes > 0 && (c.mapped || 0) === 0) { autoRan.current = true; remap(); }
    });
  }, [load, remap]);

  const processes = (graph && graph.processes) || [];
  const unmapped = (graph && graph.unmappedApps) || [];
  const counts = (graph && graph.counts) || {};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: INK }}>Applications → processes</div>
          <div style={{ fontSize: 11.5, color: INK2, lineHeight: 1.5, maxWidth: 720 }}>
            CyberRX mapped each application to the business process(es) it supports. This mapping drives all downstream
            criticality and risk calculations — review the visual below.
          </div>
        </div>
        <button onClick={remap} disabled={busy} style={{ background: '#0f1b2d', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap' }}>{busy ? 'Mapping…' : '↻ Re-map with AI'}</button>
      </div>
      {err && <div style={{ color: '#C0392B', fontSize: 12, margin: '8px 0' }}>{err}</div>}
      {counts.processes != null && (
        <div style={{ fontSize: 11, color: INK3, marginBottom: 12 }}>{counts.mapped || 0} of {counts.applications || 0} applications mapped across {counts.processes || 0} processes.</div>
      )}

      {busy && !processes.length ? <div style={{ fontSize: 12, color: INK3, padding: '12px 0' }}>Mapping applications to processes…</div> : null}
      {!processes.length && !busy ? <div style={{ fontSize: 12, color: INK3, padding: '12px 0' }}>Upload your application inventory and process list, then map.</div> : null}

      {/* Visual: each process node with the applications that support it */}
      <div style={{ display: 'grid', gap: 12 }}>
        {processes.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'stretch', gap: 0, border: `1px solid ${HAIR}`, borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            {/* Process node */}
            <div style={{ width: 230, flexShrink: 0, background: PANEL, borderRight: `1px solid ${HAIR}`, borderLeft: `4px solid ${tierColor(p.tier)}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: INK }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', background: tierColor(p.tier), borderRadius: 4, padding: '2px 7px' }}>TIER {p.tier ?? '—'}</span>
                <span style={{ fontSize: 10, color: INK3 }}>RTO {p.rto || '—'}</span>
              </div>
            </div>
            {/* Connector + supporting apps */}
            <div style={{ flex: 1, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: INK3, fontSize: 16, marginRight: 2 }}>→</span>
              {p.apps.length ? p.apps.map((a) => (
                <span key={a.id} title={a.confidence != null ? `match ${Math.round(a.confidence * 100)}%` : ''} style={{ fontSize: 11, fontWeight: 600, color: '#1e3a5f', background: '#eaf1fb', border: '1px solid #cfe0f5', borderRadius: 14, padding: '4px 11px' }}>{a.name}</span>
              )) : <span style={{ fontSize: 11, color: INK3, fontStyle: 'italic' }}>No application mapped yet</span>}
            </div>
          </div>
        ))}
      </div>

      {unmapped.length > 0 && (
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
