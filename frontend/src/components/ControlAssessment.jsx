/**
 * ControlAssessment — Milestone 7. The user-facing Control Assessment Engine UI.
 *
 * The whole product feel: Select framework → Select tools → Connect securely →
 * Run assessment → View executive results. It calls ONLY the /api/cae projection
 * endpoints, so it can never display API endpoints, JSON, scoring logic, mappings,
 * or raw evidence — the backend simply does not send them.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, NAVY = COLORS.navy1;
const GREEN = COLORS.good, AMBER = COLORS.warn, RED = COLORS.bad, BLUE = '#1d4ed8';
const statusColor = (s) => (s === 'passed' ? GREEN : s === 'partial' ? AMBER : s === 'failed' ? RED : INK3);
const statusLabel = (s) => ({ passed: 'Passed', partial: 'Partial', failed: 'Failed', not_tested: 'Not tested', needs_manual_evidence: 'Manual evidence' }[s] || s);

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function ControlAssessment(props) {
  const { token, orgId, api } = ctx(props);
  const [step, setStep] = useState(1);
  const [frameworks, setFrameworks] = useState([]);
  const [selFw, setSelFw] = useState({});
  const [categories, setCategories] = useState([]);
  const [cat, setCat] = useState('');
  const [tools, setTools] = useState([]);
  const [selTools, setSelTools] = useState({});
  const [fieldsByTool, setFieldsByTool] = useState({});
  const [form, setForm] = useState({});
  const [connStatus, setConnStatus] = useState({});
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState(null);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState([]);

  const headers = useCallback(() => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  const get = useCallback((p) => fetch(`${api}${p}`, { headers: headers() }).then((r) => r.json()).catch(() => null), [api, headers]);
  const post = useCallback((p, body) => fetch(`${api}${p}`, { method: 'POST', headers: headers(), body: JSON.stringify(body || {}) }).then((r) => r.json()).catch(() => null), [api, headers]);

  useEffect(() => {
    get('/api/cae/frameworks').then((d) => setFrameworks((d && d.frameworks) || []));
    get('/api/cae/categories').then((d) => setCategories((d && d.categories) || []));
    get('/api/cae/connections').then((d) => {
      const m = {}; ((d && d.connections) || []).forEach((c) => { m[c.tool_name] = c; }); setConnStatus(m);
    });
  }, [get]);

  useEffect(() => { if (cat) get(`/api/cae/tools?category=${encodeURIComponent(cat)}`).then((d) => setTools((d && d.tools) || [])); }, [cat, get]);

  const toggleFw = (name) => setSelFw((s) => ({ ...s, [name]: !s[name] }));
  const toggleTool = async (name) => {
    setSelTools((s) => ({ ...s, [name]: !s[name] }));
    if (!fieldsByTool[name]) { const d = await get(`/api/cae/tools/${encodeURIComponent(name)}/fields`); setFieldsByTool((f) => ({ ...f, [name]: d })); }
  };
  const setField = (tool, key, val) => setForm((f) => ({ ...f, [tool]: { ...(f[tool] || {}), [key]: val } }));

  const connect = async (tool) => {
    setBusy(true);
    const d = await post('/api/cae/connections', { tool_name: tool, fields: form[tool] || {} });
    setConnStatus((s) => ({ ...s, [tool]: d || { status: 'failed', message: 'Connection failed.' } }));
    setBusy(false);
  };

  const runAssessment = async () => {
    setBusy(true);
    const fw = Object.keys(selFw).filter((k) => selFw[k]);
    const r = await post('/api/cae/assessment/run', { frameworks: fw.length ? fw : undefined });
    setRun(r);
    const res = await get('/api/cae/assessment' + (fw.length ? `?framework=${encodeURIComponent(fw[0])}` : ''));
    setResults((res && res.results) || []);
    const sum = await get('/api/cae/assessment/summary');
    setSummary((sum && sum.frameworks) || []);
    setBusy(false); setStep(4);
  };

  const STEPS = ['Frameworks', 'Tools', 'Connect & Run', 'Results'];
  const selectedTools = Object.keys(selTools).filter((k) => selTools[k]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 4px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>Control Assessment</div>
      <div style={{ fontSize: 12.5, color: INK2, marginBottom: 14 }}>Select frameworks, connect your tools securely, run the assessment, and review executive-ready results. The engine does the rest.</div>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i + 1)} style={{ flex: 1, border: `1px solid ${step === i + 1 ? NAVY : HAIR}`, background: step === i + 1 ? NAVY : '#fff', color: step === i + 1 ? '#fff' : INK2, borderRadius: 8, padding: '8px 6px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{i + 1}. {s}</button>
        ))}
      </div>

      {/* Step 1 — Frameworks */}
      {step === 1 && (
        <Card>
          <H>Select framework(s)</H>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
            {frameworks.map((f) => (
              <button key={f.id} onClick={() => toggleFw(f.name)} style={pick(selFw[f.name])}>
                <span style={{ fontWeight: 700 }}>{f.name}</span>{selFw[f.name] && <span style={{ color: GREEN }}>✓</span>}
              </button>
            ))}
          </div>
          <Next onClick={() => setStep(2)} disabled={!Object.values(selFw).some(Boolean)} />
        </Card>
      )}

      {/* Step 2 — Tools */}
      {step === 2 && (
        <Card>
          <H>Select the tools you use</H>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} style={{ border: `1px solid ${cat === c ? BLUE : HAIR}`, background: cat === c ? '#eef2ff' : '#fff', color: cat === c ? BLUE : INK2, borderRadius: 16, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>{c}</button>
            ))}
          </div>
          {cat && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
              {tools.map((t) => (
                <button key={t.name} onClick={() => toggleTool(t.name)} style={pick(selTools[t.name])} title={t.has_connector ? 'Connector available' : 'Manual evidence'}>
                  <span>{t.name}</span>
                  <span style={{ fontSize: 9, color: t.has_connector ? GREEN : INK3 }}>{t.has_connector ? '● connect' : 'manual'}</span>
                </button>
              ))}
            </div>
          )}
          {!!selectedTools.length && <div style={{ fontSize: 11.5, color: INK2, marginTop: 10 }}>{selectedTools.length} tool(s) selected.</div>}
          <Next onClick={() => setStep(3)} disabled={!selectedTools.length} />
        </Card>
      )}

      {/* Step 3 — Connect & Run */}
      {step === 3 && (
        <Card>
          <H>Connect securely</H>
          {selectedTools.map((tool) => {
            const meta = fieldsByTool[tool];
            const cs = connStatus[tool];
            if (meta && meta.manual) return (
              <div key={tool} style={row}><strong style={{ color: INK }}>{tool}</strong><span style={{ fontSize: 11, color: INK3 }}>Collected via manual evidence — no connection required.</span></div>
            );
            return (
              <div key={tool} style={{ border: `1px solid ${HAIR}`, borderRadius: 9, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ color: INK }}>{tool}</strong>
                  {cs && <span style={{ fontSize: 11, fontWeight: 700, color: cs.status === 'connected' ? GREEN : RED }}>{cs.status === 'connected' ? 'Connected successfully' : (cs.message || 'Failed')}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
                  {((meta && meta.fields) || []).map((f) => (
                    f.type === 'boolean'
                      ? <label key={f.key} style={{ fontSize: 11, color: INK2, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" onChange={(e) => setField(tool, f.key, e.target.checked)} />{f.label}</label>
                      : <input key={f.key} type={f.secret ? 'password' : 'text'} placeholder={f.label + (f.required ? ' *' : '')} onChange={(e) => setField(tool, f.key, e.target.value)} style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '7px 9px', fontSize: 11.5, outline: 'none' }} />
                  ))}
                </div>
                <button onClick={() => connect(tool)} disabled={busy} style={{ marginTop: 8, background: NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 13px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : 'Test connection'}</button>
              </div>
            );
          })}
          <button onClick={runAssessment} disabled={busy} style={{ marginTop: 6, background: GREEN, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Running…' : '▶ Run assessment'}</button>
        </Card>
      )}

      {/* Step 4 — Results */}
      {step === 4 && (
        <div>
          {!!summary.length && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 10, marginBottom: 16 }}>
              {summary.map((s) => (
                <div key={s.framework} style={{ border: `1px solid ${HAIR}`, borderRadius: 9, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>{s.framework}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: INK, margin: '4px 0', fontFamily: FONTS.mono }}>{s.avg_score ?? '—'}<span style={{ fontSize: 12, color: INK3 }}>/5</span></div>
                  <div style={{ fontSize: 10.5, color: INK2 }}><span style={{ color: GREEN }}>{s.passed} passed</span> · <span style={{ color: AMBER }}>{s.partial} partial</span> · <span style={{ color: RED }}>{s.failed} failed</span> · {s.manual} manual</div>
                </div>
              ))}
            </div>
          )}
          <Card>
            <H>Control findings</H>
            {!results.length ? <div style={{ fontSize: 12, color: INK3 }}>No results yet — run an assessment.</div> : (
              <div style={{ display: 'grid', gap: 6 }}>
                {results.map((r) => (
                  <div key={r.framework + r.control_id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${statusColor(r.status)}`, borderRadius: 7, padding: '9px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}><span style={{ fontFamily: FONTS.mono }}>{r.control_id}</span> <span style={{ color: INK3, fontWeight: 400 }}>{r.control_name}</span></span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(r.status), fontFamily: FONTS.mono }}>{statusLabel(r.status)} · {r.score ?? '—'}/5 · {r.confidence ?? '—'}% conf</span>
                    </div>
                    {r.summary_finding && <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}>{r.summary_finding}</div>}
                    {r.business_risk && <div style={{ fontSize: 11, color: INK3, marginTop: 2 }}><strong>Risk:</strong> {r.business_risk}</div>}
                    {r.recommended_action && <div style={{ fontSize: 11, color: BLUE, marginTop: 2 }}>→ {r.recommended_action}</div>}
                    {r.evidence_source && <div style={{ fontSize: 10, color: INK3, marginTop: 2 }}>Evidence source: {r.evidence_source}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

const pick = (on) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, border: `1.5px solid ${on ? COLORS.good : COLORS.hair}`, background: on ? '#f0fdf4' : '#fff', color: COLORS.ink, borderRadius: 8, padding: '10px 13px', fontSize: 12, cursor: 'pointer', textAlign: 'left' });
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${COLORS.hair}`, borderRadius: 8, padding: '10px 13px', marginBottom: 8 };
const Card = ({ children }) => <div style={{ border: `1px solid ${COLORS.hair}`, borderRadius: 12, padding: '16px 18px', background: '#fff' }}>{children}</div>;
const H = ({ children }) => <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.ink, marginBottom: 12, fontFamily: FONTS.display }}>{children}</div>;
const Next = ({ onClick, disabled }) => <div style={{ marginTop: 14 }}><button onClick={onClick} disabled={disabled} style={{ background: disabled ? '#cbd5e1' : COLORS.navy1, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 12.5, fontWeight: 700, cursor: disabled ? 'default' : 'pointer' }}>Next →</button></div>;
