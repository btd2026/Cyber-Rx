/**
 * CsfRankings — Systemwide CSF standings
 * --------------------------------------
 * Every organization's latest NIST CSF 2.0 scorecard as a risk-adjusted
 * standings board (the association/board view):
 *
 *   · One ranked row per organization on a shared 1.00–4.00 maturity track,
 *     with the four tier zones and the 3.0 threshold marked — the threshold
 *     is a literal divider in the standings.
 *   · A six-function heat fingerprint (GV·ID·PR·DE·RS·RC) showing WHERE each
 *     organization is weak, not just its average.
 *   · An inherent-exposure badge and a verdict that combines the two: a
 *     sub-threshold org with severe exposure reads "Priority", not just "low".
 *
 * Data: GET /api/csf/rankings (?refresh=1 recomputes every org).
 */

import React, { useState, useEffect, useCallback } from 'react';

const INK = '#0f172a';
const INK_2 = '#475569';
const INK_3 = '#94a3b8';
const HAIRLINE = '#e2e8f0';
const TIER_COLORS = { 1: '#9E3B32', 2: '#B07C2E', 3: '#6E7F49', 4: '#31604B' };
const NA_COLOR = '#cbd5e1';
const THRESHOLD = 3.0;
const TRACK_MIN = 1, TRACK_MAX = 4;

const FN_ORDER = [
  { id: 'GV', name: 'Govern' }, { id: 'ID', name: 'Identify' }, { id: 'PR', name: 'Protect' },
  { id: 'DE', name: 'Detect' }, { id: 'RS', name: 'Respond' }, { id: 'RC', name: 'Recover' },
];

const tierOf = (v) => (v == null ? null : v >= 3.25 ? 4 : v >= 2.5 ? 3 : v >= 1.75 ? 2 : 1);
const tierColor = (v) => (v == null ? NA_COLOR : TIER_COLORS[tierOf(v)]);

function exposureBadge(risk) {
  if (risk == null) return { label: 'Unknown', color: INK_3 };
  if (risk >= 4) return { label: 'Severe exposure', color: '#9E3B32' };
  if (risk >= 3) return { label: 'High exposure', color: '#A85B2E' };
  if (risk >= 2) return { label: 'Moderate exposure', color: '#B07C2E' };
  return { label: 'Low exposure', color: '#64748b' };
}

function verdict(overall, risk) {
  if (overall == null) return { label: 'Not assessed', color: INK_3, weight: 0 };
  if (overall < THRESHOLD && (risk || 0) >= 3) return { label: 'Priority', color: '#9E3B32', weight: 700 };
  if (overall < THRESHOLD) return { label: 'Below threshold', color: '#A85B2E', weight: 600 };
  if (overall >= 3.5) return { label: 'Leading', color: '#31604B', weight: 600 };
  return { label: 'On track', color: '#6E7F49', weight: 500 };
}

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window!=='undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, organizationId, apiUrl };
}

// Shared maturity track: tier zones, threshold tick, marker at the score.
function MaturityTrack({ value }) {
  const pct = (v) => ((Math.max(TRACK_MIN, Math.min(TRACK_MAX, v)) - TRACK_MIN) / (TRACK_MAX - TRACK_MIN)) * 100;
  const zones = [
    { from: 1, to: 1.75, t: 1 }, { from: 1.75, to: 2.5, t: 2 },
    { from: 2.5, to: 3.25, t: 3 }, { from: 3.25, to: 4, t: 4 },
  ];
  return (
    <div style={{ position: 'relative', height: 22, flex: 1, minWidth: 220 }}>
      {/* Tier zones */}
      <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
        {zones.map((z) => (
          <div key={z.t} style={{ width: `${pct(z.to) - pct(z.from)}%`, background: TIER_COLORS[z.t], opacity: 0.16 }} />
        ))}
      </div>
      {/* Threshold tick */}
      <div style={{ position: 'absolute', top: 2, left: `${pct(THRESHOLD)}%`, width: 0, height: 18, borderLeft: `2px dashed ${INK_3}` }} />
      {/* Marker */}
      {value != null && (
        <div style={{
          position: 'absolute', top: 4, left: `calc(${pct(value)}% - 7px)`,
          width: 14, height: 14, borderRadius: '50%', background: tierColor(value),
          border: '2px solid #fff', boxShadow: '0 0 0 1px ' + tierColor(value),
        }} />
      )}
    </div>
  );
}

// Six-cell function fingerprint.
function Fingerprint({ functions }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {FN_ORDER.map((f) => {
        const v = functions ? functions[f.id] : null;
        return (
          <div key={f.id} title={`${f.name}: ${v == null ? 'not assessed' : v.toFixed(2)}`}
            style={{ width: 22, textAlign: 'center' }}>
            <div style={{ height: 16, borderRadius: 2, background: tierColor(v), opacity: v == null ? 0.45 : 0.9 }} />
            <div style={{ fontSize: 7.5, color: INK_3, marginTop: 2, letterSpacing: '0.04em' }}>{f.id}</div>
          </div>
        );
      })}
    </div>
  );
}

// Ticket #18 — voluntary, anonymized score-sharing opt-in unlocks peer benchmarking.
const OPTIN_KEY = 'cx_benchmark_optin';
const isOptedIn = () => { try { return localStorage.getItem(OPTIN_KEY) === 'true'; } catch (_) { return false; } };

export default function CsfRankings(props) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [optedIn, setOptedIn] = useState(isOptedIn());
  const { token, organizationId, apiUrl } = resolveCtx(props);

  const load = useCallback((refresh) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    const h = { 'X-Org-Id': organizationId };
    if (token) h['Authorization'] = `Bearer ${token}`;
    fetch(`${apiUrl}/api/csf/rankings${refresh ? '?refresh=1' : ''}`, { headers: h })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => setRows(d.rankings || []))
      .catch((e) => setError(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [apiUrl, organizationId, token]);

  useEffect(() => { if (optedIn) load(false); else setLoading(false); }, [load, optedIn]);

  const enableBenchmarking = () => {
    try { localStorage.setItem(OPTIN_KEY, 'true'); } catch (_) {}
    setOptedIn(true);
  };

  // #18 — until the org voluntarily opts in to anonymized score sharing, the
  // peer-benchmarking view is locked. Their own detailed assessment stays private.
  if (!optedIn) {
    return (
      <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Peer Benchmarking · Opt-in required</div>
        <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 600, color: INK }}>Compare against your peers</h2>
        <div style={{ color: INK_2, fontSize: 13, maxWidth: 520, margin: '0 auto 18px', lineHeight: 1.6 }}>
          Share your framework scores <strong>anonymously</strong> (no organization name or identifying details) to the
          central benchmarking hub and unlock the peer comparison. Your full assessment and detailed dashboards
          remain completely private regardless of this choice.
        </div>
        <button onClick={enableBenchmarking} style={{ ...ghostBtn, background: '#0f1b2d', color: '#fff', border: 'none', padding: '9px 20px', fontSize: 12 }}>
          Share anonymized scores & enable benchmarking
        </button>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 28, color: INK_3, fontSize: 13 }}>Loading peer standings…</div>;
  if (error || !rows) {
    return (
      <div style={{ padding: 28, color: '#9E3B32', fontSize: 13 }}>
        Could not load standings: {error || 'no data'}
        <button onClick={() => load(false)} style={{ ...ghostBtn, marginLeft: 12 }}>Retry</button>
      </div>
    );
  }

  const scored = rows.filter((r) => r.overall != null);
  const above = scored.filter((r) => r.overall >= THRESHOLD);
  const below = scored.filter((r) => r.overall < THRESHOLD);
  const median = scored.length
    ? [...scored].sort((a, b) => a.overall - b.overall)[Math.floor((scored.length - 1) / 2)].overall
    : null;
  // Weakest function across the system (lowest average).
  let weakestFn = null;
  if (scored.length) {
    const avgs = FN_ORDER.map((f) => {
      const vals = scored.map((r) => (r.functions || {})[f.id]).filter((v) => v != null);
      return { ...f, avg: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null };
    }).filter((x) => x.avg != null);
    if (avgs.length) weakestFn = avgs.sort((a, b) => a.avg - b.avg)[0];
  }

  const Row = (r) => {
    const vd = verdict(r.overall, r.inherentRisk);
    const ex = exposureBadge(r.inherentRisk);
    return (
      <div key={r.organizationId}
        style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '13px 16px', borderBottom: `1px solid #f1f5f9` }}>
        {/* Rank */}
        <div style={{ width: 26, textAlign: 'right', fontSize: 17, fontWeight: 300, color: INK_3, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {r.rank || '—'}
        </div>
        {/* Identity */}
        <div style={{ width: 230, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK, lineHeight: 1.3 }}>{r.name}</div>
          <div style={{ fontSize: 10, color: INK_3, marginTop: 1 }}>
            {r.abbrev} · {r.assessedCategories}/{r.totalCategories} categories
          </div>
        </div>
        {/* Function fingerprint */}
        <Fingerprint functions={r.functions} />
        {/* Maturity track */}
        <MaturityTrack value={r.overall} />
        {/* Score */}
        <div style={{ width: 52, textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: tierColor(r.overall), fontVariantNumeric: 'tabular-nums' }}>
            {r.overall == null ? '—' : r.overall.toFixed(2)}
          </div>
        </div>
        {/* Exposure + verdict */}
        <div style={{ width: 150, flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: vd.weight, color: vd.color }}>{vd.label}</div>
          <div style={{ fontSize: 9.5, color: ex.color, marginTop: 2 }}>{ex.label}{r.inherentRisk != null ? ` · ${r.inherentRisk.toFixed(1)}` : ''}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            Peer Comparison · NIST CSF v2.0 Outcomes
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>
            Risk-Adjusted Standings
          </h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, lineHeight: 1.55, maxWidth: 660 }}>
            Every organization on the same 1.00–4.00 maturity track, ranked. The fingerprint shows where each
            organization is weak by function; the verdict weighs maturity against inherent exposure
            (PHI held, revenue, membership) — a sub-threshold score matters most where exposure is highest.
          </div>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} style={{ ...ghostBtn, flexShrink: 0 }}>
          {refreshing ? 'Recomputing…' : 'Recompute all'}
        </button>
      </div>

      {/* System pulse */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${HAIRLINE}` }}>
        {[
          { label: 'Organizations assessed', value: String(scored.length) },
          { label: 'System median maturity', value: median == null ? '—' : median.toFixed(2), color: tierColor(median) },
          { label: `At or above ${THRESHOLD.toFixed(1)}`, value: String(above.length), color: '#31604B' },
          { label: `Below ${THRESHOLD.toFixed(1)}`, value: String(below.length), color: below.length ? '#9E3B32' : INK_2 },
          weakestFn && { label: 'Weakest function systemwide', value: `${weakestFn.name} · ${weakestFn.avg.toFixed(2)}`, color: tierColor(weakestFn.avg) },
        ].filter(Boolean).map((s, i) => (
          <div key={s.label} style={{ padding: '14px 28px 14px 0', marginRight: 28, borderRight: `1px solid ${HAIRLINE}`, ...(i === 0 ? {} : {}) }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: s.color || INK, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Column guide */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 16px 6px', fontSize: 8.5, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        <div style={{ width: 26, flexShrink: 0 }} />
        <div style={{ width: 230, flexShrink: 0 }}>Organization</div>
        <div style={{ width: 147, flexShrink: 0 }}>Function Fingerprint</div>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', justifyContent: 'space-between' }}>
          <span>Maturity 1.00</span><span style={{ color: INK_2 }}>┊ {THRESHOLD.toFixed(2)} threshold</span><span>4.00</span>
        </div>
        <div style={{ width: 52, flexShrink: 0, textAlign: 'right' }}>Score</div>
        <div style={{ width: 150, flexShrink: 0, textAlign: 'right' }}>Standing</div>
      </div>

      {/* Standings — the 3.0 threshold is a literal divider */}
      <div>
        {above.map(Row)}
        {below.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
            <div style={{ flex: 1, borderTop: `2px dashed ${INK_3}` }} />
            <span style={{ fontSize: 9.5, fontWeight: 600, color: INK_2, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
              {THRESHOLD.toFixed(2)} maturity threshold — engagement required below this line
            </span>
            <div style={{ flex: 1, borderTop: `2px dashed ${INK_3}` }} />
          </div>
        )}
        {below.map(Row)}
        {rows.filter((r) => r.overall == null).map(Row)}
        {rows.length === 0 && (
          <div style={{ padding: 28, color: INK_3, fontSize: 13, textAlign: 'center' }}>
            No organizations with computed scorecards yet — click Recompute all.
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${HAIRLINE}`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Maturity Tiers</span>
        {[[1, 'Partial'], [2, 'Risk Informed'], [3, 'Repeatable'], [4, 'Adaptive']].map(([t, name]) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: INK_2 }}>
            <span style={{ width: 10, height: 10, background: TIER_COLORS[t], borderRadius: 2, display: 'inline-block' }} />
            {t} · {name}
          </span>
        ))}
        <span style={{ fontSize: 10.5, color: INK_3, marginLeft: 'auto' }}>
          Fingerprint cells: GV Govern · ID Identify · PR Protect · DE Detect · RS Respond · RC Recover
        </span>
      </div>
    </div>
  );
}

const ghostBtn = {
  background: '#fff', border: '1px solid #cbd5e1', color: '#334155',
  borderRadius: 3, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 500,
};
