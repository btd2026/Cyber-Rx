/**
 * ExecutiveAgentBrief
 * -------------------
 * Surfaces the CyberRX AI agent layer on each executive dashboard.
 *
 * Product vision: "AI agents run continuously inside your perimeter — reading
 * every signal, scoring every risk, and briefing every leader in real time."
 *
 * This panel shows the live, role-specific brief produced by that executive's
 * dedicated agent: the direct answer to the one question they own, plus the
 * metrics, highlights, and recommended actions behind it.
 *
 * Props:
 *   role     - one of 'CFO' | 'CRO' | 'CLO' | 'CIO' | 'CISO' | 'Board'
 *   authToken, orgId, api_url - same auth context the dashboards already use
 */

import React, { useState, useEffect, useCallback } from 'react';

const STATUS_STYLES = {
  green: { bg: '#0f2e1d', border: '#1f8a4c', text: '#5fe39b', label: 'On track' },
  amber: { bg: '#332708', border: '#b8860b', text: '#ffce5c', label: 'Attention' },
  red: { bg: '#3a1212', border: '#c0392b', text: '#ff7a6b', label: 'Action needed' },
};

const PRIORITY_COLORS = {
  Critical: '#ff5c5c',
  High: '#ffa64d',
  Medium: '#ffd24d',
  Low: '#8fb3ff',
};

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  // The app stores the active org id under 'cyberrx_org_id' (see App.jsx).
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl =
    props.api_url ||
    props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    'http://localhost:3001';
  return { token, organizationId, apiUrl };
}

export default function ExecutiveAgentBrief(props) {
  const { role } = props;
  const [brief, setBrief] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  // Interactive Q&A
  const [suggested, setSuggested] = useState([]);
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]); // {q, summary, details, source}
  const [asking, setAsking] = useState(false);

  const { token, organizationId, apiUrl } = resolveCtx(props);

  const authHeaders = useCallback(() => {
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, [token, organizationId]);

  const ask = useCallback(
    async (q) => {
      const text = String(q || '').trim();
      if (!text || asking) return;
      setAsking(true);
      setConversation((c) => [...c, { q: text, pending: true }]);
      setQuestion('');
      try {
        const res = await fetch(`${apiUrl}/api/agents/ask/${role}?org_id=${encodeURIComponent(organizationId)}`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: text }),
        });
        if (!res.ok) throw new Error(`Agent unavailable (${res.status})`);
        const data = await res.json();
        setConversation((c) => c.map((m, i) => (i === c.length - 1
          ? { q: text, summary: data.summary, details: data.details || [], source: data.source }
          : m)));
      } catch (e) {
        setConversation((c) => c.map((m, i) => (i === c.length - 1
          ? { q: text, summary: `Could not get an answer: ${e.message}`, details: [], error: true }
          : m)));
      } finally {
        setAsking(false);
      }
    },
    [role, organizationId, apiUrl, authHeaders, asking]
  );

  const load = useCallback(
    async (refresh) => {
      try {
        refresh ? setRefreshing(true) : setLoading(true);
        setError(null);
        const headers = { 'X-Org-Id': organizationId };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const params = new URLSearchParams();
        if (organizationId) params.set('org_id', organizationId);
        if (refresh) params.set('refresh', '1');
        const qs = params.toString();
        const url = `${apiUrl}/api/agents/briefs/${role}${qs ? `?${qs}` : ''}`;
        const res = await fetch(url, { method: 'GET', headers });
        if (!res.ok) throw new Error(`Agent unavailable (${res.status})`);
        const data = await res.json();
        setBrief(data);
        setAiEnabled(data.source === 'ai');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [role, token, organizationId, apiUrl]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    fetch(`${apiUrl}/api/agents/questions/${role}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.questions)) setSuggested(d.questions); })
      .catch(() => {});
  }, [role, apiUrl, authHeaders]);

  const wrap = {
    background: 'linear-gradient(135deg, #11141c 0%, #161b27 100%)',
    border: '1px solid #2a3346',
    borderRadius: 14,
    padding: '20px 22px',
    margin: '0 0 24px 0',
    color: '#e6ecf5',
    boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
  };

  if (loading) {
    return (
      <div style={wrap} data-testid="agent-brief-loading">
        <div style={{ opacity: 0.7, fontSize: 14 }}>● Your {role} agent is reading the stack…</div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div style={wrap} data-testid="agent-brief-error">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, color: '#ff9a8c' }}>Agent brief unavailable: {error || 'no data'}</div>
          <button onClick={() => load(true)} style={btnStyle}>Retry</button>
        </div>
      </div>
    );
  }

  const st = STATUS_STYLES[brief.status] || STATUS_STYLES.amber;

  return (
    <div style={wrap} data-testid={`agent-brief-${role}`}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: '#7aa2ff', textTransform: 'uppercase' }}>
              {role} Agent
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: aiEnabled ? '#15243f' : '#23262e',
              color: aiEnabled ? '#7aa2ff' : '#9aa3b2',
              border: `1px solid ${aiEnabled ? '#2f4a7a' : '#333a47'}`,
            }}>
              {aiEnabled ? '◆ AI · running continuously' : '◆ continuous · live data'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#9aa6bc', fontStyle: 'italic', marginBottom: 8 }}>
            “{brief.question}”
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{brief.headline}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
            background: st.bg, color: st.text, border: `1px solid ${st.border}`, whiteSpace: 'nowrap',
          }}>
            ● {st.label}
          </span>
        </div>
      </div>

      {/* Summary */}
      {brief.summary && (
        <div style={{ fontSize: 14, color: '#c5cee0', marginTop: 12, lineHeight: 1.55 }}>{brief.summary}</div>
      )}

      {/* Metrics */}
      {Array.isArray(brief.metrics) && brief.metrics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(brief.metrics.length, 4)}, 1fr)`, gap: 12, marginTop: 16 }}>
          {brief.metrics.slice(0, 4).map((m, i) => (
            <div key={i} style={{ background: '#0e1118', border: '1px solid #232b3a', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#8b95a8', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Highlights + Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 18 }}>
        {Array.isArray(brief.highlights) && brief.highlights.length > 0 && (
          <div>
            <div style={sectionLabel}>What the agent surfaced</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {brief.highlights.slice(0, 4).map((h, i) => (
                <li key={i} style={{ fontSize: 13, color: '#cdd6e6', marginBottom: 6, lineHeight: 1.45 }}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(brief.actions) && brief.actions.length > 0 && (
          <div>
            <div style={sectionLabel}>Recommended actions ({brief.deliverable})</div>
            {brief.actions.slice(0, 3).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <span style={{
                  marginTop: 2, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5,
                  background: '#0e1118', color: PRIORITY_COLORS[a.priority] || '#cdd6e6',
                  border: `1px solid ${PRIORITY_COLORS[a.priority] || '#333a47'}`, whiteSpace: 'nowrap',
                }}>{a.priority}</span>
                <div style={{ fontSize: 13, color: '#cdd6e6', lineHeight: 1.4 }}>
                  {a.title} <span style={{ color: '#8b95a8' }}>· {a.owner}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #232b3a' }}>
        <span style={{ fontSize: 11, color: '#6f7a8d' }}>
          {brief.generatedAt ? `Updated ${new Date(brief.generatedAt).toLocaleString()}` : 'Live brief'}
        </span>
        <button onClick={() => load(true)} disabled={refreshing} style={btnStyle}>
          {refreshing ? 'Re-reading stack…' : '↻ Refresh brief'}
        </button>
      </div>

      {/* Interactive Q&A — ask the agent */}
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #232b3a' }}>
        <div style={{ ...sectionLabel, marginBottom: 10 }}>Ask your {role} agent</div>

        {/* Conversation */}
        {conversation.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            {conversation.map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: 13, color: '#9bc0ff', fontWeight: 600, marginBottom: 6 }}>
                  <span style={{ color: '#6f7a8d', fontWeight: 400 }}>You asked: </span>{m.q}
                </div>
                {m.pending ? (
                  <div style={{ fontSize: 13, color: '#8b95a8', fontStyle: 'italic' }}>● Agent is analyzing the data…</div>
                ) : (
                  <div style={{ background: '#0e1118', border: '1px solid #232b3a', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 14, color: m.error ? '#ff9a8c' : '#e6ecf5', lineHeight: 1.5 }}>{m.summary}</div>
                    {Array.isArray(m.details) && m.details.length > 0 && (
                      <>
                        <div style={{ ...sectionLabel, marginTop: 10, marginBottom: 6 }}>Relevant details</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {m.details.map((d, j) => (
                            <li key={j} style={{ fontSize: 13, color: '#cdd6e6', marginBottom: 5, lineHeight: 1.45 }}>{d}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Suggested questions */}
        {suggested.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {suggested.map((sq, i) => (
              <button key={i} onClick={() => ask(sq)} disabled={asking} style={chipStyle}>{sq}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); ask(question); }} style={{ display: 'flex', gap: 8 }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask the ${role} agent anything…`}
            disabled={asking}
            style={{ flex: 1, background: '#0e1118', border: '1px solid #2f3a4d', borderRadius: 8, padding: '9px 12px', color: '#e6ecf5', fontSize: 13, outline: 'none' }}
          />
          <button type="submit" disabled={asking || !question.trim()} style={{ ...btnStyle, opacity: asking || !question.trim() ? 0.5 : 1 }}>
            {asking ? 'Asking…' : 'Ask →'}
          </button>
        </form>
      </div>
    </div>
  );
}

const sectionLabel = {
  fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#8b95a8',
  textTransform: 'uppercase', marginBottom: 8,
};

const btnStyle = {
  background: '#1a2436', color: '#9bc0ff', border: '1px solid #2f4a7a',
  borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
};

const chipStyle = {
  background: '#141a26', color: '#aebbd4', border: '1px solid #2a3346',
  borderRadius: 16, padding: '5px 11px', fontSize: 12, cursor: 'pointer', textAlign: 'left',
};
