/**
 * ResolutionPanel (CIO) — entity resolution: surfaces duplicate applications
 * detected across sources and lets the user merge them to one canonical entity.
 * Backend: /api/resolution/applications/{duplicates,merge}.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, NAVY = COLORS.navy1, GREEN = COLORS.good, RED = COLORS.bad;

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function ResolutionPanel(props) {
  const { token, orgId, api } = ctx(props);
  const [groups, setGroups] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId, 'Content-Type': 'application/json' }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const load = useCallback(() => {
    if (!orgId) return;
    fetch(`${api}/api/resolution/applications/duplicates?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => r.json()).then((d) => setGroups(d.groups || [])).catch(() => setGroups([]));
  }, [api, orgId, headers]);
  useEffect(() => { load(); }, [load]);

  const merge = (g) => {
    setBusy(true); setMsg(null);
    fetch(`${api}/api/resolution/applications/merge`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, survivorId: g.survivor.id, duplicateIds: g.duplicates.map((d) => d.id) }) })
      .then((r) => r.json()).then((res) => { setMsg(`Merged ${res.merged} into ${g.survivor.name}.`); load(); })
      .catch((e) => setMsg(e.message)).finally(() => setBusy(false));
  };

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>Entity resolution — application duplicates</div>
      <div style={{ fontSize: 11.5, color: INK2, margin: '4px 0 10px', maxWidth: 720 }}>One trustworthy picture: applications reconciled across CMDB sources. Confirm a merge to collapse duplicates onto a single canonical app (crosswalk + criticality carry over).</div>
      {msg && <div style={{ background: '#f0f7f2', border: '1px solid #cce8d6', color: GREEN, borderRadius: 6, padding: '7px 11px', fontSize: 12, marginBottom: 10 }}>{msg}</div>}
      {!groups ? <div style={{ color: INK3, fontSize: 12 }}>Loading…</div> : !groups.length ? <div style={{ color: INK3, fontSize: 12 }}>No duplicate applications detected — inventory looks clean.</div> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {groups.map((g, i) => (
            <div key={i} style={{ border: `1px solid ${HAIR}`, borderRadius: 8, padding: '10px 13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12.5 }}><strong style={{ color: INK }}>{g.survivor.name}</strong> <span style={{ color: INK3 }}>← {g.duplicates.map((d) => `${d.name} (${Math.round(d.confidence * 100)}%)`).join(', ')}</span></div>
                <button onClick={() => merge(g)} disabled={busy} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>Merge</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
