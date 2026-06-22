/**
 * VendorAssessmentPanel — Saraqael vendor-assurance agent
 * -------------------------------------------------------
 * Upload panel where Saraqael reviews and cross-validates every vendor
 * document type, produces risk-rated findings mapped to NIST CSF / SOC 2 /
 * HIPAA, and feeds them into the vendor risk score and the CISO/CRO dashboards.
 *
 * Data: /api/vendor-assessment/* (doc-types, documents, summary, cross-validate)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS } from '../theme';

const INK = COLORS.ink, INK_2 = COLORS.ink2, INK_3 = COLORS.ink3, HAIRLINE = COLORS.hair, PANEL_BG = COLORS.navy1;
const RATING = {
  Critical: COLORS.bad, High: '#c2410c', Medium: COLORS.warn, Low: COLORS.good, Informational: '#8b9098', 'Not assessed': '#8B95A3',
};

function resolveCtx(props) {
  const ls = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
  const token = props.authToken || ls('authToken') || '';
  const organizationId = props.orgId || ls('cyberrx_org_id') || ls('orgId') || '';
  const apiUrl = props.api_url || props.apiUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || ((typeof window!=='undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) ? 'http://localhost:3001' : 'https://cyberrx-api.onrender.com');
  return { token, organizationId, apiUrl };
}

const FW_COLOR = (fw) => (fw.startsWith('HIPAA') ? '#9E3B32' : fw.startsWith('SOC2') ? '#8B5CF6' : '#5e6ad2');

export default function VendorAssessmentPanel(props) {
  const [docTypes, setDocTypes] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [docType, setDocType] = useState('');
  const [fileName, setFileName] = useState('');
  const [fields, setFields] = useState({});
  const [rawText, setRawText] = useState('');
  const [fileB64, setFileB64] = useState('');
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { token, organizationId, apiUrl } = resolveCtx(props);
  const vendorId = vendorName ? `vendor_${vendorName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}` : '';

  const headers = useCallback(() => {
    const h = { 'X-Org-Id': organizationId, 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, [token, organizationId]);

  useEffect(() => {
    fetch(`${apiUrl}/api/vendor-assessment/doc-types`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setDocTypes(d.docTypes || []); setAiEnabled(d.aiEnabled); if (d.docTypes && d.docTypes[0]) setDocType(d.docTypes[0].id); } })
      .catch(() => {});
  }, [apiUrl, headers]);

  const loadSummary = useCallback((vid) => {
    if (!vid) return;
    fetch(`${apiUrl}/api/vendor-assessment/${vid}?org_id=${encodeURIComponent(organizationId)}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setSummary(d); }).catch(() => {});
  }, [apiUrl, organizationId, headers]);

  const activeType = docTypes.find((t) => t.id === docType);

  const submit = async () => {
    if (!vendorName || !docType) { setError('Enter a vendor name and pick a document type.'); return; }
    setBusy(true); setError(null);
    try {
      const cleaned = {};
      Object.entries(fields).forEach(([k, v]) => { if (v !== '' && v != null) cleaned[k] = v; });
      const res = await fetch(`${apiUrl}/api/vendor-assessment/documents?org_id=${encodeURIComponent(organizationId)}`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ vendorId, vendorName, docType, fileName: fileName || `${docType}.pdf`, fields: cleaned, text: rawText || undefined, contentBase64: fileB64 || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFields({}); setRawText(''); setFileName(''); setFileB64('');
      loadSummary(vendorId);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  // Heuristic input kind from the field name.
  const fieldKind = (k) => (/date/i.test(k) ? 'date' : /findings|cves|amount|rto|rpo|days|compliance/i.test(k) ? 'number'
    : /exceptions|criteria|ranges|subprocessors|connections|systems/i.test(k) ? 'list' : 'text');

  return (
    <div style={{ background: '#fff', border: `1px solid ${HAIRLINE}`, borderRadius: 6, padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            Saraqael · Vendor Assurance Agent {aiEnabled ? '· AI extraction live' : '· structured intake'}
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.01em', fontFamily: FONTS.display }}>Vendor Document Assessment</h2>
          <div style={{ color: INK_2, fontSize: 12, marginTop: 6, maxWidth: 660, lineHeight: 1.55 }}>
            Saraqael validates every vendor document type, extracts the assurance data, maps findings to NIST CSF 2.0 /
            SOC 2 / HIPAA, cross-validates documents against each other, and feeds risk-rated findings into the vendor
            risk score and the CISO / CRO dashboards.
          </div>
        </div>
        {summary && (
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24, display: 'flex', gap: 8 }}>
            {summary.assuranceScore != null && (
              <div style={{ display: 'inline-flex', alignItems: 'stretch', background: PANEL_BG, borderRadius: 4, overflow: 'hidden' }}>
                <span style={{ background: summary.assuranceScore >= 85 ? COLORS.good : summary.assuranceScore >= 65 ? COLORS.warn : summary.assuranceScore >= 40 ? '#c2410c' : COLORS.bad, color: '#fff', fontWeight: 600, fontSize: 19, fontVariantNumeric: 'tabular-nums', fontFamily: FONTS.mono, padding: '10px 14px' }}>
                  {summary.assuranceScore}
                </span>
                <span style={{ color: '#ebecf0', fontWeight: 500, fontSize: 12, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.35 }}>
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9, color: COLORS.accent }}>Assurance Score</span>
                  <span>{summary.postureBand} · C{summary.avgCompleteness}/A{summary.avgAccuracy}</span>
                </span>
              </div>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'stretch', background: PANEL_BG, borderRadius: 4, overflow: 'hidden' }}>
              <span style={{ background: RATING[summary.overallRating] || INK_3, color: '#fff', fontWeight: 600, fontSize: 19, fontVariantNumeric: 'tabular-nums', fontFamily: FONTS.mono, padding: '10px 14px' }}>
                {summary.documentRiskScore}
              </span>
              <span style={{ color: '#ebecf0', fontWeight: 500, fontSize: 12, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.35 }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9, color: COLORS.accent }}>Document Risk Score</span>
                <span>{summary.overallRating}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 28, marginTop: 20 }}>
        {/* Upload form */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Submit a document</div>
          <label style={lbl}>Vendor</label>
          <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Cotiviti" style={inp}
            onBlur={() => loadSummary(vendorId)} />
          <label style={lbl}>Document type</label>
          <select value={docType} onChange={(e) => { setDocType(e.target.value); setFields({}); }} style={inp}>
            {docTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {activeType && <div style={{ fontSize: 10.5, color: INK_3, margin: '2px 0 8px' }}>Issuing authority: {activeType.issuer}</div>}
          <label style={lbl}>Upload document (PDF) — the agent reads the file</label>
          <input type="file" accept=".pdf,.txt,.md,.json" style={{ ...inp, padding: '6px' }}
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) { setFileB64(''); return; }
              setFileName(file.name);
              const reader = new FileReader();
              reader.onload = () => { const r = reader.result || ''; setFileB64(String(r).split(',').pop() || ''); };
              reader.readAsDataURL(file);
            }} />
          <div style={{ fontSize: 10, color: INK_3, margin: '2px 0 8px' }}>
            Upload the file and Saraqael extracts the elements and scores accuracy + completeness. Structured fields below are optional overrides.
          </div>

          {activeType && activeType.fields.map((k) => {
            const kind = fieldKind(k);
            return (
              <div key={k}>
                <label style={lbl}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}{kind === 'list' ? ' (comma-separated)' : ''}</label>
                <input type={kind === 'date' ? 'date' : kind === 'number' ? 'number' : 'text'}
                  value={fields[k] == null ? '' : (Array.isArray(fields[k]) ? fields[k].join(', ') : fields[k])}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFields((p) => ({ ...p, [k]: kind === 'list' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v }));
                  }}
                  style={inp} />
              </div>
            );
          })}
          <label style={lbl}>Or paste raw document text {aiEnabled ? '(AI will extract)' : '(stored as excerpt)'}</label>
          <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Paste the document text…" />
          {error && <div style={{ color: RATING.Critical, fontSize: 11, marginBottom: 8 }}>{error}</div>}
          <button onClick={submit} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saraqael is reviewing…' : 'Assess document →'}
          </button>
        </div>

        {/* Summary + findings */}
        <div>
          {!summary && <div style={{ color: INK_3, fontSize: 13, padding: '40px 0' }}>Submit a document, or enter a vendor name above to load its assessment.</div>}
          {summary && (
            <>
              {/* Coverage */}
              <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${HAIRLINE}`, marginBottom: 14 }}>
                {[['Documents on file', summary.documentCount], ['Critical', summary.findingCounts.Critical, 'Critical'], ['High', summary.findingCounts.High, 'High'], ['Medium', summary.findingCounts.Medium, 'Medium']].map(([label, val, r]) => (
                  <div key={label} style={{ padding: '0 24px 14px 0', marginRight: 24, borderRight: `1px solid ${HAIRLINE}` }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: r ? RATING[r] : INK, fontVariantNumeric: 'tabular-nums', fontFamily: FONTS.mono }}>{val}</div>
                  </div>
                ))}
              </div>
              {summary.documentsMissing.length > 0 && (
                <div style={{ fontSize: 11.5, color: INK_2, marginBottom: 14 }}>
                  <span style={{ fontWeight: 600, color: RATING.Medium }}>Missing document types:</span>{' '}
                  {summary.documentsMissing.map((m) => (docTypes.find((t) => t.id === m) || {}).label || m).join(' · ')}
                </div>
              )}

              {/* Documents + findings */}
              {summary.documents.map((d) => (
                <div key={d.id} style={{ border: `1px solid ${HAIRLINE}`, borderLeft: `3px solid ${RATING[d.riskRating]}`, borderRadius: 4, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{d.docLabel}<span style={{ color: INK_3, fontWeight: 400, fontSize: 11, marginLeft: 8 }}>{d.fileName}</span></div>
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: RATING[d.riskRating], textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.riskRating}</span>
                  </div>
                  {d.score != null && (
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: d.score >= 85 ? COLORS.good : d.score >= 65 ? COLORS.warn : d.score >= 40 ? '#c2410c' : COLORS.bad, lineHeight: 1, fontFamily: FONTS.mono }}>
                        {d.score}<span style={{ fontSize: 9, color: INK_3, fontWeight: 600, marginLeft: 3 }}>{d.status}</span>
                      </div>
                      {[['Completeness', d.completeness], ['Accuracy', d.accuracy]].map(([lab, v]) => (
                        <div key={lab} style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.06em' }}><span>{lab}</span><span>{v == null ? '—' : v + '%'}</span></div>
                          <div style={{ height: 5, background: '#f0f1f4', borderRadius: 3, marginTop: 2 }}><div style={{ width: `${v || 0}%`, height: '100%', background: (v || 0) >= 80 ? COLORS.good : (v || 0) >= 50 ? COLORS.warn : COLORS.bad, borderRadius: 3 }} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {d.findings.map((f) => (
                    <div key={f.id} style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid #f0f1f4` }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 8.5, fontWeight: 700, color: '#fff', background: RATING[f.severity], borderRadius: 2, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{f.severity}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{f.title}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: INK_2, margin: '4px 0', lineHeight: 1.5 }}>{f.detail}</div>
                      {f.recommendation && <div style={{ fontSize: 11, color: INK_2, fontStyle: 'italic' }}>→ {f.recommendation}</div>}
                      {f.frameworks && f.frameworks.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                          {f.frameworks.map((fw) => (
                            <span key={fw} style={{ fontSize: 9, fontWeight: 600, color: FW_COLOR(fw), border: `1px solid ${FW_COLOR(fw)}40`, borderRadius: 2, padding: '1px 6px' }}>{fw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {d.findings.length === 0 && <div style={{ fontSize: 11, color: INK_3, marginTop: 6 }}>No issues found.</div>}
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: INK_3, marginTop: 6 }}>
                Findings are written to vendor risk signals and surface on the CISO and CRO dashboards. Cross-document
                inconsistencies are re-checked automatically after each upload.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 10, fontWeight: 600, color: INK_2, margin: '8px 0 3px', textTransform: 'uppercase', letterSpacing: '0.04em' };
const inp = { width: '100%', boxSizing: 'border-box', border: `1px solid #d7d9de`, borderRadius: 3, padding: '7px 9px', fontSize: 12, color: INK, marginBottom: 4, outline: 'none' };
const primaryBtn = { width: '100%', marginTop: 12, background: '#1c2a3a', color: '#fff', border: 'none', borderRadius: 3, padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
