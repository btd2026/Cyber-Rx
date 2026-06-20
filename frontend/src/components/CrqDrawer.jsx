/**
 * CrqDrawer — shared "How this loss is calculated" control: a small link that
 * opens a modal showing the loss distribution, the FAIR-aligned methodology, and
 * editable per-risk assumptions (exposure / frequency / magnitude spread). Used
 * on every lens so CRQ transparency is consistent. Saving recomputes the model.
 */

import React, { useState } from 'react';

const INK = '#0f172a', INK2 = '#475569', INK3 = '#94a3b8', HAIR = '#e6ebf2';
const usd = (v) => { const x = Number(v) || 0; if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`; if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`; if (x >= 1e3) return `$${Math.round(x / 1e3)}K`; return `$${Math.round(x)}`; };

export default function CrqDrawer({ card, orgId, authToken, apiUrl, onSaved }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const headers = () => { const h = { 'Content-Type': 'application/json', 'X-Org-Id': orgId }; if (authToken) h.Authorization = `Bearer ${authToken}`; return h; };
  const loss = (card && card.loss) || {};

  function openIt() {
    setOpen(true); setForm({});
    if (!method) fetch(`${apiUrl}/api/decisions/methodology?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => d && setMethod(d)).catch(() => {});
  }
  function save() {
    setBusy(true);
    fetch(`${apiUrl}/api/decisions/assumptions`, { method: 'PUT', headers: headers(), body: JSON.stringify(Object.assign({ org_id: orgId, cardId: card.id }, form)) })
      .then((r) => r.json()).then(() => { setOpen(false); if (onSaved) onSaved(); }).catch(() => {}).finally(() => setBusy(false));
  }

  return (
    <>
      <button onClick={openIt} style={{ background: 'none', border: 'none', padding: 0, fontSize: 9.5, color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>ⓘ How this is calculated</button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(8,15,28,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '48px 16px', overflowY: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 'min(560px, 96vw)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: INK }}>How this loss is calculated</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: INK3, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {card.title && <div style={{ fontSize: 11.5, color: INK2, marginTop: 4 }}>{card.title}</div>}

            <div style={{ display: 'flex', gap: 14, marginTop: 14, padding: '12px 0', borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}`, flexWrap: 'wrap' }}>
              {[['Expected', loss.expected], ['P10', loss.p10], ['P50 (median)', loss.p50], ['P90', loss.p90], ['Worst case', loss.worstCase]].map(([k, v]) => (
                <div key={k} style={{ minWidth: 84 }}>
                  <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: k === 'Worst case' ? '#C0392B' : INK }}>{v == null ? '—' : usd(v)}</div>
                </div>
              ))}
            </div>

            {method && (
              <div style={{ fontSize: 11.5, color: INK2, lineHeight: 1.55, marginTop: 12 }}>
                <div><strong style={{ color: INK }}>Model.</strong> {method.model}</div>
                <div style={{ marginTop: 4 }}><strong style={{ color: INK }}>Frequency (LEF).</strong> {method.frequency}</div>
                <div style={{ marginTop: 4 }}><strong style={{ color: INK }}>Magnitude (LM).</strong> {method.magnitude}</div>
                <div style={{ marginTop: 4 }}><strong style={{ color: INK }}>Method.</strong> {method.method}</div>
                <div style={{ marginTop: 4, color: INK3 }}>Sources: {(method.dataSources || []).join(' · ')}</div>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: INK, marginBottom: 7 }}>Tune assumptions for this risk</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['exposure', 'Asset value / exposure ($)'], ['freq', 'Annual likelihood (%)'], ['spreadLo', 'Magnitude low (×, e.g. 0.3)'], ['spreadHi', 'Magnitude high (×, e.g. 2.2)']].map(([k, ph]) => (
                  <input key={k} type="number" placeholder={ph} value={form[k] == null ? '' : form[k]} onChange={(e) => setForm(Object.assign({}, form, { [k]: e.target.value }))}
                    style={{ border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <button onClick={save} disabled={busy} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save & recompute'}</button>
                <span style={{ fontSize: 10.5, color: INK3 }}>Recomputes the distribution and marks it user-tuned.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
