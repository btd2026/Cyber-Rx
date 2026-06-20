/**
 * NistCsfScorecard
 * ----------------
 * The live NIST CSF 2.0 maturity assessment, redesigned around maturity
 * lanes rather than the classic chip grid:
 *
 *   · Each of the six functions is a horizontal lane on a shared 1.00–4.00
 *     track with the four tier zones and the 3.0 threshold marked — the same
 *     visual language as the systemwide standings.
 *   · Every category is a marker positioned at its exact maturity, so weak
 *     spots literally sit to the left. Marker shape encodes sourcing:
 *     filled = automatic from systems, half = hybrid, hollow = intake evidence.
 *   · Unassessed categories queue at the lane's edge; clicking any marker
 *     opens detail with live sources and inline evidence collection.
 *
 * Data: GET /api/csf/assessment · POST /api/csf/evidence.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';
import CsfRankings from './CsfRankings';

// Ticket #05 — NIST CSF maturity (1.00–4.00) ↔ CMMI level (0–5) crosswalk,
// shown alongside the tier so both scales are visible.
const CMMI_NAMES = ['Not Performed', 'Performed Informally', 'Planned & Tracked', 'Well Defined', 'Quantitatively Controlled', 'Continuously Improving'];
function cmmiLevel(maturity) { return maturity == null ? null : Math.max(0, Math.min(5, Math.round(((maturity - 1) / 3) * 5))); }

const INK = COLORS.ink;
const INK_2 = COLORS.ink2;
const INK_3 = COLORS.ink3;
const HAIRLINE = COLORS.hair;
// Maturity-tier scale (graduated 1→4) — a domain status palette; meaning preserved.
const TIER_COLORS = { 1: COLORS.bad, 2: COLORS.warn, 3: '#6E7F49', 4: COLORS.good };
const TIER_NAMES = { 1: 'Partial', 2: 'Risk Informed', 3: 'Repeatable', 4: 'Adaptive' };
const NA_COLOR = COLORS.ink3;
const PANEL_BG = COLORS.navy1;
const THRESHOLD = 3.0;
const TRACK_MIN = 1, TRACK_MAX = 4;

const MODE_TAGS = {
  auto: { label: 'AUTO', title: 'Pulled automatically from connected systems' },
  partial: { label: 'HYBRID', title: 'Live system signal blended with intake evidence' },
  manual: { label: 'MANUAL', title: 'Scored from intake evidence (answers and documents)' },
};

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window!=='undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, organizationId, apiUrl };
}

const pct = (v) => ((Math.max(TRACK_MIN, Math.min(TRACK_MAX, v)) - TRACK_MIN) / (TRACK_MAX - TRACK_MIN)) * 100;
const tierColor = (c) => (c.maturity == null ? NA_COLOR : TIER_COLORS[c.tier] || NA_COLOR);

// Category marker: shape encodes sourcing mode.
function Marker({ cat, active, onClick, row }) {
  const color = tierColor(cat);
  const base = {
    position: 'absolute', left: `calc(${pct(cat.maturity)}% - 7px)`, top: 8 + row * 26,
    width: 14, height: 14, borderRadius: '50%', cursor: 'pointer',
    boxShadow: active ? `0 0 0 3px ${color}40` : 'none', transition: 'box-shadow 0.12s',
  };
  const fill =
    cat.mode === 'auto' ? { background: color, border: `2px solid ${color}` } :
    cat.mode === 'partial' ? { background: `linear-gradient(90deg, ${color} 50%, #fff 50%)`, border: `2px solid ${color}` } :
    { background: '#fff', border: `2px solid ${color}` };
  return (
    <div onClick={onClick} title={`${cat.id} — ${cat.name} · ${cat.maturity.toFixed(2)}`} style={{ ...base, ...fill }}>
      <span style={{
        position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)',
        fontSize: 8, fontWeight: 600, color: active ? INK : INK_3, letterSpacing: '0.03em', whiteSpace: 'nowrap',
      }}>{cat.id}</span>
    </div>
  );
}

export default function NistCsfScorecard(props) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null); // selected category id
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('individual'); // #16 — individual ↔ systemwide
  const { token, organizationId, apiUrl } = resolveCtx(props);

  const headers = useCallback(() => {
    const h = { 'X-Org-Id': organizationId, 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, [token, organizationId]);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetch(`${apiUrl}/api/csf/assessment?org_id=${encodeURIComponent(organizationId)}`, { headers: headers() })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [apiUrl, organizationId, headers]);

  useEffect(() => { load(); }, [load]);

  const answerEvidence = async (key, answer) => {
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/csf/evidence?org_id=${encodeURIComponent(organizationId)}`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ items: [{ key, answer }] }),
      });
      load();
    } catch (_) {} finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 28, color: INK_3, fontSize: 13 }}>Computing live CSF 2.0 assessment…</div>;
  if (error || !data) {
    return (
      <div style={{ padding: 28, color: COLORS.bad, fontSize: 13 }}>
        Could not compute the CSF assessment: {error || 'no data'}
        <button onClick={load} style={{ ...ghostBtn, marginLeft: 12 }}>Retry</button>
      </div>
    );
  }

  const fmt = (m) => (m == null ? '—' : m.toFixed(2));
  const allCats = data.functions.flatMap((f) => f.categories);
  const selCat = sel && allCats.find((c) => c.id === sel);
  const evidenceTotal = allCats.reduce((s, c) => s + c.evidence.length, 0);
  const evidenceAnswered = allCats.reduce((s, c) => s + c.evidence.filter((e) => e.answered).length, 0);

  // Lane rows: stagger markers vertically when scores are close enough to collide.
  const laneRows = (cats) => {
    const placed = [];
    return cats.map((c) => {
      let row = 0;
      while (placed.some((p) => p.row === row && Math.abs(pct(p.v) - pct(c.maturity)) < 7)) row += 1;
      placed.push({ row, v: c.maturity });
      return { cat: c, row: Math.min(row, 2) };
    });
  };

  return (
    <div>
      {/* #16 — Individual ↔ Systemwide toggle embedded at the top */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, border: `1px solid ${HAIRLINE}`, borderRadius: 5, overflow: 'hidden', width: 'fit-content' }}>
        {[['individual', 'Individual'], ['systemwide', 'Peer comparison']].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} style={{
            background: view === v ? PANEL_BG : '#fff', color: view === v ? '#fff' : INK_2,
            border: 'none', padding: '7px 18px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            letterSpacing: '0.04em',
          }}>{label}</button>
        ))}
      </div>
      {view === 'systemwide' ? (
        <CsfRankings authToken={token} orgId={organizationId} api_url={apiUrl} />
      ) : (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            Current-State Assessment · NIST Cybersecurity Framework 2.0
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.01em', fontFamily: FONTS.display }}>
            Cyber Maturity Profile
          </h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, maxWidth: 620, lineHeight: 1.55 }}>
            Each function is a lane on the shared 1.00–4.00 maturity track; every category sits at its exact
            score, so weak spots read left. Marker fill shows sourcing — filled from connected systems,
            half-filled hybrid, hollow from intake evidence.
            {data.lastToolSync && <> Last tool synchronization {new Date(data.lastToolSync).toLocaleString()}.</>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'stretch', background: PANEL_BG, borderRadius: 4, overflow: 'hidden' }}>
            <span style={{ background: data.overall.maturity == null ? NA_COLOR : TIER_COLORS[data.overall.tier], color: '#fff', fontWeight: 600, fontSize: 19, fontFamily: FONTS.mono, fontVariantNumeric: 'tabular-nums', padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
              {fmt(data.overall.maturity)}
            </span>
            <span style={{ color: '#e2e8f0', fontWeight: 500, fontSize: 12, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.35 }}>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9, color: COLORS.accent }}>Tier · CMMI</span>
              <span>{data.overall.tier ? `Tier ${data.overall.tier}` : 'Not assessed'}{cmmiLevel(data.overall.maturity) != null ? ` · CMMI ${cmmiLevel(data.overall.maturity)}` : ''}</span>
            </span>
          </div>
          <div style={{ color: INK_3, fontSize: 10, marginTop: 6 }}>
            {data.overall.label || 'Not assessed'}{cmmiLevel(data.overall.maturity) != null ? ` · CMMI L${cmmiLevel(data.overall.maturity)} ${CMMI_NAMES[cmmiLevel(data.overall.maturity)]}` : ''}
          </div>
          <div style={{ color: INK_3, fontSize: 10, marginTop: 2 }}>
            {data.assessedCategories} of {data.totalCategories} categories assessed · intake evidence {evidenceAnswered}/{evidenceTotal}
          </div>
        </div>
      </div>

      {/* Track scale header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '14px 0 2px' }}>
        <div style={{ width: 170, flexShrink: 0 }} />
        <div style={{ flex: 1, position: 'relative', height: 16 }}>
          {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((t) => (
            <span key={t} style={{ position: 'absolute', left: `calc(${pct(t)}% - 10px)`, fontSize: 9, color: t === THRESHOLD ? INK_2 : INK_3, fontWeight: t === THRESHOLD ? 600 : 400, fontFamily: FONTS.mono, fontVariantNumeric: 'tabular-nums' }}>
              {t.toFixed(2)}
            </span>
          ))}
        </div>
        <div style={{ width: 120, flexShrink: 0 }} />
      </div>

      {/* Function lanes */}
      {data.functions.map((f) => {
        const assessed = f.categories.filter((c) => c.maturity != null);
        const na = f.categories.filter((c) => c.maturity == null);
        const rows = laneRows(assessed);
        const laneH = 36 + (rows.length ? Math.max(...rows.map((r) => r.row)) * 26 : 0) + 14;
        return (
          <div key={f.id} style={{ display: 'flex', alignItems: 'stretch', gap: 20, borderTop: `1px solid #f1f5f9` }}>
            {/* Function rail */}
            <div style={{ width: 170, flexShrink: 0, padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 600, fontFamily: FONTS.mono, fontVariantNumeric: 'tabular-nums', color: f.maturity == null ? NA_COLOR : TIER_COLORS[f.tier] }}>
                  {fmt(f.maturity)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: INK, fontFamily: FONTS.display }}>{f.name}</span>
              </div>
              <div style={{ fontSize: 9.5, color: INK_3, marginTop: 3, letterSpacing: '0.02em' }}>
                {f.label || 'Not assessed'} · {f.assessedCount}/{f.categoryCount} categories
              </div>
            </div>
            {/* Lane track */}
            <div style={{ flex: 1, position: 'relative', minHeight: laneH }}>
              {/* Tier zones */}
              <div style={{ position: 'absolute', top: 10, left: 0, right: 0, bottom: 14, display: 'flex', borderRadius: 3, overflow: 'hidden' }}>
                {[{ f: 1, t: 1.75, k: 1 }, { f: 1.75, t: 2.5, k: 2 }, { f: 2.5, t: 3.25, k: 3 }, { f: 3.25, t: 4, k: 4 }].map((z) => (
                  <div key={z.k} style={{ width: `${pct(z.t) - pct(z.f)}%`, background: TIER_COLORS[z.k], opacity: 0.07 }} />
                ))}
              </div>
              {/* Threshold */}
              <div style={{ position: 'absolute', top: 4, bottom: 8, left: `${pct(THRESHOLD)}%`, borderLeft: `2px dashed ${INK_3}66` }} />
              {/* Markers */}
              {rows.map(({ cat, row }) => (
                <Marker key={cat.id} cat={cat} row={row} active={sel === cat.id}
                  onClick={() => setSel(sel === cat.id ? null : cat.id)} />
              ))}
            </div>
            {/* Not-assessed queue */}
            <div style={{ width: 120, flexShrink: 0, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', justifyContent: 'center' }}>
              {na.map((c) => (
                <button key={c.id} onClick={() => setSel(sel === c.id ? null : c.id)}
                  title={`${c.name} — not assessed; click to provide evidence`}
                  style={{
                    background: sel === c.id ? '#f1f5f9' : 'transparent', border: `1px dashed ${INK_3}88`,
                    color: INK_2, borderRadius: 3, padding: '2px 8px', fontSize: 9, fontWeight: 600,
                    letterSpacing: '0.04em', cursor: 'pointer',
                  }}>
                  {c.id} —
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Category detail / evidence collection */}
      {selCat && (
        <div style={{ marginTop: 18, border: `1px solid ${HAIRLINE}`, borderTop: `2px solid ${tierColor(selCat)}`, borderRadius: 4, padding: '18px 20px', background: '#fafbfc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                {selCat.id} · {MODE_TAGS[selCat.mode] ? MODE_TAGS[selCat.mode].label : selCat.mode}
              </div>
              <div style={{ fontWeight: 600, color: INK, fontSize: 15 }}>
                {selCat.name}
                <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: tierColor(selCat), fontFamily: FONTS.mono, fontVariantNumeric: 'tabular-nums' }}>
                  {selCat.maturity == null ? 'Not assessed' : `${selCat.maturity.toFixed(2)} — ${selCat.label}`}
                </span>
              </div>
              <div style={{ color: INK_2, fontSize: 11.5, marginTop: 6, lineHeight: 1.5 }}>
                {MODE_TAGS[selCat.mode] ? MODE_TAGS[selCat.mode].title : ''}.
                {' '}Sources: {selCat.sources.join(' · ')}
              </div>
            </div>
            <button onClick={() => setSel(null)} style={ghostBtn}>Close</button>
          </div>
          {selCat.evidence.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {selCat.evidence.map((e) => (
                <div key={e.key} style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 4, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ fontSize: 12.5, color: INK, fontWeight: 500 }}>{e.question}</div>
                  <div style={{ fontSize: 10.5, color: INK_3, margin: '4px 0 8px' }}>
                    Suggested evidence: {e.suggestedDoc}{e.docName ? ` — on file: ${e.docName}` : ''}
                  </div>
                  {e.answered ? (
                    <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.good, border: `1px solid ${COLORS.good}40`, borderRadius: 3, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Answered · {e.answer}
                    </span>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(answerOptions(e.key) || []).map((opt) => (
                        <button key={opt} disabled={saving} onClick={() => answerEvidence(e.key, opt)} style={ghostBtn}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 20, paddingTop: 14, borderTop: `1px solid ${HAIRLINE}`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Maturity Tiers</span>
        {[1, 2, 3, 4].map((t) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: INK_2 }}>
            <span style={{ width: 10, height: 10, background: TIER_COLORS[t], borderRadius: 2, display: 'inline-block' }} />
            {t} · {TIER_NAMES[t]}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16, fontSize: 10.5, color: INK_2, marginLeft: 'auto' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: INK_2, verticalAlign: -1, marginRight: 5 }} />automatic</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: `linear-gradient(90deg, ${INK_2} 50%, #fff 50%)`, border: `1.5px solid ${INK_2}`, verticalAlign: -1, marginRight: 5 }} />hybrid</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#fff', border: `1.5px solid ${INK_2}`, verticalAlign: -1, marginRight: 5 }} />intake evidence</span>
          <span style={{ color: INK_3 }}>┊ 3.00 threshold</span>
        </span>
      </div>
    </div>
      )}
    </div>
  );
}

// Answer options per evidence question (mirrors the backend interview).
const ANSWER_OPTIONS = {
  gv_oc_context: ['yes', 'partial', 'no'],
  gv_rm_appetite: ['yes', 'draft', 'no'],
  gv_rr_roles: ['yes', 'informal', 'no'],
  gv_po_policy: ['yes', 'outdated', 'no'],
  gv_ov_board: ['quarterly', 'semiannual', 'annual', 'never'],
  gv_sc_vendors: ['all', 'some', 'none'],
  id_im_pir: ['always', 'sometimes', 'never'],
  pr_ds_encryption: ['fully', 'partially', 'no'],
  pr_ds_dlp: ['yes', 'partial', 'no'],
  pr_ir_resilience: ['both', 'backups-only', 'neither'],
  de_ae_soc: ['24x7', 'business-hours', 'none'],
  rs_ma_irplan: ['plan-and-tabletop', 'plan-only', 'none'],
  rs_an_forensics: ['both', 'in-house', 'retainer', 'none'],
  rs_co_notify: ['yes', 'partial', 'no'],
  rc_rp_drtest: ['within-12mo', 'over-12mo', 'never'],
  rc_co_comms: ['yes', 'no'],
  id_am_inventory: ['complete', 'partial', 'none'],
  id_ra_assessment: ['annual', 'occasional', 'never'],
  rs_mi_process: ['formal', 'ad-hoc', 'none'],
};
function answerOptions(key) { return ANSWER_OPTIONS[key]; }

const ghostBtn = {
  background: '#fff', border: '1px solid #cbd5e1', color: '#334155',
  borderRadius: 3, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500,
};
