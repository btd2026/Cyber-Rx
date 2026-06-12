/**
 * CisoAnswerView — clean, focused CISO agent answer
 * -------------------------------------------------
 * When the CISO agent answers one of the 15 executive questions, this renders a
 * single professional, board-ready explanation — Answer, then What changed / Why
 * it matters / Evidence / Recommended action / Owner / Target — instead of
 * dumping the whole multi-component dashboard. A single link opens the full
 * Security Posture Dashboard for those who want to explore.
 */

import React from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e8edf3', PANEL = '#f8fafc';
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

export default function CisoAnswerView({ a, onOpenDashboard, onBack }) {
  if (!a) return null;
  const status = C[a.status] || INK3;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: INK3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>CISO Agent · Executive Answer</div>
        {onBack && <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${HAIR}`, color: INK2, borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}>← Ask another</button>}
      </div>

      <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderTop: `4px solid ${status}`, borderRadius: 10, padding: '24px 28px', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
        {/* Question + answer */}
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: INK, lineHeight: 1.4 }}>{a.question}</h2>
        <p style={{ fontSize: 16.5, color: INK, lineHeight: 1.55, margin: '12px 0 0', fontWeight: 500 }}>{a.answer}</p>

        {/* meta row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${HAIR}` }}>
          <Pill text={a.status} color={status} />
          <span style={{ fontSize: 12, color: INK2 }}>Confidence <strong style={{ color: conf(a.confidence) }}>{a.confidence}</strong></span>
          <span style={{ fontSize: 12, color: INK2 }}>Owner <strong style={{ color: INK }}>{a.owner}</strong></span>
          <span style={{ fontSize: 12, color: INK2 }}>Target <strong style={{ color: INK }}>{a.targetDate}</strong></span>
        </div>

        {/* explanation */}
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

        {/* recommended action */}
        <div style={{ marginTop: 18, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1f8a4c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Recommended action</div>
          <div style={{ fontSize: 14, color: INK, lineHeight: 1.55 }}>{a.recommendedAction}</div>
          <div style={{ fontSize: 11.5, color: INK2, marginTop: 8 }}>Owner: <strong>{a.owner}</strong> · Target: <strong>{a.targetDate}</strong></div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${HAIR}` }}>
          <div style={{ fontSize: 10.5, color: INK3 }}>
            Data sources: {(a.dataSources || []).join(', ')}{a.lastRefreshed ? ` · Refreshed ${new Date(a.lastRefreshed).toLocaleString()}` : ''}
          </div>
          {onOpenDashboard && (
            <button onClick={onOpenDashboard} style={{ background: INK, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Open full Security Posture Dashboard →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
