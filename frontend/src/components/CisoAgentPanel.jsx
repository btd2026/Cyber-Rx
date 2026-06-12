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

import React, { useState, useEffect, useMemo } from 'react';
import CisoAnswerView from './CisoAnswerView';
import { useAgentVoice, VoiceControls } from './agentVoice';

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
  const voice = useAgentVoice();
  const { token, orgId, api } = ctx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    fetch(`${api}/api/ciso/dashboard?org_id=${encodeURIComponent(orgId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setD).catch((e) => setError(e.message));
  }, [api, orgId, token]);

  const active = useMemo(() => (d && activeId ? d.questions.find((q) => q.id === activeId) : null), [d, activeId]);
  const issues = useMemo(() => {
    if (!d || !active) return [];
    return (active.riskDrivers || []).map((label) => ({ label, entity: matchEntity(d, label) }));
  }, [d, active]);

  const intro = "Hi, I'm Michael, your CISO agent. This is your security command surface. Pick one of the five questions below and I'll give you a clear, decision-ready answer about your organization's posture — what's changed, why it matters, and exactly what to do, with the evidence behind it. Or use the tabs above to go deeper: Security Posture for the full dashboard, AI Controls for your AI and GenAI risk, Attack Path to see how an attacker would reach your critical processes, and Four-Lens to see compliance against NIST CSF, 800-53, and CIS. I'll explain anything you click. Where would you like to start?";

  // Michael introduces himself once when the CISO tab opens (respects mute).
  useEffect(() => {
    if (!d) return;
    if (typeof window !== 'undefined' && window._cx_ciso_intro_done) return;
    if (typeof window !== 'undefined') window._cx_ciso_intro_done = true;
    const t = setTimeout(() => voice.speak(intro), 350);
    return () => clearTimeout(t);
  }, [d]); // eslint-disable-line

  const selectQuestion = (q) => {
    voice.stop(); setIssue(null);
    const on = q.id === activeId;
    setActiveId(on ? null : q.id);
    if (!on) setTimeout(() => voice.speak(q.narration), 120); // voice TEACHES, not reads the screen
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
        <VoiceControls voice={voice} onReplay={() => voice.speak(active ? active.narration : intro)} label="Hear Michael" />
      </div>

      {/* Agent self-introduction — what's possible on the CISO tab */}
      <div style={{ display: 'flex', gap: 12, background: '#0f1b2d', color: '#e6ecf5', borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 17, background: '#1e3a5f', color: '#9bc0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>M</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          <strong style={{ color: '#9bc0ff' }}>Michael — your CISO agent.</strong> Pick a question below for a decision-ready answer about your posture, or use the tabs above to go deeper:
          <strong> Security Posture</strong> (full dashboard), <strong>AI Controls</strong>, <strong>Attack Path</strong>, and <strong>Four-Lens</strong> (NIST CSF · 800-53 · CIS · ATT&CK). I'll explain anything you click.
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

      {issue && <IssueDrawer item={issue} voice={voice} onClose={() => { voice.stop(); setIssue(null); }} />}
    </div>
  );
}

/* ---- drill-down detail: leads with WHAT/WHY, traces to SOURCE, ends with ACTION ---- */
function IssueDrawer({ item, onClose, voice }) {
  const { kind, e } = item;
  useEffect(() => { if (voice && e && e.narration) { const t = setTimeout(() => voice.speak(e.narration), 150); return () => clearTimeout(t); } }, []); // eslint-disable-line
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {voice && e.narration && <VoiceControls voice={voice} onReplay={() => voice.speak(e.narration)} label="Explain" />}
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: INK3, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
        {/* SME explanation — the agent explains in plain English */}
        {e.explanation && (
          <div style={{ marginTop: 14, background: '#eef4fb', border: '1px solid #cfe0f3', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Michael explains</div>
            <div style={{ fontSize: 13, color: INK, lineHeight: 1.6 }}>{e.explanation}</div>
          </div>
        )}
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
