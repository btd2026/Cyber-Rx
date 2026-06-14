/**
 * CfoExposurePanel (CFO) — business-weighted cyber exposure: net/gross/insurance
 * and exposure allocated to crown-jewel applications, paired with the unified
 * assessment score. Backend: /api/cfo/exposure.
 */
import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc', GREEN = '#1f8a4c', RED = '#C0392B';
const usd = (n) => (n == null ? '—' : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function CfoExposurePanel(props) {
  const { token, orgId, api } = ctx(props);
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    if (!orgId) return;
    fetch(`${api}/api/cfo/exposure?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.json()).then(setD).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return null;
  const max = Math.max(1, ...(d.byApp || []).map((a) => a.weightedExposure || 0));
  const Stat = ({ label, value, color }) => (
    <div style={{ flex: 1, minWidth: 120, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || INK }}>{value}</div>
      <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>Business-weighted cyber exposure</div>
      <div style={{ fontSize: 11.5, color: INK2, margin: '4px 0 12px', maxWidth: 720 }}>What our security dollars buy down — net exposure allocated to the applications that carry the most business criticality, against today's assessment score.</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Net exposure" value={usd(d.netExposure)} color={RED} />
        <Stat label="Gross exposure" value={usd(d.grossExposure)} />
        <Stat label="Insurance coverage" value={usd(d.insuranceCoverage)} color={GREEN} />
        <Stat label="Tier-1 apps" value={d.tier1Apps} />
        <Stat label="Assessment score" value={d.assessmentScore ?? '—'} color={d.assessmentScore >= 80 ? GREEN : d.assessmentScore >= 50 ? '#B07C2E' : RED} />
      </div>
      {(d.byApp || []).length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Exposure by crown-jewel application</div>
          {d.byApp.slice(0, 8).map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ width: 180, fontSize: 12, color: INK, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <div style={{ flex: 1, height: 8, background: '#eef2f6', borderRadius: 4 }}><div style={{ width: `${Math.round((a.weightedExposure / max) * 100)}%`, height: '100%', background: RED, borderRadius: 4 }} /></div>
              <span style={{ width: 64, textAlign: 'right', fontSize: 11.5, fontWeight: 700, color: INK }}>{usd(a.weightedExposure)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
