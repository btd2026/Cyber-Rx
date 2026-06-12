/**
 * CroBoardReport — STEP D2 (business-risk language only)
 * ------------------------------------------------------
 * Board/CRO view: posture tied to the business — top processes by exposure,
 * enterprise readiness + maturity tier, "what changed since last board meeting",
 * business-impact themes, and chosen-profile coverage. No control IDs, no ATT&CK
 * jargon. From GET /api/frameworks/exec/cro (computed, not seeded).
 */

import React, { useState, useEffect } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc';
const GREEN = '#1f8a4c', AMBER = '#B07C2E', RED = '#C0392B';
const rate = (r) => (r === 'strong' ? GREEN : r === 'adequate' ? AMBER : r === 'weak' ? RED : INK3);
const expColor = (s) => (s >= 60 ? RED : s >= 30 ? AMBER : GREEN);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

const money = (n) => (n ? '$' + Number(n).toLocaleString() : '—');

export default function CroBoardReport(props) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { token, orgId, api } = ctx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    fetch(`${api}/api/frameworks/exec/cro?org_id=${encodeURIComponent(orgId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch((e) => setError(e.message));
  }, [api, orgId, token]);

  if (error) return <div style={{ padding: 20, color: RED, fontSize: 13 }}>Could not load board pack: {error}</div>;
  if (!data) return <div style={{ padding: 20, color: INK3, fontSize: 13 }}>Preparing board pack from latest assessment…</div>;

  const exportUrl = `${api}/api/frameworks/exec/cro/export.pdf?org_id=${encodeURIComponent(orgId)}`;
  const tierColor = data.enterpriseReadiness >= 65 ? GREEN : data.enterpriseReadiness >= 40 ? AMBER : RED;

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', borderBottom: `1px solid ${HAIR}`, paddingBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK3, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Board / CRO · Cybersecurity Pack</div>
          <h2 style={{ margin: '6px 0 0', fontSize: 21, fontWeight: 600, color: INK }}>Enterprise cyber risk in business terms</h2>
          <div style={{ fontSize: 12, color: INK2, marginTop: 6, maxWidth: 640 }}>{data.postureStatement}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ textAlign: 'center', border: `1px solid ${HAIR}`, borderTop: `3px solid ${tierColor}`, borderRadius: 6, padding: '8px 14px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: tierColor, lineHeight: 1 }}>{data.enterpriseReadiness}</div>
            <div style={{ fontSize: 9, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>Readiness · Tier {data.maturityTier.tier}</div>
          </div>
          <a href={exportUrl} style={{ background: INK, color: '#fff', fontSize: 11.5, fontWeight: 600, borderRadius: 5, padding: '8px 14px', textDecoration: 'none', whiteSpace: 'nowrap' }}>⤓ Board pack (PDF)</a>
        </div>
      </div>

      {/* What changed */}
      {data.whatChanged && (
        <div style={{ marginTop: 16, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 6 }}>What changed since the last board meeting</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: data.whatChanged.overallDelta >= 0 ? GREEN : RED }}>
              Overall {data.whatChanged.overallDelta >= 0 ? '▲ +' : '▼ '}{data.whatChanged.overallDelta} pts
            </span>
            {data.whatChanged.byFunction.map((f) => (
              <span key={f.id} style={{ fontSize: 11.5, color: f.delta >= 0 ? GREEN : RED }}>{f.name} {f.delta >= 0 ? '+' : ''}{f.delta}</span>
            ))}
          </div>
        </div>
      )}

      {/* Top processes by exposure */}
      <h3 style={{ fontSize: 13, color: INK, margin: '20px 0 8px' }}>Top business processes by exposure</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {data.topProcesses.map((p) => (
          <div key={p.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${expColor(p.exposureScore)}`, borderRadius: 5, padding: '9px 13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: INK }}>{p.name} <span style={{ fontSize: 10.5, fontWeight: 600, color: INK3 }}>· {p.criticality}</span></span>
              <span style={{ fontSize: 11.5, color: INK2 }}>exposure <strong style={{ color: expColor(p.exposureScore) }}>{p.exposureScore}/100</strong> · {money(p.financialExposure)}</span>
            </div>
            <div style={{ fontSize: 11.5, color: INK2, marginTop: 3 }}>{p.headline}</div>
          </div>
        ))}
      </div>

      {/* Business impacts */}
      <h3 style={{ fontSize: 13, color: INK, margin: '20px 0 8px' }}>Business-impact themes</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 8 }}>
        {data.businessImpacts.map((b) => (
          <div key={b.theme} style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '11px 13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 12.5, color: INK }}>{b.theme}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: rate(b.rating), borderRadius: 3, padding: '2px 7px', textTransform: 'uppercase' }}>{b.rating}</span>
            </div>
            <div style={{ fontSize: 11.5, color: INK2, marginTop: 5 }}>{b.statement}</div>
          </div>
        ))}
      </div>

      {/* Profile coverage */}
      <h3 style={{ fontSize: 13, color: INK, margin: '20px 0 8px' }}>Coverage of our chosen security profile</h3>
      <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '12px 16px', fontSize: 12, color: INK }}>
        <strong>{data.profileCoverage.name}</strong> — <strong style={{ color: expColor(100 - data.profileCoverage.coveragePct) }}>{data.profileCoverage.coveragePct}%</strong> of required safeguards are evidenced as operating
        ({data.profileCoverage.coveredControls} of {data.profileCoverage.totalControls}). Maturity assessed at <strong>Tier {data.maturityTier.tier} — {data.maturityTier.label}</strong>.
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: INK3 }}>Computed from validation run #{data.runId}. Figures trace to stored checks; see the exported pack's appendix.</div>
    </div>
  );
}
