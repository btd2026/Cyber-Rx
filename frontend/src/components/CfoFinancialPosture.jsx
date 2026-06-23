/**
 * CfoFinancialPosture — CFO Sub-tab 1: Financial Position (Current State).
 * The dollar size of cyber risk on the balance sheet: net/gross/insurance, where
 * exposure concentrates across crown-jewel apps, quantified loss scenarios, the
 * return security spend produces, what changed, a finance-language brief with
 * voice, and visibility confidence. Auto-derived from the shared substrate.
 * Backend: GET /api/cfo/posture.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import NarrativeSection from './NarrativeSection';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const TONE = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const scoreBand = (s) => (s >= 80 ? 'good' : s >= 55 ? 'warn' : 'bad');

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function CfoFinancialPosture(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/cfo/posture?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Composing the financial position…</div>;
  const maxApp = Math.max(1, ...(d.byApp || []).map((a) => a.weightedExposure || 0));

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 28 }}>
      {/* 01 — The lede: cyber risk on the balance sheet, in a sentence */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, background: COLORS.subtle, border: `1px solid ${COLORS.hair}`, color: COLORS.ink2, borderRadius: 10, padding: '14px 16px' }}>
        <div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <Score label="Financial posture" value={d.overall} />
            <Stat label="Net retained" value={usd(d.netExposure)} color={TONE.bad} />
            <Stat label="Insured" value={`${d.coverageRatio}%`} color={TONE.good} />
            {d.assessmentScore != null && <Stat label="Assessment" value={d.assessmentScore} />}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{d.brief}</div>
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration || d.brief)} label="Listen" />
      </div>

      {/* 02 — Where the exposure concentrates */}
      {(d.byApp || []).length > 0 && (
        <NarrativeSection step={2} kicker="Concentration" title="Where the exposure concentrates"
          lede="Net exposure isn't spread evenly — it's allocated to applications by business criticality. These crown jewels carry the largest share, so this is where a dollar of risk reduction goes furthest.">
          <Card>
            {d.byApp.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ width: 180, fontSize: 12, color: INK, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <div style={{ flex: 1, height: 8, background: '#f0f1f4', borderRadius: 4 }}><div style={{ width: `${Math.round((a.weightedExposure / maxApp) * 100)}%`, height: '100%', background: TONE.bad, borderRadius: 4 }} /></div>
                <span style={{ width: 64, textAlign: 'right', fontSize: 11.5, fontWeight: 700, color: INK, fontFamily: FONTS.mono }}>{usd(a.weightedExposure)}</span>
              </div>
            ))}
          </Card>
        </NarrativeSection>
      )}

      {/* 03 — If it goes wrong, how much? */}
      <NarrativeSection step={3} kicker="Quantified loss" title="If it goes wrong, how much?"
        lede="Each scenario is sized FAIR-style — annual likelihood × loss magnitude. Annualized loss is what to reserve against; single loss is the hit if it lands once.">
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead><tr style={{ color: INK3, fontSize: 9.5, textTransform: 'uppercase' }}>
                {['Loss scenario', 'Annual likelihood', 'Single loss', 'Annualized loss'].map((h) => <th key={h} style={{ textAlign: h === 'Loss scenario' ? 'left' : 'right', padding: '6px 8px' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {d.lossScenarios.map((s, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${HAIR}` }}>
                    <td style={{ padding: '7px 8px', color: INK, fontWeight: 600 }}>{s.scenario}</td>
                    <td style={{ padding: '7px 8px', color: INK2, textAlign: 'right' }}>{s.freq}%</td>
                    <td style={{ padding: '7px 8px', color: INK2, textAlign: 'right', fontFamily: FONTS.mono }}>{usd(s.sle)}</td>
                    <td style={{ padding: '7px 8px', fontWeight: 700, color: i === 0 ? TONE.bad : INK, textAlign: 'right', fontFamily: FONTS.mono }}>{usd(s.ale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(d.topDollarRisks || []).length > 0 && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${HAIR}`, paddingTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Top open risks by dollar exposure</div>
              {d.topDollarRisks.map((x, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11.5, padding: '3px 0' }}>
                  <span style={{ flex: 1, color: INK }}>{x.name} <span style={{ color: INK3 }}>· {x.severity} · {x.owner}</span></span>
                  <span style={{ fontWeight: 700, color: TONE.bad, fontFamily: FONTS.mono }}>{usd(x.exposure)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </NarrativeSection>

      {/* 04 — What a dollar of security buys */}
      <NarrativeSection step={4} kicker="Return on spend" title="What a dollar of security buys"
        lede="The case for the budget: gross exposure already bought down, what it cost, and the exposure retired per dollar invested — the figure that defends the program at the board.">
        <Card>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Stat label="Exposure removed" value={usd(d.removed)} color={TONE.good} />
            <Stat label="Cost to remediate" value={d.costToRemediate > 0 ? usd(d.costToRemediate) : '—'} />
            <Stat label="Bought down per $" value={d.riskReducedPerDollar != null ? `$${d.riskReducedPerDollar}` : '—'} color={TONE.good} />
            <Stat label="Annualized loss expectancy" value={usd(d.ale)} />
          </div>
          {d.riskReducedPerDollar == null && <div style={{ fontSize: 10.5, color: INK3, marginTop: 8 }}>Connect remediation-cost data to compute exposure bought down per dollar.</div>}
        </Card>
      </NarrativeSection>

      {/* 05 — What moved */}
      <NarrativeSection step={5} kicker="Since last period" title="What moved"
        lede="The shifts that changed the financial picture above since the last read.">
        <Card>
          <div style={{ display: 'grid', gap: 6 }}>
            {d.whatChanged.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12, color: INK2 }}>
                <span style={{ color: w.dir === 'up' ? TONE.good : w.dir === 'down' ? TONE.bad : INK3, fontWeight: 800 }}>{w.dir === 'up' ? '▲' : w.dir === 'down' ? '▼' : '▬'}</span>
                <span>{w.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </NarrativeSection>

      {/* 06 — How much to trust this read */}
      {d.visibility && (
        <NarrativeSection step={6} kicker="Visibility" title="How much to trust this read"
          lede="Every dollar figure above rests on the exposure model and the inputs behind it. Here's the confidence in what we can see.">
          <Card>
            <div style={{ fontSize: 12, color: INK2 }}>Overall <strong style={{ color: INK }}>{d.visibility.overall || d.visibility.band}</strong>{d.visibility.caveat ? <span style={{ color: INK3 }}> — {d.visibility.caveat}</span> : null}</div>
            {d.note && <div style={{ fontSize: 10, color: INK3, marginTop: 6 }}>{d.note}</div>}
          </Card>
        </NarrativeSection>
      )}
    </div>
  );
}

function Score({ label, value }) {
  const c = TONE[scoreBand(value)];
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: c, fontFamily: FONTS.mono }}>{value}</div>
      <div style={{ fontSize: 9, color: COLORS.accentText, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
    </div>
  );
}
function Stat({ label, value, color }) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 12px', minWidth: 96 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || INK, fontFamily: FONTS.mono }}>{value}</div>
      <div style={{ fontSize: 9, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}
function Card({ children }) {
  return <div style={{ border: `1px solid ${HAIR}`, borderRadius: 11, background: '#fff', padding: '13px 16px' }}>{children}</div>;
}
