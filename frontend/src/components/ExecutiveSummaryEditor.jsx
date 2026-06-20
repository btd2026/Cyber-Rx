/**
 * ExecutiveSummaryEditor — on-screen executive summary + consultant review/edit.
 *
 * Surfaces the intake-driven, generated executive summary inside the CISO
 * dashboard and provides the human-in-the-loop step:
 *   - GET  /api/ciso/exec-summary           load the stored summary (draft/reviewed)
 *   - POST /api/ciso/exec-summary/generate  generate/refresh a DRAFT from intake+assessment
 *   - PUT  /api/ciso/exec-summary           save the consultant's reviewed/edited version
 *
 * Blocks: context · posture · key_risks[] · quick_wins[] · path_forward.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { COLORS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, NAVY = COLORS.navy1;
const GREEN = COLORS.good, AMBER = COLORS.warn, RED = COLORS.bad, BLUE = '#4f5ac4';
const STATUS = { reviewed: GREEN, draft: AMBER, auto: INK3, none: INK3 };

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}

const emptyBlocks = () => ({ context: '', posture: '', key_risks: [], quick_wins: [], path_forward: '' });

const Field = ({ label, value, onChange, rows = 3, placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
    <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{ width: '100%', border: `1px solid ${HAIR}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: INK, lineHeight: 1.55, boxSizing: 'border-box', resize: 'vertical' }} />
  </div>
);

function ListEditor({ label, items, onChange, accent }) {
  const set = (i, k, v) => { const next = items.slice(); next[i] = { ...next[i], [k]: v }; onChange(next); };
  const add = () => onChange([...(items || []), { title: '', detail: '' }]);
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: accent || INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
      {(items || []).map((it, i) => (
        <div key={i} style={{ border: `1px solid ${HAIR}`, borderLeft: `3px solid ${accent || INK3}`, borderRadius: 8, padding: '9px 11px', marginBottom: 7, background: '#fff' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={it.title || ''} onChange={(e) => set(i, 'title', e.target.value)} placeholder="Title"
              style={{ flex: 1, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '6px 9px', fontSize: 12.5, fontWeight: 600, color: INK }} />
            <button onClick={() => remove(i)} title="Remove" style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>
          <textarea value={it.detail || ''} onChange={(e) => set(i, 'detail', e.target.value)} rows={2} placeholder="Business impact / detail"
            style={{ width: '100%', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '7px 9px', fontSize: 12, color: INK2, lineHeight: 1.5, boxSizing: 'border-box', marginTop: 6, resize: 'vertical' }} />
        </div>
      ))}
      <button onClick={add} style={{ background: 'transparent', border: `1px dashed ${HAIR}`, borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: BLUE, cursor: 'pointer' }}>＋ Add</button>
    </div>
  );
}

export default function ExecutiveSummaryEditor(props) {
  const { token, orgId, api } = ctx(props);
  const [stored, setStored] = useState(undefined); // undefined=loading, null=none
  const [blocks, setBlocks] = useState(emptyBlocks());
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const headers = useCallback(() => {
    const h = { 'X-Org-Id': orgId, 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [orgId, token]);

  const load = useCallback(() => {
    if (!orgId) { setStored(null); setError('No organization selected yet.'); return; }
    fetch(`${api}/api/ciso/exec-summary?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => { setStored(d); if (d && d.blocks) setBlocks({ ...emptyBlocks(), ...d.blocks }); })
      .catch((e) => { setStored(null); setError(e.message); });
  }, [api, orgId, headers]);

  useEffect(() => { load(); }, [load]);

  const generate = () => {
    setBusy(true); setError(null); setMsg(null);
    fetch(`${api}/api/ciso/exec-summary/generate?org_id=${encodeURIComponent(orgId)}`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId }) })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setStored(d); if (d && d.blocks) setBlocks({ ...emptyBlocks(), ...d.blocks }); setEditing(true); setMsg('Draft generated — review and edit before saving.'); })
      .catch((e) => setError(e.message)).finally(() => setBusy(false));
  };

  const save = () => {
    setBusy(true); setError(null); setMsg(null);
    fetch(`${api}/api/ciso/exec-summary?org_id=${encodeURIComponent(orgId)}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ org_id: orgId, blocks }) })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setStored(d); setEditing(false); setMsg('Saved as reviewed — this is what the report will use.'); })
      .catch((e) => setError(e.message)).finally(() => setBusy(false));
  };

  if (stored === undefined) return <div style={{ padding: 18, color: INK3, fontSize: 13 }}>Loading executive summary…</div>;

  const status = stored ? (stored.status || 'draft') : 'none';
  const hasContent = blocks.context || blocks.posture || (blocks.key_risks || []).length || (blocks.quick_wins || []).length || blocks.path_forward;

  return (
    <div>
      {/* header / controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', background: STATUS[status] || INK3, borderRadius: 5, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {status === 'none' ? 'Not generated' : status === 'reviewed' ? 'Reviewed' : status === 'auto' ? 'Auto (unsaved)' : 'Draft'}
          </span>
          {stored && stored.generatedBy && <span style={{ fontSize: 11, color: INK3 }}>by {stored.generatedBy}{stored.model ? ` · ${stored.model}` : ''}</span>}
          {stored && stored.updatedAt && <span style={{ fontSize: 11, color: INK3 }}>· {new Date(stored.updatedAt).toLocaleString()}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generate} disabled={busy}
            style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Working…' : hasContent ? '↻ Regenerate draft' : '✨ Generate draft'}
          </button>
          {hasContent && !editing && <button onClick={() => setEditing(true)} style={{ background: '#fff', color: INK, border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✎ Edit</button>}
          {editing && <button onClick={save} disabled={busy} style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>✓ Save as reviewed</button>}
          {hasContent && !editing && orgId && (
            <>
              <a href={`${api}/api/ciso/report.pdf?org_id=${encodeURIComponent(orgId)}`} title="Download the report with this summary"
                style={{ background: '#fff', color: INK, border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>⤓ PDF</a>
              <a href={`${api}/api/ciso/report.pptx?org_id=${encodeURIComponent(orgId)}`} title="Download the deck with this summary"
                style={{ background: '#fff', color: INK, border: `1px solid ${HAIR}`, borderRadius: 7, padding: '8px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>⤓ PPTX</a>
            </>
          )}
        </div>
      </div>
      {hasContent && !editing && status !== 'reviewed' && (
        <div style={{ fontSize: 11, color: AMBER, marginBottom: 12 }}>Tip: Save as reviewed before exporting so the report uses your finalized text.</div>
      )}

      {msg && <div style={{ background: '#f0f7f2', border: '1px solid #cce8d6', color: GREEN, borderRadius: 7, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>{msg}</div>}
      {error && <div style={{ background: '#fdecea', border: '1px solid #f3c9bf', color: RED, borderRadius: 7, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {!hasContent && !editing && (
        <div style={{ border: `1px dashed ${HAIR}`, borderRadius: 10, padding: '28px 20px', textAlign: 'center', color: INK3, fontSize: 13 }}>
          No executive summary yet. Click <strong>Generate draft</strong> to produce one from the organization's intake answers and assessment results, then review and edit before it's used in the report.
        </div>
      )}

      {hasContent && !editing && (
        // Read view — on-screen executive summary
        <div style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          {blocks.context && <p style={{ fontSize: 15, color: INK, lineHeight: 1.6, margin: '0 0 14px' }}>{blocks.context}</p>}
          {blocks.posture && <Block label="Posture" accent={BLUE}><p style={{ margin: 0, fontSize: 13.5, color: INK, lineHeight: 1.6 }}>{blocks.posture}</p></Block>}
          {(blocks.key_risks || []).length > 0 && (
            <Block label="Key risks" accent={RED}>
              {blocks.key_risks.map((r, i) => <Item key={i} title={r.title} detail={r.detail} color={RED} />)}
            </Block>
          )}
          {(blocks.quick_wins || []).length > 0 && (
            <Block label="Quick wins" accent={GREEN}>
              {blocks.quick_wins.map((w, i) => <Item key={i} title={w.title} detail={w.detail} color={GREEN} />)}
            </Block>
          )}
          {blocks.path_forward && <Block label="Path to target state" accent={AMBER}><p style={{ margin: 0, fontSize: 13.5, color: INK, lineHeight: 1.6 }}>{blocks.path_forward}</p></Block>}
          {status === 'auto' && <div style={{ fontSize: 10.5, color: INK3, fontStyle: 'italic', marginTop: 12 }}>Auto-generated from data and not yet reviewed — generate & save to finalize for the report.</div>}
        </div>
      )}

      {editing && (
        <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 12, padding: '18px 18px' }}>
          <Field label="Context (org sector, size, regulatory drivers)" value={blocks.context} onChange={(v) => setBlocks({ ...blocks, context: v })} rows={3} />
          <Field label="Posture (headline score framed in business risk)" value={blocks.posture} onChange={(v) => setBlocks({ ...blocks, posture: v })} rows={3} />
          <ListEditor label="Key risks" items={blocks.key_risks} onChange={(v) => setBlocks({ ...blocks, key_risks: v })} accent={RED} />
          <ListEditor label="Quick wins" items={blocks.quick_wins} onChange={(v) => setBlocks({ ...blocks, quick_wins: v })} accent={GREEN} />
          <Field label="Path to target state" value={blocks.path_forward} onChange={(v) => setBlocks({ ...blocks, path_forward: v })} rows={4} />
          <div style={{ fontSize: 11, color: INK3 }}>Edits are saved as the <strong>reviewed</strong> version and become what the PDF/PPTX report renders.</div>
        </div>
      )}
    </div>
  );
}

const Block = ({ label, accent, children }) => (
  <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
    <div style={{ width: 3, borderRadius: 2, background: accent || INK3, flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: accent || INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  </div>
);

const Item = ({ title, detail, color }) => (
  <div style={{ marginBottom: 7 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{title}</div>
    {detail && <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5 }}>{detail}</div>}
  </div>
);
