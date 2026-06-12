/**
 * CisoAgentPanel — the CISO agent's Q&A landing (CISO persona only)
 * ----------------------------------------------------------------
 * Clean, professional, board-ready. No other persona, no Command Center guide.
 * The 5 executive questions stay as a fixed list; the one being answered is
 * highlighted. The answer renders directly below — a single decision-ready
 * explanation whose called-out issues are clickable, opening a detail drawer
 * that traces the issue to its source. The CISO agent (Michael) can read the
 * answer aloud on request.
 *
 * One fetch of /api/ciso/dashboard provides all answers plus the supporting
 * entities used for drill-down (mock today, live-API replaceable).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import CisoAnswerView from './CisoAnswerView';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e8edf3', PANEL = '#f8fafc';
const C = { Strong: '#1f8a4c', Moderate: '#B07C2E', Weak: '#A85B2E', Critical: '#C0392B' };
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

// Michael — the CISO agent voice (male, natural where available).
function pickMichaelVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const vs = window.speechSynthesis.getVoices() || [];
  const prefer = ['Microsoft Guy Online (Natural)', 'Google US English', 'Daniel', 'Microsoft David', 'Alex'];
  for (const name of prefer) { const v = vs.find((x) => x.name === name); if (v) return v; }
  return vs.find((v) => /en/i.test(v.lang) && /male|guy|daniel|david|alex|mark|ryan/i.test(v.name)) || vs.find((v) => /en/i.test(v.lang)) || null;
}
function answerToSpeech(a) {
  if (!a) return '';
  return [
    a.answer,
    `Status: ${a.status}. Confidence: ${a.confidence}.`,
    `Why it matters. ${a.whyItMatters}`,
    `Recommended action. ${a.recommendedAction}`,
    `Owner ${a.owner}, target ${a.targetDate}.`,
  ].join(' ');
}

// Match a called-out issue string to a dashboard entity for drill-down.
function matchEntity(d, text) {
  const t = String(text || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[-–:].*$/, '').trim();
  if (!t) return null;
  const hit = (name) => { const n = String(name || '').toLowerCase(); return n && (t.includes(n) || n.includes(t)); };
  let e;
  if ((e = d.controlRisk.find((c) => hit(c.name)))) return { kind: 'control', e };
  if ((e = (d.thresholds.rows || []).find((x) => hit(x.name)))) return { kind: 'threshold', e };
  if ((e = d.attackPathways.find((p) => hit(p.weakestControl) || hit(p.process)))) return { kind: 'pathway', e };
  if ((e = d.businessProcesses.find((p) => hit(p.name)))) return { kind: 'process', e };
  if ((e = d.domainMatrix.find((x) => hit(x.name)))) return { kind: 'domain', e };
  if ((e = (d.hiddenRisks || []).find((h) => hit(h.risk)))) return { kind: 'hidden', e };
  return null;
}

export default function CisoAgentPanel(props) {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [issue, setIssue] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const voiceOn = useRef(true);
  const { token, orgId, api } = ctx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    fetch(`${api}/api/ciso/dashboard?org_id=${encodeURIComponent(orgId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setD).catch((e) => setError(e.message));
    return () => { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); };
  }, [api, orgId, token]);

  const active = useMemo(() => (d && activeId ? d.questions.find((q) => q.id === activeId) : null), [d, activeId]);
  const issues = useMemo(() => {
    if (!d || !active) return [];
    return (active.riskDrivers || []).map((label) => ({ label, entity: matchEntity(d, label) }));
  }, [d, active]);

  const speak = (a) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(answerToSpeech(a));
    const v = pickMichaelVoice(); if (v) u.voice = v;
    u.rate = 1.04; u.pitch = 1.0;
    u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(u);
  };
  const stopSpeak = () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); setSpeaking(false); };
  const selectQuestion = (q) => {
    stopSpeak(); setIssue(null);
    const on = q.id === activeId;
    setActiveId(on ? null : q.id);
    if (!on && voiceOn.current) setTimeout(() => speak(q), 120);
  };

  if (error) return <div style={{ padding: 24, color: '#C0392B', fontSize: 13 }}>Could not load the CISO agent: {error}</div>;
  if (!d) return <div style={{ padding: 24, color: INK3, fontSize: 13 }}>Loading CISO security questions…</div>;

  return (
    <div style={{ padding: '4px 0 8px' }}>
      {/* Header — agent + voice control (Michael), no Command Center guide */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Michael · CISO Agent — ask a question
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {active && (
            <button onClick={() => (speaking ? stopSpeak() : speak(active))}
              style={{ background: speaking ? '#C0392B' : INK, color: '#fff', border: 'none', borderRadius: 16, padding: '5px 13px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
              {speaking ? '■ Stop' : '▶ Hear Michael'}
            </button>
          )}
          <label style={{ fontSize: 11, color: INK2, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked onChange={(e) => { voiceOn.current = e.target.checked; if (!e.target.checked) stopSpeak(); }} />
            Auto voice
          </label>
        </div>
      </div>

      {/* Questions — fixed 5; active one highlighted */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {d.questions.map((q) => {
          const on = q.id === activeId;
          return (
            <button key={q.id} onClick={() => selectQuestion(q)}
              style={{
                textAlign: 'left', background: on ? INK : '#fff', color: on ? '#fff' : INK,
                border: `1px solid ${on ? INK : HAIR}`, borderRadius: 10, padding: '12px 15px',
                fontSize: 14, fontWeight: on ? 700 : 500, cursor: 'pointer', lineHeight: 1.4,
                boxShadow: on ? '0 2px 10px rgba(15,23,42,0.18)' : 'none', transition: 'all .12s',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: on ? '#1e3a5f' : PANEL, color: on ? '#9bc0ff' : INK3, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{q.n}</span>
              {q.question}
            </button>
          );
        })}
      </div>

      {/* Answer — directly below */}
      <div style={{ marginTop: 18 }}>
        {!active ? (
          <div style={{ border: `1px dashed ${HAIR}`, borderRadius: 10, padding: '28px', textAlign: 'center', color: INK3, fontSize: 13, background: PANEL }}>
            Select a question and Michael will answer it here — with the evidence, the recommended action, the owner, and a target date. Click any issue in the answer to trace it to its source.
          </div>
        ) : (
          <CisoAnswerView a={active} issues={issues} onIssueClick={setIssue} />
        )}
      </div>

      {issue && <IssueDrawer item={issue} onClose={() => setIssue(null)} />}
    </div>
  );
}

/* ---- drill-down detail: leads with WHAT/WHY, traces to SOURCE, ends with ACTION ---- */
function IssueDrawer({ item, onClose }) {
  const { kind, e } = item;
  let title = '', tag = '', sev = INK, what = '', why = '', source = '', process = '', action = '';
  if (kind === 'control') {
    title = e.name; tag = `${e.csf} · ${e.cis}`; sev = e.riskContribution >= 80 ? SEV.Critical : SEV.High;
    what = `Risk contribution ${e.riskContribution}/100 — likelihood ${e.likelihood}, impact ${e.impact}.`;
    why = `${e.threatRelevance}. Blast radius: ${e.blastRadius}.`;
    source = e.evidence; process = e.processAffected; action = e.action;
  } else if (kind === 'threshold') {
    const breach = (e.status || '') === 'Breach'; sev = breach ? SEV[e.breachSeverity] : '#1f8a4c';
    title = e.name; tag = breach ? `Breach · ${e.breachSeverity}` : 'Within appetite';
    what = `Current ${e.current}${e.unit === '%' ? '%' : ' ' + e.unit} against threshold ${e.threshold} (trend ${e.trend}).`;
    why = `Risk-appetite reference: ${e.policyRef}.`;
    source = `Live metric vs ${e.policyRef}`; action = breach ? e.action : 'Within appetite — monitor.';
  } else if (kind === 'pathway') {
    title = `Attack path · ${e.process}`; tag = `Weakest control: ${e.weakestControl}`; sev = SEV.Critical;
    what = e.narrative;
    why = `Business impact: ${e.businessImpact}.`;
    source = `Initial access: ${e.initialAccess} · Target: ${e.target}`; process = e.process; action = `${e.breakingControls[0]}. ${e.mitigation}.`;
  } else if (kind === 'process') {
    title = e.name; tag = `Cyber resilience: ${e.resilienceRating}`; sev = C[e.resilienceRating] || INK;
    what = `Protection ${e.protectionLevel}/100. Identity ${e.identityRisk} · Vuln ${e.vulnRisk} · Detection ${e.detectionCoverage} · Data ${e.dataProtection} · Recovery ${e.recoveryReadiness} · 3rd-party ${e.thirdPartyRisk}.`;
    why = `Supported by: ${e.supportingSystems.join(', ')}.`;
    source = `Process protection rollup`; process = e.name; action = 'Prioritize the weakest dimension above for this process.';
  } else if (kind === 'domain') {
    title = e.name; tag = `${e.status} · ${e.trend}`; sev = C[e.status] || INK;
    what = `Score ${e.current}/100 (was ${e.previous}, ${e.delta > 0 ? '+' : ''}${e.delta}).`;
    why = `Improving: ${e.topImproving.metric} (+${e.topImproving.delta}). Deteriorating: ${e.topDeteriorating.metric} (${e.topDeteriorating.delta}).`;
    source = e.source; action = `Address ${e.topDeteriorating.metric} to reverse the decline.`;
  } else if (kind === 'hidden') {
    title = e.risk; tag = `${e.domain} · ${e.process}`; sev = '#7c3aed';
    what = e.impact;
    why = `Why it's hidden: ${e.whyHidden}.`;
    source = e.evidence; process = e.process;
    action = `${e.escalation}. Formal acceptance: ${e.formalAcceptance === false ? 'none on record' : e.formalAcceptance === 'expired' ? 'expired' : 'on record'}.`;
  }
  const Row = ({ k, v }) => v ? (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{k}</div>
      <div style={{ fontSize: 13, color: INK, lineHeight: 1.55 }}>{v}</div>
    </div>
  ) : null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,0.45)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(ev) => ev.stopPropagation()} style={{ width: 'min(480px,92vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)', overflowY: 'auto', padding: '22px 24px', borderTop: `4px solid ${sev}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingBottom: 14, borderBottom: `1px solid ${HAIR}` }}>
          <div>
            <div style={{ fontSize: 10, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Issue detail</div>
            <h3 style={{ margin: '4px 0 2px', fontSize: 15.5, fontWeight: 700, color: INK }}>{title}</h3>
            <div style={{ fontSize: 11.5, color: INK2 }}>{tag}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: INK3, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <Row k="What it is" v={what} />
          <Row k="Why it matters" v={why} />
          <Row k="Evidence / source — how we know" v={source} />
          <Row k="Affected business process" v={process} />
        </div>
        {action && (
          <div style={{ background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1f8a4c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Recommended action</div>
            <div style={{ fontSize: 13, color: INK, lineHeight: 1.55 }}>{action}</div>
          </div>
        )}
      </div>
    </div>
  );
}
