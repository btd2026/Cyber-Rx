/**
 * IngestionUploader — generic, schema-agnostic upload for a process inventory or
 * a CMDB export. Uploads a file, previews the auto-detected field mapping (with
 * confidence), lets the user fix low-confidence columns, then commits. Shows how
 * many rows were ingested and how many went to the exception queue.
 *
 * Backend: POST /api/ingestion/preview, POST /api/ingestion/commit.
 */

import React, { useState, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, NAVY = COLORS.navy1;
const GREEN = COLORS.good, AMBER = COLORS.warn, RED = COLORS.bad;

function ctx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const api = props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, orgId, api };
}
const fileToB64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(file); });
const confColor = (c) => (c >= 0.8 ? GREEN : c >= 0.5 ? AMBER : RED);

export default function IngestionUploader(props) {
  const { sourceKind, label } = props; // sourceKind: 'process_inventory' | 'cmdb'
  const { token, orgId, api } = ctx(props);
  const [file, setFile] = useState(null);     // { name, b64 }
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({}); // canonicalKey -> column
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const headers = useCallback(() => { const h = { 'X-Org-Id': orgId, 'Content-Type': 'application/json' }; if (token) h.Authorization = `Bearer ${token}`; return h; }, [orgId, token]);

  const onFile = async (f) => {
    if (!f) return;
    setBusy(true); setError(null); setResult(null); setPreview(null);
    try {
      const b64 = await fileToB64(f);
      setFile({ name: f.name, b64 });
      const r = await fetch(`${api}/api/ingestion/preview`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, sourceKind, fileName: f.name, contentBase64: b64 }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const p = await r.json();
      setPreview(p);
      const m = {}; Object.keys(p.mapping || {}).forEach((k) => { m[k] = p.mapping[k].column; });
      setMapping(m);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const commit = async () => {
    setBusy(true); setError(null);
    try {
      const mappingObj = {}; Object.keys(mapping).forEach((k) => { if (mapping[k]) mappingObj[k] = { column: mapping[k] }; });
      const r = await fetch(`${api}/api/ingestion/commit`, { method: 'POST', headers: headers(), body: JSON.stringify({ org_id: orgId, sourceKind, fileName: file.name, contentBase64: file.b64, mapping: mappingObj }) });
      if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
      setResult(await r.json());
      if (props.onDone) props.onDone();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const fields = preview ? Object.keys(preview.mapping || {}).concat((preview.missingRequired || []).filter((k) => !preview.mapping[k])) : [];
  const missing = (preview && preview.missingRequired) || [];

  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: FONTS.display }}>{label || (sourceKind === 'cmdb' ? 'Import applications (CMDB file)' : 'Upload process inventory / BIA')}</div>
        <label style={{ background: NAVY, color: '#fff', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Working…' : '⤒ Choose file'}
          <input type="file" accept=".csv,.tsv,.json,.xml,.xlsx" disabled={busy} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; onFile(f); }} />
        </label>
      </div>
      <div style={{ fontSize: 11.5, color: INK2, marginTop: 6 }}>
        {sourceKind === 'cmdb'
          ? 'A CMDB yields applications/assets — not business processes. We’ll map columns automatically; you confirm anything uncertain.'
          : 'Parsed into Function → Process → Sub-process with Tier/RTO. We auto-map columns; confirm anything uncertain.'}
      </div>

      {error && <div style={{ background: '#fdecea', border: '1px solid #f3c9bf', color: RED, borderRadius: 7, padding: '8px 12px', fontSize: 12, marginTop: 10 }}>{error}</div>}

      {preview && !result && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: INK3, marginBottom: 6 }}>Detected <strong style={{ color: INK }}>{preview.format}</strong> · <span style={{ fontFamily: FONTS.mono }}>{preview.rowCount}</span> rows · review the field mapping:</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {fields.map((k) => {
              const conf = preview.mapping[k] ? preview.mapping[k].confidence : null;
              const req = missing.includes(k);
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 150, fontSize: 12, fontWeight: 600, color: INK }}>{k}{req && <span style={{ color: RED }}> *</span>}</span>
                  <select value={mapping[k] || ''} onChange={(e) => setMapping({ ...mapping, [k]: e.target.value })}
                    style={{ flex: 1, border: `1px solid ${req && !mapping[k] ? RED : HAIR}`, borderRadius: 6, padding: '6px 9px', fontSize: 12 }}>
                    <option value="">— not mapped —</option>
                    {(preview.headers || []).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {conf != null && <span style={{ width: 44, textAlign: 'right', fontSize: 11, fontWeight: 700, fontFamily: FONTS.mono, color: confColor(conf) }}>{Math.round(conf * 100)}%</span>}
                </div>
              );
            })}
          </div>
          <button onClick={commit} disabled={busy || missing.some((k) => !mapping[k])}
            style={{ marginTop: 12, background: GREEN, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: (busy || missing.some((k) => !mapping[k])) ? 0.5 : 1 }}>
            {busy ? 'Importing…' : 'Confirm & import'}
          </button>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12, background: '#f0f7f2', border: '1px solid #cce8d6', borderRadius: 8, padding: '10px 13px', fontSize: 12.5, color: INK }}>
          ✓ Imported <strong>{result.ingested}</strong> {result.target}{result.ingested === 1 ? '' : 's'}.
          {result.exceptions > 0 && <span style={{ color: AMBER }}> {result.exceptions} row(s) need review (exception queue).</span>}
        </div>
      )}
    </div>
  );
}
