/**
 * CroTreatment — CRO Sub-tab 4: Risk Treatment Portfolio & ROI.
 * Mitigate / transfer / accept across the shared-event portfolio, with capital
 * efficiency (expected loss avoided per dollar) and predicted-vs-realized risk
 * movement from the shared calibrated engine.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const SEV = { Critical: COLORS.bad, High: '#A85B2E', Medium: COLORS.warn, Low: COLORS.good };
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const TREAT = { mitigate: { c: COLORS.good, label: 'Mitigate' }, transfer: { c: '#1d4ed8', label: 'Transfer' }, accept: { c: COLORS.warn, label: 'Accept' } };
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

export default function CroTreatment(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/cro/treatment?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Building the treatment portfolio…</div>;
  const r = d.rollup, pvr = d.predictedVsRealized;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>{d.provenance && <Provenance prov={d.provenance} />}<span>Risk treatment portfolio</span></div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>

      {/* rollup */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 10 }}>
        <Kpi label="Exposures treated" value={`${r.decided}/${r.total}`} sub="decided / total" />
        <Kpi label="Capital deployed" value={usd(r.totalCapital)} />
        <Kpi label="Loss avoided" value={usd(r.totalLossAvoided)} tone="good" />
        <Kpi label="Capital efficiency" value={r.capitalEfficiency != null ? `${r.capitalEfficiency}×` : '—'} sub="loss avoided per $" tone="good" />
        {pvr && pvr.calibration != null && <Kpi label="Realized vs predicted" value={`${pvr.calibration}%`} sub="risk movement tracking" tone={pvr.calibration >= 85 ? 'good' : 'warn'} />}
      </div>

      {/* buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {d.buckets.map((b) => {
          const t = TREAT[b.treatment];
          return (
            <div key={b.treatment} style={{ border: `1px solid ${HAIR}`, borderTop: `3px solid ${t.c}`, borderRadius: 11, background: '#fff', padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.c, fontFamily: FONTS.display }}>{t.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: INK, marginTop: 2, fontFamily: FONTS.mono }}>{b.count}</div>
              <div style={{ fontSize: 10.5, color: INK3 }}>{b.decided} decided</div>
              <div style={{ marginTop: 7, display: 'grid', gap: 2, fontSize: 11, color: INK2 }}>
                <div>Capital <strong style={{ color: INK }}>{usd(b.capital)}</strong></div>
                <div>Loss avoided <strong style={{ color: TONE.good }}>{usd(b.lossAvoided)}</strong></div>
                <div>Efficiency <strong style={{ color: INK }}>{b.capitalEfficiency != null ? `${b.capitalEfficiency}×` : '—'}</strong></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* per-exposure rows */}
      <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr style={{ color: INK3, fontSize: 9.5, textTransform: 'uppercase', background: PANEL }}>
              {['Exposure', 'Treatment', 'Status', 'Capital', 'Loss avoided', 'Efficiency'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 10px' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {d.rows.map((row) => {
                const t = TREAT[row.treatment];
                return (
                  <tr key={row.id} style={{ borderTop: `1px solid ${HAIR}`, background: row.aboveAppetite ? '#fff8f6' : '#fff' }}>
                    <td style={{ padding: '8px 10px', color: INK }}>{row.title}{row.aboveAppetite ? <span style={{ fontSize: 9, color: SEV.Critical, fontWeight: 700 }}> · above appetite</span> : null}</td>
                    <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: t.c, borderRadius: 999, padding: '2px 8px' }}>{t.label}</span></td>
                    <td style={{ padding: '8px 10px', color: row.decided ? TONE.good : INK3 }}>{row.decided ? 'Decided' : 'Recommended'}</td>
                    <td style={{ padding: '8px 10px', color: INK2 }}>{usd(row.capital)}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: TONE.good }}>{usd(row.lossAvoided)}</td>
                    <td style={{ padding: '8px 10px', color: INK }}>{row.capitalEfficiency != null ? `${row.capitalEfficiency}×` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pvr && (
        <div style={{ fontSize: 11, color: INK2, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '9px 12px', lineHeight: 1.5 }}>
          <strong style={{ color: INK }}>Predicted vs realized:</strong> exposure reduced {usd(pvr.realizedExposureReduced)} realized / {usd(pvr.predictedExposureReduced)} predicted ({pvr.calibration != null ? `${pvr.calibration}% of projection` : 'n/a'}); loss avoided per $ {pvr.realizedRoi != null ? `${pvr.realizedRoi}× realized` : '—'} / {pvr.predictedRoi != null ? `${pvr.predictedRoi}× predicted` : '—'}. From the shared calibrated engine.
        </div>
      )}
    </div>
  );
}
function Kpi({ label, value, sub, tone }) {
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? TONE[tone] : '#cbd5e1'}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
      <div style={{ fontSize: 10.5, color: INK2 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: tone ? TONE[tone] : INK, marginTop: 2, fontFamily: FONTS.mono }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
