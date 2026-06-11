/**
 * NistCsfScorecard
 * ----------------
 * The live NIST CSF 2.0 maturity scorecard: 6 functions × 22 categories,
 * tier-colored like the board deck, computed by /api/csf/assessment from
 * real system data.
 *
 * Each category chip shows its maturity (1.00–4.00), an ⚙/✍ badge for
 * automatic vs manual sourcing, and click-through detail: live sources,
 * evidence status, and inline answer collection for manual controls.
 */

import React, { useState, useEffect, useCallback } from 'react';

const TIER_COLORS = { 1: '#c0392b', 2: '#e67e22', 3: '#8aa832', 4: '#2d6a2f' };
const FN_COLORS = { GV: '#3e7a34', ID: '#1f3864', PR: '#1f5fa8', DE: '#4f9fd8', RS: '#595959', RC: '#3b3b3b' };

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

  if (loading) return <div style={{ padding: 24, color: '#6b7280' }}>Computing live CSF 2.0 assessment…</div>;
  if (error || !data) {
    return (
      <div style={{ padding: 24, color: '#991b1b' }}>
        Could not compute the CSF assessment: {error || 'no data'}
        <button onClick={load} style={btn}>Retry</button>
      </div>
    );
  }

  const fmt = (m) => (m == null ? '—' : m.toFixed(2));
  const tierColor = (c) => (c.maturity == null ? '#9ca3af' : TIER_COLORS[c.tier] || '#9ca3af');
  const selCat = sel && data.functions.flatMap((f) => f.categories).find((c) => c.id === sel);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '22px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>NIST CSF 2.0 Cyber Maturity Scores</h2>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
            Current-state maturity across the six NIST CSF 2.0 functions and {data.totalCategories} categories —
            {' '}{data.autoCount} scored automatically from connected systems, {data.partialCount} blended, {data.manualCount} from intake evidence.
            {data.lastToolSync && <> Last tool sync {new Date(data.lastToolSync).toLocaleString()}.</>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#111827', borderRadius: 8, padding: '8px 14px' }}>
            <span style={{ background: data.overall.maturity == null ? '#9ca3af' : TIER_COLORS[data.overall.tier], color: '#fff', fontWeight: 800, fontSize: 20, fontFamily: 'monospace', borderRadius: 6, padding: '4px 10px' }}>
              {fmt(data.overall.maturity)}
            </span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Overall Avg Score</span>
          </div>
          <div style={{ color: '#6b7280', fontSize: 10, marginTop: 4 }}>
            {data.assessedCategories}/{data.totalCategories} categories assessed{data.overall.label ? ` · ${data.overall.label}` : ''}
          </div>
        </div>
      </div>

      {/* 6-function matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginTop: 16 }}>
        {data.functions.map((f) => (
          <div key={f.id}>
            {/* Function header tile */}
            <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 8 }}>
              <span style={{ background: f.maturity == null ? '#9ca3af' : TIER_COLORS[f.tier], color: '#fff', fontWeight: 800, fontFamily: 'monospace', fontSize: 15, padding: '8px 9px', borderRadius: '6px 0 0 6px' }}>
                {fmt(f.maturity)}
              </span>
              <span style={{ background: FN_COLORS[f.id], color: '#fff', fontWeight: 800, fontSize: 13, padding: '8px 10px', flex: 1, borderRadius: '0 6px 6px 0', display: 'flex', alignItems: 'center' }}>
                {f.name}
              </span>
            </div>
            {/* Category chips */}
            {f.categories.map((c) => (
              <div key={c.id} onClick={() => setSel(sel === c.id ? null : c.id)}
                title={`${c.id} — ${c.mode === 'auto' ? 'pulled automatically from systems' : c.mode === 'partial' ? 'live signal + intake evidence' : 'intake evidence'}`}
                style={{ display: 'flex', alignItems: 'stretch', marginBottom: 6, cursor: 'pointer', outline: sel === c.id ? `2px solid ${tierColor(c)}` : 'none', borderRadius: 5 }}>
                <span style={{ background: tierColor(c), color: '#fff', fontWeight: 800, fontFamily: 'monospace', fontSize: 11, padding: '7px 6px', minWidth: 38, textAlign: 'center', borderRadius: '5px 0 0 5px' }}>
                  {c.maturity == null ? 'N/A' : c.maturity.toFixed(2)}
                </span>
                <span style={{ background: '#f3f4f6', color: '#374151', fontSize: 10, fontWeight: 600, padding: '5px 7px', flex: 1, borderRadius: '0 5px 5px 0', lineHeight: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <span>{c.name}</span>
                  <span style={{ fontSize: 10, flexShrink: 0 }} aria-label={c.mode}>
                    {c.mode === 'auto' ? '⚙' : c.mode === 'partial' ? '⚙✍' : '✍'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Category detail / evidence collection */}
      {selCat && (
        <div style={{ marginTop: 14, border: `1px solid ${tierColor(selCat)}55`, borderLeft: `4px solid ${tierColor(selCat)}`, borderRadius: 8, padding: '14px 16px', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#111827', fontSize: 14 }}>
                {selCat.id} — {selCat.name}
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: tierColor(selCat) }}>
                  {selCat.maturity == null ? 'NOT ASSESSED' : `${selCat.maturity.toFixed(2)} · ${selCat.label}`}
                </span>
              </div>
              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 3 }}>
                {selCat.mode === 'auto' ? '⚙ Pulled automatically from connected systems — no manual input needed.'
                  : selCat.mode === 'partial' ? '⚙✍ Blends a live system signal with intake evidence.'
                  : '✍ Scored from intake evidence (answers and documents).'}
                {' '}Sources: {selCat.sources.join(' · ')}
              </div>
            </div>
            <button onClick={() => setSel(null)} style={btn}>Close</button>
          </div>
          {selCat.evidence.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {selCat.evidence.map((e) => (
                <div key={e.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '9px 12px', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>{e.question}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 6px' }}>
                    Suggested evidence: {e.suggestedDoc}{e.docName ? ` — on file: ${e.docName}` : ''}
                  </div>
                  {e.answered ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', background: '#dcfce7', borderRadius: 4, padding: '2px 8px' }}>
                      Answered: {e.answer}
                    </span>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(answerOptions(e.key) || []).map((opt) => (
                        <button key={opt} disabled={saving} onClick={() => answerEvidence(e.key, opt)}
                          style={{ ...btn, background: '#eef2ff', borderColor: '#c7d2fe', color: '#3730a3' }}>
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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Key:</span>
        {[[1, '1 - Partial'], [2, '2 - Risk Informed'], [3, '3 - Repeatable'], [4, '4 - Adaptive']].map(([t, label]) => (
          <span key={t} style={{ background: TIER_COLORS[t], color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '3px 10px' }}>{label}</span>
        ))}
        <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 6 }}>⚙ automatic from systems · ✍ intake evidence · N/A not yet assessed</span>
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
};
function answerOptions(key) { return ANSWER_OPTIONS[key]; }

const btn = {
  background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151',
  borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
};
