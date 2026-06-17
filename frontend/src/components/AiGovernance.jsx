/**
 * AiGovernance — AI governance Phase 1: the AI-BOM (AI bill of materials).
 * Import the inventory of AI/ML systems (file) or add shadow-AI sightings, then
 * see governance posture, the systems, the data they touch, autonomy, and the
 * risk flags (shadow AI on sensitive data, agents without oversight, sensitive
 * data sent to external models, ungoverned systems).
 */

import React, { useState, useEffect, useCallback } from 'react';

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
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', provider: '', dataSensitivity: 'PII', autonomy: 'Assistive', hosting: 'External SaaS', sanctioned: 'Shadow', owner: '', purpose: '' });
  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const load = useCallback(() => {
    fetch(`${api}/api/ai-systems/inventory?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setInv(d); }).catch(() => {});
  }, [api, orgId, headers]);
  useEffect(() => { load(); }, [load]);

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

      {!inv ? <div style={{ fontSize: 12, color: INK3 }}>Loading AI inventory…</div> : (
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
          <div style={{ fontSize: 10.5, color: INK3, marginTop: 10 }}>Phase 1 of AI governance — the AI bill of materials. Control assessment (NIST AI RMF · OWASP LLM · MITRE ATLAS) and per-role AI decision-intelligence follow.</div>
        </>
      )}
    </div>
  );
}

const inpStyle = { border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none' };
function sel(label, value, opts, onChange) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inpStyle} aria-label={label}>
      {opts.map((o) => <option key={o} value={o}>{label}: {o}</option>)}
    </select>
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
