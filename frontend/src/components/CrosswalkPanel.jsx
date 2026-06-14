/**
 * CrosswalkPanel — assisted app → process crosswalk. Lists each application with
 * its best-matching process (confidence), lets the user accept or override, and
 * on confirm inherits the process's criticality (Tier + RTO) onto the app.
 *
 * Backend: GET /api/crosswalk/app-process/suggestions, POST .../confirm.
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', GREEN = '#1f8a4c', AMBER = '#B07C2E', RED = '#C0392B';

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}
const confColor = (c) => (c >= 0.8 ? GREEN : c >= 0.5 ? AMBER : RED);

export default function CrosswalkPanel(props) {
  const { token, orgId, api } = ctx(props);
  const [items, setItems] = useState(null);
  const [choice, setChoice] = useState({});   // appId -> processId
  const [done, setDone] = useState({});        // appId -> {tier, rto}
  const [busy, setBusy] = useState({});
  const [error, setError] = useState(null);

  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId, 'Content-Type': 'application/json' }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const load = useCallback(() => {
    if (!orgId) { setError('No organization selected yet.'); return; }
    fetch(`${api}/api/crosswalk/app-process/suggestions?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        const c = {}; (d.items || []).forEach((it) => { if (it.suggestions[0]) c[it.application.id] = it.suggestions[0].id; });
        setChoice(c);
      })
      .catch((e) => setError(e.message));
  }, [api, orgId, headers]);

  useEffect(() => { load(); }, [load]);

  const confirm = (appId) => {
    const processId = choice[appId];
    if (!processId) return;
    setBusy((b) => ({ ...b, [appId]: true }));
    fetch(`${api}/api/crosswalk/app-process/confirm`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, applicationId: appId, processId }) })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((res) => setDone((d) => ({ ...d, [appId]: res.inherited || {} })))
      .catch((e) => setError(e.message))
      .finally(() => setBusy((b) => ({ ...b, [appId]: false })));
  };

  if (error && !items) return <div style={{ fontSize: 12.5, color: RED, padding: 10 }}>Crosswalk unavailable: {error}</div>;
  if (!items) return <div style={{ fontSize: 12.5, color: INK3, padding: 10 }}>Loading crosswalk suggestions…</div>;
  if (!items.length) return <div style={{ fontSize: 12.5, color: INK3, padding: 10 }}>No applications yet — import a CMDB first, and add processes (inventory or reference model).</div>;

  return (
    <div>
      <div style={{ fontSize: 12.5, color: INK2, marginBottom: 10 }}>Map each application to the business process it supports. We suggest the best match — accept it or pick another. Confirming inherits the process's criticality (Tier + RTO) onto the application.</div>
      {error && <div style={{ background: '#fdecea', border: '1px solid #f3c9bf', color: RED, borderRadius: 6, padding: '6px 10px', fontSize: 11.5, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((it) => {
          const app = it.application; const top = it.suggestions[0];
          const inh = done[app.id];
          return (
            <div key={app.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 8, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: INK, minWidth: 160 }}>{app.name}</span>
              <span style={{ fontSize: 12, color: INK3 }}>→</span>
              <select value={choice[app.id] || ''} onChange={(e) => setChoice({ ...choice, [app.id]: e.target.value })}
                style={{ flex: 1, minWidth: 200, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '6px 9px', fontSize: 12 }}>
                <option value="">— select a process —</option>
                {it.suggestions.map((s) => <option key={s.id} value={s.id}>{s.name} ({Math.round(s.confidence * 100)}%)</option>)}
              </select>
              {top && <span style={{ fontSize: 11, fontWeight: 700, color: confColor(top.confidence) }}>{Math.round(top.confidence * 100)}%</span>}
              {inh ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>✓ Tier {inh.tier ?? '—'} · RTO {inh.rto || '—'}</span>
              ) : (
                <button onClick={() => confirm(app.id)} disabled={busy[app.id] || !choice[app.id]}
                  style={{ background: '#0f1b2d', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', opacity: (busy[app.id] || !choice[app.id]) ? 0.5 : 1 }}>
                  {busy[app.id] ? '…' : 'Confirm'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
