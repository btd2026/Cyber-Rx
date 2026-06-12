/**
 * CisoExecReport — STEP D1 (operational security language)
 * --------------------------------------------------------
 * CSF 2.0 function scores · 800-53 family compliance vs selected baseline · CIS
 * IG progress (pending B3) · ATT&CK heat map (matrix colored by coverage, click
 * a technique for the evidencing check) · failing-control queue with remediation
 * · score trends. All from GET /api/frameworks/exec/ciso (computed, not seeded).
 */

import React, { useState, useEffect, useMemo } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc';
const GREEN = '#1f8a4c', AMBER = '#B07C2E', RED = '#C0392B';
const cstat = (s) => (s === 'green' ? GREEN : s === 'amber' ? AMBER : s === 'red' ? RED : INK3);
const cov = { prevent: GREEN, detect: AMBER, none: '#e5e9f0' };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

function ScoreChip({ label, score, status }) {
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderTop: `3px solid ${cstat(status)}`, borderRadius: 6, padding: '9px 12px', textAlign: 'center', minWidth: 92 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: cstat(status), lineHeight: 1 }}>{score == null ? '—' : score}</div>
      <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
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
  const { token, orgId, api } = ctx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    setData(null);
    fetch(`${api}/api/frameworks/exec/ciso?org_id=${encodeURIComponent(orgId)}&baseline=${baseline}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch((e) => setError(e.message));
  }, [api, orgId, token, baseline]);

  const maxHeat = useMemo(() => (data ? Math.max(1, ...data.attack.heat.map((t) => t.total)) : 1), [data]);

  if (error) return <div style={{ padding: 20, color: RED, fontSize: 13 }}>Could not load CISO pack: {error}</div>;
  if (!data) return <div style={{ padding: 20, color: INK3, fontSize: 13 }}>Computing security posture from latest validation run…</div>;

  const exportUrl = `${api}/api/frameworks/exec/ciso/export.pdf?org_id=${encodeURIComponent(orgId)}&baseline=${baseline}`;

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', borderBottom: `1px solid ${HAIR}`, paddingBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK3, textTransform: 'uppercase', letterSpacing: '0.14em' }}>CISO · Security Posture Pack</div>
          <h2 style={{ margin: '6px 0 0', fontSize: 21, fontWeight: 600, color: INK }}>Four-lens operational posture</h2>
          <div style={{ fontSize: 11.5, color: INK2, marginTop: 5 }}>NIST CSF 2.0 · SP 800-53 r5 · MITRE ATT&CK · CIS v8.1 — computed from validation run #{data.runId}.</div>
        </div>
        <a href={exportUrl} style={{ background: INK, color: '#fff', fontSize: 11.5, fontWeight: 600, borderRadius: 5, padding: '8px 14px', textDecoration: 'none' }}>⤓ Export CISO pack (PDF)</a>
      </div>

      {/* CSF function scores */}
      <h3 style={{ fontSize: 13, color: INK, margin: '16px 0 8px' }}>NIST CSF 2.0 — function scores <span style={{ color: INK3, fontWeight: 400 }}>(overall {data.csf.overall ?? '—'})</span></h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {data.csf.functions.map((f) => <ScoreChip key={f.id} label={f.name} score={f.score} status={f.status} />)}
      </div>

      {/* 800-53 families + baseline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 8px' }}>
        <h3 style={{ fontSize: 13, color: INK, margin: 0 }}>NIST 800-53 r5 — family compliance</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {['low', 'moderate', 'high'].map((b) => (
            <button key={b} onClick={() => setBaseline(b)} style={{ fontSize: 10.5, fontWeight: baseline === b ? 700 : 500, color: baseline === b ? '#fff' : INK2, background: baseline === b ? INK : '#fff', border: `1px solid ${baseline === b ? INK : HAIR}`, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', textTransform: 'capitalize' }}>{b}</button>
          ))}
        </div>
      </div>
      <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '10px 14px', marginBottom: 8, fontSize: 12, color: INK }}>
        <strong>{data.nist80053.baseline.name}</strong> baseline coverage: <strong style={{ color: cstat(data.nist80053.baseline.coveragePct >= 60 ? 'amber' : 'red') }}>{data.nist80053.baseline.coveragePct}%</strong> — {data.nist80053.baseline.covered} of {data.nist80053.baseline.total} controls have a passing mapped check.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: 6 }}>
        {data.nist80053.families.slice(0, 20).map((f) => (
          <div key={f.family} style={{ border: `1px solid ${HAIR}`, borderRadius: 5, padding: '6px 9px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700, fontSize: 11, color: INK }}>{f.family}</span><span style={{ fontWeight: 700, fontSize: 11, color: cstat(f.status) }}>{f.score}</span></div>
            <div style={{ height: 4, background: '#eef2f6', borderRadius: 2, marginTop: 4 }}><div style={{ width: `${f.score}%`, height: '100%', background: cstat(f.status), borderRadius: 2 }} /></div>
          </div>
        ))}
      </div>

      {/* ATT&CK heat map */}
      <h3 style={{ fontSize: 13, color: INK, margin: '20px 0 8px' }}>MITRE ATT&CK coverage <span style={{ color: INK3, fontWeight: 400 }}>({data.attack.summary.covered}/{data.attack.summary.total} techniques — prevent {data.attack.summary.prevent}, detect {data.attack.summary.detect})</span></h3>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
        {data.attack.heat.map((t) => (
          <div key={t.shortname} style={{ minWidth: 116, flex: '0 0 auto' }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: INK2, marginBottom: 4, height: 26, lineHeight: 1.15 }}>{t.tactic}</div>
            <div style={{ display: 'flex', height: 10, borderRadius: 3, overflow: 'hidden', border: `1px solid ${HAIR}` }}>
              {['prevent', 'detect', 'none'].map((k) => t[k] > 0 && <div key={k} title={`${k}: ${t[k]}`} style={{ flex: t[k], background: cov[k] }} />)}
            </div>
            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {t.techniques.slice(0, 12).map((x) => (
                <button key={x.id} onClick={() => setTech(x)} title={x.name}
                  style={{ width: 14, height: 14, borderRadius: 2, border: 'none', cursor: 'pointer', background: cov[x.status] }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {tech && (
        <div style={{ marginTop: 8, background: '#0b1220', borderRadius: 6, padding: '10px 13px', color: '#e2e8f0', fontSize: 11.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{tech.id} · {tech.name}</strong>
            <button onClick={() => setTech(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ marginTop: 4, color: '#cbd5e1' }}>Coverage: <span style={{ color: cov[tech.status] === '#e5e9f0' ? '#94a3b8' : cov[tech.status] }}>{tech.status}</span> · confidence {tech.confidence || 'low'} · evidencing check: <code style={{ color: '#7dd3fc' }}>{tech.source_check || 'none'}</code></div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10.5, color: INK2 }}>
        {[['prevent', 'Prevent'], ['detect', 'Detect'], ['none', 'No coverage']].map(([k, l]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 11, height: 11, borderRadius: 2, background: cov[k], display: 'inline-block' }} />{l}</span>
        ))}
      </div>

      {/* Failing queue */}
      <h3 style={{ fontSize: 13, color: INK, margin: '20px 0 8px' }}>Failing-control queue ({data.failingQueue.length})</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {data.failingQueue.map((q) => (
          <div key={q.check} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${RED}`, borderRadius: 5, padding: '8px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: INK }}>{q.title}</span>
              <span style={{ fontSize: 11, color: RED }}>{q.observed ?? '—'} vs {q.expected ?? '—'}</span>
            </div>
            <div style={{ fontSize: 10, color: INK3, marginTop: 2 }}>CSF {q.csf || '—'} · 800-53 {q.controls || '—'} · {q.tool}</div>
            <div style={{ fontSize: 11.5, color: INK, marginTop: 4 }}>→ {q.recommendation}</div>
          </div>
        ))}
      </div>

      {/* Trends + CIS pending */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 18 }}>
        <div><div style={{ fontSize: 11, color: INK3 }}>CSF overall trend</div><Spark points={data.trends.csf} /></div>
        <div><div style={{ fontSize: 11, color: INK3 }}>800-53 overall trend</div><Spark points={data.trends.nist80053} /></div>
      </div>
      {data.cis && data.cis.status === 'ingested' && (
        <>
          <h3 style={{ fontSize: 13, color: INK, margin: '20px 0 8px' }}>CIS Controls v{data.cis.version} — the 18 Controls <span style={{ color: INK3, fontWeight: 400 }}>({data.cis.safeguards} safeguards)</span></h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px,1fr))', gap: 8 }}>
            {(data.cis.controls || []).map((c) => {
              const col = c.attainmentPct >= 80 ? GREEN : c.attainmentPct >= 50 ? AMBER : RED;
              return (
                <div key={c.number} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${col}`, borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: INK }}><span style={{ color: INK3 }}>{c.number}.</span> {c.name}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: col, fontVariantNumeric: 'tabular-nums' }}>{c.attainmentPct}%</span>
                  </div>
                  <div style={{ height: 5, background: '#eef2f6', borderRadius: 3, margin: '6px 0 4px' }}><div style={{ width: `${c.attainmentPct}%`, height: '100%', background: col, borderRadius: 3 }} /></div>
                  <div style={{ fontSize: 10, color: INK3 }}>{c.covered}/{c.safeguards} safeguards evidenced · {c.status}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {data.cis && data.cis.status === 'pending' && (
        <div style={{ marginTop: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 12px', fontSize: 11.5, color: '#92400e' }}>
          <strong>CIS Controls v8.1 (IG1/2/3):</strong> {data.cis.note}
        </div>
      )}
    </div>
  );
}
