/**
 * CioTransformation — CIO Sub-tab 4: Transformation Portfolio & ROI.
 * Initiatives as a portfolio scored for risk introduced vs reduced and resilience
 * impact, with predicted-vs-realized from the shared calibrated engine, and a
 * sequence / secure / defer recommendation per initiative.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc';
const TONE = { good: '#1f8a4c', warn: '#B07C2E', bad: '#C0392B' };
const REC = { sequence: { c: '#1f8a4c', label: 'Sequence earlier' }, secure: { c: '#B07C2E', label: 'Secure-by-design' }, defer: { c: '#C0392B', label: 'Defer' } };
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function CioTransformation(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/cio/transformation?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Scoring the transformation portfolio…</div>;
  const r = d.rollup;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#94a3b8', marginBottom: -4 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Transformation portfolio</div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>

      {/* rollup */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 10 }}>
        <Kpi label="Initiatives" value={`${r.total}`} sub={`${r.sequence} seq · ${r.secure} secure · ${r.defer} defer`} />
        <Kpi label="Net risk change" value={`${r.netRiskReduced >= 0 ? '+' : ''}${r.netRiskReduced}`} sub="posture points (reduced − introduced)" tone={r.netRiskReduced >= 0 ? 'good' : 'bad'} />
        <Kpi label="Loss avoided / $" value={r.blendedRoi != null ? `${r.blendedRoi}×` : '—'} sub={r.realizedRoi != null ? `${r.realizedRoi}× realized` : 'predicted'} />
        <Kpi label="Exposure reduced" value={`${usd(r.realizedExposureReduced)} / ${usd(r.totalExposureReduced)}`} sub="realized / predicted" tone="good" />
        {r.calibration != null && <Kpi label="Engine calibration" value={`${r.calibration}%`} sub="realized vs projection" tone={r.calibration >= 85 ? 'good' : 'warn'} />}
      </div>

      {/* per-initiative */}
      <div style={{ display: 'grid', gap: 11 }}>
        {d.initiatives.map((it) => {
          const rec = REC[it.recommendation.action] || REC.secure;
          return (
            <div key={it.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${rec.c}`, borderRadius: 11, background: '#fff', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>{it.name}</div>
                  {it.objective && <div style={{ fontSize: 11, color: INK2, marginTop: 2 }}>{it.objective}</div>}
                  <div style={{ fontSize: 10.5, color: INK3, marginTop: 4 }}>Owner {it.owner || '—'} · {it.percentComplete}% · {it.status}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: rec.c, borderRadius: 999, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{rec.label}</span>
                  <div style={{ fontSize: 10.5, color: INK2, marginTop: 5, maxWidth: 240 }}>{it.recommendation.why}</div>
                </div>
              </div>

              {/* risk introduced vs reduced + resilience */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 10 }}>
                <div>
                  <Label>Risk reduced</Label>
                  <BarRow value={it.riskReduced} max={14} tone={TONE.good} suffix=" pts" />
                </div>
                <div>
                  <Label>Risk introduced</Label>
                  <BarRow value={it.riskIntroduced} max={14} tone={TONE.bad} suffix=" pts" />
                </div>
                <div>
                  <Label>Resilience impact</Label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: it.resilience.score >= 5 ? TONE.good : it.resilience.score >= 3 ? TONE.warn : INK3 }}>{it.resilience.label}</div>
                </div>
              </div>

              {/* predicted vs realized */}
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10, fontSize: 11, color: INK2, borderTop: `1px solid ${PANEL}`, paddingTop: 8 }}>
                <span>Posture lift <strong style={{ color: TONE.good }}>+{it.realized.postureLift}</strong> / +{it.predicted.postureLift} <span style={{ color: INK3 }}>realized/pred</span></span>
                <span>Loss avoided <strong style={{ color: INK }}>{usd(it.realized.exposureReduced)}</strong> / {usd(it.predicted.exposureReduced)}</span>
                <span>Per $ <strong style={{ color: INK }}>{it.predicted.roi != null ? `${it.predicted.roi}×` : '—'}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? TONE[tone] : '#cbd5e1'}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
      <div style={{ fontSize: 10.5, color: INK2 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: tone ? TONE[tone] : INK, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
const Label = ({ children }) => <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginBottom: 4 }}>{children}</div>;
function BarRow({ value, max, tone, suffix }) {
  const pct = Math.min(100, (Number(value) / max) * 100);
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: tone }}>{value}{suffix}</div>
      <div style={{ height: 6, background: '#eef2f6', borderRadius: 3, overflow: 'hidden', marginTop: 3 }}><div style={{ width: `${pct}%`, height: '100%', background: tone }} /></div>
    </div>
  );
}
