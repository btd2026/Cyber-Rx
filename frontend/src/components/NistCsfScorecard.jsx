/**
 * NistCsfScorecard
 * ----------------
 * The live NIST CSF 2.0 maturity scorecard: 6 functions × 22 categories,
 * computed by /api/csf/assessment from real system data.
 *
 * Visual language is deliberately enterprise: a muted, desaturated tier
 * palette, hairline borders, uppercase letter-spaced labels, and uniform
 * deep-slate function headers — no saturated chips or icon glyphs.
 *
 * Each category row shows its maturity (1.00–4.00) and an AUTO / HYBRID /
 * MANUAL sourcing tag, with click-through detail: live sources, evidence
 * status, and inline answer collection for manual controls.
 */

import React, { useState, useEffect, useCallback } from 'react';

// Muted, desaturated tier palette (board-deck hues, enterprise restraint).
const TIER_COLORS = { 1: '#9E3B32', 2: '#B07C2E', 3: '#6E7F49', 4: '#31604B' };
const TIER_NAMES = { 1: 'Partial', 2: 'Risk Informed', 3: 'Repeatable', 4: 'Adaptive' };
const NA_COLOR = '#8B95A3';
const INK = '#0f172a';        // primary text
const INK_2 = '#475569';      // secondary text
const INK_3 = '#94a3b8';      // muted text
const HAIRLINE = '#e2e8f0';
const HEADER_BG = '#1c2a3a';  // uniform function header
const PANEL_BG = '#0f1b2d';   // overall tile

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
    'http://localhost:3001';
  return { token, organizationId, apiUrl };
}

export default function NistCsfScorecard(props) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null); // selected category id
  const [saving, setSaving] = useState(false);
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
      <div style={{ padding: 28, color: '#9E3B32', fontSize: 13 }}>
        Could not compute the CSF assessment: {error || 'no data'}
        <button onClick={load} style={{ ...ghostBtn, marginLeft: 12 }}>Retry</button>
      </div>
    );
  }

  const fmt = (m) => (m == null ? '—' : m.toFixed(2));
  const tierColor = (c) => (c.maturity == null ? NA_COLOR : TIER_COLORS[c.tier] || NA_COLOR);
  const selCat = sel && data.functions.flatMap((f) => f.categories).find((c) => c.id === sel);

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            Current-State Assessment · NIST Cybersecurity Framework 2.0
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>
            Cyber Maturity Scores
          </h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, maxWidth: 640, lineHeight: 1.55 }}>
            Maturity across the six functions and {data.totalCategories} categories. {data.autoCount} categories are scored
            automatically from connected systems, {data.partialCount} blend a live signal with intake evidence,
            and {data.manualCount} are scored from intake evidence.
            {data.lastToolSync && <> Last tool synchronization {new Date(data.lastToolSync).toLocaleString()}.</>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'stretch', background: PANEL_BG, borderRadius: 4, overflow: 'hidden' }}>
            <span style={{ background: data.overall.maturity == null ? NA_COLOR : TIER_COLORS[data.overall.tier], color: '#fff', fontWeight: 600, fontSize: 19, fontVariantNumeric: 'tabular-nums', padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
              {fmt(data.overall.maturity)}
            </span>
            <span style={{ color: '#e2e8f0', fontWeight: 500, fontSize: 12, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.35 }}>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9, color: '#8fa3bd' }}>Overall Average</span>
              <span>{data.overall.label || 'Not assessed'}</span>
            </span>
          </div>
          <div style={{ color: INK_3, fontSize: 10, marginTop: 6, letterSpacing: '0.02em' }}>
            {data.assessedCategories} of {data.totalCategories} categories assessed
          </div>
        </div>
      </div>

      {/* 6-function matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginTop: 22 }}>
        {data.functions.map((f) => (
          <div key={f.id}>
            {/* Function header */}
            <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 10, borderRadius: 3, overflow: 'hidden' }}>
              <span style={{ background: f.maturity == null ? NA_COLOR : TIER_COLORS[f.tier], color: '#fff', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 13, padding: '9px 10px', display: 'flex', alignItems: 'center' }}>
                {fmt(f.maturity)}
              </span>
              <span style={{ background: HEADER_BG, color: '#f1f5f9', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em', padding: '9px 11px', flex: 1, display: 'flex', alignItems: 'center' }}>
                {f.name}
              </span>
            </div>
            {/* Category rows */}
            {f.categories.map((c) => {
              const tc = tierColor(c);
              const active = sel === c.id;
              return (
                <div key={c.id} onClick={() => setSel(active ? null : c.id)}
                  title={`${c.id} — ${MODE_TAGS[c.mode] ? MODE_TAGS[c.mode].title : c.mode}`}
                  style={{
                    display: 'flex', alignItems: 'stretch', marginBottom: 6, cursor: 'pointer',
                    border: `1px solid ${active ? tc : HAIRLINE}`, borderRadius: 3, overflow: 'hidden',
                    background: '#fff', transition: 'border-color 0.12s',
                  }}>
                  <span style={{ background: tc, color: '#fff', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: 11, padding: '8px 0', minWidth: 42, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.maturity == null ? '—' : c.maturity.toFixed(2)}
                  </span>
                  <span style={{ color: INK_2, fontSize: 10.5, fontWeight: 500, padding: '6px 8px', flex: 1, lineHeight: 1.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                    <span style={{ color: INK }}>{c.name}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, color: INK_3, letterSpacing: '0.1em' }}>
                      {MODE_TAGS[c.mode] ? MODE_TAGS[c.mode].label : ''}{c.maturity == null ? ' · NOT ASSESSED' : ''}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Category detail / evidence collection */}
      {selCat && (
        <div style={{ marginTop: 20, border: `1px solid ${HAIRLINE}`, borderTop: `2px solid ${tierColor(selCat)}`, borderRadius: 4, padding: '18px 20px', background: '#fafbfc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                {selCat.id} · {MODE_TAGS[selCat.mode] ? MODE_TAGS[selCat.mode].label : selCat.mode}
              </div>
              <div style={{ fontWeight: 600, color: INK, fontSize: 15 }}>
                {selCat.name}
                <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: tierColor(selCat), fontVariantNumeric: 'tabular-nums' }}>
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
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#31604B', border: '1px solid #31604B40', borderRadius: 3, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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

      {/* Key */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 22, paddingTop: 14, borderTop: `1px solid ${HAIRLINE}`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Maturity Tiers</span>
        {[1, 2, 3, 4].map((t) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: INK_2 }}>
            <span style={{ width: 10, height: 10, background: TIER_COLORS[t], borderRadius: 2, display: 'inline-block' }} />
            {t} · {TIER_NAMES[t]}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: INK_2 }}>
          <span style={{ width: 10, height: 10, background: NA_COLOR, borderRadius: 2, display: 'inline-block' }} />
          Not assessed
        </span>
        <span style={{ fontSize: 10.5, color: INK_3, marginLeft: 'auto' }}>
          AUTO — connected systems · HYBRID — system + evidence · MANUAL — intake evidence
        </span>
      </div>
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
  rs_an_forensics: ['in-house', 'retainer', 'none'],
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
