/**
 * RiskDecision — the CISO's documented decision on an escalated or hidden risk.
 *
 * Three paths:
 *   1. Open a remediation ticket (TicketControl — assign owner, tracks age/SLA).
 *   2. Accept the risk — a documented risk acceptance (justification, accepted
 *      by, review date) persisted via /api/remediation/risk-acceptance; shows the
 *      acceptance age and an "expired" flag once the review date passes.
 *   3. Escalate to an executive sponsor (email / copy a briefing note).
 *
 * An existing decision (open ticket or recorded acceptance) is loaded on mount.
 */

import React, { useState, useEffect, useCallback } from 'react';
import TicketControl from './TicketControl';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e2e8f0', PANEL = '#f8fafc';
const GREEN = '#1f8a4c', RED = '#C0392B', AMBER = '#B07C2E';

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

const Tab = ({ on, onClick, children }) => (
  <button onClick={onClick} style={{ background: on ? '#0f1b2d' : '#fff', color: on ? '#fff' : INK2, border: `1px solid ${on ? '#0f1b2d' : HAIR}`, borderRadius: 7, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{children}</button>
);

export default function RiskDecision(props) {
  const { sourceRef, title, severity, owner, recommendation, processName, escalationPath } = props;
  const { token, orgId, api } = ctx(props);
  const [mode, setMode] = useState(null);          // 'ticket' | 'accept' | 'escalate'
  const [acceptance, setAcceptance] = useState(null);
  const [form, setForm] = useState({ justification: '', acceptedBy: owner || '', riskLevel: severity || 'Medium', reviewDate: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const headers = useCallback(() => {
    const h = { 'X-Org-Id': orgId, 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [orgId, token]);

  useEffect(() => {
    fetch(`${api}/api/remediation/risk-acceptance?sourceRef=${encodeURIComponent(sourceRef)}&org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => r.json()).then((j) => { if (j.acceptance) { setAcceptance(j.acceptance); setMode('accept'); } }).catch(() => {});
  }, [api, orgId, sourceRef, headers]);

  const submitAccept = () => {
    if (!form.justification.trim()) { setError('A justification is required to accept a risk.'); return; }
    setBusy(true); setError(null);
    fetch(`${api}/api/remediation/risk-acceptance`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ org_id: orgId, sourceRef, title, justification: form.justification, riskLevel: form.riskLevel, acceptedBy: form.acceptedBy, reviewDate: form.reviewDate || null }),
    }).then((r) => r.json()).then((j) => setAcceptance(j.acceptance)).catch((e) => setError(e.message)).finally(() => setBusy(false));
  };

  const revoke = () => {
    setBusy(true);
    fetch(`${api}/api/remediation/risk-acceptance/revoke`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, sourceRef }) })
      .then((r) => r.json()).then((j) => setAcceptance(j.acceptance)).catch((e) => setError(e.message)).finally(() => setBusy(false));
  };

  const note = `ESCALATION — ${title}\nRecommended: ${recommendation || '—'}\nOwner: ${owner || '—'}\nEscalation path: ${escalationPath || 'CISO → executive sponsor'}\nProtects: ${processName || '—'}\n— Raised from the CyberRx CISO dashboard.`;
  const mailto = `mailto:?subject=${encodeURIComponent(`[Escalation] ${title}`)}&body=${encodeURIComponent(note)}`;
  const copy = () => { try { navigator.clipboard.writeText(note); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (_) {} };

  // If the risk is already accepted (and not revoked), lead with that record.
  const active = acceptance && acceptance.status !== 'revoked';

  return (
    <div style={{ marginTop: 9, borderTop: `1px dashed ${HAIR}`, paddingTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#0f1b2d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Your decision</div>

      {active ? (
        <div style={{ background: acceptance.expired ? '#fdf6e9' : '#f0f7f2', border: `1px solid ${acceptance.expired ? '#f0dcae' : '#cce8d6'}`, borderRadius: 8, padding: '10px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', background: acceptance.expired ? AMBER : GREEN, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase' }}>{acceptance.expired ? 'Acceptance expired' : 'Risk accepted'}</span>
            <span style={{ fontSize: 11, color: INK2 }}>Accepted <strong style={{ color: INK }}>{acceptance.ageDays}d ago</strong>{acceptance.acceptedBy ? <> by <strong style={{ color: INK }}>{acceptance.acceptedBy}</strong></> : null}</span>
            {acceptance.reviewDate && <span style={{ fontSize: 11, color: acceptance.expired ? AMBER : INK3 }}>Review {new Date(acceptance.reviewDate).toLocaleDateString()}</span>}
          </div>
          <div style={{ fontSize: 11.5, color: INK, lineHeight: 1.5, marginTop: 6 }}>{acceptance.justification}</div>
          <button onClick={revoke} disabled={busy} style={{ marginTop: 8, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '5px 11px', fontSize: 11, fontWeight: 600, color: RED, cursor: 'pointer' }}>Revoke & reconsider</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: mode ? 10 : 0 }}>
            <Tab on={mode === 'ticket'} onClick={() => setMode('ticket')}>＋ Open remediation ticket</Tab>
            <Tab on={mode === 'accept'} onClick={() => setMode('accept')}>✓ Accept the risk</Tab>
            <Tab on={mode === 'escalate'} onClick={() => setMode('escalate')}>↑ Escalate to sponsor</Tab>
          </div>

          {mode === 'ticket' && (
            <TicketControl sourceRef={sourceRef} title={`[CISO] ${title}`} recommendation={recommendation} severity={severity} owner={owner} />
          )}

          {mode === 'accept' && (
            <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 8, padding: '11px 13px' }}>
              <div style={{ fontSize: 11, color: INK2, marginBottom: 8 }}>Document the acceptance — this is the formal record that the risk is being kept as-is.</div>
              <textarea value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })}
                placeholder="Justification — why is this risk acceptable, and what compensating factors apply?"
                style={{ width: '100%', minHeight: 60, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: INK, boxSizing: 'border-box', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                <label style={{ fontSize: 10.5, color: INK2 }}>Accepted by<br />
                  <input value={form.acceptedBy} onChange={(e) => setForm({ ...form, acceptedBy: e.target.value })} placeholder="Name / role"
                    style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, marginTop: 2 }} /></label>
                <label style={{ fontSize: 10.5, color: INK2 }}>Risk level<br />
                  <select value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}
                    style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, marginTop: 2 }}>
                    {['Low', 'Medium', 'High', 'Critical'].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select></label>
                <label style={{ fontSize: 10.5, color: INK2 }}>Review by<br />
                  <input type="date" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
                    style={{ border: `1px solid ${HAIR}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, marginTop: 2 }} /></label>
              </div>
              <button onClick={submitAccept} disabled={busy}
                style={{ marginTop: 10, background: GREEN, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Recording…' : 'Record risk acceptance'}
              </button>
            </div>
          )}

          {mode === 'escalate' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={mailto} style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: INK, textDecoration: 'none' }}>✉ Email sponsor</a>
              <button onClick={copy} style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: INK, cursor: 'pointer' }}>{copied ? '✓ Copied' : '⧉ Copy briefing note'}</button>
            </div>
          )}
        </>
      )}
      {error && <div style={{ fontSize: 11, color: RED, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
