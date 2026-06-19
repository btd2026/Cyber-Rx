/**
 * AiGovernance — AI governance Phase 1: the AI-BOM (AI bill of materials).
 * Import the inventory of AI/ML systems (file) or add shadow-AI sightings, then
 * see governance posture, the systems, the data they touch, autonomy, and the
 * risk flags (shadow AI on sensitive data, agents without oversight, sensitive
 * data sent to external models, ungoverned systems).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2', PANEL = '#f8fafc';
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };
const sevTone = (s) => SEV[s] || INK3;

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

const Pill = ({ text, color }) => (
  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: color, borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{text}</span>
);

export default function AiGovernance(props) {
  const { token, orgId, api } = ctx(props);
  const voice = useAgentVoice();
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState('bom'); // bom | nist_ai_rmf | owasp_llm | mitre_atlas | eu_ai_act
  const [assess, setAssess] = useState(null);
  const [eu, setEu] = useState(null);
  const [form, setForm] = useState({ name: '', provider: '', dataSensitivity: 'PII', autonomy: 'Assistive', hosting: 'External SaaS', sanctioned: 'Shadow', owner: '', purpose: '' });
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const load = useCallback(() => {
    fetch(`${api}/api/ai-systems/inventory?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setInv(d); }).catch(() => {});
  }, [api, orgId, headers]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (view === 'bom') return;
    if (view === 'eu_ai_act') {
      setEu(null);
      fetch(`${api}/api/ai-systems/eu-ai-act?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
        .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setEu(d); }).catch(() => {});
      return;
    }
    setAssess(null);
    fetch(`${api}/api/ai-systems/assessment?framework=${encodeURIComponent(view)}&org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setAssess(d); }).catch(() => {});
  }, [view, api, orgId, headers]);

  function upload(file) {
    if (!file) return; setBusy(true); setErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result || '').split(',').pop();
      fetch(`${api}/api/ai-systems/upload`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, fileName: file.name, contentBase64: b64 }) })
        .then((r) => r.json()).then((res) => { if (res.error) setErr(res.error); else setInv(res.inventory); }).catch((e) => setErr(e.message)).finally(() => setBusy(false));
    };
    reader.readAsDataURL(file);
  }

  function addSystem() {
    if (!form.name) { setErr('Name is required.'); return; }
    setBusy(true); setErr(null);
    fetch(`${api}/api/ai-systems/add`, { method: 'POST', headers: headers(), body: JSON.stringify(Object.assign({ org_id: orgId }, form)) })
      .then((r) => r.json()).then((res) => { if (res.error) setErr(res.error); else { setInv(res.inventory); setShowAdd(false); setForm(Object.assign({}, form, { name: '', purpose: '', owner: '' })); } })
      .catch((e) => setErr(e.message)).finally(() => setBusy(false));
  }

  const score = inv ? inv.governanceScore : null;
  const scoreColor = score == null ? INK3 : score >= 80 ? '#1f8a4c' : score >= 60 ? '#B07C2E' : '#C0392B';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: INK2, maxWidth: 640, lineHeight: 1.5 }}>
          Your <strong>AI bill of materials</strong> — every AI/ML system, GenAI feature, and agent (including shadow AI), the data each touches, its autonomy, and whether it's governed.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ background: '#4f46e5', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Working…' : '⬆ Import AI inventory'}
            <input type="file" style={{ display: 'none' }} disabled={busy} accept=".csv,.xls,.xlsx,.txt,.pdf,.doc,.docx" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) upload(f); e.target.value = ''; }} />
          </label>
          <button onClick={() => setShowAdd(!showAdd)} style={{ background: '#fff', color: INK, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add / report shadow AI</button>
        </div>
      </div>

      {err && <div style={{ color: '#C0392B', fontSize: 12, marginBottom: 10 }}>{err}</div>}

      {/* framework sub-tabs — each assessed independently */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['bom', 'AI Inventory (AI-BOM)'], ['nist_ai_rmf', 'NIST AI RMF'], ['owasp_llm', 'OWASP LLM Top 10'], ['mitre_atlas', 'MITRE ATLAS'], ['eu_ai_act', 'EU AI Act']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{ border: `1px solid ${view === k ? '#0f1b2d' : HAIR}`, background: view === k ? '#0f1b2d' : '#fff', color: view === k ? '#fff' : INK2, padding: '6px 13px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', borderRadius: 999 }}>{l}</button>
          ))}
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(aiNarration(view, inv, assess, eu))} label="Listen" />
      </div>

      {showAdd && (
        <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14, background: PANEL }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 8 }}>Add an AI system</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input placeholder="Name (e.g. Marketing using ChatGPT)" value={form.name} onChange={(e) => setForm(Object.assign({}, form, { name: e.target.value }))} style={inpStyle} />
            <input placeholder="Provider / model" value={form.provider} onChange={(e) => setForm(Object.assign({}, form, { provider: e.target.value }))} style={inpStyle} />
            {sel('Data', form.dataSensitivity, ['PHI', 'PCI', 'IP/Secrets', 'PII', 'Public/None', 'Unknown'], (v) => setForm(Object.assign({}, form, { dataSensitivity: v })))}
            {sel('Autonomy', form.autonomy, ['Assistive', 'Copilot', 'Agentic'], (v) => setForm(Object.assign({}, form, { autonomy: v })))}
            {sel('Hosting', form.hosting, ['External SaaS', 'Self-hosted'], (v) => setForm(Object.assign({}, form, { hosting: v })))}
            {sel('Status', form.sanctioned, ['Shadow', 'Unreviewed', 'Sanctioned'], (v) => setForm(Object.assign({}, form, { sanctioned: v })))}
            <input placeholder="Owner (optional)" value={form.owner} onChange={(e) => setForm(Object.assign({}, form, { owner: e.target.value }))} style={inpStyle} />
            <input placeholder="Purpose (optional)" value={form.purpose} onChange={(e) => setForm(Object.assign({}, form, { purpose: e.target.value }))} style={inpStyle} />
          </div>
          <button onClick={addSystem} disabled={busy} style={{ marginTop: 10, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Add system'}</button>
        </div>
      )}

      {view === 'eu_ai_act' && <EuAiActView eu={eu} />}
      {view !== 'bom' && view !== 'eu_ai_act' && <FrameworkView a={assess} />}

      {view === 'bom' && (!inv ? <div style={{ fontSize: 12, color: INK3 }}>Loading AI inventory…</div> : (
        <>
          {/* posture + KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginBottom: 12 }}>
            <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${scoreColor}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
              <div style={{ fontSize: 10.5, color: INK2 }}>AI governance posture</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor }}>{score}<span style={{ fontSize: 12, color: INK3, fontWeight: 600 }}> / 100</span></div>
            </div>
            <Kpi label="AI systems" value={inv.counts.total} />
            <Kpi label="Shadow AI" value={inv.counts.shadow} tone={inv.counts.shadow ? 'bad' : 'good'} />
            <Kpi label="Autonomous agents" value={inv.counts.agentic} tone={inv.counts.agentic ? 'warn' : 'good'} />
            <Kpi label="Sensitive → external" value={inv.counts.sensitiveExternal} tone={inv.counts.sensitiveExternal ? 'warn' : 'good'} />
            <Kpi label="Ungoverned" value={inv.counts.ungoverned} tone={inv.counts.ungoverned ? 'warn' : 'good'} />
            <Kpi label="Critical-risk" value={inv.counts.critical} tone={inv.counts.critical ? 'bad' : 'good'} />
          </div>

          {/* AI-BOM table */}
          <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead><tr style={{ background: PANEL, color: INK3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {['AI system', 'Type', 'Data', 'Autonomy', 'Hosting', 'Status', 'Risk'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '9px 12px', borderBottom: `1px solid ${HAIR}` }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {inv.systems.map((s, i) => (
                    <tr key={s.id || i} style={{ background: i % 2 ? '#fff' : '#fcfdfe', borderTop: i ? `1px solid ${HAIR}` : 'none' }}>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: 700, color: INK }}>{s.name}</div>
                        {s.flags && s.flags.length > 0 && <div style={{ fontSize: 10, color: sevTone(s.riskLevel), marginTop: 2 }}>{s.flags.map((f) => f.text).join(' · ')}</div>}
                        {s.owner ? <div style={{ fontSize: 9.5, color: INK3, marginTop: 1 }}>Owner: {s.owner}</div> : null}
                      </td>
                      <td style={{ padding: '9px 12px', color: INK2 }}>{s.systemType}</td>
                      <td style={{ padding: '9px 12px' }}>{['PHI', 'PCI', 'IP/Secrets', 'PII'].includes(s.dataSensitivity) ? <Pill text={s.dataSensitivity} color="#A85B2E" /> : <span style={{ color: INK3 }}>{s.dataSensitivity}</span>}</td>
                      <td style={{ padding: '9px 12px' }}>{s.autonomy === 'Agentic' ? <Pill text="Agentic" color="#C0392B" /> : <span style={{ color: INK2 }}>{s.autonomy}</span>}</td>
                      <td style={{ padding: '9px 12px', color: INK2 }}>{s.hosting}</td>
                      <td style={{ padding: '9px 12px' }}>{s.sanctioned === 'Shadow' ? <Pill text="Shadow" color="#C0392B" /> : s.sanctioned === 'Unreviewed' ? <Pill text="Unreviewed" color="#B07C2E" /> : <span style={{ color: '#1f8a4c', fontWeight: 600 }}>Sanctioned</span>}</td>
                      <td style={{ padding: '9px 12px' }}><Pill text={s.riskLevel} color={sevTone(s.riskLevel)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: INK3, marginTop: 10 }}>The AI bill of materials. Use the tabs above to assess controls against NIST AI RMF, OWASP LLM Top 10, and MITRE ATLAS — each independently.</div>
        </>
      ))}
    </div>
  );
}

const STBAND = { Strong: '#1f8a4c', Partial: '#B07C2E', Weak: '#A85B2E', Gap: '#C0392B' };
function FrameworkView({ a }) {
  if (!a) return <div style={{ fontSize: 12, color: INK3 }}>Assessing controls…</div>;
  const sc = a.band === 'Strong' ? '#1f8a4c' : a.band === 'Partial' ? '#B07C2E' : a.band === 'Weak' ? '#A85B2E' : '#C0392B';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${sc}`, borderRadius: 9, padding: '11px 15px', background: '#fff' }}>
          <div style={{ fontSize: 10.5, color: INK2 }}>{a.name} posture</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: sc }}>{a.score}<span style={{ fontSize: 12, color: INK3, fontWeight: 600 }}> / 100 · {a.band}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Strong', 'Partial', 'Weak', 'Gap'].map((k) => (
            <span key={k} style={{ fontSize: 10.5, color: INK2 }}><strong style={{ color: STBAND[k] }}>{a.counts[k.toLowerCase()]}</strong> {k}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {a.controls.map((c) => <ControlRow key={c.id} c={c} />)}
      </div>
      <div style={{ fontSize: 10.5, color: INK3, marginTop: 10 }}>Scored from your AI inventory signals. Controls marked “needs evidence” become connector-driven as tool integrations are added. Expand any control for the rationale and the decision to take.</div>
    </div>
  );
}

// A control row that opens to the decision-grade detail: WHY this verdict, the
// TARGET to reach, the immediate ACTION, and the DECISION leadership should make.
function ControlRow({ c }) {
  const [open, setOpen] = useState(false);
  const detailed = c.why || c.target || c.decision;
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${STBAND[c.status]}`, borderRadius: 8, background: '#fff' }}>
      <button onClick={() => detailed && setOpen(!open)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 13px', cursor: detailed ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{c.fn ? `${c.fn} · ` : ''}{c.id} — {c.name}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill text={c.status} color={STBAND[c.status]} />
            {detailed && <span style={{ fontSize: 10, color: INK3 }}>{open ? '▲' : '▼'}</span>}
          </span>
        </div>
        <div style={{ fontSize: 11, color: INK2, marginTop: 4 }}>{c.finding}</div>
        {!open && c.status !== 'Strong' && <div style={{ fontSize: 11, color: '#1f8a4c', fontWeight: 600, marginTop: 3 }}>→ {c.recommendation}</div>}
      </button>
      {open && detailed && (
        <div style={{ borderTop: `1px solid ${HAIR}`, background: PANEL, padding: '11px 13px', display: 'grid', gap: 9 }}>
          {c.why && <Detail label="Why this verdict" tone={INK2}>{c.why}</Detail>}
          {(c.target || c.targetScore) && <Detail label="Target" tone={INK2}>{c.target}{c.targetScore ? ` (${c.targetScore}+/100).` : ''}</Detail>}
          {c.recommendation && c.status !== 'Strong' && <Detail label="Action" tone="#1f8a4c">{c.recommendation}</Detail>}
          {c.decision && <Detail label="Decision to take" tone="#7c3aed">{c.decision}</Detail>}
        </div>
      )}
    </div>
  );
}
function Detail({ label, tone, children }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: tone, lineHeight: 1.5, fontWeight: tone === '#7c3aed' ? 600 : 400 }}>{children}</div>
    </div>
  );
}

// Spoken summary of the active AI-governance view for the agent voice.
// Calm, business-toned narration that EXPLAINS what the leader is looking at and
// where to focus — not a read-out of every number. Kept deliberately short.
function aiNarration(view, inv, assess, eu) {
  if (view === 'eu_ai_act') {
    if (!eu) return 'Classifying your AI systems under the EU AI Act.';
    const high = eu.counts.high || 0;
    const top = (eu.systems || []).find((s) => s.tier === 'High-risk');
    if (!high) return 'This sorts each AI system into the EU AI Act risk tiers. Nothing currently lands in the high-risk tier, so your obligations are lighter — but re-check whenever a system\'s purpose or data changes, and confirm with Legal.';
    return `This sorts each AI system into the EU AI Act risk tiers, because the legal obligations rise sharply with the tier. ${high} of your systems fall into the high-risk tier, which carries the heaviest duties${top ? ` — most notably ${top.name}, since ${String(top.rationale || '').toLowerCase()}` : ''}. Treat those as the priority, and have Legal confirm the classification before you rely on it.`;
  }
  if (view !== 'bom') {
    if (!assess) return 'Assessing your AI controls.';
    const weak = (assess.controls || []).filter((c) => c.status === 'Weak' || c.status === 'Gap');
    let s = `This grades your AI program against ${assess.name} — a recognised standard for trustworthy AI. You're at ${assess.score} out of 100, which we'd call ${String(assess.band || '').toLowerCase()}. `;
    s += weak.length
      ? `The quickest way to raise that is to close your weakest area first: ${weak[0].name} — ${weak[0].recommendation}`
      : 'Controls are largely in place; keep them evidenced and re-test on schedule.';
    return s;
  }
  if (!inv) return 'Loading your AI bill of materials.';
  const c = inv.counts;
  const band = inv.governanceScore >= 75 ? 'a reasonably governed program' : inv.governanceScore >= 50 ? 'a program with meaningful gaps' : 'an early, largely ungoverned program';
  const worst = (inv.systems || []).find((s) => s.riskLevel === 'Critical') || (inv.systems || []).find((s) => s.riskLevel === 'High');
  const concerns = [];
  if (c.shadow) concerns.push(`${c.shadow} shadow AI tool${c.shadow > 1 ? 's' : ''} running outside oversight`);
  if (c.sensitiveExternal) concerns.push(`${c.sensitiveExternal} sending regulated data to external models`);
  if (c.agentic) concerns.push(`${c.agentic} autonomous agent${c.agentic > 1 ? 's' : ''} acting without a human in the loop`);
  let s = 'This is your AI bill of materials — one inventory of every AI system in use, including the shadow tools no one formally approved. Each row shows what data it touches, how independently it acts, and whether anyone owns its governance. ';
  s += `At ${inv.governanceScore} out of 100, this is ${band}. `;
  s += concerns.length ? `The exposure that matters most: ${concerns.slice(0, 2).join(', and ')}. ` : 'Nothing critical stands out right now. ';
  if (worst) s += `I'd start with ${worst.name}: ${(worst.flags || []).map((f) => f.text).join('; ') || `${worst.riskLevel} risk`}.`;
  return s;
}

const inpStyle = { border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none' };
function sel(label, value, opts, onChange) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inpStyle} aria-label={label}>
      {opts.map((o) => <option key={o} value={o}>{label}: {o}</option>)}
    </select>
  );
}
const TIER = { 'High-risk': '#C0392B', 'Limited-risk': '#B07C2E', 'Minimal-risk': '#1f8a4c', 'Prohibited': '#7c1d12' };
function EuAiActView({ eu }) {
  if (!eu) return <div style={{ fontSize: 12, color: INK3 }}>Classifying under the EU AI Act…</div>;
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#eef4fb,#f6f9fe)', border: '1px solid #d7e6f7', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 12.5, color: INK, lineHeight: 1.55 }}>{eu.summary}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['High-risk', eu.counts.high], ['Limited-risk', eu.counts.limited], ['Minimal-risk', eu.counts.minimal]].map(([k, n]) => (
          <span key={k} style={{ fontSize: 11, color: INK2 }}><strong style={{ color: TIER[k] }}>{n || 0}</strong> {k}</span>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {(eu.systems || []).map((s, i) => (
          <div key={i} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${TIER[s.tier]}`, borderRadius: 8, padding: '10px 13px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{s.name}</span>
              <Pill text={s.tier} color={TIER[s.tier]} />
            </div>
            <div style={{ fontSize: 11, color: INK2, marginTop: 4 }}>{s.rationale}</div>
            <div style={{ fontSize: 10.5, color: INK3, marginTop: 5 }}>Obligations: {(s.obligations || []).join(' · ')}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: INK3, marginTop: 10 }}>First-pass classification from system attributes — validate with Legal/Compliance before relying on it.</div>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const c = tone === 'bad' ? '#C0392B' : tone === 'warn' ? '#B07C2E' : tone === 'good' ? '#1f8a4c' : INK;
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${tone ? c : '#cbd5e1'}`, borderRadius: 9, padding: '11px 13px', background: '#fff' }}>
      <div style={{ fontSize: 10.5, color: INK2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone ? c : INK, marginTop: 2 }}>{value}</div>
    </div>
  );
}
