/**
 * CisoPostureDomains
 * ------------------
 * The CISO security posture across the eight posture domains. Each domain card
 * shows its 0–100 score, status, trend, the top three drivers, the metrics
 * outside threshold, and the recommended CISO action. An "emphasis" prop
 * reorders/highlights the cards to match the question asked (trend, risk,
 * gaps, thresholds, actions).
 *
 * Data: GET /api/ciso/posture
 */

import React, { useState, useEffect } from 'react';

const INK = '#0f172a', INK_2 = '#475569', INK_3 = '#94a3b8', HAIRLINE = '#e2e8f0';
const STATUS = { green: '#1f8a4c', amber: '#B07C2E', red: '#C0392B', 'Not assessed': '#94a3b8' };
const TREND = {
  improving: { a: '▲', c: '#1f8a4c', t: 'Improving' }, deteriorating: { a: '▼', c: '#C0392B', t: 'Deteriorating' },
  stable: { a: '▬', c: '#94a3b8', t: 'Stable' }, new: { a: '◆', c: '#2563eb', t: 'New baseline' },
};

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, organizationId, apiUrl };
}

export default function CisoPostureDomains(props) {
  const { emphasis } = props; // 'trend' | 'risk' | 'gaps' | 'thresholds' | 'actions' | null
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null); // expanded domain id
  const { token, organizationId, apiUrl } = resolveCtx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    fetch(`${apiUrl}/api/ciso/posture?org_id=${encodeURIComponent(organizationId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch((e) => setError(e.message));
  }, [apiUrl, organizationId, token]);

  if (error) return <div style={{ padding: 20, color: STATUS.red, fontSize: 13 }}>Could not load posture domains: {error}</div>;
  if (!data) return <div style={{ padding: 20, color: INK_3, fontSize: 13 }}>Computing CISO posture domains…</div>;

  // Order cards by the question emphasis.
  let domains = [...data.domains];
  if (emphasis === 'trend') domains.sort((a, b) => a.delta - b.delta);
  else if (emphasis === 'risk' || emphasis === 'gaps' || emphasis === 'thresholds' || emphasis === 'actions') domains.sort((a, b) => a.score - b.score);

  const sc = (s) => STATUS[s] || INK_3;

  return (
    <div>
      {/* Overall band */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#0f1b2d', borderRadius: 8, padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: sc(data.overall.status), fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {data.overall.score}<span style={{ fontSize: 14, color: '#8fa3bd' }}>/100</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>Overall security posture · {data.overall.status.toUpperCase()}</div>
          <div style={{ color: '#8fa3bd', fontSize: 11, marginTop: 2 }}>
            Across 8 posture domains · <span style={{ color: TREND[data.overall.trend].c }}>{TREND[data.overall.trend].a} {TREND[data.overall.trend].t}{data.overall.delta ? ` (${data.overall.delta > 0 ? '+' : ''}${data.overall.delta} vs last period)` : ''}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {domains.map((d) => {
          const tr = TREND[d.trend] || TREND.new;
          const expanded = open === d.id;
          return (
            <div key={d.id} style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderLeft: `4px solid ${sc(d.status)}`, borderRadius: 6, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{d.name}</div>
                  <div style={{ fontSize: 10.5, marginTop: 2, color: tr.c, fontWeight: 600 }}>
                    {tr.a} {tr.t}{d.delta ? ` (${d.delta > 0 ? '+' : ''}${d.delta})` : ''}
                    <span style={{ color: INK_3, fontWeight: 400, marginLeft: 8 }}>{d.metricsOutsideThreshold.length} metric(s) outside threshold</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: sc(d.status), fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{d.score}</div>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: sc(d.status), textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.status}</div>
                </div>
              </div>
              {/* score bar */}
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', margin: '8px 0 10px' }}>
                <div style={{ width: `${d.score}%`, height: '100%', background: sc(d.status), borderRadius: 3 }} />
              </div>
              {/* top drivers */}
              <div style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Top 3 drivers</div>
              {d.drivers.map((dr, i) => (
                <div key={i} style={{ fontSize: 11, color: INK_2, padding: '1px 0' }}>· {dr}</div>
              ))}
              {/* recommended action */}
              <div style={{ marginTop: 10, fontSize: 11.5, color: INK, background: `${sc(d.status)}10`, border: `1px solid ${sc(d.status)}30`, borderRadius: 4, padding: '7px 10px' }}>
                <span style={{ fontWeight: 700, color: sc(d.status) }}>Action:</span> {d.recommendedAction}
              </div>
              {/* metrics drilldown */}
              <button onClick={() => setOpen(expanded ? null : d.id)}
                style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#2563eb', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                {expanded ? '▲ Hide metrics' : `▼ All ${d.metrics.length} metrics`}
              </button>
              {expanded && (
                <div style={{ marginTop: 6, borderTop: `1px solid ${HAIRLINE}`, paddingTop: 6 }}>
                  {d.metrics.map((m) => (
                    <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0', fontSize: 11, borderBottom: '1px solid #f8fafc' }}>
                      <span style={{ color: INK_2 }}>{m.name}<span style={{ color: INK_3, fontSize: 9, marginLeft: 6 }}>{m.source}</span></span>
                      <span style={{ fontWeight: 600, color: m.within ? '#1f8a4c' : '#C0392B', fontVariantNumeric: 'tabular-nums' }}>
                        {m.value}{m.unit ? ` ${m.unit}` : ''} <span style={{ color: INK_3, fontWeight: 400 }}>/ {m.higher ? '≥' : '≤'}{m.target}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
