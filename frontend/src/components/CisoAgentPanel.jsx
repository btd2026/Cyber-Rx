/**
 * CisoAgentPanel — the CISO agent's Q&A landing (CISO persona only)
 * ----------------------------------------------------------------
 * Clean, professional, board-ready. No agent intro, no voice, no other persona.
 * The 15 executive questions stay as a fixed list; the one being answered is
 * highlighted. The answer renders directly below — a single decision-ready
 * explanation (no posture score) whose called-out issues are clickable, opening
 * a detail drawer for the underlying control, threshold, attack path, process,
 * or domain.
 *
 * One fetch of /api/ciso/dashboard provides all 15 answers plus the supporting
 * entities used for drill-down (mock today, live-API replaceable).
 */

import React, { useState, useEffect, useMemo } from 'react';
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

// Match a called-out issue string to a dashboard entity for drill-down.
function matchEntity(d, text) {
  const t = String(text || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[-–].*$/, '').trim();
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

  if (error) return <div style={{ padding: 24, color: '#C0392B', fontSize: 13 }}>Could not load the CISO agent: {error}</div>;
  if (!d) return <div style={{ padding: 24, color: INK3, fontSize: 13 }}>Loading CISO security questions…</div>;

  return (
    <div style={{ padding: '4px 0 8px' }}>
      {/* Questions — fixed list; active one highlighted */}
      <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
        Ask the CISO agent
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {d.questions.map((q) => {
          const on = q.id === activeId;
          return (
            <button key={q.id} onClick={() => { setActiveId(on ? null : q.id); setIssue(null); }}
              style={{
                textAlign: 'left', background: on ? INK : '#fff', color: on ? '#fff' : INK2,
                border: `1px solid ${on ? INK : HAIR}`, borderRadius: 9, padding: '9px 13px',
                fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: 'pointer', lineHeight: 1.35,
                boxShadow: on ? '0 2px 8px rgba(15,23,42,0.18)' : 'none', transition: 'all .12s',
              }}>
              <span style={{ color: on ? '#9bc0ff' : INK3, fontWeight: 700, marginRight: 6 }}>{q.n}</span>{q.question}
            </button>
          );
        })}
      </div>

      {/* Answer — directly below the questions */}
      <div style={{ marginTop: 18 }}>
        {!active ? (
          <div style={{ border: `1px dashed ${HAIR}`, borderRadius: 10, padding: '28px', textAlign: 'center', color: INK3, fontSize: 13, background: PANEL }}>
            Select a question above and the agent will answer it here — with the evidence, the recommended action, the owner, and a target date.
          </div>
        ) : (
          <CisoAnswerView a={active} issues={issues} onIssueClick={setIssue} />
        )}
      </div>

      {issue && <IssueDrawer item={issue} onClose={() => setIssue(null)} />}
    </div>
  );
}

/* ---- drill-down detail drawer for a called-out issue ---- */
function IssueDrawer({ item, onClose }) {
  const { kind, e } = item;
  const Row = ({ k, v, strong }) => (
    <div style={{ display: 'flex', gap: 10, fontSize: 12.5, marginBottom: 6 }}>
      <span style={{ width: 140, color: INK3, flexShrink: 0 }}>{k}</span>
      <span style={{ color: INK, fontWeight: strong ? 700 : 400, lineHeight: 1.5 }}>{v}</span>
    </div>
  );
  let title = '', subtitle = '', body = null, accent = INK;
  if (kind === 'control') {
    title = e.name; subtitle = `${e.csf} · ${e.cis}`; accent = e.riskContribution >= 80 ? SEV.Critical : SEV.High;
    body = (<>
      <Row k="Risk contribution" v={`${e.riskContribution}/100`} strong />
      <Row k="Likelihood" v={e.likelihood} /><Row k="Impact" v={e.impact} />
      <Row k="Blast radius" v={e.blastRadius} /><Row k="Threat relevance" v={e.threatRelevance} />
      <Row k="Process affected" v={e.processAffected} /><Row k="Evidence" v={e.evidence} />
      <Action text={e.action} />
    </>);
  } else if (kind === 'threshold') {
    const breach = (e.status || '') === 'Breach'; accent = breach ? SEV[e.breachSeverity] : '#1f8a4c';
    title = e.name; subtitle = breach ? `Breach · ${e.breachSeverity}` : 'Within appetite';
    body = (<>
      <Row k="Current" v={`${e.current}${e.unit === '%' ? '%' : ' ' + e.unit}`} strong />
      <Row k="Threshold" v={e.threshold} /><Row k="Trend" v={e.trend} />
      <Row k="Policy" v={e.policyRef} />
      {breach && <Action text={e.action} />}
    </>);
  } else if (kind === 'pathway') {
    title = `Attack path · ${e.process}`; subtitle = `Weakest control: ${e.weakestControl}`; accent = SEV.Critical;
    body = (<>
      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.6, marginBottom: 10 }}>{e.narrative}</div>
      <Row k="Initial access" v={e.initialAccess} /><Row k="Escalation" v={e.escalation} />
      <Row k="Lateral movement" v={e.lateral} /><Row k="Target" v={e.target} />
      <Row k="Business impact" v={e.businessImpact} /><Row k="Weakest control" v={e.weakestControl} strong />
      <Action text={e.mitigation} />
    </>);
  } else if (kind === 'process') {
    title = e.name; subtitle = `Cyber resilience: ${e.resilienceRating}`; accent = C[e.resilienceRating] || INK;
    body = (<>
      <Row k="Protection level" v={`${e.protectionLevel}/100`} strong />
      <Row k="Supporting systems" v={e.supportingSystems.join(', ')} />
      <Row k="Identity risk" v={e.identityRisk} /><Row k="Vulnerability risk" v={e.vulnRisk} />
      <Row k="Detection coverage" v={e.detectionCoverage} /><Row k="Data protection" v={e.dataProtection} />
      <Row k="Recovery readiness" v={e.recoveryReadiness} /><Row k="Third-party dependency" v={e.thirdPartyRisk} />
    </>);
  } else if (kind === 'domain') {
    title = e.name; subtitle = `${e.status} · ${e.trend}`; accent = C[e.status] || INK;
    body = (<>
      <Row k="Current score" v={`${e.current}/100`} strong /><Row k="Previous" v={`${e.previous}`} />
      <Row k="Delta" v={`${e.delta > 0 ? '+' : ''}${e.delta}`} />
      <Row k="Top improving" v={`${e.topImproving.metric} (+${e.topImproving.delta})`} />
      <Row k="Top deteriorating" v={`${e.topDeteriorating.metric} (${e.topDeteriorating.delta})`} />
      <Row k="Evidence source" v={e.source} />
    </>);
  } else if (kind === 'hidden') {
    title = e.risk; subtitle = `${e.domain} · ${e.process}`; accent = '#7c3aed';
    body = (<>
      <Row k="Why hidden" v={e.whyHidden} /><Row k="Evidence" v={e.evidence} />
      <Row k="Potential impact" v={e.impact} />
      <Row k="Formal acceptance" v={e.formalAcceptance === false ? 'None on record' : e.formalAcceptance === 'expired' ? 'Exception expired' : 'Accepted'} strong />
      <Action text={e.escalation} />
    </>);
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,0.45)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(ev) => ev.stopPropagation()} style={{ width: 'min(500px,92vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)', overflowY: 'auto', padding: '22px 24px', borderTop: `4px solid ${accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${HAIR}` }}>
          <div>
            <div style={{ fontSize: 10, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{kind} detail</div>
            <h3 style={{ margin: '4px 0 2px', fontSize: 15, fontWeight: 700, color: INK }}>{title}</h3>
            <div style={{ fontSize: 11.5, color: INK2 }}>{subtitle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: INK3, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginTop: 14 }}>{body}</div>
      </div>
    </div>
  );
}

function Action({ text }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 12, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 7, padding: '10px 12px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1f8a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recommended action</div>
      <div style={{ fontSize: 12.5, color: INK, marginTop: 3, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}
