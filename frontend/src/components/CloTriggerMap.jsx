/**
 * CloTriggerMap — CLO Sub-tab 2 (priority): Trigger Map & Materiality.
 * For each top cyber scenario (SHARED events), the laws/clocks/contracts it would
 * fire + a materiality checklist from the live event. Click to drill into the
 * CISO technical lens and the CFO financial-materiality lens of the SAME event.
 * CLO options (pre-stage notification, legal hold, regulator engagement) write to
 * the shared ledger; the "monitor" acceptance is litigation-discoverable, so the
 * rationale prompt steers toward defensible reasoning.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { DefensibleRationaleHint, DEFENSIBLE_PLACEHOLDER } from './legalRationale';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, NAVY = COLORS.navy1;
const SEV = { Critical: COLORS.bad, High: '#A85B2E', Medium: COLORS.warn, Low: COLORS.good };
const LIT = { High: COLORS.bad, Elevated: COLORS.warn, Moderate: COLORS.good };
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
const Pill = ({ text, color }) => <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: color, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{text}</span>;
const STAT = (s) => (/^yes/i.test(s) ? '#1f8a4c' : /^no/i.test(s) ? '#C0392B' : /likely/i.test(s) ? '#B07C2E' : '#94a3b8');

export default function CloTriggerMap(props) {
  const role = 'CLO';
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState(null);
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  const load = useCallback(() => {
    fetch(`${api}/api/clo/triggers?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);
  useEffect(() => { load(); }, [load]);

  function choose(scn, opt, rationale) {
    const action = opt.id === 'accept' ? 'accept' : 'select';
    fetch(`${api}/api/decisions/${encodeURIComponent(scn.id)}/decision`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ org_id: orgId, role, action, optionId: opt.id, rationale: rationale || null, decidedBy: 'General Counsel', engineState: { title: scn.title, firedObligations: scn.firedObligations, materiality: scn.materiality, option: opt.label } }),
    }).then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!ok) setErr(j.error || 'Could not record.'); else { setErr(null); load(); } })
      .catch((e) => setErr(e.message));
  }

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Building the trigger map…</div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {d.provenance && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, fontSize: 10, color: '#94a3b8', marginBottom: -4 }}><Provenance prov={d.provenance} /><span>data provenance</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, background: NAVY, color: '#e6ecf5', borderRadius: 10, padding: '13px 16px' }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          {d.counts.scenarios} top scenario(s) would fire <strong style={{ color: '#9bc0ff' }}>{d.counts.obligationsFired}</strong> distinct obligation(s); <strong style={{ color: '#f0a868' }}>{d.counts.material}</strong> screen as potentially material. Each is the <strong>same event</strong> the CISO and CFO see.
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(d.narration)} label="Listen" />
      </div>
      {err && <div style={{ color: '#C0392B', fontSize: 12 }}>{err}</div>}

      <div style={{ display: 'grid', gap: 11 }}>
        {d.scenarios.map((s) => {
          const isOpen = open === s.id; const sev = SEV[s.severity] || INK3;
          return (
            <div key={s.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${s.materiality.material ? SEV.Critical : sev}`, borderRadius: 11, background: '#fff' }}>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill text={s.scenarioType} color={sev} />
                      {s.materiality.material && <Pill text="Potentially material" color={SEV.Critical} />}
                      <Pill text={`Litigation ${s.projection.litigationLikelihood}`} color={LIT[s.projection.litigationLikelihood]} />
                      {s.decision && <Pill text="Decided" color="#1f8a4c" />}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: FONTS.display, color: INK, marginTop: 6 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>Data at risk: {s.dataAtRisk} · nearest deadline: <strong>{s.projection.nearestDeadline}</strong></div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase' }}>P90 loss</div>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FONTS.mono, color: sev }}>{usd(s.loss.p90)}</div>
                  </div>
                </div>

                {/* fired obligations */}
                <div style={{ marginTop: 9 }}>
                  <Label>Laws / clocks / contracts this would fire</Label>
                  {s.firedObligations.length ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {s.firedObligations.map((f, i) => (
                        <span key={i} title={`${f.jurisdiction} — ${f.trigger}`} style={{ fontSize: 10.5, color: '#5b3a1e', background: '#fbf3df', border: '1px solid #f0dcae', borderRadius: 6, padding: '3px 9px' }}>{f.obligation} <strong>· {f.clockLabel}</strong></span>
                      ))}
                    </div>
                  ) : <div style={{ fontSize: 11, color: INK3 }}>No statutory clock fires on the current data mapping — confirm contractual SLAs with counsel.</div>}
                </div>

                <button onClick={() => setOpen(isOpen ? null : s.id)} style={{ marginTop: 9, background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{isOpen ? '▲ Hide materiality, cross-lens & legal moves' : '▼ Materiality checklist · CISO/CFO lenses · legal moves'}</button>
              </div>

              {isOpen && (
                <div style={{ borderTop: `1px solid ${HAIR}`, padding: '12px 14px', background: PANEL, display: 'grid', gap: 12 }}>
                  {/* materiality checklist */}
                  <div>
                    <Label>Materiality checklist (from the live event)</Label>
                    <div style={{ display: 'grid', gap: 5 }}>
                      {s.materiality.items.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5, borderBottom: `1px solid #fff`, paddingBottom: 3 }}>
                          <span style={{ color: INK }}>{m.item} <span style={{ color: INK3, fontSize: 10 }}>— {m.note}</span></span>
                          <strong style={{ color: STAT(m.status), whiteSpace: 'nowrap' }}>{m.status}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* cross-lens */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {s.technical && (
                      <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '10px 12px' }}>
                        <Label>🛡 CISO lens — technical event</Label>
                        <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{s.technical.headline}</div>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginTop: 5 }}>
                          {(s.technical.attackPath || []).map((st, i) => (
                            <React.Fragment key={i}>
                              <span style={{ fontSize: 10, color: INK, background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '2px 6px' }}>{st.label}</span>
                              {i < s.technical.attackPath.length - 1 && <span style={{ color: '#C0392B', fontWeight: 800 }}>→</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.financialMateriality && (
                      <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '10px 12px' }}>
                        <Label>💰 CFO lens — financial materiality</Label>
                        <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{s.financialMateriality.headline}</div>
                        {s.financialMateriality.primary && <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>{s.financialMateriality.primary.label}: <strong>{s.financialMateriality.primary.value}</strong></div>}
                        <div style={{ fontSize: 11, color: INK2, marginTop: 4, lineHeight: 1.5 }}>{s.financialMateriality.narrative}</div>
                      </div>
                    )}
                  </div>
                  {/* legal moves → ledger */}
                  <div>
                    <Label>First legal moves (logged to the shared ledger)</Label>
                    <LegalOptions scn={s} onChoose={choose} />
                    {s.decision && <div style={{ marginTop: 8, fontSize: 11, color: INK2, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 8, padding: '8px 12px' }}><strong style={{ color: '#1f8a4c' }}>Logged:</strong> {s.decision.optionId} by {s.decision.decidedBy || 'General Counsel'}{s.decision.rationale ? ` — "${s.decision.rationale}"` : ''}.</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: '#7a5b1e', background: '#fbf3df', border: '1px solid #f0dcae', borderRadius: 8, padding: '8px 11px' }}><strong>⚖️</strong> {d.legalCaveat}</div>
    </div>
  );
}

function LegalOptions({ scn, onChoose }) {
  const [accepting, setAccepting] = useState(false);
  const [rationale, setRationale] = useState('');
  if (scn.decision) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))', gap: 9 }}>
      {scn.options.map((o) => {
        const isRec = o.id === scn.recommended;
        return (
          <div key={o.id} style={{ border: `1px solid ${isRec ? '#4f46e5' : HAIR}`, borderRadius: 9, padding: '10px 12px', background: '#fff' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{o.label}{isRec && <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', background: '#4f46e5', borderRadius: 999, padding: '1px 6px', marginLeft: 5 }}>REC</span>}</div>
            <div style={{ fontSize: 10, color: INK3, marginTop: 5, lineHeight: 1.45 }}>{o.note}</div>
            {o.id === 'accept'
              ? <button onClick={() => setAccepting(!accepting)} style={btn('#94a3b8')}>Monitor — document…</button>
              : <button onClick={() => onChoose(scn, o)} style={btn(isRec ? '#4f46e5' : '#0f172a')}>Choose</button>}
            {accepting && o.id === 'accept' && (
              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                <DefensibleRationaleHint compact />
                <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3} placeholder={DEFENSIBLE_PLACEHOLDER}
                  style={{ width: '100%', border: `1px solid ${HAIR}`, borderRadius: 7, padding: '7px 9px', fontSize: 11.5, outline: 'none', resize: 'vertical' }} />
                <button onClick={() => onChoose(scn, o, rationale)} disabled={!rationale.trim()} style={{ ...btn('#1f8a4c'), opacity: rationale.trim() ? 1 : 0.5 }}>Record decision (logged & discoverable)</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
const Label = ({ children }) => <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', marginBottom: 5 }}>{children}</div>;
const btn = (bg) => ({ marginTop: 9, width: '100%', background: bg, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' });
