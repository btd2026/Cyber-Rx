/**
 * CisoExecReport — STEP D1 (operational security language)
 * --------------------------------------------------------
 * CSF 2.0 function scores · 800-53 family compliance vs selected baseline · CIS
 * IG progress (pending B3) · ATT&CK heat map (matrix colored by coverage, click
 * a technique for the evidencing check) · failing-control queue with remediation
 * · score trends. All from GET /api/frameworks/exec/ciso (computed, not seeded).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc';
const GREEN = '#1f8a4c', AMBER = '#B07C2E', RED = '#C0392B';
const cstat = (s) => (s === 'green' ? GREEN : s === 'amber' ? AMBER : s === 'red' ? RED : INK3);
const cov = { prevent: GREEN, detect: AMBER, none: '#e5e9f0' };

// Agent voice — an intro for the dashboard and one explanation per lens.
const INTRO = "This is your Four-Lens view. The same security program, seen through four independent frameworks — NIST CSF 2.0, NIST 800-53, MITRE ATT&CK, and CIS Controls. Pick a lens with the buttons, and click any function, family, control, or tactic to dig in: you'll see the subcategory scores, exactly what was tested and the result, and where there's a finding, the recommendation to fix it.";
const LENS_VOICE = {
  csf: "NIST CSF 2.0 is the board-level shape of your program — six functions from Govern through Recover. Click any function to open its subcategories, see which were tested, the score, and any findings with recommendations.",
  n80053: "NIST 800-53 is the detailed control catalog behind your chosen baseline. Each family rolls up its controls. Click a family to see the individual controls, what was checked, and where you fall short of the baseline.",
  attack: "MITRE ATT&CK shows whether you can actually prevent or detect real adversary techniques, grouped by tactic. Click a tactic to see each technique and whether you have prevention, detection, or nothing — with a recommendation where there's a gap.",
  cis: "CIS Controls version 8.1 is the prioritized, practical checklist — eighteen controls made of safeguards. Click a control to see each safeguard, whether it's evidenced by an automated check, and what to fix.",
  ops: "This is the operational view: the specific checks failing right now, each with a recommendation, plus how your two scored frameworks are trending over time.",
};

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

function ScoreChip({ label, score, status, onClick }) {
  return (
    <div onClick={onClick} title={onClick ? 'Click to drill into subcategories' : undefined}
      style={{ border: `1px solid ${HAIR}`, borderTop: `3px solid ${cstat(status)}`, borderRadius: 6, padding: '9px 12px', textAlign: 'center', minWidth: 92, cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow .12s' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: cstat(status), lineHeight: 1 }}>{score == null ? '—' : score}</div>
      <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
      {onClick && <div style={{ fontSize: 9, color: '#2563eb', marginTop: 4, fontWeight: 600 }}>dig in →</div>}
    </div>
  );
}

function Spark({ points }) {
  if (!points || points.length < 2) return <span style={{ fontSize: 10, color: INK3 }}>—</span>;
  const xs = points.map((p) => Number(p.score));
  const min = Math.min(...xs), max = Math.max(...xs), span = max - min || 1;
  const w = 120, h = 26;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((Number(p.score) - min) / span) * h}`).join(' ');
  return <svg width={w} height={h}><polyline points={d} fill="none" stroke={INK} strokeWidth="1.5" /></svg>;
}

export default function CisoExecReport(props) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [baseline, setBaseline] = useState('moderate');
  const [tech, setTech] = useState(null);
  const [lens, setLens] = useState('csf');
  const [drill, setDrill] = useState(null); // { framework, group, title }
  const voice = useAgentVoice();
  const { token, orgId, api } = ctx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    setData(null);
    fetch(`${api}/api/frameworks/exec/ciso?org_id=${encodeURIComponent(orgId)}&baseline=${baseline}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch((e) => setError(e.message));
  }, [api, orgId, token, baseline]);

  // Michael introduces the dashboard once, then explains each lens as it opens.
  useEffect(() => {
    if (!data) return;
    if (typeof window !== 'undefined' && !window._cx_fourlens_intro) { window._cx_fourlens_intro = true; voice.speak(INTRO); }
  }, [data]); // eslint-disable-line
  useEffect(() => {
    if (data && LENS_VOICE[lens]) voice.speak(LENS_VOICE[lens]);
    return () => voice.stop();
  }, [lens]); // eslint-disable-line

  const maxHeat = useMemo(() => (data ? Math.max(1, ...data.attack.heat.map((t) => t.total)) : 1), [data]);

  if (error) return <div style={{ padding: 20, color: RED, fontSize: 13 }}>Could not load CISO pack: {error}</div>;
  if (!data) return <div style={{ padding: 20, color: INK3, fontSize: 13 }}>Computing security posture from latest validation run…</div>;

  const pdfUrl = `${api}/api/ciso/report.pdf?org_id=${encodeURIComponent(orgId)}&baseline=${baseline}`;
  const pptxUrl = `${api}/api/ciso/report.pptx?org_id=${encodeURIComponent(orgId)}&baseline=${baseline}`;
  const cisCol = (p) => (p >= 80 ? GREEN : p >= 50 ? AMBER : RED);

  return (
    <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', paddingBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK3, textTransform: 'uppercase', letterSpacing: '0.14em' }}>CISO · Security Posture Pack</div>
          <h2 style={{ margin: '6px 0 0', fontSize: 21, fontWeight: 600, color: INK }}>Four-lens operational posture</h2>
          <div style={{ fontSize: 11.5, color: INK2, marginTop: 5 }}>Four independent frameworks on the same program — pick a lens below. Computed from validation run #{data.runId}.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <VoiceControls voice={voice} onReplay={() => voice.speak(LENS_VOICE[lens] || INTRO)} label="Hear Michael" />
          <a href={pdfUrl} style={{ background: INK, color: '#fff', fontSize: 11.5, fontWeight: 600, borderRadius: 5, padding: '8px 14px', textDecoration: 'none' }}>⤓ PDF report</a>
          <a href={pptxUrl} style={{ background: '#fff', color: INK, border: `1px solid ${HAIR}`, fontSize: 11.5, fontWeight: 600, borderRadius: 5, padding: '8px 14px', textDecoration: 'none' }}>⤓ PowerPoint</a>
        </div>
      </div>

      {/* lens selector — one framework box at a time */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 4px' }}>
        {[['csf', 'NIST CSF 2.0', '#2563eb'], ['n80053', 'NIST 800-53 r5', '#7c3aed'], ['attack', 'MITRE ATT&CK', '#C0392B'], ['cis', 'CIS Controls v8.1', '#1f8a4c'], ['ops', 'Operational', INK3]].map(([k, l, c]) => (
          <button key={k} onClick={() => setLens(k)} style={{ background: lens === k ? c : '#fff', color: lens === k ? '#fff' : INK2, border: `1px solid ${lens === k ? c : HAIR}`, borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: lens === k ? 700 : 500, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* ===== Lens 1 — NIST CSF 2.0 ===== */}
      {lens === 'csf' && (
      <Lens n={1} title="NIST CSF 2.0 — Function scores" accent="#2563eb"
        sub="The six core functions of the Cybersecurity Framework. This is the board-level shape of the program."
        right={<Pillbox text={`Overall ${data.csf.overall ?? '—'}`} color="#2563eb" />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {data.csf.functions.map((f) => <ScoreChip key={f.id} label={f.name} score={f.score} status={f.status} onClick={() => setDrill({ framework: 'csf', group: f.id, title: `CSF · ${f.name}` })} />)}
        </div>
      </Lens>
      )}

      {/* ===== Lens 2 — NIST 800-53 r5 ===== */}
      {lens === 'n80053' && (
      <Lens n={2} title="NIST SP 800-53 r5 — Control-family compliance" accent="#7c3aed"
        sub="Coverage of the control families in your chosen baseline. Families are grouped weakest-first."
        right={(
          <div style={{ display: 'flex', gap: 4 }}>
            {['low', 'moderate', 'high'].map((b) => (
              <button key={b} onClick={() => setBaseline(b)} style={{ fontSize: 10.5, fontWeight: baseline === b ? 700 : 500, color: baseline === b ? '#fff' : INK2, background: baseline === b ? '#7c3aed' : '#fff', border: `1px solid ${baseline === b ? '#7c3aed' : HAIR}`, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', textTransform: 'capitalize' }}>{b}</button>
            ))}
          </div>
        )}>
        <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '9px 13px', marginBottom: 10, fontSize: 12, color: INK }}>
          <strong style={{ textTransform: 'capitalize' }}>{data.nist80053.baseline.name}</strong> baseline coverage: <strong style={{ color: cstat(data.nist80053.baseline.coveragePct >= 60 ? 'amber' : 'red') }}>{data.nist80053.baseline.coveragePct}%</strong> — {data.nist80053.baseline.covered} of {data.nist80053.baseline.total} controls have a passing mapped check.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px,1fr))', gap: 7 }}>
          {data.nist80053.families.slice(0, 20).map((f) => (
            <div key={f.family} onClick={() => setDrill({ framework: 'n80053', group: f.family, title: `800-53 · ${f.family} family` })} title="Click to drill into controls"
              style={{ border: `1px solid ${HAIR}`, background: '#fff', borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700, fontSize: 11.5, color: INK }}>{f.family}</span><span style={{ fontWeight: 700, fontSize: 11.5, color: cstat(f.status) }}>{f.score}</span></div>
              <div style={{ height: 4, background: '#eef2f6', borderRadius: 2, marginTop: 5 }}><div style={{ width: `${f.score}%`, height: '100%', background: cstat(f.status), borderRadius: 2 }} /></div>
            </div>
          ))}
        </div>
      </Lens>
      )}

      {/* ===== Lens 3 — MITRE ATT&CK ===== */}
      {lens === 'attack' && (
      <Lens n={3} title="MITRE ATT&CK — Coverage by tactic" accent="#C0392B"
        sub="How well your controls prevent or detect real adversary techniques, grouped by attack tactic."
        right={<Pillbox text={`${data.attack.summary.covered}/${data.attack.summary.total} covered`} color="#C0392B" />}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {data.attack.heat.map((t) => (
            <div key={t.shortname} style={{ minWidth: 124, flex: '0 0 auto', border: `1px solid ${HAIR}`, background: '#fff', borderRadius: 6, padding: '8px 9px' }}>
              <div onClick={() => setDrill({ framework: 'attack', group: t.shortname, title: `ATT&CK · ${t.tactic}` })} title="Click to drill into techniques"
                style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', marginBottom: 5, height: 26, lineHeight: 1.2, cursor: 'pointer' }}>{t.tactic} ↗</div>
              <div style={{ display: 'flex', height: 8, borderRadius: 3, overflow: 'hidden', border: `1px solid ${HAIR}`, marginBottom: 5 }}>
                {['prevent', 'detect', 'none'].map((k) => t[k] > 0 && <div key={k} title={`${k}: ${t[k]}`} style={{ flex: t[k], background: cov[k] }} />)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {t.techniques.slice(0, 14).map((x) => (
                  <button key={x.id} onClick={() => setTech(x)} title={x.name}
                    style={{ width: 13, height: 13, borderRadius: 2, border: '1px solid #00000010', cursor: 'pointer', background: cov[x.status] }} />
                ))}
              </div>
              <div style={{ fontSize: 9, color: INK3, marginTop: 5 }}>{t.total} techniques</div>
            </div>
          ))}
        </div>
        {tech && (
          <div style={{ marginTop: 10, background: '#0b1220', borderRadius: 6, padding: '10px 13px', color: '#e2e8f0', fontSize: 11.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{tech.id} · {tech.name}</strong>
              <button onClick={() => setTech(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginTop: 4, color: '#cbd5e1' }}>Coverage: <span style={{ color: cov[tech.status] === '#e5e9f0' ? '#94a3b8' : cov[tech.status] }}>{tech.status}</span> · confidence {tech.confidence || 'low'} · evidencing check: <code style={{ color: '#7dd3fc' }}>{tech.source_check || 'none'}</code></div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10.5, color: INK2 }}>
          {[['prevent', 'Prevent'], ['detect', 'Detect'], ['none', 'No coverage']].map(([k, l]) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 11, height: 11, borderRadius: 2, background: cov[k], display: 'inline-block' }} />{l}</span>
          ))}
        </div>
      </Lens>
      )}

      {/* ===== Lens 4 — CIS Controls (grouped by status) ===== */}
      {lens === 'cis' && data.cis && data.cis.status === 'ingested' && (
        <Lens n={4} title={`CIS Controls v${data.cis.version} — the 18 Controls`} accent="#1f8a4c"
          sub={`${data.cis.safeguards} safeguards across 18 controls, grouped by how well each is evidenced.`}>
          {['Gap', 'Weak', 'Moderate', 'Strong'].map((band) => {
            const group = (data.cis.controls || []).filter((c) => c.status === band);
            if (!group.length) return null;
            const bandCol = band === 'Strong' ? GREEN : band === 'Moderate' ? AMBER : RED;
            return (
              <div key={band} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: bandCol, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{band} · {group.length}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px,1fr))', gap: 8 }}>
                  {group.map((c) => (
                    <div key={c.number} onClick={() => setDrill({ framework: 'cis', group: String(c.number), title: `CIS ${c.number} — ${c.name}` })} title="Click to drill into safeguards"
                      style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${cisCol(c.attainmentPct)}`, background: '#fff', borderRadius: 6, padding: '10px 12px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: INK }}><span style={{ color: INK3 }}>{c.number}.</span> {c.name}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: cisCol(c.attainmentPct), fontVariantNumeric: 'tabular-nums' }}>{c.attainmentPct}%</span>
                      </div>
                      <div style={{ height: 5, background: '#eef2f6', borderRadius: 3, margin: '6px 0 4px' }}><div style={{ width: `${c.attainmentPct}%`, height: '100%', background: cisCol(c.attainmentPct), borderRadius: 3 }} /></div>
                      <div style={{ fontSize: 10, color: INK3 }}>{c.covered}/{c.safeguards} safeguards evidenced</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Lens>
      )}

      {/* Operational */}
      {lens === 'ops' && (
      <Lens n="·" title="Operational — failing checks & trend" accent={INK3}
        sub="The specific checks that need action, and how the two scored frameworks are trending.">
        {data.failingQueue.length > 0 ? (
          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            {data.failingQueue.map((q) => (
              <div key={q.check} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${RED}`, background: '#fff', borderRadius: 5, padding: '8px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: INK }}>{q.title}</span>
                  <span style={{ fontSize: 11, color: RED }}>{q.observed ?? '—'} vs {q.expected ?? '—'}</span>
                </div>
                <div style={{ fontSize: 10, color: INK3, marginTop: 2 }}>CSF {q.csf || '—'} · 800-53 {q.controls || '—'} · {q.tool}</div>
                <div style={{ fontSize: 11.5, color: INK, marginTop: 4 }}>→ {q.recommendation}</div>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize: 12, color: INK3, marginBottom: 12 }}>No failing checks in the latest run.</div>}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 11, color: INK3 }}>CSF overall trend</div><Spark points={data.trends.csf} /></div>
          <div><div style={{ fontSize: 11, color: INK3 }}>800-53 overall trend</div><Spark points={data.trends.nist80053} /></div>
        </div>
      </Lens>
      )}

      {data.cis && data.cis.status === 'pending' && (
        <div style={{ marginTop: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 12px', fontSize: 11.5, color: '#92400e' }}>
          <strong>CIS Controls v8.1:</strong> {data.cis.note}
        </div>
      )}

      {drill && <DrillDrawer drill={drill} api={api} orgId={orgId} token={token} onClose={() => setDrill(null)} />}
    </div>
  );
}

/* ---- Drill-down drawer: subcategories with score, what was done, findings, recs ---- */
function DrillDrawer({ drill, api, orgId, token, onClose }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    setD(null);
    fetch(`${api}/api/frameworks/exec/drilldown?org_id=${encodeURIComponent(orgId)}&framework=${drill.framework}&group=${encodeURIComponent(drill.group)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setD).catch((e) => setError(e.message));
  }, [api, orgId, token, drill]);
  const sChip = (s, score) => (
    <span style={{ fontSize: 12, fontWeight: 700, color: cstat(s), fontVariantNumeric: 'tabular-nums' }}>{score == null ? (s === 'red' ? 'gap' : '—') : `${score}`}</span>
  );
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,0.45)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px,95vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)', overflowY: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fbfcfe', borderBottom: `1px solid ${HAIR}`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Drill-down</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 15.5, fontWeight: 700, color: INK }}>{drill.title}</h3>
            {d && <div style={{ fontSize: 11, color: INK2, marginTop: 2 }}>{d.count} {drill.framework === 'attack' ? 'techniques' : 'subcategories'} · run #{d.runId || '—'}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: INK3, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '14px 20px 26px' }}>
          {error && <div style={{ color: RED, fontSize: 12 }}>{error}</div>}
          {!d && !error && <div style={{ color: INK3, fontSize: 12 }}>Loading subcategory detail…</div>}
          {d && d.requirements.map((r) => {
            const isOpen = open === r.id;
            return (
              <div key={r.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${cstat(r.status)}`, borderRadius: 7, marginBottom: 8, overflow: 'hidden' }}>
                <button onClick={() => setOpen(isOpen ? null : r.id)} style={{ width: '100%', textAlign: 'left', background: isOpen ? PANEL : '#fff', border: 'none', cursor: 'pointer', padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12.5, color: INK }}><strong style={{ color: INK3, fontWeight: 700 }}>{r.id}</strong> {r.title}</span>
                  {r.findings.length > 0 && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: RED, borderRadius: 4, padding: '2px 7px' }}>{r.findings.length} finding{r.findings.length > 1 ? 's' : ''}</span>}
                  {sChip(r.status, r.score)}
                  <span style={{ color: INK3, fontSize: 11 }}>{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '4px 14px 14px', background: PANEL, fontSize: 12, color: INK }}>
                    <div style={{ color: INK2, lineHeight: 1.55, marginBottom: 8 }}>{r.summary}</div>
                    {r.checks.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>What was done</div>
                        {r.checks.map((c) => (
                          <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0, background: c.status === 'pass' ? GREEN : c.status === 'partial' ? AMBER : c.status === 'fail' ? RED : INK3 }} />
                            <span style={{ lineHeight: 1.5, color: INK2 }}>{c.did}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {r.findings.length > 0 && (
                      <div style={{ background: '#fdecea', border: '1px solid #f3c9bf', borderRadius: 6, padding: '8px 11px', marginBottom: 8 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Findings</div>
                        {r.findings.map((f, i) => <div key={i} style={{ fontSize: 11.5, color: INK, lineHeight: 1.5, marginBottom: 2 }}>• {f}</div>)}
                      </div>
                    )}
                    {r.recommendations.length > 0 && (
                      <div style={{ background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 6, padding: '8px 11px' }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Recommendations</div>
                        {r.recommendations.map((rec, i) => <div key={i} style={{ fontSize: 11.5, color: INK, lineHeight: 1.5, marginBottom: 2 }}>→ {rec}</div>)}
                      </div>
                    )}
                    {!r.findings.length && r.tested && <div style={{ fontSize: 11.5, color: GREEN }}>✓ Operating within target — no findings.</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// A clearly-bordered group panel for one framework lens.
function Lens({ n, title, sub, accent, right, children }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 10, marginTop: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#fbfcfe', borderBottom: `1px solid ${HAIR}`, borderLeft: `4px solid ${accent}`, padding: '11px 16px' }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Lens {n}</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: INK2, marginTop: 2, maxWidth: 720 }}>{sub}</div>}
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

function Pillbox({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}14`, border: `1px solid ${color}40`, borderRadius: 14, padding: '4px 12px', whiteSpace: 'nowrap' }}>{text}</span>;
}
