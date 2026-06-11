'use strict';

/**
 * FrameworkScoreService
 * ---------------------
 * Live compliance scorecards for the non-CSF frameworks (HIPAA, NIST 800-53,
 * CIS v8, NAIC, ISO 27001, SOC 2, CMS 42 CFR, PCI DSS, GDPR).
 *
 * Every framework ultimately asks about the same underlying facts — identity,
 * training, data protection, logging, response, recovery, vendors, governance.
 * This service computes those facts ONCE as a shared signal registry (from the
 * same live context the NIST CSF engine reads: synced tool metrics, the
 * assets/risks/tasks tables, and the intake evidence answers) and maps each
 * framework's sections and controls onto them.
 *
 * Scores are 0–100 compliance per control; a control with no available signal
 * is "Not assessed" — nothing is invented. Sourcing per control is derived:
 * auto (all live signals), manual (all intake evidence), hybrid (mixed).
 */

const NistCsf = require('./NistCsfService');
const logger = require('../utils/logger');

function n(v) { const x = Number(v); return Number.isFinite(x) ? x : null; }
function clamp(v) { return Math.max(0, Math.min(100, v)); }
function avg(vals) {
  const xs = vals.filter((v) => v != null && Number.isFinite(v));
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
}

// Evidence answer → 0–100 via the CSF interview's option weights.
function ans(ctx, key) {
  const q = NistCsf.EVIDENCE_QUESTIONS.find((x) => x.key === key);
  const ev = ctx.evidence[key];
  if (!q || !ev || ev.answer == null || !(ev.answer in q.options)) return null;
  return q.options[ev.answer];
}

// ---------------------------------------------------------------------------
// Shared signal registry. kind: 'live' (connected systems / platform tables)
// or 'evidence' (intake interview). Each fn(ctx) -> 0–100 | null.
// ---------------------------------------------------------------------------
const SIGNALS = {
  mfa:        { kind: 'live', label: 'Okta — MFA enrollment', fn: (c) => n(c.I.mfa_pct) },
  pam:        { kind: 'live', label: 'CyberArk — PAM coverage', fn: (c) => n(c.I.pam_pct) },
  training:   { kind: 'live', label: 'LMS — training completion', fn: (c) => n(c.I.training_pct) },
  phishing:   { kind: 'live', label: 'KnowBe4 — phishing resistance', fn: (c) => (n(c.I.phishing_pct) == null ? null : clamp(100 - c.I.phishing_pct * 8)) },
  patch:      { kind: 'live', label: 'Tenable — patch compliance', fn: (c) => n(c.I.patch_pct) },
  vulnSla:    { kind: 'live', label: 'Tenable — vuln remediation SLA', fn: (c) => n(c.I.vuln_sla_pct) },
  edr:        { kind: 'live', label: 'CrowdStrike — EDR coverage', fn: (c) => n(c.I.edr_pct) },
  siem:       { kind: 'live', label: 'Splunk — log retention', fn: (c) => (n(c.I.siem_days) == null ? null : clamp(c.I.siem_days / 90 * 100)) },
  mttd:       { kind: 'live', label: 'Splunk — mean time to detect', fn: (c) => (n(c.I.mttd_hrs) == null ? null : clamp(100 - Math.max(0, c.I.mttd_hrs - 24) * 2)) },
  mttr:       { kind: 'live', label: 'ServiceNow — mean time to respond', fn: (c) => (n(c.I.mttr_hrs) == null ? null : clamp(100 - Math.max(0, c.I.mttr_hrs - 4) * 10)) },
  inventory:  { kind: 'live', label: 'Asset inventory / CMDB', fn: (c) => {
    const t = Number(c.assets.total) || 0;
    if (!t) return ans(c, 'id_am_inventory');
    const supported = (t - (Number(c.assets.eol) || 0)) / t;
    const clean = (Number(c.assets.clean) || 0) / t;
    return clamp(supported * 50 + clean * 25 + (Number(c.assets.avg_patch) || 0) * 0.25);
  } },
  riskAssess: { kind: 'live', label: 'Risk register', fn: (c) => {
    const t = Number(c.risks.total) || 0;
    if (!t) return ans(c, 'id_ra_assessment');
    return clamp(35 + ((Number(c.risks.quantified) || 0) / t) * 35 + ((Number(c.risks.owned) || 0) / t) * 30);
  } },
  remediation: { kind: 'live', label: 'Remediation tasks', fn: (c) => {
    const open = Number(c.tasks.open) || 0;
    if (!open && !(Number(c.tasks.overdue) || 0)) return ans(c, 'rs_mi_process');
    return clamp(100 - (open ? ((Number(c.tasks.overdue) || 0) / open) * 80 : 0));
  } },
  vendor:     { kind: 'live', label: 'Vendor risk signals + assessments', fn: (c) => avg([
    (Number(c.vendors.active) || 0) > 0 || (Number(c.vendors.severe) || 0) > 0
      ? clamp(70 - (Number(c.vendors.severe) || 0) * 12) : null,
    ans(c, 'gv_sc_vendors'),
  ]) },
  notify:     { kind: 'live', label: 'Legal obligations + procedures', fn: (c) => avg([
    (Number(c.legal.total) || 0) > 0 ? clamp(40 + ((Number(c.legal.timed) || 0) / (Number(c.legal.total) || 1)) * 50) : null,
    ans(c, 'rs_co_notify'),
  ]) },
  policy:        { kind: 'evidence', label: 'Intake — security policy', fn: (c) => ans(c, 'gv_po_policy') },
  roles:         { kind: 'evidence', label: 'Intake — security leadership/roles', fn: (c) => ans(c, 'gv_rr_roles') },
  oversight:     { kind: 'evidence', label: 'Intake — board oversight', fn: (c) => ans(c, 'gv_ov_board') },
  appetite:      { kind: 'evidence', label: 'Intake — risk appetite', fn: (c) => ans(c, 'gv_rm_appetite') },
  context:       { kind: 'evidence', label: 'Intake — organizational context', fn: (c) => ans(c, 'gv_oc_context') },
  encryption:    { kind: 'evidence', label: 'Intake — PHI encryption', fn: (c) => ans(c, 'pr_ds_encryption') },
  dlp:           { kind: 'evidence', label: 'Intake — DLP deployment', fn: (c) => ans(c, 'pr_ds_dlp') },
  resilience:    { kind: 'evidence', label: 'Intake — backups & redundancy', fn: (c) => ans(c, 'pr_ir_resilience') },
  soc:           { kind: 'evidence', label: 'Intake — SOC coverage', fn: (c) => ans(c, 'de_ae_soc') },
  irplan:        { kind: 'evidence', label: 'Intake — IR plan & tabletop', fn: (c) => ans(c, 'rs_ma_irplan') },
  forensics:     { kind: 'evidence', label: 'Intake — forensics capability', fn: (c) => ans(c, 'rs_an_forensics') },
  drTest:        { kind: 'evidence', label: 'Intake — DR test recency', fn: (c) => ans(c, 'rc_rp_drtest') },
  recoveryComms: { kind: 'evidence', label: 'Intake — recovery communications', fn: (c) => ans(c, 'rc_co_comms') },
  lessons:       { kind: 'evidence', label: 'Intake — lessons learned', fn: (c) => ans(c, 'id_im_pir') },
};

// Shorthand to keep the framework maps readable.
const ctl = (ref, name, signals) => ({ ref, name, signals });

// ---------------------------------------------------------------------------
// The nine framework maps.
// ---------------------------------------------------------------------------
const FRAMEWORKS = {
  hipaa: {
    label: 'HIPAA Security Rule', standard: '45 CFR §§164.302–318',
    sections: [
      { id: 'admin', name: 'Administrative Safeguards §164.308', controls: [
        ctl('§164.308(a)(1)', 'Security Management & Risk Analysis', ['riskAssess', 'policy']),
        ctl('§164.308(a)(2)', 'Assigned Security Responsibility', ['roles']),
        ctl('§164.308(a)(3)', 'Workforce Security', ['pam', 'training']),
        ctl('§164.308(a)(5)', 'Security Awareness & Training', ['training', 'phishing']),
        ctl('§164.308(a)(6)', 'Security Incident Procedures', ['irplan', 'mttr']),
        ctl('§164.308(a)(7)', 'Contingency Plan', ['drTest', 'resilience']),
        ctl('§164.308(b)(1)', 'Business Associate Agreements', ['vendor']),
      ] },
      { id: 'physical', name: 'Physical Safeguards §164.310', controls: [
        ctl('§164.310(a)(1)', 'Facility Access Controls', ['inventory']),
        ctl('§164.310(d)(1)', 'Device & Media Controls', ['inventory', 'encryption']),
      ] },
      { id: 'technical', name: 'Technical Safeguards §164.312', controls: [
        ctl('§164.312(a)(1)', 'Access Control', ['mfa', 'pam']),
        ctl('§164.312(b)', 'Audit Controls', ['siem']),
        ctl('§164.312(c)(1)', 'Integrity', ['encryption', 'edr']),
        ctl('§164.312(e)(1)', 'Transmission Security', ['encryption']),
      ] },
      { id: 'breach', name: 'Breach Notification §164.400–414', controls: [
        ctl('§164.404', '60-Day Individual Notification', ['notify']),
        ctl('§164.408', 'HHS/OCR Notification', ['notify', 'irplan']),
      ] },
    ],
  },
  nist_800_53: {
    label: 'NIST SP 800-53 Rev 5', standard: 'Security & Privacy Controls (moderate baseline)',
    sections: [
      { id: 'ac', name: 'Access Control & Identification (AC, IA)', controls: [
        ctl('AC-2', 'Account Management', ['pam']),
        ctl('AC-3', 'Access Enforcement', ['mfa', 'pam']),
        ctl('IA-2', 'Multi-Factor Authentication', ['mfa']),
      ] },
      { id: 'at_au', name: 'Awareness & Audit (AT, AU)', controls: [
        ctl('AT-2', 'Literacy Training & Awareness', ['training', 'phishing']),
        ctl('AU-6', 'Audit Record Review & Analysis', ['siem', 'soc']),
        ctl('AU-11', 'Audit Record Retention', ['siem']),
      ] },
      { id: 'cm_si', name: 'Configuration & System Integrity (CM, SI)', controls: [
        ctl('CM-8', 'System Component Inventory', ['inventory']),
        ctl('SI-2', 'Flaw Remediation', ['patch', 'vulnSla']),
        ctl('SI-3', 'Malicious Code Protection', ['edr']),
        ctl('SI-4', 'System Monitoring', ['mttd', 'soc']),
      ] },
      { id: 'cp_ir', name: 'Contingency & Incident Response (CP, IR)', controls: [
        ctl('CP-4', 'Contingency Plan Testing', ['drTest']),
        ctl('CP-9', 'System Backup', ['resilience']),
        ctl('IR-4', 'Incident Handling', ['irplan', 'mttr', 'forensics']),
        ctl('IR-8', 'Incident Response Plan', ['irplan']),
      ] },
      { id: 'ra_sr', name: 'Risk Assessment & Supply Chain (RA, SR)', controls: [
        ctl('RA-3', 'Risk Assessment', ['riskAssess']),
        ctl('RA-5', 'Vulnerability Monitoring & Scanning', ['vulnSla']),
        ctl('SR-6', 'Supplier Assessments & Reviews', ['vendor']),
      ] },
      { id: 'sc', name: 'System & Communications Protection (SC)', controls: [
        ctl('SC-8', 'Transmission Confidentiality', ['encryption']),
        ctl('SC-28', 'Protection of Information at Rest', ['encryption', 'dlp']),
      ] },
    ],
  },
  cis: {
    label: 'CIS Controls v8', standard: 'Implementation Group 2',
    sections: [
      { id: 'basic', name: 'Basic Cyber Hygiene (1–7)', controls: [
        ctl('CIS-1', 'Inventory of Enterprise Assets', ['inventory']),
        ctl('CIS-3', 'Data Protection', ['encryption', 'dlp']),
        ctl('CIS-4', 'Secure Configuration', ['patch']),
        ctl('CIS-5', 'Account Management', ['pam']),
        ctl('CIS-6', 'Access Control Management', ['mfa']),
        ctl('CIS-7', 'Continuous Vulnerability Management', ['vulnSla', 'patch']),
      ] },
      { id: 'foundational', name: 'Foundational (8–13)', controls: [
        ctl('CIS-8', 'Audit Log Management', ['siem']),
        ctl('CIS-9', 'Email & Browser Protections', ['phishing']),
        ctl('CIS-10', 'Malware Defenses', ['edr']),
        ctl('CIS-11', 'Data Recovery', ['drTest', 'resilience']),
        ctl('CIS-13', 'Network Monitoring & Defense', ['mttd', 'soc']),
      ] },
      { id: 'organizational', name: 'Organizational (14–18)', controls: [
        ctl('CIS-14', 'Security Awareness & Skills Training', ['training', 'phishing']),
        ctl('CIS-15', 'Service Provider Management', ['vendor']),
        ctl('CIS-17', 'Incident Response Management', ['irplan', 'mttr', 'forensics']),
      ] },
    ],
  },
  naic: {
    label: 'NAIC Insurance Data Security Model Law', standard: 'Model Law 668',
    sections: [
      { id: 's4', name: 'Section 4 — Information Security Program', controls: [
        ctl('§4.A', 'Written Information Security Program', ['policy']),
        ctl('§4.C', 'Risk Assessment', ['riskAssess', 'appetite']),
        ctl('§4.D(2)', 'Access Controls & MFA', ['mfa', 'pam']),
        ctl('§4.D(4)', 'Encryption of Nonpublic Information', ['encryption']),
        ctl('§4.D(9)', 'Audit Trails', ['siem']),
        ctl('§4.E', 'Board Oversight', ['oversight', 'roles']),
        ctl('§4.F', 'Third-Party Service Provider Oversight', ['vendor']),
      ] },
      { id: 's5', name: 'Sections 5–6 — Event Investigation & Notification', controls: [
        ctl('§5', 'Investigation of Cybersecurity Events', ['forensics', 'irplan']),
        ctl('§6', '72-Hour Commissioner Notification', ['notify']),
      ] },
    ],
  },
  iso27001: {
    label: 'ISO/IEC 27001:2022', standard: 'Annex A control themes',
    sections: [
      { id: 'a5', name: 'A.5 Organizational Controls', controls: [
        ctl('A.5.1', 'Policies for Information Security', ['policy']),
        ctl('A.5.2', 'Roles & Responsibilities', ['roles', 'oversight']),
        ctl('A.5.19', 'Supplier Relationships', ['vendor']),
        ctl('A.5.24', 'Incident Management Planning', ['irplan']),
        ctl('A.5.29', 'ICT Continuity', ['drTest', 'resilience']),
      ] },
      { id: 'a6', name: 'A.6 People Controls', controls: [
        ctl('A.6.3', 'Awareness, Education & Training', ['training', 'phishing']),
        ctl('A.6.8', 'Event Reporting', ['lessons', 'soc']),
      ] },
      { id: 'a8', name: 'A.8 Technological Controls', controls: [
        ctl('A.8.2', 'Privileged Access Rights', ['pam']),
        ctl('A.8.5', 'Secure Authentication', ['mfa']),
        ctl('A.8.7', 'Protection Against Malware', ['edr']),
        ctl('A.8.8', 'Technical Vulnerability Management', ['vulnSla', 'patch']),
        ctl('A.8.12', 'Data Leakage Prevention', ['dlp']),
        ctl('A.8.15', 'Logging & Monitoring', ['siem', 'mttd']),
        ctl('A.8.24', 'Use of Cryptography', ['encryption']),
      ] },
    ],
  },
  soc2: {
    label: 'SOC 2 Type II', standard: 'AICPA Trust Services Criteria',
    sections: [
      { id: 'cc1_3', name: 'Control Environment & Risk (CC1–CC3)', controls: [
        ctl('CC1.2', 'Board Oversight', ['oversight']),
        ctl('CC1.3', 'Structures & Reporting Lines', ['roles']),
        ctl('CC3.2', 'Risk Identification & Analysis', ['riskAssess']),
      ] },
      { id: 'cc6', name: 'Logical & Physical Access (CC6)', controls: [
        ctl('CC6.1', 'Access Security & Encryption', ['mfa', 'encryption']),
        ctl('CC6.2', 'User Provisioning & Privileged Access', ['pam']),
        ctl('CC6.8', 'Malware Prevention & Detection', ['edr']),
      ] },
      { id: 'cc7', name: 'System Operations (CC7)', controls: [
        ctl('CC7.1', 'Vulnerability Detection & Monitoring', ['vulnSla', 'siem']),
        ctl('CC7.3', 'Security Event Evaluation', ['mttd', 'soc']),
        ctl('CC7.4', 'Incident Response Program', ['irplan', 'mttr']),
      ] },
      { id: 'a_c', name: 'Availability & Confidentiality (A1, C1)', controls: [
        ctl('A1.2', 'Recovery Infrastructure & Backups', ['resilience', 'drTest']),
        ctl('C1.1', 'Confidential Information Protection', ['encryption', 'dlp']),
      ] },
    ],
  },
  cms: {
    label: 'CMS Medicare Advantage Security', standard: '42 CFR §422 / Part D',
    sections: [
      { id: 'safeguards', name: 'Data Safeguards & Access', controls: [
        ctl('§422.118', 'Beneficiary Data Safeguards', ['encryption', 'dlp']),
        ctl('§422.504(b)', 'Access Controls for CMS Data', ['mfa', 'pam']),
        ctl('§422.504(d)', 'Records Retention & Audit', ['siem']),
      ] },
      { id: 'program', name: 'Program Integrity & Oversight', controls: [
        ctl('§422.503(b)', 'Compliance Program', ['policy', 'roles', 'training']),
        ctl('§422.504(i)', 'First Tier/Downstream Entity (FDR) Oversight', ['vendor']),
        ctl('§422.516', 'Risk Program & Reporting', ['riskAssess', 'oversight']),
      ] },
      { id: 'incident', name: 'Incident & Continuity', controls: [
        ctl('Part D §423.504', '1-Business-Day Incident Reporting', ['notify', 'irplan']),
        ctl('§422.504(o)', 'Business Continuity Plan', ['drTest', 'resilience']),
      ] },
    ],
  },
  pci: {
    label: 'PCI DSS v4.0', standard: 'Payment Card Industry Data Security Standard',
    sections: [
      { id: 'protect', name: 'Protect Account Data (Req 3–4)', controls: [
        ctl('Req 3', 'Protect Stored Account Data', ['encryption', 'dlp']),
        ctl('Req 4', 'Strong Cryptography in Transmission', ['encryption']),
      ] },
      { id: 'vuln', name: 'Vulnerability Management (Req 5–6)', controls: [
        ctl('Req 5', 'Protect Against Malicious Software', ['edr']),
        ctl('Req 6', 'Secure Systems & Software', ['patch', 'vulnSla']),
      ] },
      { id: 'access', name: 'Access Control (Req 7–9)', controls: [
        ctl('Req 7', 'Restrict Access by Need-to-Know', ['pam']),
        ctl('Req 8', 'Identify Users & Authenticate (MFA)', ['mfa']),
        ctl('Req 9', 'Restrict Physical Access', ['inventory']),
      ] },
      { id: 'monitor', name: 'Monitor & Test (Req 10–11)', controls: [
        ctl('Req 10', 'Log & Monitor All Access', ['siem', 'mttd']),
        ctl('Req 11', 'Test Security Regularly', ['vulnSla', 'riskAssess']),
      ] },
      { id: 'policy', name: 'Security Policy (Req 12)', controls: [
        ctl('Req 12.1', 'Information Security Policy', ['policy']),
        ctl('Req 12.6', 'Security Awareness Education', ['training', 'phishing']),
        ctl('Req 12.8', 'Third-Party Service Providers', ['vendor']),
        ctl('Req 12.10', 'Incident Response Plan', ['irplan']),
      ] },
    ],
  },
  gdpr: {
    label: 'GDPR / Privacy', standard: 'EU 2016/679 (privacy-security articles)',
    sections: [
      { id: 'accountability', name: 'Accountability & Governance (Art 5, 24, 30)', controls: [
        ctl('Art 5(2)', 'Accountability Principle', ['policy', 'oversight']),
        ctl('Art 30', 'Records of Processing Activities', ['inventory']),
        ctl('Art 35', 'Data Protection Impact Assessments', ['riskAssess']),
      ] },
      { id: 'security', name: 'Security of Processing (Art 25, 32)', controls: [
        ctl('Art 25', 'Data Protection by Design', ['dlp', 'encryption']),
        ctl('Art 32(1)(a)', 'Encryption of Personal Data', ['encryption']),
        ctl('Art 32(1)(b)', 'Confidentiality & Access Control', ['mfa', 'pam']),
        ctl('Art 32(1)(c)', 'Restore Availability After Incident', ['resilience', 'drTest']),
      ] },
      { id: 'breach', name: 'Breach & Processors (Art 28, 33–34)', controls: [
        ctl('Art 28', 'Processor Obligations', ['vendor']),
        ctl('Art 33', '72-Hour Supervisory Notification', ['notify', 'irplan']),
        ctl('Art 34', 'Communication to Data Subjects', ['recoveryComms', 'notify']),
      ] },
      { id: 'people', name: 'People & Detection', controls: [
        ctl('Art 39', 'Staff Awareness (DPO Duties)', ['training', 'phishing']),
        ctl('Art 32(1)(d)', 'Testing & Evaluation', ['siem', 'mttd']),
      ] },
    ],
  },
};

const FRAMEWORK_IDS = Object.keys(FRAMEWORKS);
const statusOf = (s) => (s == null ? 'Not assessed' : s >= 75 ? 'Compliant' : s >= 50 ? 'Partial' : 'Gap');

async function getFrameworkAssessment(orgId, frameworkId) {
  const def = FRAMEWORKS[frameworkId];
  if (!def) throw new Error('Unknown framework');
  const ctx = await NistCsf.gatherContext(orgId);

  // Evaluate each signal once.
  const sigVals = {};
  Object.entries(SIGNALS).forEach(([k, s]) => {
    try { sigVals[k] = s.fn(ctx); } catch (_) { sigVals[k] = null; }
  });

  const sections = def.sections.map((sec) => {
    const controls = sec.controls.map((c) => {
      const vals = c.signals.map((k) => sigVals[k]);
      const score = avg(vals);
      const kinds = new Set(c.signals.map((k) => SIGNALS[k].kind));
      const mode = kinds.size > 1 ? 'partial' : (kinds.has('live') ? 'auto' : 'manual');
      return {
        ref: c.ref, name: c.name, mode,
        score: score == null ? null : Math.round(score),
        status: statusOf(score),
        sources: c.signals.map((k) => ({
          key: k, label: SIGNALS[k].label, kind: SIGNALS[k].kind,
          value: sigVals[k] == null ? null : Math.round(sigVals[k]),
        })),
      };
    });
    const score = avg(controls.map((c) => c.score));
    return {
      id: sec.id, name: sec.name,
      score: score == null ? null : Math.round(score),
      status: statusOf(score),
      controls,
      assessed: controls.filter((c) => c.score != null).length,
      total: controls.length,
    };
  });

  const allControls = sections.flatMap((s) => s.controls);
  const overall = avg(allControls.map((c) => c.score));
  return {
    framework: frameworkId,
    label: def.label,
    standard: def.standard,
    organizationId: orgId,
    generatedAt: new Date().toISOString(),
    lastToolSync: ctx.lastSync,
    overall: overall == null ? null : Math.round(overall),
    status: statusOf(overall),
    assessedControls: allControls.filter((c) => c.score != null).length,
    totalControls: allControls.length,
    autoCount: allControls.filter((c) => c.mode === 'auto').length,
    partialCount: allControls.filter((c) => c.mode === 'partial').length,
    manualCount: allControls.filter((c) => c.mode === 'manual').length,
    sections,
  };
}

function listFrameworks() {
  return FRAMEWORK_IDS.map((id) => ({
    id, label: FRAMEWORKS[id].label, standard: FRAMEWORKS[id].standard,
    sections: FRAMEWORKS[id].sections.length,
    controls: FRAMEWORKS[id].sections.reduce((s, x) => s + x.controls.length, 0),
  }));
}

module.exports = { getFrameworkAssessment, listFrameworks, FRAMEWORKS, FRAMEWORK_IDS };
