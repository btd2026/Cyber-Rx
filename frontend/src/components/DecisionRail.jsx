/**
 * DecisionRail — the always-visible "decisions, not dashboards" surface. A
 * persistent bar (shown across every sub-tab) with a count of what needs the
 * leader's decision — fed by risks, stalled projects, AI risk, and blind spots —
 * opening a slide-over with the compact queue, a jump to the full Decision Queue,
 * and a one-click export of the decision & evidence ledger (defensibility).
 *
 * VisibilityChip — per-asset-class visibility confidence, surfaced in the hero so
 * outputs are never presented confidently over thin data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper;
const NAVY = COLORS.navy1;
// SEV — semantic severity, meaning preserved.
const SEV = { Critical: COLORS.bad, High: '#A85B2E', Medium: COLORS.warn, Low: COLORS.good };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}
const headersFor = (orgId, token) => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; };

export function VisibilityChip(props) {
  const { token, orgId, api } = ctx(props);
  const [v, setV] = useState(null);
  useEffect(() => {
    fetch(`${api}/api/visibility?org_id=${encodeURIComponent(orgId)}`, { headers: headersFor(orgId, token) })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setV(d); }).catch(() => {});
  }, [api, orgId, token]);
  if (!v) return null;
  const c = v.band === 'High' ? '#34d399' : v.band === 'Moderate' ? '#fbbf24' : '#f87171';
  return (
    <span title={v.caveat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#16263b', border: '1px solid #2c4f7c', borderRadius: 999, padding: '5px 12px', fontSize: 11, color: '#cbd5e1', cursor: 'help' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
      Data visibility: <strong style={{ color: '#fff' }}>{v.band} ({v.overall}%)</strong>
    </span>
  );
}

export default function DecisionRail(props) {
  const role = props.role || 'CISO';
  const { token, orgId, api } = ctx(props);
  const [cards, setCards] = useState([]);
  const [blind, setBlind] = useState([]);
  const [open, setOpen] = useState(false);
  const [integrity, setIntegrity] = useState(null);
  const headers = useCallback(() => headersFor(orgId, token), [orgId, token]);

  useEffect(() => {
    fetch(`${api}/api/decisions?role=${encodeURIComponent(role)}&org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setCards(d.cards || []); }).catch(() => {});
    // Blind spots feed the queue too (kept separate server-side to avoid recursion).
    fetch(`${api}/api/coaching/blindspots?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.findings) setBlind(d.findings.filter((f) => f.severity === 'Critical' || f.severity === 'High')); }).catch(() => {});
    fetch(`${api}/api/decisions/ledger/verify?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setIntegrity(d); }).catch(() => {});
  }, [api, orgId, role, headers]);

  const undecided = cards.filter((c) => !c.decision);
  const count = undecided.length + blind.length;
  const crit = undecided.filter((c) => c.event.severity === 'Critical').length;
  const tone = crit > 0 ? '#C0392B' : count > 0 ? '#B07C2E' : '#1f8a4c';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: tone === '#1f8a4c' ? '#f0f7f2' : '#fff7ed', border: `1px solid ${tone}33`, borderLeft: `4px solid ${tone}`, padding: '9px 16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: INK, fontWeight: 600 }}>
          <span style={{ fontSize: 14 }}>⚖️</span>{' '}
          {count > 0
            ? <>{count} decision{count === 1 ? '' : 's'} need your attention{crit ? ` — ${crit} critical` : ''}.</>
            : <>No open decisions — you're current.</>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { if (props.onOpenQueue) props.onOpenQueue(); else setOpen(true); }} style={{ background: tone, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>Review decisions</button>
          {props.onOpenQueue && count > 0 && (
            <button onClick={() => setOpen(true)} title="Quick peek without leaving this page" style={{ background: '#fff', color: INK2, border: `1px solid ${HAIR}`, borderRadius: 7, padding: '6px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>Peek</button>
          )}
          {integrity && integrity.entries > 0 && (
            <span title={integrity.valid ? `Hash chain intact · ${integrity.entries} entries` : `Chain broken at entry ${integrity.brokenAt}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: integrity.valid ? '#1f8a4c' : '#C0392B', border: `1px solid ${integrity.valid ? '#1f8a4c' : '#C0392B'}33`, borderRadius: 7, padding: '6px 9px' }}>
              {integrity.valid ? '🛡 Integrity verified' : '⚠ Integrity broken'}
            </span>
          )}
          <a href={`${api}/api/decisions/ledger.csv?org_id=${encodeURIComponent(orgId)}`} style={{ background: '#fff', color: INK2, border: `1px solid ${HAIR}`, borderRadius: 7, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>⤓ Ledger</a>
          <a href={`${api}/api/decisions/evidence-package?org_id=${encodeURIComponent(orgId)}`} title="Auditor evidence package (decisions + hash-chain proof)" style={{ background: '#fff', color: INK2, border: `1px solid ${HAIR}`, borderRadius: 7, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}>⤓ Evidence</a>
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,0.45)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px,94vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)', overflowY: 'auto', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: INK, fontFamily: FONTS.display }}>Decisions needing attention</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: INK3, cursor: 'pointer' }}>✕</button>
            </div>
            {props.onOpenQueue && (
              <button onClick={() => { setOpen(false); props.onOpenQueue(); }} style={{ width: '100%', background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>Open the full Decision Queue →</button>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {undecided.map((c) => (
                <div key={c.id} onClick={props.onOpenQueue ? () => { setOpen(false); props.onOpenQueue(); } : undefined}
                  role={props.onOpenQueue ? 'button' : undefined} tabIndex={props.onOpenQueue ? 0 : undefined}
                  style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${SEV[c.event.severity] || INK3}`, borderRadius: 8, padding: '9px 12px', cursor: props.onOpenQueue ? 'pointer' : 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{(c.lens && c.lens.headline) || c.event.title}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: SEV[c.event.severity] || INK3, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{c.event.severity}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>{c.type === 'compound' ? 'Chained scenario' : c.event.category === 'project' ? 'Stalled project' : 'Risk'} · {c.event.title}{props.onOpenQueue ? ' · Decide →' : ''}</div>
                </div>
              ))}
              {blind.map((f, i) => (
                <div key={`b${i}`} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid #7c3aed`, borderRadius: 8, padding: '9px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{f.pattern}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#7c3aed', borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>Blind spot</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>{f.detail}</div>
                </div>
              ))}
              {count === 0 && <div style={{ fontSize: 12, color: INK3 }}>Nothing pending — every critical item has a recorded decision.</div>}
            </div>
            <a href={`${api}/api/decisions/ledger.csv?org_id=${encodeURIComponent(orgId)}`} style={{ display: 'inline-block', marginTop: 14, fontSize: 11.5, color: '#1d4ed8', fontWeight: 700 }}>⤓ Export decision &amp; evidence ledger (CSV)</a>
          </div>
        </div>
      )}
    </>
  );
}
