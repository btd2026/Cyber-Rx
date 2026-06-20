/**
 * CloPortfolio — CLO Sub-tab 4: Regulatory & Litigation Portfolio.
 * Open matters, contractual remediation, and compliance initiatives with status
 * and exposure-reduction, predicted vs realized from the shared calibrated engine.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
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

export default function CloPortfolio(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/clo/portfolio?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Building the regulatory & litigation portfolio…</div>;
  const r = d.rollup;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#8b9098', marginBottom: -4 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Regulatory & litigation portfolio</div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 10 }}>
        <Kpi label="Open matters" value={`${r.openMatters}`} />
        <Kpi label="Contractual items" value={`${r.contractualItems}`} />
        <Kpi label="Compliance initiatives" value={`${r.initiatives}`} />
        <Kpi label="Exposure reduced" value={`${usd(r.realizedExposureReduced)} / ${usd(r.predictedExposureReduced)}`} sub="realized / predicted" tone="good" />
        {r.calibration != null && <Kpi label="Calibration" value={`${r.calibration}%`} sub="realized vs projection" tone={r.calibration >= 85 ? 'good' : 'warn'} />}
      </div>

      <Panel title="Open matters">
        <Table cols={['Matter', 'Type', 'Status', 'Exposure', 'Clock']} rows={d.matters.map((m) => [m.name + (m.modeled ? ' ·modeled' : ''), m.type, m.status, usd(m.exposure), m.clock])} />
      </Panel>
      <Panel title="Contractual remediation">
        <Table cols={['Item', 'Status', 'Exposure reduction']} rows={d.contractual.map((c) => [c.item + (c.modeled ? ' ·modeled' : ''), c.status, c.exposureReduction ? usd(c.exposureReduction) : '—'])} />
      </Panel>

      <Panel title="Compliance initiatives — predicted vs realized">
        <div style={{ display: 'grid', gap: 9 }}>
          {d.complianceInitiatives.map((it) => (
            <div key={it.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 9, background: '#fff', padding: '10px 13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{it.name}</span>
                <span style={{ fontSize: 10, color: '#4f5ac4', background: '#eef0fb', border: '1px solid #dfe1e6', borderRadius: 999, padding: '2px 8px' }}>{it.category}</span>
              </div>
              <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>{it.owner} · {it.percentComplete}% · {it.status}</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: INK2, marginTop: 6 }}>
                <span>Exposure reduced <strong style={{ color: TONE.good }}>{usd(it.realized.exposureReduced)}</strong> / {usd(it.predicted.exposureReduced)} <span style={{ color: INK3 }}>realized/pred</span></span>
                {it.reducesRisks && it.reducesRisks.length > 0 && <span style={{ color: INK3 }}>Reduces: {it.reducesRisks.map((x) => x.title).join(', ')}</span>}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div style={{ fontSize: 10, color: INK3 }}>{d.note}</div>
    </div>
  );
}
function Kpi({ label, value, sub, tone }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? TONE[tone] : '#d7d9de'}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}><div style={{ fontSize: 10.5, color: INK2 }}>{label}</div><div style={{ fontSize: 18, fontWeight: 800, fontFamily: FONTS.mono, color: tone ? TONE[tone] : INK, marginTop: 2 }}>{value}</div>{sub && <div style={{ fontSize: 10, color: INK3, marginTop: 1 }}>{sub}</div>}</div>;
}
function Panel({ title, children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}><div style={{ fontSize: 12.5, fontWeight: 800, fontFamily: FONTS.display, color: INK, marginBottom: 9 }}>{title}</div>{children}</div>;
}
function Table({ cols, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead><tr style={{ color: INK3, fontSize: 9.5, textTransform: 'uppercase' }}>{cols.map((c) => <th key={c} style={{ textAlign: 'left', padding: '6px 8px' }}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} style={{ borderTop: `1px solid ${HAIR}` }}>{r.map((cell, j) => <td key={j} style={{ padding: '7px 8px', color: j === 0 ? INK : INK2 }}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
