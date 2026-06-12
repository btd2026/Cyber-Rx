/**
 * CisoSecurityPostureDashboard — dedicated CISO persona view
 * ----------------------------------------------------------
 * Executive decision-support dashboard (NOT a GRC compliance view). Business
 * language first, technical detail second. Every score is explainable and every
 * recommendation traces to evidence. CISO persona only — no other executives.
 *
 * Sections: Overall Posture hero · Executive Q&A (15 decision-ready answers with
 * an evidence drawer) · Domain Health Matrix · Control Risk Contribution ·
 * Security Thresholds · Action-Now Queue · Business-Process Protection · Attack
 * Pathways · Readiness & Investment · Hidden Risk. Exportable executive summary.
 *
 * Data: GET /api/ciso/dashboard (computed; mock today, live-API replaceable).
 */

import React, { useState, useEffect } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc', NAVY = '#0f1b2d';
const C = { Strong: '#1f8a4c', Moderate: '#B07C2E', Weak: '#A85B2E', Critical: '#C0392B', 'Not assessed': '#94a3b8' };
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };
const conf = (c) => (c === 'High' ? '#1f8a4c' : c === 'Medium' ? '#B07C2E' : '#94a3b8');
const band = (s) => (s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical');
const sc = (s) => C[band(s)];

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
  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: color, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{text}</span>
);
const Trend = ({ d }) => {
  const up = d > 0, flat = d === 0;
  return <span style={{ color: flat ? INK3 : up ? '#1f8a4c' : '#C0392B', fontWeight: 700, fontSize: 11 }}>{flat ? '▬' : up ? '▲' : '▼'} {d > 0 ? '+' : ''}{d}</span>;
};
function Bar({ value, color }) {
  return <div style={{ height: 6, background: '#eef2f6', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color || sc(value), borderRadius: 3 }} /></div>;
}

export default function CisoSecurityPostureDashboard(props) {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('qa');
  const voice = useAgentVoice();
  const [drawer, setDrawer] = useState(null);   // an executive answer
  const [pathSel, setPathSel] = useState(0);
  const { token, orgId, api } = ctx(props);

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    fetch(`${api}/api/ciso/dashboard?org_id=${encodeURIComponent(orgId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setD).catch((e) => setError(e.message));
  }, [api, orgId, token]);

  // When arrived from the CISO agent with a question, open the Q&A tab and the
  // matching answer's evidence drawer so the agent's answer is front-and-center.
  useEffect(() => {
    if (!d || !props.focusQuestion) return;
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const t = norm(props.focusQuestion);
    const a = d.questions.find((x) => norm(x.question) === t)
      || d.questions.find((x) => norm(x.question).includes(t) || t.includes(norm(x.question)));
    if (a) { setTab('qa'); setDrawer(a); }
  }, [d, props.focusQuestion]);

  // Auto-narrate the active tab (Michael explains the page). Respects mute.
  useEffect(() => {
    if (d && d.tabNarration && d.tabNarration[tab]) voice.speak(d.tabNarration[tab]);
    return () => voice.stop();
  }, [d, tab]); // eslint-disable-line

  if (error) return <div style={{ padding: 24, color: '#C0392B', fontSize: 13 }}>Could not load CISO dashboard: {error}</div>;
  if (!d) return <div style={{ padding: 24, color: INK3, fontSize: 13 }}>Composing CISO security posture…</div>;

  const p = d.overallPosture;
  const refreshed = new Date(d.generatedAt).toLocaleString();

  const TABS = [
    ['qa', `Executive Q&A · 15`], ['domains', 'Domain Health'], ['controls', 'Control Risk'],
    ['thresholds', `Thresholds · ${d.thresholds.breaches} breached`], ['actions', 'Action Now'],
    ['processes', 'Process Protection'], ['paths', 'Attack Pathways'], ['readiness', 'Readiness & Investment'],
    ['hidden', `Hidden Risk · ${d.hiddenRisks.length}`],
  ];

  return (
    <div style={{ background: PANEL, borderRadius: 8, padding: 0, fontFamily: 'inherit' }}>
      {/* ===== Hero: Overall Security Posture ===== */}
      <div style={{ background: NAVY, borderRadius: '8px 8px 0 0', padding: '22px 28px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: sc(p.current) === '#A85B2E' ? '#f0a868' : sc(p.current) }}>{p.current}</div>
              <div style={{ fontSize: 10, color: '#8fa3bd', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>of 100 · {band(p.current)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#8fa3bd', textTransform: 'uppercase', letterSpacing: '0.16em' }}>CISO · Security Posture</div>
              <h2 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 700 }}>Executive Security Posture</h2>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12.5, color: '#cbd5e1' }}>
                <span>Last period <strong style={{ color: '#fff' }}>{p.previous}</strong></span>
                <span style={{ color: p.delta >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>{p.delta >= 0 ? '▲ +' : '▼ '}{p.delta} pts</span>
                <span style={{ textTransform: 'capitalize' }}>{p.trend}</span>
                <span style={{ color: '#8fa3bd' }}>· Confidence {p.confidence}</span>
              </div>
            </div>
          </div>
          <button onClick={() => exportSummary(d)} style={{ background: '#1e3a5f', color: '#fff', border: '1px solid #2c4f7c', borderRadius: 6, padding: '9px 15px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⤓ Export executive summary</button>
        </div>
        <div style={{ marginTop: 14, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, maxWidth: 920 }}>{p.narrative}</div>
        {/* weighted domain strip */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {d.domainMatrix.filter((x) => x.weight > 0).map((x) => (
            <div key={x.id} title={`${x.name} ${x.current} (${x.weight}% weight)`} style={{ flex: 1, minWidth: 92, background: '#16263b', borderRadius: 5, padding: '7px 9px' }}>
              <div style={{ fontSize: 9.5, color: '#8fa3bd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: sc(x.current) === '#A85B2E' ? '#f0a868' : sc(x.current) }}>{x.current}</span>
                <Trend d={x.delta} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div style={{ display: 'flex', gap: 0, background: '#fff', borderBottom: `1px solid ${HAIR}`, overflowX: 'auto', position: 'sticky', top: 0, zIndex: 5 }}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === k ? INK : 'transparent'}`, color: tab === k ? INK : INK3, padding: '11px 15px', cursor: 'pointer', fontSize: 12, fontWeight: tab === k ? 700 : 500, whiteSpace: 'nowrap' }}>{label}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: '18px 22px' }}>
        {/* Standalone tab intro + agent voice (Michael explains the page) */}
        {d.tabNarration && d.tabNarration[tab] && (
          <div style={{ display: 'flex', gap: 14, justifyContent: 'space-between', alignItems: 'flex-start', background: '#eef4fb', border: '1px solid #cfe0f3', borderRadius: 8, padding: '12px 15px', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Michael explains this view</div>
              <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.55 }}>{d.tabNarration[tab]}</div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <VoiceControls voice={voice} onReplay={() => voice.speak(d.tabNarration[tab])} label="Explain" />
            </div>
          </div>
        )}
        {tab === 'qa' && <ExecQA questions={d.questions} onEvidence={setDrawer} />}
        {tab === 'domains' && <Domains matrix={d.domainMatrix} />}
        {tab === 'controls' && <Controls rows={d.controlRisk} />}
        {tab === 'thresholds' && <Thresholds board={d.thresholds} />}
        {tab === 'actions' && <Actions queue={d.actionQueue} attention={d.attentionItems} />}
        {tab === 'processes' && <Processes procs={d.businessProcesses} />}
        {tab === 'paths' && <Pathways paths={d.attackPathways} sel={pathSel} setSel={setPathSel} />}
        {tab === 'readiness' && <Readiness readiness={d.readiness} investments={d.investments} peers={d.peerMaturity} emerging={d.emergingRisks} />}
        {tab === 'hidden' && <Hidden risks={d.hiddenRisks} />}
        <div style={{ fontSize: 10.5, color: INK3, marginTop: 16, borderTop: `1px solid ${HAIR}`, paddingTop: 10 }}>
          Last refreshed {refreshed}. Mock/demo data — structured for live replacement via {d.evidenceSources.length} sources (Okta, Splunk, ServiceNow, CrowdStrike, Tenable, SailPoint, Prisma, Panorama, DLP, backup).
        </div>
      </div>

      {drawer && <EvidenceDrawer a={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}

/* ---------------- Executive Q&A ---------------- */
function ExecQA({ questions, onEvidence }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 12 }}>
      {questions.map((a) => (
        <div key={a.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${C[a.status]}`, borderRadius: 7, padding: '14px 16px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{a.n}. {a.question}</div>
            <Pill text={a.status} color={C[a.status]} />
          </div>
          <div style={{ fontSize: 13, color: INK, marginTop: 8, lineHeight: 1.5 }}>{a.answer}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 10.5, color: INK2, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>Confidence <strong style={{ color: conf(a.confidence) }}>{a.confidence}</strong></span>
            <span>Owner <strong>{a.owner}</strong></span>
            <span>Target <strong>{a.targetDate}</strong></span>
            <button onClick={() => onEvidence(a)} style={{ marginLeft: 'auto', background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 5, padding: '4px 10px', fontSize: 10.5, fontWeight: 600, color: INK, cursor: 'pointer' }}>Evidence & decision →</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidenceDrawer({ a, onClose }) {
  const Row = ({ label, children }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,0.45)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 92vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)', overflowY: 'auto', padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${HAIR}` }}>
          <div>
            <div style={{ fontSize: 10, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CISO Question {a.n}</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: INK }}>{a.question}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: INK3, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}><Pill text={a.status} color={C[a.status]} /><Pill text={`Confidence ${a.confidence}`} color={conf(a.confidence)} /></div>
        <Row label="Answer">{a.answer}</Row>
        <Row label="What changed">{a.whatChanged}</Row>
        <Row label="Why it matters">{a.whyItMatters}</Row>
        <Row label="Evidence">
          <ul style={{ margin: 0, paddingLeft: 16 }}>{a.evidence.map((e, i) => <li key={i} style={{ marginBottom: 3 }}>{e}</li>)}</ul>
        </Row>
        <Row label="Business / process impact">{a.businessImpact}</Row>
        <Row label="Key risk drivers">{(a.riskDrivers || []).join(' · ')}</Row>
        <div style={{ background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 6, padding: '10px 12px', margin: '10px 0' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1f8a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recommended action</div>
          <div style={{ fontSize: 12.5, color: INK, marginTop: 3 }}>{a.recommendedAction}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: INK2, flexWrap: 'wrap' }}>
          <span>Owner <strong>{a.owner}</strong></span><span>Target <strong>{a.targetDate}</strong></span>
        </div>
        <div style={{ fontSize: 10.5, color: INK3, marginTop: 12 }}>Data sources: {(a.dataSources || []).join(', ')} · Last refreshed {new Date(a.lastRefreshed).toLocaleString()}</div>
      </div>
    </div>
  );
}

/* ---------------- Domain Health Matrix ---------------- */
function Domains({ matrix }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
      {matrix.map((m) => (
        <div key={m.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 7, padding: '13px 15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{m.name}{m.weight > 0 && <span style={{ fontSize: 9.5, color: INK3, fontWeight: 500 }}> · {m.weight}%</span>}</span>
            <Pill text={m.status} color={C[m.status]} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0' }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: sc(m.current) }}>{m.current}</span>
            <span style={{ fontSize: 11, color: INK3 }}>was {m.previous}</span>
            <Trend d={m.delta} />
            <span style={{ marginLeft: 'auto', fontSize: 10, color: m.trend === 'improving' ? '#1f8a4c' : m.trend === 'deteriorating' ? '#C0392B' : INK3, fontWeight: 600, textTransform: 'capitalize' }}>{m.trend}</span>
          </div>
          <Bar value={m.current} />
          <div style={{ fontSize: 10.5, color: INK2, marginTop: 8, lineHeight: 1.5 }}>
            <div>▲ <span style={{ color: '#1f8a4c' }}>{m.topImproving.metric} (+{m.topImproving.delta})</span></div>
            <div>▼ <span style={{ color: '#C0392B' }}>{m.topDeteriorating.metric} ({m.topDeteriorating.delta})</span></div>
          </div>
          <div style={{ fontSize: 9.5, color: INK3, marginTop: 6 }}>Source: {m.source}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Control Risk Contribution ---------------- */
function Controls({ rows }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {rows.map((c) => (
        <div key={c.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => setOpen(open === c.id ? null : c.id)} style={{ width: '100%', textAlign: 'left', background: open === c.id ? PANEL : '#fff', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: INK3, width: 22 }}>#{c.rank}</span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK }}>{c.name}<span style={{ fontSize: 9.5, color: INK3, fontWeight: 500, marginLeft: 8 }}>{c.csf} · {c.cis}</span></span>
            <span style={{ width: 120 }}><Bar value={c.riskContribution} color={c.riskContribution >= 80 ? '#C0392B' : c.riskContribution >= 60 ? '#A85B2E' : '#B07C2E'} /></span>
            <span style={{ fontSize: 13, fontWeight: 800, color: c.riskContribution >= 80 ? '#C0392B' : '#A85B2E', width: 30, textAlign: 'right' }}>{c.riskContribution}</span>
          </button>
          {open === c.id && (
            <div style={{ padding: '4px 14px 14px 48px', background: PANEL, fontSize: 11.5, color: INK2, lineHeight: 1.6 }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                <span>Likelihood <strong style={{ color: INK }}>{c.likelihood}</strong></span>
                <span>Impact <strong style={{ color: INK }}>{c.impact}</strong></span>
                <span>Blast radius <strong style={{ color: INK }}>{c.blastRadius}</strong></span>
                <span>Process <strong style={{ color: INK }}>{c.processAffected}</strong></span>
              </div>
              <div>Threat relevance: {c.threatRelevance}</div>
              <div>Evidence: {c.evidence}</div>
              <div style={{ marginTop: 6, color: '#1f8a4c', fontWeight: 600 }}>→ {c.action}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Thresholds ---------------- */
function Thresholds({ board }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>
        <strong style={{ color: board.breaches ? '#C0392B' : '#1f8a4c' }}>{board.breaches} of {board.total}</strong> thresholds breached ({board.critical} critical). Breaches are risk-appetite violations.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {board.rows.map((t) => {
          const breach = t.status === 'Breach';
          return (
            <div key={t.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${breach ? SEV[t.breachSeverity] : '#1f8a4c'}`, borderRadius: 6, padding: '10px 13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{t.name}</span>
                <Pill text={breach ? t.breachSeverity : 'Within'} color={breach ? SEV[t.breachSeverity] : '#1f8a4c'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '5px 0' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: breach ? SEV[t.breachSeverity] : '#1f8a4c' }}>{t.current}{t.unit === '%' ? '%' : ''}</span>
                <span style={{ fontSize: 11, color: INK3 }}>{t.unit !== '%' ? t.unit + ' · ' : ''}threshold {t.threshold}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: t.trend === 'improving' ? '#1f8a4c' : t.trend === 'worsening' ? '#C0392B' : INK3, textTransform: 'capitalize' }}>{t.trend}</span>
              </div>
              {breach && <div style={{ fontSize: 10.5, color: INK2, marginTop: 4 }}>→ {t.action}</div>}
              <div style={{ fontSize: 9.5, color: INK3, marginTop: 4 }}>{t.policyRef}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Action-Now Queue + Attention ---------------- */
function Actions({ queue, attention }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Action-Now Queue <span style={{ fontWeight: 400, textTransform: 'none' }}>(severity × urgency × impact × threat × confidence)</span></div>
        {queue.map((a) => (
          <div key={a.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '10px 13px', marginBottom: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: a.rank <= 2 ? '#C0392B' : INK3, width: 24 }}>#{a.rank}</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK }}>{a.action}</span>
              {a.escalation && <Pill text="Escalate" color="#C0392B" />}
            </div>
            <div style={{ fontSize: 11, color: INK2, marginTop: 5, lineHeight: 1.5 }}>Why now: {a.whyNow}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5, color: INK3, marginTop: 6 }}>
              <span>Protects <strong style={{ color: INK2 }}>{a.process}</strong></span>
              <span>Owner <strong style={{ color: INK2 }}>{a.owner}</strong></span>
              <span>Due <strong style={{ color: INK2 }}>{a.dueDate}</strong></span>
              {a.automation !== 'n/a' && <span>⚙ {a.automation}</span>}
            </div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Top CISO Attention Items</div>
        {attention.map((a) => (
          <div key={a.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${SEV[a.severity]}`, borderRadius: 6, padding: '10px 13px', marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{a.title}</span>
              <Pill text={a.severity} color={SEV[a.severity]} />
            </div>
            <div style={{ fontSize: 11, color: INK2, marginTop: 5 }}>{a.businessImpact}</div>
            <div style={{ fontSize: 10.5, color: '#1f8a4c', fontWeight: 600, marginTop: 5 }}>→ {a.decision}</div>
            <div style={{ fontSize: 10, color: INK3, marginTop: 4 }}>{a.owner} · {a.targetDate} · {a.escalationPath}{a.blockers ? ` · blocker: ${a.blockers}` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Business Process Protection ---------------- */
function Processes({ procs }) {
  const cols = ['identityRisk', 'vulnRisk', 'detectionCoverage', 'dataProtection', 'recoveryReadiness', 'thirdPartyRisk'];
  const labels = { identityRisk: 'Identity', vulnRisk: 'Vuln', detectionCoverage: 'Detection', dataProtection: 'Data', recoveryReadiness: 'Recovery', thirdPartyRisk: '3rd-party' };
  const cell = (v, isRisk) => {
    // risk fields: High = bad; coverage fields: High = good
    const good = isRisk ? (v === 'Low') : (v === 'High');
    const bad = isRisk ? (v === 'High') : (v === 'Low');
    return bad ? '#C0392B' : good ? '#1f8a4c' : '#B07C2E';
  };
  const isRisk = (k) => /Risk/.test(k);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead><tr style={{ color: INK3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px' }}>Critical Process</th>
          <th style={{ padding: '6px 8px' }}>Protection</th>
          {cols.map((c) => <th key={c} style={{ padding: '6px 6px' }}>{labels[c]}</th>)}
          <th style={{ padding: '6px 8px' }}>Resilience</th>
        </tr></thead>
        <tbody>
          {procs.map((p) => (
            <tr key={p.id} style={{ borderTop: `1px solid ${HAIR}` }}>
              <td style={{ padding: '9px 8px' }}>
                <div style={{ fontWeight: 700, color: INK }}>{p.name}</div>
                <div style={{ fontSize: 9.5, color: INK3 }}>{p.supportingSystems.join(' · ')}</div>
              </td>
              <td style={{ padding: '9px 8px', width: 110 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontWeight: 800, color: sc(p.protectionLevel) }}>{p.protectionLevel}</span><div style={{ flex: 1 }}><Bar value={p.protectionLevel} /></div></div>
              </td>
              {cols.map((c) => (
                <td key={c} style={{ padding: '9px 6px', textAlign: 'center' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: cell(p[c], isRisk(c)), borderRadius: 3, padding: '2px 7px' }}>{p[c]}</span>
                </td>
              ))}
              <td style={{ padding: '9px 8px', textAlign: 'center' }}><Pill text={p.resilienceRating} color={C[p.resilienceRating] || INK3} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: INK3, marginTop: 8 }}>Risk columns: red = high risk. Coverage columns: green = strong. Connects security controls to the business.</div>
    </div>
  );
}

/* ---------------- Attack Pathways ---------------- */
function Pathways({ paths, sel, setSel }) {
  const p = paths[sel] || paths[0];
  // Build a labelled kill-chain: each step gets a stage label + the control that breaks it.
  const steps = p.narrative.split('→').map((s) => s.trim()).filter(Boolean);
  const stageLabel = ['Initial access', 'Foothold', 'Privilege escalation', 'Lateral movement', 'Impact', 'Impact'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 18 }}>
      {/* path picker */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Critical processes at risk</div>
        {paths.map((x, i) => (
          <button key={x.id} onClick={() => setSel(i)} style={{ display: 'block', width: '100%', textAlign: 'left', background: i === sel ? INK : '#fff', color: i === sel ? '#fff' : INK, border: `1px solid ${i === sel ? INK : HAIR}`, borderRadius: 8, padding: '10px 12px', marginBottom: 6, cursor: 'pointer' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{x.process}</div>
            <div style={{ fontSize: 10, color: i === sel ? '#ffb4a8' : '#C0392B', marginTop: 2 }}>Weakest link: {x.weakestControl}</div>
          </button>
        ))}
      </div>

      <div>
        {/* What the CISO needs to know — plain English */}
        <div style={{ background: '#fff7f5', border: '1px solid #f3c9bf', borderRadius: 9, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>What you need to know</div>
          <div style={{ fontSize: 14, color: INK, lineHeight: 1.55 }}>
            An attacker reaches <strong>{p.process}</strong> by starting with <strong>{p.initialAccess.toLowerCase()}</strong>, then exploiting <strong>{p.weakestControl}</strong> to move toward <strong>{p.target}</strong>. If it succeeds: <strong style={{ color: '#C0392B' }}>{p.businessImpact}</strong>
          </div>
          <div style={{ fontSize: 13, color: INK, marginTop: 8, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 7, padding: '9px 12px' }}>
            <strong style={{ color: '#1f8a4c' }}>Fix this one thing first:</strong> {p.breakingControls[0]}.
          </div>
        </div>

        {/* Labelled kill-chain (vertical, readable) */}
        <div style={{ border: `1px solid ${HAIR}`, borderRadius: 9, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>How the attack unfolds</div>
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < steps.length - 1 ? 0 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 13, background: last ? '#C0392B' : INK, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                  {i < steps.length - 1 && <div style={{ width: 2, height: 22, background: '#E8631A' }} />}
                </div>
                <div style={{ paddingBottom: i < steps.length - 1 ? 10 : 0 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: last ? '#C0392B' : '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stageLabel[Math.min(i, stageLabel.length - 1)]}{last ? ' — business impact' : ''}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{step}</div>
                </div>
              </div>
            );
          })}
          {/* MITRE + target facts */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '12px 0 10px' }}>
            {p.mitreStages.map((s) => <span key={s} style={{ fontSize: 9.5, fontWeight: 600, color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: 3, padding: '1px 6px' }}>{s}</span>)}
          </div>
          <div style={{ background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 7, padding: '10px 12px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1f8a4c', textTransform: 'uppercase' }}>Controls that break the chain</div>
            <div style={{ fontSize: 12, color: INK, marginTop: 4 }}>{p.breakingControls.join(' · ')}</div>
            <div style={{ fontSize: 12, color: INK, marginTop: 6 }}><strong>Mitigation:</strong> {p.mitigation}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Readiness + Investment + Peers + Emerging ---------------- */
function Readiness({ readiness, investments, peers, emerging }) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cyber-Event Readiness</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: sc(readiness.overall) }}>{readiness.overall}</span>
          <Pill text={readiness.rating} color={C[readiness.rating]} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 6 }}>
          {readiness.items.map((r) => (
            <div key={r.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 5, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 11, color: INK }}>{r.name}</span><span style={{ fontSize: 12, fontWeight: 700, color: sc(r.score) }}>{r.score}</span></div>
              <div style={{ marginTop: 4 }}><Bar value={r.score} /></div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Investment → Measurable Risk Reduction</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: 8 }}>
          {investments.map((iv) => (
            <div key={iv.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '11px 13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{iv.name}</span><span style={{ fontSize: 11, color: INK3 }}>{iv.spend}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0', fontSize: 11 }}>
                <span style={{ color: INK3 }}>risk {iv.baselineRisk}</span><span style={{ color: '#E8631A' }}>→</span><span style={{ fontWeight: 700, color: '#1f8a4c' }}>{iv.currentRisk}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#1f8a4c' }}>−{iv.riskReduction} pts</span>
              </div>
              <div style={{ fontSize: 10.5, color: INK2 }}>{iv.riskArea} · +{iv.futureReduction} expected{iv.blockers ? ` · blocker: ${iv.blockers}` : ''}</div>
              {/Approve|Fund|Mandate/.test(iv.decision) && <div style={{ fontSize: 10.5, color: '#C0392B', fontWeight: 600, marginTop: 4 }}>Decision: {iv.decision}</div>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Where We Trail Peer Maturity</div>
          {peers.map((p) => (
            <div key={p.domain} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 11.5, color: INK }}>{p.domain}</span>
              <span style={{ fontSize: 11, color: INK3 }}>us {p.us} · peer {p.peerMedian}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#C0392B', width: 36, textAlign: 'right' }}>{p.gap}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Emerging Faster Than We Adapt</div>
          {emerging.map((e) => (
            <div key={e.id} style={{ border: `1px solid ${HAIR}`, borderRadius: 5, padding: '8px 10px', marginBottom: 6 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: INK }}>{e.risk}</div>
              <div style={{ fontSize: 10, color: INK2, marginTop: 2 }}>Velocity <strong style={{ color: '#C0392B' }}>{e.velocity}</strong> · our adaptation <strong>{e.ourAdaptation}</strong> — {e.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Hidden Risk ---------------- */
function Hidden({ risks }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px,1fr))', gap: 10 }}>
      {risks.map((h) => (
        <div key={h.id} style={{ border: `1px solid ${HAIR}`, borderLeft: '4px solid #7c3aed', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{h.risk}</div>
          <div style={{ fontSize: 11, color: INK2, marginTop: 5, lineHeight: 1.5 }}><strong>Why hidden:</strong> {h.whyHidden}</div>
          <div style={{ fontSize: 11, color: INK2, marginTop: 3 }}><strong>Evidence:</strong> {h.evidence}</div>
          <div style={{ fontSize: 10.5, color: INK3, marginTop: 6 }}>{h.domain} · {h.process}</div>
          <div style={{ fontSize: 11, color: INK, marginTop: 5 }}>Impact: {h.impact}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
            <Pill text={h.formalAcceptance === false ? 'No formal acceptance' : h.formalAcceptance === 'expired' ? 'Exception expired' : 'Accepted'} color={h.formalAcceptance === true ? '#1f8a4c' : '#C0392B'} />
          </div>
          <div style={{ fontSize: 10.5, color: '#7c3aed', fontWeight: 600, marginTop: 6 }}>→ {h.escalation}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Export executive summary ---------------- */
function exportSummary(d) {
  const p = d.overallPosture;
  const L = [];
  L.push(`CISO SECURITY POSTURE — EXECUTIVE SUMMARY`);
  L.push(`Generated ${new Date(d.generatedAt).toLocaleString()}`);
  L.push(``);
  L.push(`OVERALL POSTURE: ${p.current}/100 (${band(p.current)}) — ${p.delta >= 0 ? '+' : ''}${p.delta} vs last period (${p.previous}). Trend: ${p.trend}. Confidence: ${p.confidence}.`);
  L.push(p.narrative);
  L.push(``);
  L.push(`THRESHOLDS: ${d.thresholds.breaches}/${d.thresholds.total} breached (${d.thresholds.critical} critical).`);
  L.push(`READINESS: ${d.readiness.overall}/100 (${d.readiness.rating}).`);
  L.push(``);
  L.push(`TOP ACTIONS NOW:`);
  d.actionQueue.slice(0, 5).forEach((a) => L.push(`  #${a.rank} ${a.action} — owner ${a.owner}, due ${a.dueDate}${a.escalation ? ' [ESCALATE]' : ''}`));
  L.push(``);
  L.push(`EXECUTIVE Q&A:`);
  d.questions.forEach((a) => {
    L.push(`Q${a.n}. ${a.question}`);
    L.push(`  Answer: ${a.answer}`);
    L.push(`  Confidence: ${a.confidence} | Status: ${a.status}`);
    L.push(`  Recommended: ${a.recommendedAction} (Owner: ${a.owner}, Target: ${a.targetDate})`);
    L.push(``);
  });
  const blob = new Blob([L.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `ciso-executive-summary-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click(); URL.revokeObjectURL(url);
}
