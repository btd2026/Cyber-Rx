/**
 * CioFrictionMap — CIO Sub-tab 3 (priority): Velocity-vs-Risk Friction Map.
 * For each delivery initiative, shows where security requirements create friction
 * and quantifies the tradeoff: ship-on-time (days saved + expected-loss/risk delta)
 * vs secure-by-design (cost + days) vs a phased middle. The risk traded is a
 * SHARED event; selecting a tradeoff writes to the shared decision ledger.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { DefensibleRationaleHint, DEFENSIBLE_PLACEHOLDER } from './legalRationale';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const SEV = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };
const FRIC = { None: COLORS.good, Low: COLORS.good, Medium: COLORS.warn, High: COLORS.bad };
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

export default function CioFrictionMap(props) {
  const role = 'CIO';
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  const load = useCallback(() => {
    fetch(`${api}/api/cio/friction?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);
  useEffect(() => { load(); }, [load]);

  function choose(item, opt, rationale) {
    // ship-on-time defers a control = accepting a risk delta (needs rationale);
    // secure/phased are an active selection. Same ledger as every decision.
    const action = opt.id === 'ship' ? 'accept' : 'select';
    fetch(`${api}/api/decisions/${encodeURIComponent(item.id)}/decision`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ org_id: orgId, role, action, optionId: opt.id, rationale: rationale || null, decidedBy: role, engineState: { initiative: item.initiative, tradeoff: item.tradeoff, linkedRisks: item.linkedRisks, option: opt.label } }),
    }).then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!ok) setErr(j.error || 'Could not record the tradeoff.'); else { setErr(null); load(); } })
      .catch((e) => setErr(e.message));
  }

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Building the velocity-vs-risk map…</div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#8b9098', marginBottom: -4 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, background: COLORS.subtle, border: `1px solid ${COLORS.hair}`, color: COLORS.ink2, borderRadius: 10, padding: '13px 16px' }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          Where security requirements meet delivery dates. Shipping every initiative as-is would leave <strong style={{ color: COLORS.warn }}>{usd(d.totalLossOnTable)}</strong> of expected loss on the table. Each tradeoff is the <strong>same shared risk</strong> the security team sees, and every choice is logged.
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>
      {err && <div style={{ color: '#cf222e', fontSize: 12 }}>{err}</div>}

      <div style={{ display: 'grid', gap: 14 }}>
        {d.initiatives.map((it) => <FrictionCard key={it.id} item={it} onChoose={choose} voice={voice} />)}
      </div>
    </div>
  );
}

function FrictionCard({ item, onChoose, voice }) {
  const [accepting, setAccepting] = useState(false);
  const [rationale, setRationale] = useState('');
  const decided = item.decision;
  const t = item.tradeoff;
  const narr = `${item.initiative}. Security friction: ${item.frictionPoints.join(', ')}. ` +
    `Shipping on time saves about ${t.daysSaved} days but adds roughly ${usd(t.expectedLossAdded)} expected loss and ${t.residualRiskAddedPct} percent residual risk on ${item.linkedRisks.map((r) => r.title).join(', ') || 'the linked exposure'}. ` +
    `Secure-by-design costs about ${usd(t.secureCost)} and ${t.daysSaved} days, avoiding that loss. Recommended: ${item.recommended}.`;

  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>{item.initiative}</div>
            {item.objective && <div style={{ fontSize: 11, color: INK2, marginTop: 2 }}>{item.objective}</div>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5, color: INK3, marginTop: 5 }}>
              <span>Owner <strong style={{ color: INK2 }}>{item.owner}</strong></span>
              <span>{item.percentComplete}% complete</span>
              <span>{item.status}</span>
            </div>
          </div>
          {voice && <VoiceControls voice={voice} onReplay={() => voice.speak(narr)} label="Listen" />}
        </div>

        {/* friction points + linked shared risks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
          <div>
            <Label>Security friction points</Label>
            <ul style={{ margin: 0, paddingLeft: 16 }}>{item.frictionPoints.map((f, i) => <li key={i} style={{ fontSize: 11, color: INK2, lineHeight: 1.5 }}>{f}</li>)}</ul>
          </div>
          <div>
            <Label>Risk traded (shared events)</Label>
            {item.linkedRisks.length ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{item.linkedRisks.map((r, i) => <span key={i} style={{ fontSize: 11, color: '#1c1f26', background: '#eaf1fb', border: '1px solid #cfe0f5', borderRadius: 6, padding: '3px 9px' }}>{r.title}{r.severity ? <span style={{ color: INK3 }}> · {r.severity}</span> : null}</span>)}</div>
              : <div style={{ fontSize: 11, color: INK3 }}>No directly-linked register risk — exposure modeled from the initiative domain.</div>}
          </div>
        </div>
      </div>

      {/* the tradeoff bar */}
      <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}`, background: PANEL }}>
        <Tradeoff label="Ship on time" tone="#cf222e" lines={[`+${usd(t.expectedLossAdded)} expected loss`, `+${t.residualRiskAddedPct}% residual risk`, `saves ~${t.daysSaved} days`]} />
        <Tradeoff label="Secure-by-design" tone="#1a7f37" lines={[`${usd(t.secureCost)} cost`, `~${t.daysSaved} days added`, `avoids ${usd(t.expectedLossAdded)} loss`]} />
        <Tradeoff label="Net (secure)" tone={t.netSecureValue >= 0 ? '#1a7f37' : '#9a6700'} lines={[`${t.netSecureValue >= 0 ? '+' : ''}${usd(t.netSecureValue)}`, 'loss avoided − cost', t.netSecureValue >= 0 ? 'secure pays off' : 'phase it']} />
      </div>

      {/* options → ledger */}
      <div style={{ padding: '11px 16px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 9 }}>
          {item.options.map((o) => {
            const isRec = o.id === item.recommended;
            const isChosen = decided && decided.optionId === o.id;
            return (
              <div key={o.id} style={{ border: `1px solid ${isChosen ? '#1a7f37' : isRec ? '#5e6ad2' : HAIR}`, borderRadius: 9, padding: '10px 12px', background: isChosen ? '#f0f7f2' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{o.label}</span>
                  {isRec && !decided && <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', background: '#5e6ad2', borderRadius: 999, padding: '2px 7px', textTransform: 'uppercase' }}>Rec</span>}
                </div>
                <div style={{ fontSize: 10, color: INK3, marginTop: 6, lineHeight: 1.45 }}>{o.note}</div>
                {!decided && (o.id === 'ship'
                  ? <button onClick={() => setAccepting(accepting === o.id ? null : o.id)} style={btn(INK3)}>Ship on time…</button>
                  : <button onClick={() => onChoose(item, o)} style={btn(isRec ? '#5e6ad2' : '#0b0c0e')}>Choose</button>)}
                {accepting === o.id && !decided && o.id === 'ship' && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ marginBottom: 6 }}><DefensibleRationaleHint compact /></div>
                    <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3} placeholder={DEFENSIBLE_PLACEHOLDER}
                      style={{ width: '100%', border: `1px solid ${HAIR}`, borderRadius: 7, padding: '7px 9px', fontSize: 11.5, outline: 'none', resize: 'vertical' }} />
                    <button onClick={() => onChoose(item, o, rationale)} disabled={!rationale.trim()} style={{ ...btn('#cf222e'), opacity: rationale.trim() ? 1 : 0.5, marginTop: 6 }}>Record ship-on-time</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {decided && (
          <div style={{ marginTop: 10, fontSize: 11, color: INK2, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 8, padding: '8px 12px' }}>
            <strong style={{ color: '#1a7f37' }}>Logged:</strong> {decided.optionId === 'ship' ? 'Ship on time (risk delta accepted)' : decided.optionId === 'secure' ? 'Secure-by-design' : 'Phased'} by {decided.decidedBy || 'CIO'}{decided.rationale ? ` — "${decided.rationale}"` : ''} ({new Date(decided.at).toLocaleString()}).
          </div>
        )}
      </div>
    </div>
  );
}

const Label = ({ children }) => <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginBottom: 5 }}>{children}</div>;
function Tradeoff({ label, tone, lines }) {
  return (
    <div style={{ flex: 1, padding: '10px 14px', borderRight: `1px solid ${HAIR}` }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: tone, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {lines.map((l, i) => <div key={i} style={{ fontSize: i === 0 ? 13 : 10.5, fontWeight: i === 0 ? 800 : 500, color: i === 0 ? INK : INK2, marginTop: i === 0 ? 3 : 1, fontFamily: i === 0 ? FONTS.mono : undefined }}>{l}</div>)}
    </div>
  );
}
const btn = (bg) => ({ marginTop: 9, width: '100%', background: bg, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' });
