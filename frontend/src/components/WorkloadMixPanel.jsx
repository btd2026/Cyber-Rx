/**
 * WorkloadMixPanel — donut chart of where workloads run (on-prem / Azure / AWS /
 * GCP / other cloud / SaaS), from the hostingMix captured at intake
 * (orgs.setup_json.hostingMix). Shown on the CISO and CIO dashboards.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair;
const ENVS = [
  { key: 'on_prem', label: 'On-prem', color: '#475569' },
  { key: 'azure', label: 'Azure', color: '#0078D4' },
  { key: 'aws', label: 'AWS', color: '#FF9900' },
  { key: 'gcp', label: 'GCP', color: '#4285F4' },
  { key: 'other_cloud', label: 'Other cloud', color: '#7c3aed' },
  { key: 'saas', label: 'SaaS', color: '#1f8a4c' },
];

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

// Donut from segments [{label, value, color}]. Pure SVG, no deps.
export function Donut({ segments, size = 132, stroke = 20 }) {
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, cx = size / 2;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#eef2f6" strokeWidth={stroke} />
      {segments.filter((s) => s.value > 0).map((s, i) => {
        const frac = s.value / total, len = frac * C;
        const el = (
          <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}
            transform={`rotate(-90 ${cx} ${cx})`} />
        );
        off += len; return el;
      })}
    </svg>
  );
}

export default function WorkloadMixPanel(props) {
  const { token, orgId, api } = ctx(props);
  const [mix, setMix] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  useEffect(() => {
    if (!orgId) return;
    fetch(`${api}/api/orgs/${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const sj = (d && (d.setup_json || d.setupJson)) || (d && d.org && d.org.setup_json) || {};
        const hm = sj.hostingMix || sj.hosting_mix || (d && d.hostingMix) || null;
        setMix(hm || {});
      })
      .catch(() => setMix({}));
  }, [api, orgId, headers]);

  if (!mix) return null;
  const segments = ENVS.map((e) => ({ ...e, value: Number(mix[e.key]) || 0 })).filter((s) => s.value > 0);
  if (!segments.length) return null;

  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, padding: '14px 16px', background: '#fff', marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 2, fontFamily: FONTS.display }}>Where workloads run</div>
      <div style={{ fontSize: 11.5, color: INK2, marginBottom: 10 }}>Hosting mix captured at intake — attack surface and shared-responsibility split by environment.</div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <Donut segments={segments} />
        <div style={{ display: 'grid', gap: 5, flex: 1, minWidth: 180 }}>
          {segments.sort((a, b) => b.value - a.value).map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1, color: INK }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: INK, fontFamily: FONTS.mono }}>{s.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
