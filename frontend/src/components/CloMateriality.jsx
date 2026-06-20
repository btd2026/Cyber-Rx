/**
 * CloMateriality — SEC cyber-incident materiality determination & 8-K Item 1.05
 * workflow. Screened scenarios become candidates; counsel records a determination
 * (with rationale → tamper-evident ledger), the 4-business-day clock starts on a
 * material determination, and a draft 8-K + disclosure package can be exported.
 * Decision-support only — not legal advice.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import Provenance from './Provenance';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, NAVY = COLORS.navy1;
const SEV = { Critical: COLORS.bad, High: '#A85B2E', Medium: COLORS.warn, Low: COLORS.good };
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };
const DET = { material: { label: 'Material', color: '#C0392B' }, not_material: { label: 'Not material', color: '#1f8a4c' }, pending: { label: 'Pending', color: '#B07C2E' } };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

const daysUntil = (iso) => { if (!iso) return null; return Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5); };

export default function CloMateriality(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ determination: '', rationale: '', factors: {} });
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const load = useCallback(() => {
    fetch(`${api}/api/clo/materiality?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j); }).catch(() => {});
  }, [api, orgId, headers]);
  useEffect(() => { load(); }, [load]);

  function openAssess(c) {
    setOpen(open === c.eventRef ? null : c.eventRef); setDraft(null); setErr(null);
    const a = c.assessment || {};
    setForm({ determination: a.determination || '', rationale: a.rationale || '', factors: a.factors || {} });
  }
  const setFactor = (id, v) => setForm((f) => ({ ...f, factors: { ...f.factors, [id]: v } }));

  function save(c) {
    if (!form.determination) { setErr('Choose a determination.'); return; }
    if (!form.rationale.trim()) { setErr('A documented rationale is required.'); return; }
    setBusy(true); setErr(null);
    fetch(`${api}/api/clo/materiality`, { method: 'POST', headers: headers(), body: JSON.stringify({
      org_id: orgId, eventRef: c.eventRef, title: c.title, determination: form.determination, rationale: form.rationale, factors: form.factors, decidedBy: 'CLO',
      quant: { lossExpected: c.lossExpected, lossP90: c.lossP90, scenarioType: c.scenarioType },
    }) }).then((r) => r.json()).then((res) => { if (res.error) setErr(res.error); else { setOpen(null); load(); } }).catch((e) => setErr(e.message)).finally(() => setBusy(false));
  }

  function loadDraft(id) { setDraft({ loading: true }); fetch(`${api}/api/clo/materiality/${id}/draft-8k?org_id=${encodeURIComponent(orgId)}`, { headers: headers() }).then((r) => r.json()).then(setDraft).catch((e) => setDraft({ draft: e.message })); }

  if (!d) return <div style={{ fontSize: 12, color: INK3 }}>Loading materiality workflow…</div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, background: NAVY, color: '#e6ecf5', borderRadius: 10, padding: '13px 16px' }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          {d.provenance && <Provenance prov={d.provenance} dark />}
          <span><strong style={{ color: COLORS.accent }}>SEC materiality & 8-K Item 1.05.</strong> {d.counts.determined} determination(s) on record, {d.counts.material} material. Materiality threshold {usd(d.thresholdUSD)}.</span>
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(`SEC materiality workflow. ${d.candidates.length} candidate incidents. ${d.counts.material} determined material. A material determination starts the four business day 8-K clock.`)} label="Listen" />
      </div>

      <div style={{ fontSize: 10.5, color: INK2, background: '#fff7ed', border: '1px solid #f3d9b8', borderRadius: 8, padding: '8px 12px' }}>{d.disclaimer}</div>
      {err && <div style={{ color: '#C0392B', fontSize: 12 }}>{err}</div>}

      <div style={{ display: 'grid', gap: 10 }}>
        {d.candidates.length === 0 && <div style={{ fontSize: 12, color: INK3 }}>No candidate incidents currently screened.</div>}
        {d.candidates.map((c) => {
          const a = c.assessment; const det = a && DET[a.determination];
          const days = a && a.filingDeadline ? daysUntil(a.filingDeadline) : null;
          const isOpen = open === c.eventRef;
          return (
            <div key={c.eventRef} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${SEV[c.severity] || INK3}`, borderRadius: 10, background: '#fff', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, fontFamily: FONTS.display, color: INK }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>
                    Modeled loss <strong>{usd(c.lossExpected)}</strong> (P90 {usd(c.lossP90)}) · {c.quantExceeds ? <span style={{ color: '#C0392B', fontWeight: 700 }}>exceeds threshold</span> : 'below threshold'}
                    {c.screenedMaterial && <span style={{ color: '#B07C2E', fontWeight: 700 }}> · screens material</span>}
                    {c.dataAtRisk && <span> · data: {c.dataAtRisk}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 150 }}>
                  {det
                    ? <><span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: det.color, borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase' }}>{det.label}</span>
                        {days != null && <div style={{ fontSize: 10.5, color: days <= 1 ? '#C0392B' : INK2, marginTop: 4 }}>8-K due {new Date(a.filingDeadline).toLocaleDateString()} · {days}d left</div>}</>
                    : <span style={{ fontSize: 10.5, color: INK3 }}>Not yet determined</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                <button onClick={() => openAssess(c)} style={btn('#0f1b2d')}>{isOpen ? 'Close' : a ? 'Revise determination' : 'Make determination'}</button>
                {a && <button onClick={() => loadDraft(a.id)} style={btn('#fff', INK2)}>Draft 8-K</button>}
                {a && <a href={`${api}/api/clo/materiality/${a.id}/package?org_id=${encodeURIComponent(orgId)}`} style={{ ...btn('#fff', INK2), textDecoration: 'none', display: 'inline-block' }}>⤓ Disclosure package</a>}
              </div>

              {isOpen && (
                <div style={{ marginTop: 11, background: PANEL, borderRadius: 8, padding: '11px 13px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: INK, marginBottom: 7 }}>Materiality factors (the "total mix")</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {d.factors.map((f) => (
                      <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11.5, color: INK2 }}>{f.label}</span>
                        <span style={{ display: 'flex', gap: 4 }}>
                          {['yes', 'no', 'unknown'].map((v) => (
                            <button key={v} onClick={() => setFactor(f.id, v)} style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                              border: `1px solid ${form.factors[f.id] === v ? '#0f1b2d' : HAIR}`, background: form.factors[f.id] === v ? '#0f1b2d' : '#fff', color: form.factors[f.id] === v ? '#fff' : INK2 }}>{v}</button>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {Object.keys(DET).map((k) => (
                      <button key={k} onClick={() => setForm((f) => ({ ...f, determination: k }))} style={{ fontSize: 11, fontWeight: 700, borderRadius: 7, padding: '6px 12px', cursor: 'pointer',
                        border: `1px solid ${form.determination === k ? DET[k].color : HAIR}`, background: form.determination === k ? DET[k].color : '#fff', color: form.determination === k ? '#fff' : INK2 }}>{DET[k].label}</button>
                    ))}
                  </div>
                  <textarea value={form.rationale} onChange={(e) => setForm((f) => ({ ...f, rationale: e.target.value }))} placeholder="Documented rationale (required) — basis for the determination; recorded to the tamper-evident ledger and discoverable in litigation."
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: 9, border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, minHeight: 64, outline: 'none', resize: 'vertical' }} />
                  <button onClick={() => save(c)} disabled={busy} style={{ ...btn('#4f46e5'), marginTop: 8, opacity: busy ? 0.6 : 1 }}>{busy ? 'Recording…' : 'Record determination'}</button>
                  {form.determination === 'material' && <span style={{ fontSize: 10.5, color: '#C0392B', marginLeft: 8 }}>Starts the 4-business-day 8-K clock.</span>}
                </div>
              )}

              {draft && open === c.eventRef && a && (
                <div style={{ marginTop: 10, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '11px 13px', background: '#fff' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: INK, marginBottom: 6 }}>Draft 8-K Item 1.05 {draft.model ? <span style={{ fontWeight: 500, color: INK3 }}>({draft.model})</span> : ''}</div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: INK2, fontFamily: 'inherit', margin: 0, lineHeight: 1.5 }}>{draft.loading ? 'Drafting…' : draft.draft}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function btn(bg, color) { return { background: bg, color: color || '#fff', border: `1px solid ${bg === '#fff' ? '#e6ebf2' : bg}`, borderRadius: 7, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }; }
