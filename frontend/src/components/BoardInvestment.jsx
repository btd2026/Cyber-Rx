/**
 * BoardInvestment — Board Sub-tab 4: Investment & ROI (capital oversight).
 * Are we investing where the expected loss is highest? Investment alignment of
 * the portfolio against the top exposures, plus predicted-vs-realized and
 * loss-avoided-per-dollar from the shared calibrated engine.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const SEV = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };
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

export default function BoardInvestment(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/board/investment?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Reviewing capital allocation…</div>;
  const r = d.rollup;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#8b9098', marginBottom: -4 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Investment & ROI — capital oversight</div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 10 }}>
        <Kpi label="Investment alignment" value={`${r.alignment}%`} sub={`${r.fundedTopExposures}/${r.topExposureCount} top exposures funded`} tone={r.alignment >= 60 ? 'good' : r.alignment >= 30 ? 'warn' : 'bad'} />
        <Kpi label="Total investment" value={usd(r.totalBudget)} />
        <Kpi label="Loss avoided / $" value={r.blendedRoi != null ? `${r.blendedRoi}×` : '—'} sub={r.realizedRoi != null ? `${r.realizedRoi}× realized` : 'predicted'} tone="good" />
        <Kpi label="Exposure reduced" value={`${usd(r.realizedExposureReduced)} / ${usd(r.predictedExposureReduced)}`} sub="realized / predicted" tone="good" />
        {r.calibration != null && <Kpi label="Engine calibration" value={`${r.calibration}%`} sub="realized vs projection" tone={r.calibration >= 85 ? 'good' : 'warn'} />}
      </div>

      {/* are the biggest exposures funded? */}
      <Panel title="Are we spending where the loss is? — top exposures vs funding">
        <div style={{ display: 'grid', gap: 7 }}>
          {d.topExposures.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderLeft: `4px solid ${e.funded ? TONE.good : TONE.bad}`, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ fontSize: 12, color: INK, fontWeight: 600 }}>{e.title} <span style={{ color: INK3, fontSize: 10.5 }}>· {e.severity}</span></span>
              <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: INK2 }}>{usd(e.expectedLoss)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: e.funded ? TONE.good : TONE.bad, borderRadius: 999, padding: '2px 9px' }}>{e.funded ? 'Funded' : 'Unfunded'}</span>
              </span>
            </div>
          ))}
        </div>
        {r.alignment < 60 && <div style={{ fontSize: 11, color: TONE.warn, marginTop: 8 }}>Capital is not fully aligned to the largest exposures — a question to put to management.</div>}
      </Panel>

      {/* portfolio */}
      <Panel title="Portfolio — predicted vs realized">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr style={{ color: INK3, fontSize: 9.5, textTransform: 'uppercase' }}>{['Initiative', 'Status', 'Budget', 'Predicted', 'Realized', 'Per $'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}</tr></thead>
            <tbody>
              {d.projects.map((p, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${HAIR}` }}>
                  <td style={{ padding: '7px 8px', color: INK, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '7px 8px', color: INK2 }}>{p.percentComplete}% · {p.status}</td>
                  <td style={{ padding: '7px 8px', color: INK2 }}>{usd(p.budget)}</td>
                  <td style={{ padding: '7px 8px', color: INK2 }}>{usd(p.predicted)}</td>
                  <td style={{ padding: '7px 8px', fontWeight: 700, color: TONE.good }}>{usd(p.realized)}</td>
                  <td style={{ padding: '7px 8px', color: INK }}>{p.roi != null ? `${p.roi}×` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
function Kpi({ label, value, sub, tone }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? TONE[tone] : '#d7d9de'}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}><div style={{ fontSize: 10.5, color: INK2 }}>{label}</div><div style={{ fontSize: 18, fontWeight: 800, fontFamily: FONTS.mono, color: tone ? TONE[tone] : INK, marginTop: 2 }}>{value}</div>{sub && <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>{sub}</div>}</div>;
}
function Panel({ title, children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}><div style={{ fontSize: 12.5, fontWeight: 800, fontFamily: FONTS.display, color: INK, marginBottom: 9 }}>{title}</div>{children}</div>;
}
