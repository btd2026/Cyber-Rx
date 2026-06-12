/**
 * CisoAnswerView — clean, scannable CISO agent answer
 * ---------------------------------------------------
 * Leads with the answer and the decision, keeps the SME explanation to one tight
 * paragraph, shows evidence compactly, and tucks secondary detail behind a
 * "More detail" toggle so the page is appealing and easy to follow — not text
 * heavy. The spoken narration is never shown on screen (it is voice only).
 */

import React, { useState } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e8edf3';
const C = { Strong: '#1f8a4c', Moderate: '#B07C2E', Weak: '#A85B2E', Critical: '#C0392B' };
const conf = (c) => (c === 'High' ? '#1f8a4c' : c === 'Medium' ? '#B07C2E' : '#94a3b8');

const Chip = ({ label, value, color }) => (
  <span style={{ fontSize: 11.5, color: INK2 }}>{label} <strong style={{ color: color || INK }}>{value}</strong></span>
);

export default function CisoAnswerView({ a, issues, onIssueClick }) {
  const [more, setMore] = useState(false);
  if (!a) return null;
  const status = C[a.status] || INK3;

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderTop: `4px solid ${status}`, borderRadius: 10, padding: '22px 26px', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
      {/* answer headline */}
      <p style={{ fontSize: 18, color: INK, lineHeight: 1.5, margin: 0, fontWeight: 600 }}>{a.answer}</p>

      {/* meta chips */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: status, borderRadius: 5, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{a.status}</span>
        <Chip label="Confidence" value={a.confidence} color={conf(a.confidence)} />
        <Chip label="Owner" value={a.owner} />
        <Chip label="By" value={a.targetDate} />
      </div>

      {/* the decision — most prominent */}
      <div style={{ marginTop: 16, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 9, padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#1f8a4c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Do this</div>
        <div style={{ fontSize: 15, color: INK, lineHeight: 1.5, fontWeight: 500 }}>{a.recommendedAction}</div>
      </div>

      {/* SME explanation — one tight paragraph */}
      {a.explanation && (
        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <div style={{ width: 3, borderRadius: 2, background: '#1d4ed8', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Michael explains</div>
            <div style={{ fontSize: 13.5, color: INK, lineHeight: 1.6 }}>{a.explanation}</div>
          </div>
        </div>
      )}

      {/* issues — clickable */}
      {issues && issues.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>The risks behind this — click for detail</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {issues.map((it, i) => (
              <button key={i} onClick={() => it.entity && onIssueClick && onIssueClick(it.entity)}
                style={{ background: it.entity ? '#eef4fb' : '#fff', border: `1px solid ${it.entity ? '#cfe0f3' : HAIR}`, color: it.entity ? '#1d4ed8' : INK2, borderRadius: 16, padding: '6px 13px', fontSize: 12.5, fontWeight: 600, cursor: it.entity ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {it.label}{it.entity && <span style={{ fontSize: 11 }}>→</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* secondary detail — collapsed by default to keep it scannable */}
      <button onClick={() => setMore(!more)} style={{ marginTop: 16, background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
        {more ? '▾ Hide detail' : '▸ More detail & evidence'}
      </button>
      {more && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${HAIR}`, paddingTop: 14, display: 'grid', gap: 12 }}>
          {a.whatChanged && <Detail label="What changed" text={a.whatChanged} />}
          {a.whyItMatters && <Detail label="Why it matters" text={a.whyItMatters} />}
          {a.businessImpact && <Detail label="Business / process impact" text={a.businessImpact} />}
          {a.evidence && a.evidence.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Evidence</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {a.evidence.map((e, i) => <li key={i} style={{ fontSize: 12.5, color: INK, marginBottom: 3, lineHeight: 1.5 }}>{e}</li>)}
              </ul>
            </div>
          )}
          <div style={{ fontSize: 10.5, color: INK3 }}>Data sources: {(a.dataSources || []).join(', ')}{a.lastRefreshed ? ` · Refreshed ${new Date(a.lastRefreshed).toLocaleString()}` : ''}</div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, text }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}
