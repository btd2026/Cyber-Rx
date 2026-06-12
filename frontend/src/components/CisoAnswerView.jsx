/**
 * CisoAnswerView — clean, focused CISO agent answer
 * -------------------------------------------------
 * Renders one executive answer professionally: the plain-English answer, then
 * What changed / Why it matters / Evidence / Recommended action / Owner / Target.
 * No posture score, no dashboard chrome. The issues the answer calls out are
 * shown as clickable chips (onIssueClick) so the CISO can drill into any of them.
 */

import React from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e8edf3';
const C = { Strong: '#1f8a4c', Moderate: '#B07C2E', Weak: '#A85B2E', Critical: '#C0392B' };
const conf = (c) => (c === 'High' ? '#1f8a4c' : c === 'Medium' ? '#B07C2E' : '#94a3b8');

const Pill = ({ text, color }) => (
  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: color, borderRadius: 5, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{text}</span>
);

function Section({ label, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: INK, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function CisoAnswerView({ a, issues, onIssueClick }) {
  if (!a) return null;
  const status = C[a.status] || INK3;

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderTop: `4px solid ${status}`, borderRadius: 10, padding: '24px 28px', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
      {/* answer */}
      <p style={{ fontSize: 17, color: INK, lineHeight: 1.55, margin: 0, fontWeight: 500 }}>{a.answer}</p>

      {/* SME explanation — the agent explains it for a non-technical CISO */}
      {a.explanation && (
        <div style={{ marginTop: 12, background: '#eef4fb', border: '1px solid #cfe0f3', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Michael explains</div>
          <div style={{ fontSize: 13.5, color: INK, lineHeight: 1.6 }}>{a.explanation}</div>
        </div>
      )}

      {/* meta row — status + confidence + owner + target (no posture score) */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${HAIR}` }}>
        <Pill text={a.status} color={status} />
        <span style={{ fontSize: 12, color: INK2 }}>Confidence <strong style={{ color: conf(a.confidence) }}>{a.confidence}</strong></span>
        <span style={{ fontSize: 12, color: INK2 }}>Owner <strong style={{ color: INK }}>{a.owner}</strong></span>
        <span style={{ fontSize: 12, color: INK2 }}>Target <strong style={{ color: INK }}>{a.targetDate}</strong></span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
        <Section label="What changed">{a.whatChanged}</Section>
        <Section label="Why it matters">{a.whyItMatters}</Section>
      </div>

      <Section label="Evidence">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(a.evidence || []).slice(0, 5).map((e, i) => <li key={i} style={{ marginBottom: 4 }}>{e}</li>)}
        </ul>
      </Section>

      {a.businessImpact && <Section label="Business / process impact">{a.businessImpact}</Section>}

      {/* clickable issues called out in the answer */}
      {issues && issues.length > 0 && (
        <Section label="Issues called out — click any for detail">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {issues.map((it, i) => (
              <button key={i} onClick={() => onIssueClick && onIssueClick(it.entity)}
                style={{ background: '#fff', border: `1px solid ${it.entity ? '#c7d2e0' : HAIR}`, color: it.entity ? '#1d4ed8' : INK2, borderRadius: 16, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: it.entity ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {it.label}{it.entity && <span style={{ fontSize: 10, color: '#94a3b8' }}>→</span>}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* recommended action */}
      <div style={{ marginTop: 18, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#1f8a4c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Recommended action</div>
        <div style={{ fontSize: 14, color: INK, lineHeight: 1.55 }}>{a.recommendedAction}</div>
        <div style={{ fontSize: 11.5, color: INK2, marginTop: 8 }}>Owner: <strong>{a.owner}</strong> · Target: <strong>{a.targetDate}</strong></div>
      </div>

      <div style={{ fontSize: 10.5, color: INK3, marginTop: 14 }}>
        Data sources: {(a.dataSources || []).join(', ')}{a.lastRefreshed ? ` · Refreshed ${new Date(a.lastRefreshed).toLocaleString()}` : ''}
      </div>
    </div>
  );
}
