/**
 * CisoAnswerView — clean, scannable CISO agent answer
 * ---------------------------------------------------
 * Organized for fast reading and visual appeal: a verdict header, the answer,
 * the decision, the evidence that SUPPORTS the answer (surfaced, not buried),
 * and the clickable risks behind it. Secondary context sits behind a toggle so
 * the page stays appealing and easy to follow. The spoken narration (Michael's
 * 30-second "why this is good or bad") is never shown on screen — it is voice
 * only.
 */

import React, { useState } from 'react';
import TicketControl from './TicketControl';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e8edf3', PANEL = '#f8fafc';
const C = { Strong: '#1f8a4c', Moderate: '#B07C2E', Weak: '#A85B2E', Critical: '#C0392B' };
const VERDICT = { Strong: 'Healthy', Moderate: 'Needs attention', Weak: 'At risk', Critical: 'Urgent' };
const SEV = { Strong: 'Low', Moderate: 'Medium', Weak: 'High', Critical: 'Critical' };
const conf = (c) => (c === 'High' ? '#1f8a4c' : c === 'Medium' ? '#B07C2E' : '#94a3b8');

const SectionLabel = ({ children, color }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: color || INK3, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>{children}</div>
);

export default function CisoAnswerView({ a, issues, onIssueClick }) {
  const [more, setMore] = useState(false);
  if (!a) return null;
  const status = C[a.status] || INK3;
  const verdict = VERDICT[a.status] || a.status;
  const clickable = (issues || []).filter((it) => it.entity);

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderTop: `4px solid ${status}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      {/* verdict header band — executive-first: status pill + key facts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '15px 24px', background: `linear-gradient(135deg, ${status}14, ${status}05)`, borderBottom: `1px solid ${HAIR}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: status, borderRadius: 6, padding: '5px 12px', textTransform: 'uppercase', letterSpacing: '0.07em', boxShadow: `0 1px 4px ${status}55` }}>{verdict}</span>
          <span style={{ fontSize: 11.5, color: INK2 }}>Confidence <strong style={{ color: conf(a.confidence) }}>{a.confidence}</strong></span>
        </div>
        <div style={{ fontSize: 11.5, color: INK2, display: 'flex', gap: 16 }}>
          <span>Owner <strong style={{ color: INK }}>{a.owner}</strong></span>
          <span>Target <strong style={{ color: INK }}>{a.targetDate}</strong></span>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* the answer */}
        <p style={{ fontSize: 18, color: INK, lineHeight: 1.5, margin: 0, fontWeight: 600 }}>{a.answer}</p>

        {/* SME supporting context (distinct from the spoken narration) */}
        {a.explanation && (
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <div style={{ width: 3, borderRadius: 2, background: '#1d4ed8', flexShrink: 0 }} />
            <div>
              <SectionLabel color="#1d4ed8">Why this matters</SectionLabel>
              <div style={{ fontSize: 13.5, color: INK, lineHeight: 1.6 }}>{a.explanation}</div>
            </div>
          </div>
        )}

        {/* the decision — most prominent */}
        <div style={{ marginTop: 16, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 10, padding: '14px 16px' }}>
          <SectionLabel color="#1f8a4c">Do this</SectionLabel>
          <div style={{ fontSize: 15, color: INK, lineHeight: 1.5, fontWeight: 500 }}>{a.recommendedAction}</div>
        </div>

        {/* remediation ticket + status feedback loop */}
        <div style={{ marginTop: 14 }}>
          <SectionLabel>Remediation — open & track a ticket</SectionLabel>
          <TicketControl sourceRef={`ciso:${a.id}`} title={`[CISO] ${a.question}`}
            recommendation={a.recommendedAction} severity={SEV[a.status] || 'Medium'}
            owner={a.owner} dueDate={a.targetDate} />
        </div>

        {/* evidence that supports the answer — surfaced, not buried */}
        {a.evidence && a.evidence.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <SectionLabel>How we know — the evidence</SectionLabel>
            <div style={{ display: 'grid', gap: 7 }}>
              {a.evidence.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '9px 12px' }}>
                  <span style={{ color: status, fontSize: 13, lineHeight: 1.5, flexShrink: 0 }}>▸</span>
                  <span style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{e}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* risks behind the answer — clickable to trace to source */}
        {clickable.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <SectionLabel>The risks behind this — click any to trace it to its source</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {clickable.map((it, i) => (
                <button key={i} onClick={() => onIssueClick && onIssueClick(it.entity)}
                  style={{ background: '#eef4fb', border: '1px solid #cfe0f3', color: '#1d4ed8', borderRadius: 18, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'all .12s' }}>
                  {it.label}<span style={{ fontSize: 13, opacity: 0.7 }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* secondary context — collapsed to keep the answer clean */}
        <button onClick={() => setMore(!more)} style={{ marginTop: 18, background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          {more ? '▾ Hide background' : '▸ What changed & why it matters'}
        </button>
        {more && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${HAIR}`, paddingTop: 14, display: 'grid', gap: 14 }}>
            {a.whatChanged && <Detail label="What changed" text={a.whatChanged} />}
            {a.whyItMatters && <Detail label="Why it matters" text={a.whyItMatters} />}
            {a.businessImpact && <Detail label="Business / process impact" text={a.businessImpact} />}
            <div style={{ fontSize: 10.5, color: INK3 }}>Data sources: {(a.dataSources || []).join(', ')}{a.lastRefreshed ? ` · Refreshed ${new Date(a.lastRefreshed).toLocaleString()}` : ''}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, text }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}
