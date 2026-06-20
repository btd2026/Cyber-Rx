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
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, NAVY = COLORS.navy1;
const C = { Strong: COLORS.good, Moderate: COLORS.warn, Weak: '#c2410c', Critical: COLORS.bad };
const SEV = { Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good };

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
  if ((e = (d.investments || []).find((x) => hit(x.name)))) return { kind: 'investment', e };
  if ((e = (d.emergingRisks || []).find((x) => hit(x.risk)))) return { kind: 'emerging', e };
  return null;
}

export default function CisoAgentPanel(props) {
  const role = props.role || 'CISO';
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [issue, setIssue] = useState(null);
  const voice = useAgentVoice();
  const { token, orgId, api } = ctx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    fetch(`${api}/api/ciso/dashboard?role=${encodeURIComponent(role)}&org_id=${encodeURIComponent(orgId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setD).catch((e) => setError(e.message));
  }, [api, orgId, token, role]);

  const active = useMemo(() => (d && activeId ? d.questions.find((q) => q.id === activeId) : null), [d, activeId]);
  const issues = useMemo(() => {
    if (!d || !active) return [];
    return (active.riskDrivers || []).map((label) => ({ label, entity: matchEntity(d, label) }));
  }, [d, active]);

  const intro = role === 'CISO'
    ? "Hi, I'm your CISO agent. These are the five key questions every CISO should be able to answer at any time — how strong our posture is, where risk is concentrated, how we'd hold up if attacked today, whether we're inside our own risk thresholds, and whether our security investments are paying off. Each question shows a short summary of where we stand. Click a question and I'll give you the full details — the evidence, the recommended action, the owner, and a target date. Where would you like to start?"
    : `Hi, I'm your ${role} agent. These are the five key questions every ${role} should be able to answer at any time, each answered from your own data. Each question shows a short summary of where you stand. Click a question for the full details — the evidence behind it, the recommended action, the owner, and a target date. Where would you like to start?`;

  // The agent introduces itself once per role when the tab opens (respects mute).
  useEffect(() => {
    if (!d) return;
    const flag = `_cx_intro_done_${role}`;
    if (typeof window !== 'undefined' && window[flag]) return;
    if (typeof window !== 'undefined') window[flag] = true;
    const t = setTimeout(() => voice.speak(intro), 350);
    return () => clearTimeout(t);
  }, [d, role]); // eslint-disable-line

  const selectQuestion = (q) => {
    voice.stop(); setIssue(null);
    const on = q.id === activeId;
    setActiveId(on ? null : q.id);
    if (!on) setTimeout(() => voice.speak(q.narration), 120); // voice TEACHES, not reads the screen
  };

  if (error) return <div style={{ padding: 24, color: '#cf222e', fontSize: 13 }}>Could not load the {role} agent: {error}</div>;
  if (!d) return <div style={{ padding: 24, color: INK3, fontSize: 13 }}>Loading {role} questions…</div>;

  return (
    <div style={{ padding: '4px 0 8px' }}>
      {/* Header + voice control. Voice is kept intact; the agent is not named in writing. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Current State
        </div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(active ? active.narration : intro)} label="Listen" />
      </div>

      {/* Intro — shown only in list mode so the detail view stays focused. */}
      {!active && (
        <div style={{ background: COLORS.subtle, border: `1px solid ${COLORS.hair}`, color: COLORS.ink2, borderRadius: 10, padding: '14px 18px', marginBottom: 14, fontSize: 12.5, lineHeight: 1.6 }}>
          These are the <strong style={{ color: COLORS.accentText }}>5 key questions every {role} should be able to answer at any time</strong>. Each one shows a quick summary of where you stand right now — <strong>select a question</strong> for the full details: the answer, the evidence behind it, the recommended action, and who owns it.
        </div>
      )}

      {/* List mode — the 5 questions, each with a quick summary. Selecting one
          replaces the list with a focused detail view, so questions and their
          explanations are never interleaved. */}
      {!active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {d.questions.map((q) => (
            <button key={q.id} onClick={() => selectQuestion(q)}
              style={{ width: '100%', textAlign: 'left', background: '#fff', color: INK,
                border: `1px solid ${HAIR}`, borderLeft: `4px solid ${C[q.status] || INK3}`, borderRadius: 10, padding: '13px 16px', cursor: 'pointer', transition: 'all .12s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, background: PANEL, color: INK3, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{q.n}</span>
                <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{q.question}</span>
                {q.status && <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: '#fff', background: C[q.status] || INK3, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{q.status}</span>}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 7, paddingLeft: 32, color: INK2 }}>{q.answer}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4f5ac4', marginTop: 6, paddingLeft: 32 }}>View details →</div>
            </button>
          ))}
        </div>
      )}

      {/* Detail mode — one question, kept separate from the rest. */}
      {active && (
        <div>
          <button onClick={() => selectQuestion(active)}
            style={{ background: 'transparent', border: 'none', color: '#4f5ac4', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
            ← All questions
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: 12, background: NAVY, color: COLORS.accent, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{active.n}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: INK, lineHeight: 1.35, fontFamily: FONTS.display }}>{active.question}</span>
          </div>
          <CisoAnswerView a={active} role={role} issues={issues} onIssueClick={setIssue} />
        </div>
      )}

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
    const breach = (e.status || '') === 'Breach'; sev = breach ? SEV[e.breachSeverity] : '#1a7f37';
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
  } else if (kind === 'investment') {
    const reduction = (e.baselineRisk || 0) - (e.currentRisk || 0);
    title = e.name; tag = `${e.riskArea} · ${e.spend}`; sev = e.blockers ? SEV.Medium : '#1a7f37';
    what = `Measured risk cut from ${e.baselineRisk} to ${e.currentRisk} (−${reduction}); about ${e.futureReduction} more points available.`;
    why = e.blockers ? `Remaining return is blocked by: ${e.blockers}.` : 'On track — no blocker on record.';
    source = 'Investment-to-risk-reduction tracking';
    action = e.decision;
  } else if (kind === 'emerging') {
    title = e.risk; tag = `Velocity ${e.velocity} · our adaptation ${e.ourAdaptation}`;
    sev = (e.velocity === 'High' && e.ourAdaptation !== 'High') ? SEV.High : SEV.Medium;
    what = e.note;
    why = `This threat is moving ${String(e.velocity).toLowerCase()} while our adaptation is ${String(e.ourAdaptation).toLowerCase()} — the gap widens over time.`;
    source = 'Emerging-risk register';
    action = `Close the ${String(e.ourAdaptation).toLowerCase()}-adaptation gap before this is exploited.`;
  }
  const Row = ({ k, v }) => v ? (
    <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '11px 13px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{k}</div>
      <div style={{ fontSize: 13, color: INK, lineHeight: 1.55 }}>{v}</div>
    </div>
  ) : null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,0.45)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(ev) => ev.stopPropagation()} style={{ width: 'min(500px,94vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)', overflowY: 'auto', borderTop: `4px solid ${sev}` }}>
        {/* header band */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${HAIR}`, background: PANEL }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ fontSize: 10, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Issue detail</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: INK3, cursor: 'pointer', lineHeight: 1, marginTop: -4 }}>✕</button>
          </div>
          <h3 style={{ margin: '6px 0 8px', fontSize: 16, fontWeight: 800, color: INK, lineHeight: 1.35, fontFamily: FONTS.display }}>{title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: sev, borderRadius: 5, padding: '3px 10px' }}>{tag}</span>
            {voice && e.narration && <VoiceControls voice={voice} onReplay={() => voice.speak(e.narration)} label="Explain" />}
          </div>
        </div>

        <div style={{ padding: '18px 24px 26px' }}>
          {/* SME explanation — the agent explains in plain English */}
          {e.explanation && (
            <div style={{ background: '#eef0fb', border: '1px solid #dfe1e6', borderRadius: 9, padding: '13px 15px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4f5ac4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Why this matters</div>
              <div style={{ fontSize: 13, color: INK, lineHeight: 1.6 }}>{e.explanation}</div>
            </div>
          )}
          <div style={{ display: 'grid', gap: 10 }}>
            <Row k="What it is" v={what} />
            <Row k="Why it matters" v={why} />
            <Row k="Evidence / source — how we know" v={source} />
            <Row k="Affected business process" v={process} />
          </div>
          {action && (
            <div style={{ marginTop: 16, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 9, padding: '13px 15px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1a7f37', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Recommended action</div>
              <div style={{ fontSize: 13, color: INK, lineHeight: 1.55 }}>{action}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
