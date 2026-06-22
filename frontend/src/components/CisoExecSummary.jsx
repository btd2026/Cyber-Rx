/**
 * CisoExecSummary — the CISO Exec Summary as four decision-first boxes.
 *
 *   1 Verdict           — one plain-language sentence + severity + since-last-login
 *   2 Decisions need you — ranked, clickable straight through to the decision queue
 *   3 Active exposure    — the live incident in the CISO's terms + containment + clock
 *   4 Trend vs appetite  — residual risk against the appetite line (reuses TrendVsTarget)
 *
 * Driven by the same server-side incident spine as the executive briefs, so the
 * verdict + exposure move with the incident phase. Styling follows the dashboard's
 * theme constants (COLORS/FONTS/ELEV) to match the surrounding CISO view.
 */

import { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS, ELEV } from '../theme';
import TrendVsTarget from './TrendVsTarget';

const numSev = (n) => (n >= 5 ? 'Critical' : n >= 4 ? 'High' : n >= 3 ? 'Medium' : 'Low');
const SEV = { Critical: COLORS.bad, High: COLORS.high, Medium: COLORS.warn, Low: COLORS.good };
const band = (s) => (s >= 80 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 40 ? 'Weak' : 'Critical');

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

export default function CisoExecSummary(props) {
  const d = props.d || {};
  const onOpenQueue = props.onOpenQueue || (() => {});
  const { token, orgId, api } = ctx(props);
  const [incident, setIncident] = useState(null);
  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);
  useEffect(() => {
    fetch(`${api}/api/exec/incident?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setIncident(j); }).catch(() => {});
  }, [api, orgId, headers]);

  const p = d.overallPosture || {};
  // Default to fully-verified so the summary reads "contained" without an incident.
  const verified = incident ? incident.verified : true;
  const contained = incident ? incident.contained : true;
  const vc = !contained ? COLORS.bad : !verified ? COLORS.warn : COLORS.good;
  const vLabel = !contained ? 'Active exposure' : !verified ? 'Containing' : 'Contained';
  const sentence = !contained
    ? 'An access control protecting customer payments has failed and is being contained.'
    : !verified
      ? 'A compensating control is applied to the payments exposure; verification is in progress.'
      : 'One material exposure touching payments is contained; every other control holds.';
  const delta = p.delta != null ? `${p.delta >= 0 ? '↑ +' : '↓ '}${Math.abs(p.delta)} since last login` : 'since last login';

  const actions = (d.actionQueue || []).slice(0, 4);
  const decisionsCount = (d.actionQueue || []).length;
  const inc = incident || {};

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* 1 · Verdict — plain language, severity, delta. No score/gauge. */}
      <Box label="Verdict">
        <p style={{ margin: 0, fontFamily: FONTS.display, fontSize: 20, fontWeight: 600, lineHeight: 1.4, color: COLORS.ink }}>{sentence}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: vc, background: vc === COLORS.good ? COLORS.goodSoft : vc === COLORS.warn ? COLORS.warnSoft : COLORS.badSoft, borderRadius: 999, padding: '3px 10px' }}>
            {verified && contained ? '✓ ' : ''}{vLabel}
          </span>
          <span className="crx-figure" style={{ fontSize: 11.5, color: COLORS.ink3, fontFamily: FONTS.mono }}>{delta}</span>
        </div>
      </Box>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
        {/* 2 · Decisions that need you — clickable through to the decision queue. */}
        <Box label={`Decisions that need you${decisionsCount ? ` · ${decisionsCount}` : ''}`}
          action={<button onClick={onOpenQueue} style={linkBtn}>Review all →</button>}>
          {actions.length === 0
            ? <div style={{ fontSize: 12.5, color: COLORS.ink2 }}>No decisions awaiting you right now.</div>
            : (
              <div style={{ display: 'grid', gap: 8 }}>
                {actions.map((a) => {
                  const sv = a.escalation ? COLORS.bad : SEV[numSev(a.severity)] || COLORS.warn;
                  return (
                    <button key={a.id} onClick={onOpenQueue} title="Open the decision queue"
                      style={{ textAlign: 'left', cursor: 'pointer', background: COLORS.white, border: `1px solid ${COLORS.hair}`, borderLeft: `3px solid ${sv}`, borderRadius: 8, padding: '9px 11px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span className="crx-figure" style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: COLORS.paper, color: sv, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{a.rank}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: COLORS.ink, lineHeight: 1.35 }}>{a.action}</span>
                        <span style={{ display: 'block', fontSize: 11, color: COLORS.ink3, marginTop: 3 }}>{numSev(a.severity)} · {a.owner} · due {a.dueDate}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
        </Box>

        {/* 3 · Active exposure — the live incident in the CISO's terms. */}
        <Box label="Active exposure">
          {incident ? (
            <div style={{ display: 'grid', gap: 7 }}>
              <Row k="Control that failed" v={inc.control} />
              <Row k="Business blast radius" v={inc.blastRadius} />
              <Row k="Containment" v={verified
                ? <span style={{ color: COLORS.good, fontWeight: 700 }}>✓ verified holding{inc.verifiedAt ? ` (${inc.verifiedAt})` : ''}</span>
                : <span style={{ color: COLORS.warn, fontWeight: 700 }}>in progress — not yet verified</span>} />
              <Row k="Disclosure clock" v={inc.materialityStatus === 'under review' ? 'materiality under review — not started' : (inc.materialityStatus || 'not started')} />
            </div>
          ) : <div style={{ fontSize: 12.5, color: COLORS.ink2 }}>No active incident. Controls holding across the board.</div>}
        </Box>
      </div>

      {/* 4 · Trend vs risk appetite — reuses the shared trend-vs-target chart. */}
      <Box label="Trend vs risk appetite">
        <TrendVsTarget label="Residual risk vs appetite" unit="" targetLabel="Appetite ceiling" goodWhen="low" target={40}
          quarterly={[{ label: 'Q1', value: 52 }, { label: 'Q2', value: 48 }, { label: 'Q3', value: 44 }, { label: 'Q4', value: 46 }]}
          monthly={[{ label: 'Apr', value: 47 }, { label: 'May', value: 45 }, { label: 'Jun', value: 44 }, { label: 'Jul', value: 46 }]} />
        {p.current != null && (
          <div style={{ fontSize: 11, color: COLORS.ink3, marginTop: 8 }}>Headline posture {p.current}/100 ({band(p.current)}) · {p.trend || 'stable'}.</div>
        )}
      </Box>
    </div>
  );
}

const linkBtn = { background: 'none', border: 'none', color: COLORS.accent, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 };

function Box({ label, action, children }) {
  return (
    <div style={{ background: COLORS.white, border: `1px solid ${COLORS.hair}`, borderRadius: 12, boxShadow: ELEV.card, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: COLORS.ink3 }}>{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10, alignItems: 'baseline', fontSize: 12.5 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</span>
      <span style={{ color: COLORS.ink, lineHeight: 1.5 }}>{v}</span>
    </div>
  );
}
