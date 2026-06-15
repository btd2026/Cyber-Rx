/**
 * ExecRoleDashboard — dedicated, role-specific executive dashboard for every
 * C-suite seat OTHER than the CISO (CFO / CIO / CRO / CLO / Board).
 *
 * It deliberately mirrors the CISO Security Posture dashboard's visual language
 * (navy hero, KPI strip, tab chrome, decision-ready question cards) so all
 * leaders share ONE format — but every number, question, and sub-tab is sourced
 * from /api/exec/dashboard?role=<role> and pertains ONLY to that leader. No two
 * seats show the same summary.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAgentVoice, VoiceControls } from './agentVoice';
import TicketControl from './TicketControl';
import DashNav from './DashNav';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc', NAVY = '#0f1b2d';
const C = { Strong: '#1f8a4c', Moderate: '#B07C2E', Weak: '#A85B2E', Critical: '#C0392B' };
const SEV = { Critical: '#C0392B', High: '#A85B2E', Medium: '#B07C2E', Low: '#1f8a4c' };
const TONE = { good: '#1f8a4c', warn: '#B07C2E', bad: '#C0392B' };
const band = (s) => (s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical');
const sc = (s) => C[band(s)];
const statusSev = { Strong: 'Low', Moderate: 'Medium', Weak: 'High', Critical: 'Critical' };

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
  return <span style={{ color: flat ? INK3 : up ? '#34d399' : '#f87171', fontWeight: 700, fontSize: 11 }}>{flat ? '▬' : up ? '▲ +' : '▼ '}{d}</span>;
};
function Bar({ value, color }) {
  return <div style={{ height: 6, background: '#eef2f6', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color || sc(value), borderRadius: 3 }} /></div>;
}

export default function ExecRoleDashboard(props) {
  const role = props.role || 'Board';
  const { token, orgId, api } = ctx(props);
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('qa');

  useEffect(() => {
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    fetch(`${api}/api/exec/dashboard?role=${encodeURIComponent(role)}&org_id=${encodeURIComponent(orgId)}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j) => { setD(j); }).catch((e) => setError(e.message));
  }, [api, orgId, token, role]);

  if (error) return <div style={{ padding: 24, color: '#C0392B', fontSize: 13 }}>Could not load {role} dashboard: {error}</div>;
  if (!d) return <div style={{ padding: 24, color: INK3, fontSize: 13 }}>Composing {role} executive view…</div>;

  const h = d.hero;
  const refreshed = new Date(d.generatedAt).toLocaleString();
  const active = (d.tabs || []).find((t) => t.key === tab) || d.tabs[0];

  return (
    <div style={{ background: PANEL, borderRadius: 8, padding: 0, fontFamily: 'inherit' }}>
      {props.navId && <div style={{ marginBottom: 12 }}><DashNav current={props.navId} go={props.go} /></div>}

      {/* ===== Hero ===== */}
      <div style={{ background: NAVY, borderRadius: '8px 8px 0 0', padding: '22px 28px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: sc(h.score) === '#A85B2E' ? '#f0a868' : sc(h.score) }}>{h.score}</div>
              <div style={{ fontSize: 10, color: '#8fa3bd', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>of 100 · {h.band}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#8fa3bd', textTransform: 'uppercase', letterSpacing: '0.16em' }}>{h.tag}</div>
              <h2 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 700 }}>{h.title}</h2>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12.5, color: '#cbd5e1' }}>
                <span style={{ color: h.delta >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>{h.delta >= 0 ? '▲ +' : '▼ '}{h.delta} pts</span>
                <span style={{ textTransform: 'capitalize' }}>{h.trend}</span>
                <span style={{ color: '#8fa3bd' }}>· Confidence {h.confidence}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`${api}/api/ciso/report.pdf?org_id=${encodeURIComponent(orgId)}`} style={{ background: '#1e3a5f', color: '#fff', border: '1px solid #2c4f7c', borderRadius: 6, padding: '9px 15px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>⤓ PDF report</a>
            <a href={`${api}/api/ciso/report.pptx?org_id=${encodeURIComponent(orgId)}`} style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid #2c4f7c', borderRadius: 6, padding: '9px 15px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>⤓ PowerPoint</a>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, maxWidth: 920 }}>{h.narrative}</div>
        {/* role KPI strip */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {(d.strip || []).map((x, i) => (
            <div key={i} style={{ flex: 1, minWidth: 110, background: '#16263b', borderRadius: 5, padding: '7px 11px' }}>
              <div style={{ fontSize: 9.5, color: '#8fa3bd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: x.tone ? TONE[x.tone] : '#fff' }}>{x.value}</div>
              {x.sub && <div style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div style={{ display: 'flex', gap: 0, background: '#fff', borderBottom: `1px solid ${HAIR}`, overflowX: 'auto', position: 'sticky', top: 0, zIndex: 5 }}>
        {(d.tabs || []).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.key ? INK : 'transparent'}`, color: tab === t.key ? INK : INK3, padding: '11px 15px', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 500, whiteSpace: 'nowrap' }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: '18px 22px' }}>
        <Section role={role} section={active} rolePanel={props.rolePanel} />
        <div style={{ fontSize: 10.5, color: INK3, marginTop: 16, borderTop: `1px solid ${HAIR}`, paddingTop: 10 }}>
          Last refreshed {refreshed}. Built from your CyberRX primary sources — role-specific to the {role}.
        </div>
      </div>
    </div>
  );
}

function Section({ role, section, rolePanel }) {
  if (!section) return null;
  switch (section.type) {
    case 'questions': return <Questions role={role} section={section} />;
    case 'metrics': return <Metrics section={section} />;
    case 'ranked': return <Ranked section={section} />;
    case 'table': return <TableView section={section} />;
    case 'cards': return <CardsView section={section} />;
    case 'actions': return <ActionsView role={role} section={section} />;
    case 'rolepanel': return <div>{rolePanel || <div style={{ fontSize: 12, color: INK3 }}>Detail view unavailable.</div>}</div>;
    default: return null;
  }
}

/* ---- Current State: 5 role questions as decision-ready cards ---- */
function Questions({ role, section }) {
  const voice = useAgentVoice();
  const [active, setActive] = useState(null);
  const qs = section.questions || [];
  const narrate = (q) => [q.answer, q.whyItMatters, q.recommendedAction ? `Recommended: ${q.recommendedAction}` : '']
    .filter(Boolean).join(' ');
  const intro = `These are the five key questions every ${role} should be able to answer at any time. ` +
    `Each one shows where you stand right now. Select a question for the full answer, the evidence behind it, ` +
    `the recommended action, and who owns it.`;
  const select = (q) => {
    voice.stop();
    const on = active && active.id === q.id;
    setActive(on ? null : q);
    if (!on) setTimeout(() => voice.speak(narrate(q)), 120);
  };

  if (active) {
    return (
      <div style={{ padding: '4px 0 8px' }}>
        <button onClick={() => { voice.stop(); setActive(null); }} style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← All questions</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 24, height: 24, borderRadius: 12, background: NAVY, color: '#9bc0ff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{active.n}</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: INK, lineHeight: 1.35 }}>{active.question}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Pill text={active.status} color={C[active.status] || INK3} />
            <VoiceControls voice={voice} onReplay={() => voice.speak(narrate(active))} label="Listen" />
          </span>
        </div>
        <Detail a={active} role={role} />
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Current State</div>
        <VoiceControls voice={voice} onReplay={() => voice.speak(intro)} label="Listen" />
      </div>
      <div style={{ background: NAVY, color: '#e6ecf5', borderRadius: 10, padding: '14px 18px', marginBottom: 14, fontSize: 12.5, lineHeight: 1.6 }}>{section.intro}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {qs.map((q) => (
          <button key={q.id} onClick={() => select(q)} style={{ width: '100%', textAlign: 'left', background: '#fff', color: INK, border: `1px solid ${HAIR}`, borderLeft: `4px solid ${C[q.status] || INK3}`, borderRadius: 10, padding: '13px 16px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: PANEL, color: INK3, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{q.n}</span>
              <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{q.question}</span>
              {q.status && <span style={{ marginLeft: 'auto', flexShrink: 0 }}><Pill text={q.status} color={C[q.status] || INK3} /></span>}
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 7, paddingLeft: 32, color: INK2 }}>{q.answer}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginTop: 6, paddingLeft: 32 }}>View details →</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Detail({ a, role }) {
  const Row = ({ label, children }) => children ? (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.5 }}>{children}</div>
    </div>
  ) : null;
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Pill text={a.status} color={C[a.status] || INK3} />
        <Pill text={`Confidence ${a.confidence}`} color={a.confidence === 'High' ? '#1f8a4c' : a.confidence === 'Medium' ? '#B07C2E' : '#94a3b8'} />
      </div>
      <Row label="Answer">{a.answer}</Row>
      <Row label="What changed">{a.whatChanged}</Row>
      <Row label="Why it matters">{a.whyItMatters}</Row>
      <Row label="Evidence">
        {a.evidence && a.evidence.length ? <ul style={{ margin: 0, paddingLeft: 16 }}>{a.evidence.map((e, i) => <li key={i} style={{ marginBottom: 3 }}>{e}</li>)}</ul> : null}
      </Row>
      <Row label="Business impact">{a.businessImpact}</Row>
      <Row label="Key risk drivers">{(a.riskDrivers || []).join(' · ')}</Row>
      <div style={{ background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 6, padding: '10px 12px', margin: '10px 0' }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1f8a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recommended action</div>
        <div style={{ fontSize: 12.5, color: INK, marginTop: 3 }}>{a.recommendedAction}</div>
      </div>
      <Row label="Remediation — open & track a ticket">
        <TicketControl sourceRef={`${role.toLowerCase()}:${a.id}`} title={`[${role}] ${a.question}`}
          recommendation={a.recommendedAction} severity={statusSev[a.status] || 'Medium'}
          owner={a.owner} dueDate={a.targetDate} />
      </Row>
      <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: INK2, flexWrap: 'wrap' }}>
        <span>Owner <strong>{a.owner}</strong></span><span>Target <strong>{a.targetDate}</strong></span>
      </div>
      <div style={{ fontSize: 10.5, color: INK3, marginTop: 12 }}>Data sources: {(a.dataSources || []).join(', ')}</div>
    </div>
  );
}

/* ---- generic section renderers ---- */
function Metrics({ section }) {
  return (
    <div>
      {section.note && <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>{section.note}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {(section.items || []).map((m, i) => (
          <div key={i} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${m.tone ? TONE[m.tone] : INK3}`, borderRadius: 7, padding: '13px 15px' }}>
            <div style={{ fontSize: 11, color: INK2 }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: m.tone ? TONE[m.tone] : INK, marginTop: 3 }}>{m.value}</div>
            {m.sub && <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>{m.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Ranked({ section }) {
  const items = section.items || [];
  const max = Math.max(1, ...items.map((x) => Number(x.score) || 0));
  return (
    <div>
      {section.note && <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>{section.note}</div>}
      {!items.length && <div style={{ fontSize: 12, color: INK3 }}>Nothing to rank yet.</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((x, i) => (
          <div key={i} style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '11px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: INK3, width: 22 }}>#{i + 1}</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK }}>{x.name}<span style={{ fontSize: 10, color: INK3, fontWeight: 500, marginLeft: 8 }}>{x.sub}</span></span>
              <span style={{ width: 120 }}><Bar value={Math.round(((Number(x.score) || 0) / max) * 100)} color={x.tone ? TONE[x.tone] : undefined} /></span>
              <span style={{ fontSize: 13, fontWeight: 800, color: x.tone ? TONE[x.tone] : INK, minWidth: 56, textAlign: 'right' }}>{x.scoreLabel || x.score}</span>
            </div>
            {x.action && <div style={{ fontSize: 11, color: '#1f8a4c', fontWeight: 600, marginTop: 5, paddingLeft: 34 }}>→ {x.action}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TableView({ section }) {
  const cols = section.columns || [];
  const rows = section.rows || [];
  return (
    <div style={{ overflowX: 'auto' }}>
      {section.note && <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>{section.note}</div>}
      {!rows.length && <div style={{ fontSize: 12, color: INK3 }}>No rows yet.</div>}
      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead><tr style={{ color: INK3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {cols.map((c) => <th key={c.key} style={{ textAlign: 'left', padding: '6px 8px' }}>{c.label}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderTop: `1px solid ${HAIR}` }}>
                {cols.map((c) => {
                  const v = row[c.key];
                  const unassigned = typeof v === 'string' && /unassigned/i.test(v);
                  const crit = typeof v === 'string' && /^critical$/i.test(v);
                  return <td key={c.key} style={{ padding: '9px 8px', color: unassigned || crit ? '#C0392B' : INK, fontWeight: c.key === cols[0].key ? 700 : 500 }}>{v}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CardsView({ section }) {
  const items = section.items || [];
  return (
    <div>
      {section.note && <div style={{ fontSize: 12, color: INK2, marginBottom: 12 }}>{section.note}</div>}
      {!items.length && <div style={{ fontSize: 12, color: INK3 }}>Nothing flagged.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${it.tagTone ? TONE[it.tagTone] : INK3}`, borderRadius: 7, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{it.title}</div>
              {it.tag && <Pill text={it.tag} color={it.tagTone ? TONE[it.tagTone] : INK3} />}
            </div>
            {(it.fields || []).length > 0 && (
              <div style={{ marginTop: 8, display: 'grid', gap: 3 }}>
                {it.fields.map((fld, fi) => <div key={fi} style={{ fontSize: 11, color: INK2 }}><span style={{ color: INK3 }}>{fld.k}: </span><strong style={{ color: INK }}>{fld.v}</strong></div>)}
              </div>
            )}
            {it.action && <div style={{ fontSize: 11, color: '#1f8a4c', fontWeight: 600, marginTop: 8 }}>→ {it.action}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionsView({ role, section }) {
  const items = section.items || [];
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Action-Now Queue <span style={{ fontWeight: 400, textTransform: 'none' }}>{section.note}</span></div>
      {!items.length && <div style={{ fontSize: 12, color: INK3 }}>No actions required right now.</div>}
      {items.map((a) => (
        <div key={a.rank} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${SEV[a.severity] || '#B07C2E'}`, borderRadius: 6, padding: '11px 13px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: a.rank <= 2 ? '#C0392B' : INK3, width: 24 }}>#{a.rank}</span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: INK }}>{a.action}</span>
            <Pill text={a.severity} color={SEV[a.severity] || INK3} />
          </div>
          <div style={{ fontSize: 11, color: INK2, marginTop: 5, lineHeight: 1.5 }}>Why now: {a.whyNow}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5, color: INK3, marginTop: 6 }}>
            {a.process && <span>Relates to <strong style={{ color: INK2 }}>{a.process}</strong></span>}
            <span>Owner <strong style={{ color: INK2 }}>{a.owner}</strong></span>
            <span>Due <strong style={{ color: INK2 }}>{a.dueDate}</strong></span>
          </div>
          <div style={{ marginTop: 9 }}>
            <TicketControl sourceRef={`${role.toLowerCase()}-act:${a.rank}`} title={`[${role}] ${a.action}`} recommendation={a.action} severity={a.severity} owner={a.owner} dueDate={a.dueDate} />
          </div>
        </div>
      ))}
    </div>
  );
}
