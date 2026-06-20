/**
 * OrganizationIntakeDocuments — the "Document Request" phase of Organization Intake.
 *
 * Renders the deduplicated checklist from GET /api/intake/document-checklist
 * (each canonical document appears once, with the controls it satisfies), lets
 * the user upload each document, and shows the per-control review results that
 * the pipeline fans out (met / partially met / not met). Re-review re-runs the
 * LLM/heuristic review from the stored text without re-uploading.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK2 = COLORS.ink2, INK3 = COLORS.ink3, HAIR = COLORS.hair, PANEL = COLORS.paper, ACC = '#0891b2', AMBER = COLORS.warn;
const STATUS_COLOR = { 'met': COLORS.good, 'partially met': COLORS.warn, 'not met': COLORS.bad };
const UP_COLOR = { requested: COLORS.ink3, uploaded: '#2563eb', normalized: '#2563eb', reviewed: COLORS.good, failed: COLORS.bad };

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const orgId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const token = props.authToken || ls('authToken') || '';
  const api = props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    ((typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { orgId, token, api };
}

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = reject;
  r.readAsDataURL(file);
});

export default function OrganizationIntakeDocuments(props) {
  const { orgId, token, api } = resolveCtx(props);
  const [docs, setDocs] = useState(null);
  const [pilot, setPilot] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState({});       // documentTypeId -> true while uploading/reviewing
  const [open, setOpen] = useState({});        // documentTypeId -> show controls / results
  const [results, setResults] = useState({});  // uploadId -> assessments[]

  const headers = useCallback(() => {
    const h = { 'X-Org-Id': orgId };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [orgId, token]);

  const loadChecklist = useCallback(() => {
    if (!orgId) { setError('No organization selected yet — finish the profile step first.'); return; }
    fetch(`${api}/api/intake/document-checklist?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setDocs(d.documents || []); setPilot(!!d.pilot); setError(null); })
      .catch((e) => setError(e.message));
  }, [api, orgId, headers]);

  useEffect(() => { loadChecklist(); }, [loadChecklist]);

  const loadResults = useCallback((uploadId) => {
    if (!uploadId) return;
    fetch(`${api}/api/intake/documents/${encodeURIComponent(uploadId)}/assessments?org_id=${encodeURIComponent(orgId)}`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => setResults((m) => ({ ...m, [uploadId]: d.assessments || [] })))
      .catch(() => {});
  }, [api, orgId, headers]);

  const upload = async (doc, file) => {
    if (!file) return;
    setBusy((b) => ({ ...b, [doc.id]: true }));
    try {
      const contentBase64 = await fileToBase64(file);
      const r = await fetch(`${api}/api/intake/documents`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, document_type_id: doc.id, file_name: file.name, contentBase64 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const out = await r.json();
      loadChecklist();
      if (out.upload_id) { setOpen((o) => ({ ...o, [doc.id]: true })); loadResults(out.upload_id); }
    } catch (e) {
      setError(`Upload failed for ${doc.name}: ${e.message}`);
    } finally {
      setBusy((b) => ({ ...b, [doc.id]: false }));
    }
  };

  // PILOT/TEST: fetch a generated sample document and run it through the pipeline.
  const useSample = async (doc) => {
    setBusy((b) => ({ ...b, [doc.id]: true }));
    try {
      const s = await fetch(`${api}/api/intake/sample/${encodeURIComponent(doc.id)}?org_id=${encodeURIComponent(orgId)}`, { headers: headers() });
      if (!s.ok) throw new Error(`HTTP ${s.status}`);
      const sample = await s.json();
      const r = await fetch(`${api}/api/intake/documents`, {
        method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, document_type_id: doc.id, file_name: sample.fileName, text: sample.text }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const out = await r.json();
      loadChecklist();
      if (out.upload_id) { setOpen((o) => ({ ...o, [doc.id]: true })); loadResults(out.upload_id); }
    } catch (e) {
      setError(`Sample failed for ${doc.name}: ${e.message}`);
    } finally {
      setBusy((b) => ({ ...b, [doc.id]: false }));
    }
  };

  const rereview = async (doc) => {
    if (!doc.upload_id) return;
    setBusy((b) => ({ ...b, [doc.id]: true }));
    try {
      const r = await fetch(`${api}/api/intake/documents/${encodeURIComponent(doc.upload_id)}/rereview`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadResults(doc.upload_id);
    } catch (e) {
      setError(`Re-review failed: ${e.message}`);
    } finally {
      setBusy((b) => ({ ...b, [doc.id]: false }));
    }
  };

  if (error && !docs) return <div style={{ padding: 18, color: '#C0392B', fontSize: 13 }}>Document Request unavailable: {error}</div>;
  if (!docs) return <div style={{ padding: 18, color: INK3, fontSize: 13 }}>Loading document checklist…</div>;

  const reviewed = docs.filter((d) => d.upload_status === 'reviewed').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5, maxWidth: 640 }}>
          These are the documents required for manual control review. Each is requested <strong>once</strong> and, when uploaded, is reviewed against every control it satisfies.
        </div>
        <div style={{ fontSize: 12, color: INK3, whiteSpace: 'nowrap', fontFamily: FONTS.mono }}><strong style={{ color: INK }}>{reviewed}</strong> / {docs.length} reviewed</div>
      </div>

      {error && <div style={{ background: '#fdecea', border: '1px solid #f3c9bf', color: '#C0392B', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {docs.map((doc) => {
          const isOpen = open[doc.id];
          const isBusy = busy[doc.id];
          const status = doc.upload_status || 'requested';
          const res = doc.upload_id ? results[doc.upload_id] : null;
          return (
            <div key={doc.id} style={{ border: `1px solid ${HAIR}`, borderLeft: `4px solid ${UP_COLOR[status] || INK3}`, borderRadius: 8, padding: '13px 15px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: FONTS.display }}>{doc.name}</div>
                  {doc.category && <div style={{ fontSize: 9.5, color: INK3, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{doc.category}</div>}
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: UP_COLOR[status] || INK3, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{status}</span>
              </div>

              {doc.description && <div style={{ fontSize: 11.5, color: INK2, lineHeight: 1.5, marginTop: 7 }}>{doc.description}</div>}

              <button onClick={() => setOpen((o) => ({ ...o, [doc.id]: !o[doc.id] }))}
                style={{ marginTop: 8, background: 'transparent', border: 'none', color: ACC, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                {isOpen ? '▲ Hide' : `▾ Satisfies ${doc.control_count} control${doc.control_count === 1 ? '' : 's'}`}
              </button>

              {isOpen && (
                <div style={{ marginTop: 8, borderTop: `1px solid ${HAIR}`, paddingTop: 8 }}>
                  {(doc.controls || []).map((c) => {
                    const r = (res || []).find((x) => x.framework_id === c.framework_id && x.requirement_id === c.requirement_id);
                    return (
                      <div key={`${c.framework_id}:${c.requirement_id}`} style={{ padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: INK }}>{c.requirement_id}</span>
                          <span style={{ fontSize: 9.5, color: INK3 }}>{c.domain}</span>
                          {r && <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, color: STATUS_COLOR[r.status] || INK3, textTransform: 'uppercase' }}>{r.status}</span>}
                        </div>
                        <div style={{ fontSize: 10.5, color: INK2, lineHeight: 1.45 }}>{c.expected_requirement || c.title}</div>
                        {r && r.evidence_excerpt && <div style={{ fontSize: 10, color: INK3, fontStyle: 'italic', marginTop: 2 }}>“{r.evidence_excerpt}”</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <label style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: '6px 11px', fontSize: 11, fontWeight: 600, color: INK, cursor: isBusy ? 'default' : 'pointer' }}>
                  {isBusy ? 'Working…' : status === 'reviewed' ? '↻ Replace' : '⤒ Upload'}
                  <input type="file" accept=".pdf,.docx,.xlsx,.txt,.md,.csv" disabled={isBusy} style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; upload(doc, f); }} />
                </label>
                {pilot && (
                  <button onClick={() => useSample(doc)} disabled={isBusy} title="Generate a sample document and run the pipeline (test fixture)"
                    style={{ background: '#fdf6e9', border: '1px solid #f0dcae', borderRadius: 6, padding: '6px 11px', fontSize: 11, fontWeight: 600, color: AMBER, cursor: 'pointer' }}>
                    ⚙ Use sample (test)
                  </button>
                )}
                {doc.upload_id && status === 'reviewed' && (
                  <button onClick={() => { setOpen((o) => ({ ...o, [doc.id]: true })); loadResults(doc.upload_id); rereview(doc); }} disabled={isBusy}
                    style={{ background: 'transparent', border: `1px solid ${HAIR}`, borderRadius: 6, padding: '6px 11px', fontSize: 11, fontWeight: 600, color: INK2, cursor: 'pointer' }}>
                    ↻ Re-review
                  </button>
                )}
                {doc.file_name && <span style={{ fontSize: 10, color: INK3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{doc.file_name}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {docs.length === 0 && <div style={{ fontSize: 12, color: INK3, padding: 12 }}>No documents requested yet. The catalog is seeded on the API at startup.</div>}
    </div>
  );
}
