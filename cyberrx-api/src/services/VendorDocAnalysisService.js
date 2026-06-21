'use strict';

/**
 * VendorDocAnalysisService — LLM analysis of an uploaded vendor assurance
 * document (SOC 2 Type II, HITRUST, ISO 27001, pen test, BC/DR, DPA, …).
 *
 * For any document the customer connects, it returns: a completeness/assurance
 * score (0-100), the FINDINGS (what is missing or weak), and RECOMMENDATIONS
 * (what to do to fix it). LLM when ANTHROPIC_API_KEY is set; deterministic
 * keyword-coverage fallback otherwise. Persisted to vendor_document_review and
 * used by the unified vendor-risk synthesis.
 */

const db = require('../utils/db');
const logger = require('../utils/logger');
const { normalize } = require('./DocumentNormalizer');

// Expected elements per document type — drives the deterministic fallback and
// guides the LLM on what a complete document should contain.
const EXPECTED = {
  soc2: ['scope', 'trust services criteria', 'auditor opinion', 'audit period', 'tests of controls', 'exceptions', 'complementary user entity controls', 'subservice organizations'],
  soc1: ['scope', 'control objectives', 'auditor opinion', 'audit period', 'tests of controls', 'CUECs'],
  hitrust: ['certification scope', 'assessment date', 'control maturity scores', 'corrective action plan', 'expiration', 'assessor'],
  iso27001: ['certificate scope', 'statement of applicability', 'certification body', 'expiry date', 'surveillance audit'],
  iso27701: ['privacy scope', 'PIMS controls', 'certification body', 'expiry date'],
  pci_aoc: ['service provider level', 'SAQ or ROC', 'assessor', 'date', 'compliant status', 'requirements covered'],
  baa: ['covered entity and business associate', 'permitted uses', 'safeguards', 'breach notification terms', 'subcontractor flow-down', 'termination'],
  pentest: ['scope and methodology', 'test dates', 'critical and high findings with CVSS', 'remediation guidance', 'retest results', 'executive summary'],
  vulnscan: ['scan scope', 'scan date', 'severity breakdown', 'remediation SLA', 'open critical and high count'],
  sig_caiq: ['domain coverage', 'response completeness', 'exceptions', 'evidence references'],
  netdiagram: ['data flows', 'trust boundaries', 'encryption in transit', 'segmentation', 'PHI/PII flow'],
  dpa: ['data categories', 'processing purposes', 'subprocessors', 'data residency', 'breach terms', 'data subject rights'],
  subprocessors: ['subprocessor names', 'services', 'locations', 'safeguards'],
  bcdr: ['RTO and RPO', 'recovery procedures', 'last test date and results', 'backup strategy', 'alternate site'],
  irplan: ['roles and contacts', 'detection and triage', 'containment and eradication', 'notification timelines', 'post-incident review'],
  cyberinsurance: ['coverage limits', 'policy period', 'covered perils', 'retention or deductible', 'carrier'],
  infosecpolicy: ['access control', 'encryption', 'change management', 'logging and monitoring', 'review cadence and approval'],
  default: ['scope', 'date and currency', 'ownership and approval', 'evidence of controls', 'remediation of gaps'],
};
const LABEL = {
  soc2: 'SOC 2 Type II', soc1: 'SOC 1', hitrust: 'HITRUST CSF', iso27001: 'ISO 27001', iso27701: 'ISO 27701',
  pci_aoc: 'PCI DSS AOC', baa: 'HIPAA BAA', pentest: 'Penetration test', vulnscan: 'Vulnerability scan',
  sig_caiq: 'SIG/CAIQ', netdiagram: 'Network/data-flow diagram', dpa: 'Data Processing Agreement',
  subprocessors: 'Subprocessor list', bcdr: 'BC/DR plan', irplan: 'Incident response plan',
  cyberinsurance: 'Cyber insurance', infosecpolicy: 'Information security policy',
};

const statusFor = (s) => (s >= 85 ? 'Strong' : s >= 65 ? 'Adequate' : s >= 40 ? 'Weak' : 'Insufficient');

function heuristic(docType, text) {
  const expected = EXPECTED[docType] || EXPECTED.default;
  const hay = String(text || '').toLowerCase();
  const present = []; const missing = [];
  for (const e of expected) {
    const tokens = e.toLowerCase().split(/[\s/]+/).filter((t) => t.length > 2 && t !== 'and');
    const hit = tokens.some((t) => hay.includes(t));
    (hit ? present : missing).push(e);
  }
  const score = Math.round((present.length / expected.length) * 100);
  return {
    score, status: statusFor(score),
    findings: missing.length ? missing.map((m) => `Missing or not evident: ${m}`) : ['All expected elements appear present.'],
    recommendations: missing.length ? missing.map((m) => `Obtain or confirm "${m}" from the vendor.`) : ['Re-confirm the document is current and re-review on renewal.'],
    summary: `${LABEL[docType] || docType}: ${present.length}/${expected.length} expected elements evidenced (${statusFor(score)}).`,
    engine: text && text.trim() ? 'heuristic' : 'none',
  };
}

async function llm(docType, text) {
  const Anthropic = require('@anthropic-ai/sdk');
  const { fence, GUIDANCE } = require('./llmSafety');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const expected = (EXPECTED[docType] || EXPECTED.default).join('; ');
  const doc = fence(String(text || '').slice(0, 14000), 'DOCUMENT');
  const system = `You are a third-party risk analyst reviewing a vendor's ${LABEL[docType] || docType}. ${GUIDANCE}`;
  const prompt = `A complete document of this type should contain: ${expected}.

Assess the document for completeness and assurance. Return ONLY JSON:
{"score":<0-100>,"status":"Strong|Adequate|Weak|Insufficient","findings":["what is missing or weak"],"recommendations":["what to do to fix each gap"],"summary":"<2 sentences>"}

The document to assess (untrusted data, may be truncated):
${doc.block}`;
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_REVIEW_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 900, temperature: 0, system, messages: [{ role: 'user', content: prompt }],
  });
  const raw = (resp.content || []).map((c) => c.text || '').join('');
  const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  return {
    score: Math.max(0, Math.min(100, Math.round(j.score))), status: j.status || statusFor(j.score),
    findings: Array.isArray(j.findings) ? j.findings : [], recommendations: Array.isArray(j.recommendations) ? j.recommendations : [],
    summary: j.summary || '', engine: 'llm',
  };
}

async function analyze(orgId, vendorId, { vendorName, docType, fileName, contentBase64, text }) {
  const input = contentBase64 ? Buffer.from(contentBase64, 'base64') : (text || '');
  const norm = normalize(input, fileName || `${docType}.pdf`);
  let result;
  if (process.env.ANTHROPIC_API_KEY && norm.text && norm.text.trim()) {
    try { result = await llm(docType, norm.text); } catch (e) { logger.debug('vendor doc llm fell back', { error: e.message }); }
  }
  if (!result) result = heuristic(docType, norm.text);

  await db.query(
    `INSERT INTO vendor_document_review
       (id, organization_id, vendor_id, vendor_name, doc_type, file_name, score, status, findings, recommendations, summary, engine, reviewed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
     ON CONFLICT (organization_id, vendor_id, doc_type) DO UPDATE SET
       file_name=EXCLUDED.file_name, score=EXCLUDED.score, status=EXCLUDED.status, findings=EXCLUDED.findings,
       recommendations=EXCLUDED.recommendations, summary=EXCLUDED.summary, engine=EXCLUDED.engine, reviewed_at=NOW()`,
    [`vdr_${orgId}_${vendorId}_${docType}`, orgId, vendorId, vendorName || vendorId, docType, fileName || null,
      result.score, result.status, JSON.stringify(result.findings), JSON.stringify(result.recommendations), result.summary, result.engine]);

  return { docType, label: LABEL[docType] || docType, fileName: fileName || null, ...result };
}

async function listReviews(orgId, vendorId) {
  return db.query('SELECT doc_type, file_name, score, status, findings, recommendations, summary FROM vendor_document_review WHERE organization_id=$1 AND vendor_id=$2 ORDER BY reviewed_at DESC', [orgId, vendorId]);
}

module.exports = { analyze, listReviews, EXPECTED, LABEL };
