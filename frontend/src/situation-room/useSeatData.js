/**
 * useSeatData — generic adapter for the six non-CISO seats (CISO has useCisoData).
 *
 * Binds the COMMON spine that every role's backend exposes with a verified shape:
 *   GET /api/agents/briefs/:role        → { headline, status, summary, metrics, ... }
 *   GET /api/agents/key-questions/:role → { cards:[{question,answer,severity}] }
 *   GET /api/metrics/:role              → { metrics:{ postureScore, ... } }
 * Returns overrides the seat merges over its authored sample (tagged-sample fallback).
 * Not every role has every endpoint (no CEO brief/metrics; metrics only cfo/ciso/cro/
 * board) — missing ones simply stay null and the seat shows its tagged sample.
 *
 * Same fetch context as useCisoData (token + X-Org-Id). Resilient + offline-safe.
 */
import { useEffect, useState } from 'react';
import { apiCtx } from './useCisoData';

const statusKind = (s) => (s === 'red' ? 'critical' : s === 'amber' ? 'exposure' : 'pass');
const statusLabel = (s) => (s === 'red' ? 'Action required' : s === 'amber' ? 'Attention' : 'Within tolerance');
const isCrit = (s) => /crit/i.test(String(s || ''));
const sevKind = (s) => (isCrit(s) ? 'critical' : /high|med/i.test(String(s || '')) ? 'exposure' : 'pass');

export function useSeatData(seat, props = {}) {
  // Agent endpoints validate role with EXACT case (ROLES keys are 'CFO','CRO',
  // 'CLO','CIO','Board' — same as the seat string). metrics/:role is lowercase.
  const agentRole = String(seat || '');
  const metricRole = agentRole.toLowerCase();
  const { token, orgId, api } = apiCtx(props);
  const [brief, setBrief] = useState(null);
  const [kq, setKq] = useState(null);
  const [met, setMet] = useState(null);

  useEffect(() => {
    if (!seat || seat === 'CISO') return undefined; // CISO uses useCisoData
    let alive = true;
    const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`;
    const q = `org_id=${encodeURIComponent(orgId)}`;
    const grab = (path, set) => fetch(`${api}${path}${path.includes('?') ? '&' : '?'}${q}`, { headers: h })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j) set(j); }).catch(() => {});
    grab(`/api/agents/briefs/${agentRole}`, setBrief);
    grab(`/api/agents/key-questions/${agentRole}`, setKq);
    grab(`/api/metrics/${metricRole}`, setMet);
    return () => { alive = false; };
  }, [seat, agentRole, metricRole, api, orgId, token]);

  if (!brief && !kq && !met) return null;
  const out = {};
  if (brief && brief.headline) {
    out.brief = { verdict: brief.headline, lede: brief.summary || null, pill: statusLabel(brief.status), pillKind: statusKind(brief.status) };
  }
  const cards = (kq && (kq.cards || kq.questions)) || null;
  if (Array.isArray(cards) && cards.length) {
    out.briefingCards = cards.map((c) => ({ q: c.question, a: c.answer, pill: c.severity || '', kind: sevKind(c.severity) }));
  }
  const ps = met && met.metrics && (met.metrics.postureScore != null ? met.metrics.postureScore
    : (met.metrics.posture != null ? met.metrics.posture : null));
  if (ps != null) out.postureLive = ps;
  return Object.keys(out).length ? out : null;
}
