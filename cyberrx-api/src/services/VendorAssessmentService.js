'use strict';

/**
 * VendorAssessmentService — "Saraqael", the vendor-assurance agent.
 * -----------------------------------------------------------------
 * Reviews and validates every document type in the vendor upload panel, not
 * just SOC 2 and pentest reports. For each document Saraqael:
 *   1. Confirms it is what it claims to be (format, issuing authority, completeness).
 *   2. Extracts the key assurance data points relevant to our frameworks.
 *   3. Maps findings to NIST CSF 2.0, SOC 2, and HIPAA controls as applicable.
 *   4. Flags anything missing, expired, out of scope, or inconsistent.
 *   5. Produces a plain-language finding with a risk rating
 *      (Critical / High / Medium / Low / Informational).
 *   6. Feeds findings into the vendor risk score and the CISO/CRO dashboards
 *      (via vendor_risk_signals) as real evidence.
 *
 * Saraqael also CROSS-VALIDATES across a vendor's documents — documents are
 * never reviewed in isolation (e.g. a subprocessor on the network diagram but
 * absent from the subprocessor list is a finding; a pentest covering a
 * different IP range than the diagram's in-scope range is a finding).
 *
 * Extraction: when ANTHROPIC_API_KEY is set, Claude parses raw document text
 * into the structured fields below; otherwise the uploader's structured fields
 * are used directly. Either way the validators, framework mapping, scoring, and
 * cross-checks are deterministic.
 */

const crypto = require('crypto');
const db = require('../utils/db');
const logger = require('../utils/logger');

const RATINGS = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const RATING_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3, Informational: 4 };
const RATING_SCORE = { Critical: 40, High: 25, Medium: 12, Low: 5, Informational: 0 };
const SIGNAL_SEVERITY = { Critical: 'Critical', High: 'High', Medium: 'Medium', Low: 'Low', Informational: 'Info' };

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
let anthropicClient = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (anthropicClient) return anthropicClient;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new (Anthropic.default || Anthropic)({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropicClient;
  } catch (_) { return null; }
}
function aiEnabled() { return !!getClient(); }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uid(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }
function daysBetween(a, b) { return Math.round((a.getTime() - b.getTime()) / 86400000); }
function parseDate(v) { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
function asArray(v) { return Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]); }
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function finding(severity, title, detail, frameworks, recommendation, dataPoints) {
  return { id: uid('vf'), severity, title, detail, frameworks: frameworks || [], recommendation: recommendation || '', dataPoints: dataPoints || {} };
}
function worstRating(findings) {
  if (!findings.length) return 'Informational';
  return findings.reduce((w, f) => (RATING_RANK[f.severity] < RATING_RANK[w] ? f.severity : w), 'Informational');
}

// ---------------------------------------------------------------------------
// Document type registry. Each validator receives ({ fields, now }) and returns
// an array of findings. `fields` is the extracted/structured data for the doc.
// ---------------------------------------------------------------------------
const DOC_TYPES = {
  soc2: {
    label: 'SOC 2 Type I & II', issuer: 'AICPA-registered CPA firm',
    fields: ['reportType', 'auditFirm', 'periodStart', 'periodEnd', 'trustCriteria', 'exceptions', 'scopeSystems'],
    validate: ({ fields, now }) => {
      const f = [];
      const type = String(fields.reportType || '').toUpperCase();
      if (!/I{1,2}/.test(type)) f.push(finding('Medium', 'SOC 2 report type unstated', 'Could not confirm whether this is a Type I (point-in-time) or Type II (period-of-time) report.', ['SOC2:CC'], 'Obtain a SOC 2 Type II covering the full audit period.', { reportType: fields.reportType || null }));
      if (type.includes('I') && !type.includes('II')) f.push(finding('Medium', 'SOC 2 Type I only', 'A Type I attests design at a point in time, not operating effectiveness over a period.', ['SOC2:CC', 'CSF:GV.SC'], 'Request a Type II report before relying on operating-effectiveness assurance.', {}));
      const end = parseDate(fields.periodEnd);
      if (end) {
        const age = daysBetween(now, end);
        if (age > 365) f.push(finding('High', 'SOC 2 audit period is stale', `The audit period ended ${age} days ago (over 12 months).`, ['SOC2:CC', 'CSF:GV.SC'], 'Obtain the current-year SOC 2 report.', { periodEnd: fields.periodEnd, ageDays: age }));
        else if (age > 270) f.push(finding('Medium', 'SOC 2 approaching staleness', `The audit period ended ${age} days ago; a bridge letter may be required.`, ['SOC2:CC'], 'Request a bridge letter covering the gap to today.', { ageDays: age }));
      } else {
        f.push(finding('Medium', 'SOC 2 audit period not found', 'No audit period end date could be extracted.', ['SOC2:CC'], 'Confirm the report covers a defined audit period.', {}));
      }
      const exceptions = asArray(fields.exceptions);
      if (exceptions.length) f.push(finding(exceptions.length >= 3 ? 'High' : 'Medium', `${exceptions.length} SOC 2 exception(s) noted`, `Auditor noted exceptions: ${exceptions.slice(0, 5).join('; ')}.`, ['SOC2:CC', 'CSF:PR.AA', 'HIPAA:§164.308'], 'Review each exception for impact on our data and obtain management responses.', { exceptions }));
      if (!fields.auditFirm) f.push(finding('Low', 'Audit firm not identified', 'The issuing CPA firm could not be confirmed.', ['SOC2:CC'], 'Confirm the report was issued by an AICPA-registered firm.', {}));
      const tsc = asArray(fields.trustCriteria).map(norm);
      if (tsc.length && !tsc.includes('security')) f.push(finding('Medium', 'Security TSC not in scope', 'The Security (Common Criteria) trust service criterion was not listed in scope.', ['SOC2:CC'], 'Ensure at least the Security TSC is covered.', { trustCriteria: fields.trustCriteria }));
      return f;
    },
  },
  pentest: {
    label: 'Penetration Test Report', issuer: 'Independent security testing firm',
    fields: ['firm', 'methodology', 'testDate', 'scopeIpRanges', 'criticalFindings', 'highFindings', 'remediationStatus'],
    validate: ({ fields, now }) => {
      const f = [];
      const d = parseDate(fields.testDate);
      if (d) { const age = daysBetween(now, d); if (age > 365) f.push(finding('High', 'Penetration test is stale', `Test performed ${age} days ago (over 12 months).`, ['CSF:ID.RA', 'SOC2:CC7.1'], 'Require an annual penetration test.', { testDate: fields.testDate, ageDays: age })); }
      else f.push(finding('Medium', 'Pentest date not found', 'No test date could be extracted.', ['CSF:ID.RA'], 'Confirm when the test was performed.', {}));
      if (!fields.methodology) f.push(finding('Low', 'Methodology unstated', 'No testing methodology (e.g. OWASP, PTES, NIST 800-115) was identified.', ['CSF:ID.RA'], 'Confirm a recognized methodology was followed.', {}));
      const crit = Number(fields.criticalFindings) || 0, high = Number(fields.highFindings) || 0;
      const rem = norm(fields.remediationStatus);
      if (crit > 0 && !/remediat|closed|resolved|fixed/.test(rem)) f.push(finding('Critical', `${crit} unremediated critical pentest finding(s)`, `${crit} critical and ${high} high findings with remediation status "${fields.remediationStatus || 'unknown'}".`, ['CSF:PR.PS', 'CSF:ID.RA', 'SOC2:CC7.1'], 'Block or condition the engagement until criticals are remediated and retested.', { criticalFindings: crit, highFindings: high, remediationStatus: fields.remediationStatus }));
      else if (crit + high > 0) f.push(finding(high >= 5 ? 'High' : 'Medium', `${crit} critical / ${high} high pentest findings`, `Remediation status: ${fields.remediationStatus || 'unspecified'}.`, ['CSF:PR.PS', 'CSF:ID.RA'], 'Track remediation to closure and obtain retest evidence.', { criticalFindings: crit, highFindings: high }));
      if (!asArray(fields.scopeIpRanges).length) f.push(finding('Low', 'Test scope (IP ranges) not specified', 'Cannot confirm the test covered the systems that hold our data.', ['CSF:ID.RA'], 'Obtain the in-scope asset/IP list and compare to systems touching our data.', {}));
      return f;
    },
  },
  iso27001: {
    label: 'ISO 27001 Certificate', issuer: 'Accredited certification body',
    fields: ['certBody', 'certNumber', 'issueDate', 'expiryDate', 'scopeStatement', 'surveillanceStatus'],
    validate: ({ fields, now }) => {
      const f = [];
      const exp = parseDate(fields.expiryDate);
      if (exp) { const days = daysBetween(exp, now); if (days < 0) f.push(finding('High', 'ISO 27001 certificate expired', `Certificate expired ${Math.abs(days)} days ago.`, ['CSF:GV.SC', 'SOC2:CC'], 'Obtain the current certificate before relying on ISO assurance.', { expiryDate: fields.expiryDate })); else if (days < 90) f.push(finding('Medium', 'ISO 27001 certificate expiring soon', `Certificate expires in ${days} days.`, ['CSF:GV.SC'], 'Request the renewed certificate.', { daysToExpiry: days })); }
      else f.push(finding('Medium', 'ISO 27001 validity dates not found', 'Issue/expiry dates could not be extracted.', ['CSF:GV.SC'], 'Confirm the certificate is currently valid.', {}));
      if (!fields.certBody) f.push(finding('Medium', 'Certification body not identified', 'Cannot confirm the certificate was issued by an accredited body (e.g. UKAS, ANAB).', ['CSF:GV.SC'], 'Verify the certification body is accredited.', {}));
      if (!fields.scopeStatement) f.push(finding('Medium', 'ISO scope statement missing', 'Without a scope statement the certificate may not cover the services we use.', ['CSF:GV.SC'], 'Confirm the certified scope includes the services provided to us.', {}));
      if (norm(fields.surveillanceStatus) && /overdue|missed|lapsed/.test(norm(fields.surveillanceStatus))) f.push(finding('Medium', 'Surveillance audit overdue', 'A required surveillance audit appears overdue, risking certificate suspension.', ['CSF:GV.SC'], 'Confirm surveillance audits are current.', {}));
      return f;
    },
  },
  baa: {
    label: 'HIPAA Business Associate Agreement', issuer: 'Executed contract',
    fields: ['permittedUses', 'safeguards', 'breachNotification', 'subcontractors', 'returnDestruction', 'signedDate'],
    validate: ({ fields }) => {
      const f = [];
      const required = [
        ['permittedUses', 'permitted uses and disclosures'],
        ['safeguards', 'safeguards for PHI'],
        ['breachNotification', 'breach notification obligations'],
        ['subcontractors', 'subcontractor flow-down (§164.308(b))'],
        ['returnDestruction', 'return/destruction of PHI on termination'],
      ];
      const missing = required.filter(([k]) => !fields[k] || norm(fields[k]) === 'no' || norm(fields[k]) === 'missing');
      if (missing.length) f.push(finding(missing.length >= 2 ? 'Critical' : 'High', `BAA missing ${missing.length} required clause(s)`, `Absent or weakened: ${missing.map((m) => m[1]).join('; ')}.`, ['HIPAA:§164.314', 'HIPAA:§164.308(b)', 'CSF:GV.SC'], 'Do not exchange PHI until a compliant BAA with all required clauses is executed.', { missing: missing.map((m) => m[0]) }));
      else f.push(finding('Informational', 'BAA contains the required clauses', 'All five required BAA elements were confirmed present.', ['HIPAA:§164.314'], '', {}));
      if (!parseDate(fields.signedDate)) f.push(finding('Low', 'BAA execution date not found', 'Cannot confirm the BAA is fully executed.', ['HIPAA:§164.314'], 'Confirm both parties have signed.', {}));
      return f;
    },
  },
  vulnscan: {
    label: 'Vulnerability Scan Results', issuer: 'Scanner (Tenable/Qualys/Rapid7)',
    fields: ['scanDate', 'criticalCves', 'highCves', 'oldestOpenDays', 'slaCompliance'],
    validate: ({ fields, now }) => {
      const f = [];
      const crit = Number(fields.criticalCves) || 0, high = Number(fields.highCves) || 0;
      if (crit > 0) f.push(finding(crit >= 5 ? 'Critical' : 'High', `${crit} open critical CVE(s)`, `${crit} critical and ${high} high CVEs open at scan time.`, ['CSF:PR.PS', 'CSF:ID.RA', 'SOC2:CC7.1', 'HIPAA:§164.308(a)(1)'], 'Require remediation of critical CVEs within SLA before processing our data.', { criticalCves: crit, highCves: high }));
      const oldest = Number(fields.oldestOpenDays) || 0;
      if (oldest > 90) f.push(finding('High', 'Aging unremediated vulnerabilities', `Oldest open finding is ${oldest} days old, exceeding typical SLA.`, ['CSF:PR.PS'], 'Confirm a remediation SLA exists and is met.', { oldestOpenDays: oldest }));
      const sla = Number(fields.slaCompliance);
      if (Number.isFinite(sla) && sla < 85) f.push(finding('Medium', `Patch SLA compliance ${sla}%`, 'Remediation SLA compliance is below an acceptable threshold.', ['CSF:PR.PS'], 'Track SLA compliance toward 95%+.', { slaCompliance: sla }));
      const d = parseDate(fields.scanDate);
      if (d && daysBetween(now, d) > 90) f.push(finding('Medium', 'Scan results are stale', `Scan is ${daysBetween(now, d)} days old.`, ['CSF:PR.PS'], 'Require monthly scanning evidence.', {}));
      return f;
    },
  },
  irplan: {
    label: 'Incident Response Plan', issuer: 'Vendor security program',
    fields: ['detection', 'containment', 'eradication', 'recovery', 'notificationTimeline', 'lastTested', 'testingCadence'],
    validate: ({ fields, now }) => {
      const f = [];
      const elements = [['detection', 'detection'], ['containment', 'containment'], ['eradication', 'eradication'], ['recovery', 'recovery'], ['notificationTimeline', 'notification timelines']];
      const missing = elements.filter(([k]) => !fields[k] || norm(fields[k]) === 'no');
      if (missing.length) f.push(finding(missing.length >= 3 ? 'High' : 'Medium', `IR plan missing ${missing.length} required element(s)`, `Absent: ${missing.map((m) => m[1]).join('; ')}.`, ['CSF:RS.MA', 'SOC2:CC7.4', 'HIPAA:§164.308(a)(6)'], 'Require a complete IR plan covering all lifecycle phases.', { missing: missing.map((m) => m[0]) }));
      const tested = parseDate(fields.lastTested);
      if (!tested || norm(fields.lastTested) === 'never') f.push(finding('High', 'IR plan never tested', 'No record of a tabletop or live exercise.', ['CSF:RS.MA', 'SOC2:CC7.4'], 'Require at least annual IR testing.', { lastTested: fields.lastTested || 'never' }));
      else if (daysBetween(now, tested) > 365) f.push(finding('Medium', 'IR plan testing overdue', `Last tested ${daysBetween(now, tested)} days ago (over 12 months).`, ['CSF:RS.MA'], 'Require annual IR testing.', { ageDays: daysBetween(now, tested) }));
      return f;
    },
  },
  bcdr: {
    label: 'Business Continuity / DR Plan', issuer: 'Vendor resilience program',
    fields: ['rto', 'rpo', 'lastTestDate', 'testResult', 'coversOurSystems'],
    validate: ({ fields, now }) => {
      const f = [];
      if (fields.rto == null || fields.rto === '') f.push(finding('Medium', 'RTO target not specified', 'No Recovery Time Objective stated.', ['CSF:RC.RP', 'SOC2:A1.2'], 'Obtain RTO targets for systems that touch our data.', {}));
      if (fields.rpo == null || fields.rpo === '') f.push(finding('Medium', 'RPO target not specified', 'No Recovery Point Objective stated.', ['CSF:RC.RP', 'SOC2:A1.2'], 'Obtain RPO targets.', {}));
      const t = parseDate(fields.lastTestDate);
      if (!t || norm(fields.lastTestDate) === 'never') f.push(finding('High', 'DR plan never tested', 'No evidence of a DR test.', ['CSF:RC.RP'], 'Require annual DR testing with results.', {}));
      else if (daysBetween(now, t) > 365) f.push(finding('Medium', 'DR test overdue', `Last DR test ${daysBetween(now, t)} days ago.`, ['CSF:RC.RP'], 'Require annual DR testing.', {}));
      if (norm(fields.coversOurSystems) === 'no') f.push(finding('High', 'DR scope excludes our systems', 'The continuity plan does not cover systems that process our data/processes.', ['CSF:RC.RP'], 'Require DR coverage for in-scope systems.', {}));
      return f;
    },
  },
  subprocessors: {
    label: 'Subprocessor List', issuer: 'Vendor disclosure',
    fields: ['subprocessors'], // [{name, service, location}]
    validate: ({ fields }) => {
      const list = asArray(fields.subprocessors);
      if (!list.length) return [finding('Low', 'No subprocessors disclosed', 'No subprocessor list was provided; fourth-party risk cannot be assessed.', ['CSF:GV.SC'], 'Obtain a current subprocessor list.', {})];
      return [finding('Informational', `${list.length} subprocessor(s) disclosed`, `Disclosed: ${list.map((s) => (typeof s === 'string' ? s : s.name)).slice(0, 8).join(', ')}.`, ['CSF:GV.SC'], 'Each subprocessor handling our data should itself be documented (see cross-checks).', { count: list.length })];
    },
  },
  cyberinsurance: {
    label: 'Cyber Insurance Certificate', issuer: 'Insurance carrier',
    fields: ['namedInsured', 'coverageAmount', 'policyType', 'expiryDate'],
    validate: ({ fields, now }) => {
      const f = [];
      const exp = parseDate(fields.expiryDate);
      if (exp) { const days = daysBetween(exp, now); if (days < 0) f.push(finding('High', 'Cyber insurance policy expired', `Policy expired ${Math.abs(days)} days ago.`, ['CSF:GV.SC'], 'Obtain proof of current cyber coverage.', { expiryDate: fields.expiryDate })); else if (days < 45) f.push(finding('Medium', 'Cyber insurance expiring soon', `Policy expires in ${days} days.`, ['CSF:GV.SC'], 'Request renewal evidence.', {})); }
      else f.push(finding('Medium', 'Policy expiry not found', 'Could not confirm the policy is in force.', ['CSF:GV.SC'], 'Confirm current effective dates.', {}));
      const pt = norm(fields.policyType);
      if (pt && !pt.includes('cyber')) f.push(finding('High', 'Not a cyber liability policy', `Policy type appears to be "${fields.policyType}", not dedicated cyber liability.`, ['CSF:GV.SC'], 'General liability does not cover cyber events — require a cyber liability policy.', { policyType: fields.policyType }));
      const amt = Number(String(fields.coverageAmount).replace(/[^0-9.]/g, '')) || 0;
      if (amt > 0 && amt < 1e6) f.push(finding('Medium', 'Low cyber coverage limit', `Coverage of ~$${amt.toLocaleString()} may be inadequate for the data exposure.`, ['CSF:GV.SC'], 'Assess coverage adequacy against potential breach cost.', { coverageAmount: amt }));
      // named-insured vs vendor legal entity handled in cross-validation
      return f;
    },
  },
  netdiagram: {
    label: 'Network Architecture Diagram', issuer: 'Vendor architecture',
    fields: ['tenancy', 'ourDataIsolated', 'thirdPartyConnections', 'inScopeRanges'],
    validate: ({ fields }) => {
      const f = [];
      if (norm(fields.ourDataIsolated) === 'no') f.push(finding('High', 'Our data not logically isolated', 'The diagram indicates our data environment is not logically isolated.', ['CSF:PR.IR', 'SOC2:CC6.1', 'HIPAA:§164.312(a)(1)'], 'Require logical isolation (separate tenant/VPC/keyspace) for our data.', {}));
      if (norm(fields.tenancy) === 'shared' && norm(fields.ourDataIsolated) !== 'yes') f.push(finding('Medium', 'Shared-tenant architecture', 'A shared-tenant design without confirmed isolation raises co-tenant risk.', ['CSF:PR.IR', 'SOC2:CC6.1'], 'Confirm tenant isolation controls.', { tenancy: fields.tenancy }));
      const conns = asArray(fields.thirdPartyConnections);
      if (conns.length) f.push(finding('Low', `${conns.length} third-party connection(s) in architecture`, `Connections to: ${conns.map((c) => (typeof c === 'string' ? c : c.name)).slice(0, 8).join(', ')}.`, ['CSF:GV.SC'], 'Confirm each external connection is documented and authorized (see cross-checks).', { connections: conns }));
      return f;
    },
  },
};

const DOC_TYPE_IDS = Object.keys(DOC_TYPES);

// ---------------------------------------------------------------------------
// AI extraction: parse raw document text into the structured fields a type
// expects. Falls back to the provided structured fields when no key.
// ---------------------------------------------------------------------------
async function extractFields(docType, payload) {
  const def = DOC_TYPES[docType];
  const provided = payload.fields && typeof payload.fields === 'object' ? payload.fields : {};
  const text = payload.text || payload.content;
  const client = getClient();
  if (!client || !text || Object.keys(provided).length) {
    return { fields: provided, source: Object.keys(provided).length ? 'structured' : 'empty' };
  }
  try {
    const schema = { type: 'object', additionalProperties: true, properties: {} };
    def.fields.forEach((k) => { schema.properties[k] = {}; });
    const resp = await client.messages.create({
      model: MODEL, max_tokens: 1500, thinking: { type: 'adaptive' },
      system: `You are Saraqael, a vendor-assurance analyst. Extract ONLY the following fields from this ${def.label} as JSON: ${def.fields.join(', ')}. Use null when a field is not present. Dates as ISO. Counts as numbers. Lists as arrays. Never invent values.`,
      messages: [{ role: 'user', content: String(text).slice(0, 20000) }],
      output_config: { format: { type: 'json_schema', schema } },
    });
    const tb = (resp.content || []).find((b) => b.type === 'text');
    return { fields: tb ? JSON.parse(tb.text) : provided, source: 'ai' };
  } catch (err) {
    logger.warn('Saraqael extraction failed, using provided fields', { docType, error: err.message });
    return { fields: provided, source: 'structured' };
  }
}

// ---------------------------------------------------------------------------
// Assess a single document.
// ---------------------------------------------------------------------------
async function assessDocument(orgId, { vendorId, vendorName, docType, fileName, fields, text, content }) {
  if (!DOC_TYPES[docType]) throw new Error(`Unknown document type: ${docType}`);
  const now = new Date();
  const ext = await extractFields(docType, { fields, text, content });
  let findings = [];
  try { findings = DOC_TYPES[docType].validate({ fields: ext.fields || {}, now }) || []; }
  catch (err) { logger.warn('Saraqael validator error', { docType, error: err.message }); }
  const rating = worstRating(findings);
  const id = uid('vdoc');
  const excerpt = (text || content) ? String(text || content).slice(0, 600) : null;

  await db.query(
    `INSERT INTO vendor_documents (id, organization_id, vendor_id, vendor_name, doc_type, file_name, status, risk_rating, extracted, findings, content_excerpt, assessed_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,'assessed',$7,$8,$9,$10,NOW(),NOW())`,
    [id, orgId, vendorId, vendorName, docType, fileName || null, rating, JSON.stringify(ext.fields || {}), JSON.stringify(findings), excerpt]
  );

  await feedSignals(orgId, vendorId, vendorName, DOC_TYPES[docType].label, findings);

  return { id, vendorId, vendorName, docType, docLabel: DOC_TYPES[docType].label, fileName: fileName || null, riskRating: rating, extracted: ext.fields || {}, extractionSource: ext.source, findings, assessedAt: now.toISOString(), aiEnabled: aiEnabled() };
}

// ---------------------------------------------------------------------------
// Cross-validation across a vendor's documents — documents are never reviewed
// in isolation.
// ---------------------------------------------------------------------------
async function crossValidate(orgId, vendorId, vendorName) {
  const rows = await db.query(
    `SELECT doc_type, extracted FROM vendor_documents WHERE organization_id=$1 AND vendor_id=$2`, [orgId, vendorId]);
  const byType = {};
  rows.forEach((r) => { byType[r.doc_type] = byType[r.doc_type] || []; byType[r.doc_type].push(typeof r.extracted === 'string' ? JSON.parse(r.extracted) : (r.extracted || {})); });
  const first = (t) => (byType[t] && byType[t][0]) || null;
  const findings = [];

  const subList = (first('subprocessors') || {}).subprocessors;
  const subNames = asArray(subList).map((s) => norm(typeof s === 'string' ? s : s.name)).filter(Boolean);
  const diagram = first('netdiagram') || {};
  const diagramConns = asArray(diagram.thirdPartyConnections).map((c) => norm(typeof c === 'string' ? c : c.name)).filter(Boolean);

  // 1. Subprocessor on the network diagram but absent from the subprocessor list.
  if (subList != null || diagramConns.length) {
    diagramConns.forEach((c) => {
      if (c && !subNames.some((s) => s.includes(c) || c.includes(s))) {
        findings.push(finding('High', 'Undisclosed third party in network architecture', `The network diagram shows a connection to "${c}" that does not appear on the subprocessor list — chain-of-custody gap.`, ['CSF:GV.SC'], 'Reconcile the diagram and subprocessor list; document or remove the undisclosed connection.', { connection: c }));
      }
    });
  }

  // 2. Subprocessor handling our data that itself lacks documentation in our system.
  if (subNames.length) {
    const documentedVendors = (await db.query(
      `SELECT DISTINCT lower(vendor_name) vn FROM vendor_documents WHERE organization_id=$1`, [orgId])).map((r) => r.vn);
    subNames.forEach((s, i) => {
      const known = documentedVendors.some((v) => v && (v.includes(s) || s.includes(v)));
      if (!known) {
        const raw = asArray(subList)[i];
        findings.push(finding('Medium', 'Subprocessor lacks documentation in our system', `Subprocessor "${typeof raw === 'string' ? raw : raw.name}" has no assurance documents on file — fourth-party chain-of-custody gap.`, ['CSF:GV.SC'], 'Obtain assurance documentation for this subprocessor or confirm it does not touch our data.', { subprocessor: typeof raw === 'string' ? raw : raw.name }));
      }
    });
  }

  // 3. Pentest scope vs network-diagram in-scope ranges.
  const pent = first('pentest') || {};
  const pentRanges = asArray(pent.scopeIpRanges).map(norm).filter(Boolean);
  const diagRanges = asArray(diagram.inScopeRanges).map(norm).filter(Boolean);
  if (pentRanges.length && diagRanges.length) {
    const overlap = pentRanges.some((p) => diagRanges.some((d) => d.includes(p) || p.includes(d)));
    if (!overlap) findings.push(finding('High', 'Pentest scope does not match architecture', `The penetration test covered ${pent.scopeIpRanges} but the network diagram lists in-scope ranges ${diagram.inScopeRanges} — the systems holding our data may not have been tested.`, ['CSF:ID.RA', 'CSF:PR.PS'], 'Require a penetration test scoped to the systems that process our data.', { pentestRanges: pent.scopeIpRanges, diagramRanges: diagram.inScopeRanges }));
  }

  // 4. Cyber-insurance named insured vs vendor legal entity.
  const ins = first('cyberinsurance') || {};
  if (ins.namedInsured && vendorName) {
    const a = norm(ins.namedInsured), b = norm(vendorName);
    if (a && b && !(a.includes(b) || b.includes(a))) findings.push(finding('Medium', 'Insurance named insured mismatch', `The cyber policy names "${ins.namedInsured}", which does not match the vendor entity "${vendorName}" — coverage may not extend to this entity.`, ['CSF:GV.SC'], 'Confirm the policy names the contracting legal entity (or an affiliate that covers it).', { namedInsured: ins.namedInsured, vendor: vendorName }));
  }

  // 5. Missing required documents (vendor handling PHI without a BAA, etc.).
  if (!byType.baa) findings.push(finding('High', 'No BAA on file', 'No Business Associate Agreement has been assessed for this vendor; required before exchanging PHI.', ['HIPAA:§164.314', 'CSF:GV.SC'], 'Obtain and execute a compliant BAA.', {}));
  if (!byType.soc2 && !byType.iso27001) findings.push(finding('Medium', 'No independent assurance report', 'Neither a SOC 2 nor an ISO 27001 certificate is on file.', ['CSF:GV.SC', 'SOC2:CC'], 'Obtain a SOC 2 Type II or ISO 27001 certificate.', {}));

  await feedSignals(orgId, vendorId, vendorName, 'Saraqael cross-validation', findings, 'Fourth-Party Risk');
  return findings;
}

// ---------------------------------------------------------------------------
// Feed findings into vendor_risk_signals (→ CISO/CRO dashboards & vendor score).
// ---------------------------------------------------------------------------
async function feedSignals(orgId, vendorId, vendorName, sourceName, findings, category) {
  for (const f of findings) {
    if (f.severity === 'Informational') continue;
    try {
      await db.query(
        `INSERT INTO vendor_risk_signals
           (id, organization_id, vendor_id, vendor_name, source_name, source_type, signal_category,
            signal_name, severity, confidence, observed_at, status, description, recommended_action,
            mapped_frameworks, raw_data, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'file_upload',$6,$7,$8,$9,NOW(),'active',$10,$11,$12,$13,NOW(),NOW())`,
        [uid('vrs'), orgId, vendorId, vendorName, sourceName, category || 'Compliance Evidence',
         f.title, SIGNAL_SEVERITY[f.severity] || 'Info', aiEnabled() ? 90 : 80,
         f.detail, f.recommendation, JSON.stringify(f.frameworks), JSON.stringify(f.dataPoints || {})]
      );
    } catch (err) { logger.warn('Saraqael signal write failed', { error: err.message }); }
  }
}

// ---------------------------------------------------------------------------
// Vendor summary: documents, findings, cross-checks, and a document-risk score.
// ---------------------------------------------------------------------------
async function getVendorSummary(orgId, vendorId) {
  const docs = await db.query(
    `SELECT * FROM vendor_documents WHERE organization_id=$1 AND vendor_id=$2 ORDER BY assessed_at DESC`, [orgId, vendorId]);
  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
  const documents = docs.map((d) => ({
    id: d.id, docType: d.doc_type, docLabel: (DOC_TYPES[d.doc_type] || {}).label || d.doc_type,
    fileName: d.file_name, riskRating: d.risk_rating, extracted: parse(d.extracted || '{}'),
    findings: parse(d.findings || '[]'), assessedAt: d.assessed_at,
  }));
  const allFindings = documents.flatMap((d) => d.findings.map((f) => ({ ...f, docType: d.docType })));
  const counts = RATINGS.reduce((m, r) => { m[r] = allFindings.filter((f) => f.severity === r).length; return m; }, {});
  // Document-risk score: 100 minus weighted findings, floored at 0.
  const penalty = allFindings.reduce((s, f) => s + (RATING_SCORE[f.severity] || 0), 0);
  const score = Math.max(0, 100 - penalty);
  const present = documents.map((d) => d.docType);
  const missing = DOC_TYPE_IDS.filter((t) => !present.includes(t));
  return {
    vendorId, documentRiskScore: score,
    overallRating: counts.Critical ? 'Critical' : counts.High ? 'High' : counts.Medium ? 'Medium' : documents.length ? 'Low' : 'Not assessed',
    documentCount: documents.length, findingCounts: counts,
    documentsOnFile: present, documentsMissing: missing,
    documents, aiEnabled: aiEnabled(),
  };
}

function listDocTypes() {
  return DOC_TYPE_IDS.map((id) => ({ id, label: DOC_TYPES[id].label, issuer: DOC_TYPES[id].issuer, fields: DOC_TYPES[id].fields }));
}

module.exports = { assessDocument, crossValidate, getVendorSummary, listDocTypes, aiEnabled, DOC_TYPES, DOC_TYPE_IDS };
