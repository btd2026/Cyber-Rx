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
    label: 'HIPAA Security Rule', standard: '45 CFR Part 160 & 164 (Security + Breach Notification)',
    sections: [
      { id: 'admin', name: 'Administrative Safeguards §164.308', controls: [
        ctl('§164.308(a)(1)', 'Security Management Process & Risk Analysis', ['riskAssess', 'policy']),
        ctl('§164.308(a)(2)', 'Assigned Security Responsibility', ['roles']),
        ctl('§164.308(a)(3)', 'Workforce Security', ['pam', 'roles']),
        ctl('§164.308(a)(4)', 'Information Access Management', ['pam', 'mfa']),
        ctl('§164.308(a)(5)', 'Security Awareness & Training', ['training', 'phishing']),
        ctl('§164.308(a)(6)', 'Security Incident Procedures', ['irplan', 'mttr']),
        ctl('§164.308(a)(7)', 'Contingency Plan', ['drTest', 'resilience']),
        ctl('§164.308(a)(8)', 'Evaluation', ['riskAssess', 'oversight']),
        ctl('§164.308(b)(1)', 'Business Associate Contracts', ['vendor']),
      ] },
      { id: 'physical', name: 'Physical Safeguards §164.310', controls: [
        ctl('§164.310(a)(1)', 'Facility Access Controls', ['inventory']),
        ctl('§164.310(b)', 'Workstation Use', ['policy']),
        ctl('§164.310(c)', 'Workstation Security', ['edr', 'inventory']),
        ctl('§164.310(d)(1)', 'Device & Media Controls', ['inventory', 'encryption']),
      ] },
      { id: 'technical', name: 'Technical Safeguards §164.312', controls: [
        ctl('§164.312(a)(1)', 'Access Control', ['mfa', 'pam']),
        ctl('§164.312(b)', 'Audit Controls', ['siem']),
        ctl('§164.312(c)(1)', 'Integrity', ['encryption', 'edr']),
        ctl('§164.312(d)', 'Person or Entity Authentication', ['mfa']),
        ctl('§164.312(e)(1)', 'Transmission Security', ['encryption']),
      ] },
      { id: 'org', name: 'Organizational & Policies §164.314 / §164.316', controls: [
        ctl('§164.314(a)', 'Business Associate Arrangements', ['vendor']),
        ctl('§164.316(a)', 'Policies & Procedures', ['policy']),
        ctl('§164.316(b)', 'Documentation & Retention', ['policy', 'siem']),
      ] },
      { id: 'breach', name: 'Breach Notification §164.400–414', controls: [
        ctl('§164.404', 'Individual Notification (60 days)', ['notify']),
        ctl('§164.406', 'Media Notification', ['notify', 'recoveryComms']),
        ctl('§164.408', 'HHS/OCR Notification', ['notify', 'irplan']),
        ctl('§164.410', 'Business Associate Notification', ['vendor', 'notify']),
      ] },
    ],
  },
  nist_800_53: {
    label: 'NIST SP 800-53 Rev 5', standard: 'Security & Privacy Controls — all 20 control families (moderate baseline)',
    sections: [
      { id: 'AC', name: 'AC — Access Control', controls: [
        ctl('AC-2', 'Account Management', ['pam']),
        ctl('AC-3', 'Access Enforcement', ['mfa', 'pam']),
        ctl('AC-6', 'Least Privilege', ['pam']),
        ctl('AC-17', 'Remote Access', ['mfa', 'encryption']),
      ] },
      { id: 'AT', name: 'AT — Awareness & Training', controls: [
        ctl('AT-2', 'Literacy Training & Awareness', ['training', 'phishing']),
        ctl('AT-3', 'Role-Based Training', ['training']),
      ] },
      { id: 'AU', name: 'AU — Audit & Accountability', controls: [
        ctl('AU-6', 'Audit Record Review & Analysis', ['siem', 'soc']),
        ctl('AU-11', 'Audit Record Retention', ['siem']),
        ctl('AU-12', 'Audit Record Generation', ['siem', 'edr']),
      ] },
      { id: 'CA', name: 'CA — Assessment, Authorization & Monitoring', controls: [
        ctl('CA-2', 'Control Assessments', ['riskAssess']),
        ctl('CA-7', 'Continuous Monitoring', ['mttd', 'soc']),
        ctl('CA-8', 'Penetration Testing', ['vulnSla', 'riskAssess']),
      ] },
      { id: 'CM', name: 'CM — Configuration Management', controls: [
        ctl('CM-2', 'Baseline Configuration', ['patch']),
        ctl('CM-6', 'Configuration Settings', ['patch']),
        ctl('CM-8', 'System Component Inventory', ['inventory']),
      ] },
      { id: 'CP', name: 'CP — Contingency Planning', controls: [
        ctl('CP-4', 'Contingency Plan Testing', ['drTest']),
        ctl('CP-9', 'System Backup', ['resilience']),
        ctl('CP-10', 'System Recovery & Reconstitution', ['drTest', 'resilience']),
      ] },
      { id: 'IA', name: 'IA — Identification & Authentication', controls: [
        ctl('IA-2', 'Identification & Authentication (Org Users)', ['mfa']),
        ctl('IA-5', 'Authenticator Management', ['mfa', 'pam']),
      ] },
      { id: 'IR', name: 'IR — Incident Response', controls: [
        ctl('IR-4', 'Incident Handling', ['irplan', 'mttr', 'forensics']),
        ctl('IR-6', 'Incident Reporting', ['notify']),
        ctl('IR-8', 'Incident Response Plan', ['irplan']),
      ] },
      { id: 'MA', name: 'MA — Maintenance', controls: [
        ctl('MA-2', 'Controlled Maintenance', ['patch']),
        ctl('MA-4', 'Nonlocal Maintenance', ['mfa', 'encryption']),
      ] },
      { id: 'MP', name: 'MP — Media Protection', controls: [
        ctl('MP-4', 'Media Storage', ['encryption']),
        ctl('MP-6', 'Media Sanitization', ['inventory', 'encryption']),
      ] },
      { id: 'PE', name: 'PE — Physical & Environmental Protection', controls: [
        ctl('PE-2', 'Physical Access Authorizations', ['inventory']),
        ctl('PE-3', 'Physical Access Control', ['inventory']),
      ] },
      { id: 'PL', name: 'PL — Planning', controls: [
        ctl('PL-2', 'System Security & Privacy Plans', ['policy']),
        ctl('PL-8', 'Security & Privacy Architectures', ['policy', 'context']),
      ] },
      { id: 'PM', name: 'PM — Program Management', controls: [
        ctl('PM-2', 'Information Security Program Leadership', ['roles']),
        ctl('PM-4', 'Plan of Action & Milestones Process', ['remediation']),
        ctl('PM-9', 'Risk Management Strategy', ['appetite', 'riskAssess']),
        ctl('PM-14', 'Testing, Training & Monitoring', ['training', 'soc']),
      ] },
      { id: 'PS', name: 'PS — Personnel Security', controls: [
        ctl('PS-3', 'Personnel Screening', ['roles']),
        ctl('PS-4', 'Personnel Termination', ['pam']),
      ] },
      { id: 'PT', name: 'PT — PII Processing & Transparency', controls: [
        ctl('PT-2', 'Authority to Process PII', ['policy', 'context']),
        ctl('PT-5', 'Privacy Notice', ['policy']),
      ] },
      { id: 'RA', name: 'RA — Risk Assessment', controls: [
        ctl('RA-3', 'Risk Assessment', ['riskAssess']),
        ctl('RA-5', 'Vulnerability Monitoring & Scanning', ['vulnSla', 'patch']),
        ctl('RA-7', 'Risk Response', ['remediation']),
      ] },
      { id: 'SA', name: 'SA — System & Services Acquisition', controls: [
        ctl('SA-4', 'Acquisition Process', ['vendor']),
        ctl('SA-9', 'External System Services', ['vendor']),
      ] },
      { id: 'SC', name: 'SC — System & Communications Protection', controls: [
        ctl('SC-7', 'Boundary Protection', ['edr', 'soc']),
        ctl('SC-8', 'Transmission Confidentiality & Integrity', ['encryption']),
        ctl('SC-28', 'Protection of Information at Rest', ['encryption', 'dlp']),
      ] },
      { id: 'SI', name: 'SI — System & Information Integrity', controls: [
        ctl('SI-2', 'Flaw Remediation', ['patch', 'vulnSla']),
        ctl('SI-3', 'Malicious Code Protection', ['edr']),
        ctl('SI-4', 'System Monitoring', ['mttd', 'soc']),
        ctl('SI-7', 'Software, Firmware & Information Integrity', ['edr', 'patch']),
      ] },
      { id: 'SR', name: 'SR — Supply Chain Risk Management', controls: [
        ctl('SR-3', 'Supply Chain Controls & Processes', ['vendor']),
        ctl('SR-6', 'Supplier Assessments & Reviews', ['vendor']),
      ] },
    ],
  },
  cis: {
    label: 'CIS Controls v8', standard: 'All 18 controls (Implementation Group 2)',
    sections: [
      { id: 'g1', name: 'Controls 1–6 — Basic Cyber Hygiene', controls: [
        ctl('CIS-1', 'Inventory & Control of Enterprise Assets', ['inventory']),
        ctl('CIS-2', 'Inventory & Control of Software Assets', ['inventory', 'patch']),
        ctl('CIS-3', 'Data Protection', ['encryption', 'dlp']),
        ctl('CIS-4', 'Secure Configuration of Assets & Software', ['patch']),
        ctl('CIS-5', 'Account Management', ['pam']),
        ctl('CIS-6', 'Access Control Management', ['mfa', 'pam']),
      ] },
      { id: 'g2', name: 'Controls 7–12 — Foundational', controls: [
        ctl('CIS-7', 'Continuous Vulnerability Management', ['vulnSla', 'patch']),
        ctl('CIS-8', 'Audit Log Management', ['siem']),
        ctl('CIS-9', 'Email & Web Browser Protections', ['phishing']),
        ctl('CIS-10', 'Malware Defenses', ['edr']),
        ctl('CIS-11', 'Data Recovery', ['drTest', 'resilience']),
        ctl('CIS-12', 'Network Infrastructure Management', ['patch', 'soc']),
      ] },
      { id: 'g3', name: 'Controls 13–18 — Organizational', controls: [
        ctl('CIS-13', 'Network Monitoring & Defense', ['mttd', 'soc']),
        ctl('CIS-14', 'Security Awareness & Skills Training', ['training', 'phishing']),
        ctl('CIS-15', 'Service Provider Management', ['vendor']),
        ctl('CIS-16', 'Application Software Security', ['vulnSla', 'patch']),
        ctl('CIS-17', 'Incident Response Management', ['irplan', 'mttr', 'forensics']),
        ctl('CIS-18', 'Penetration Testing', ['vulnSla', 'riskAssess']),
      ] },
    ],
  },
  naic: {
    label: 'NAIC Insurance Data Security Model Law', standard: 'Model Law 668',
    sections: [
      { id: 's4', name: 'Section 4 — Information Security Program', controls: [
        ctl('§4.A', 'Written Information Security Program', ['policy']),
        ctl('§4.B', 'Objectives of the Program', ['policy', 'context']),
        ctl('§4.C', 'Risk Assessment', ['riskAssess', 'appetite']),
        ctl('§4.D(1)', 'Access Controls', ['mfa', 'pam']),
        ctl('§4.D(2)', 'Multi-Factor Authentication', ['mfa']),
        ctl('§4.D(3)', 'Asset Inventory & Classification', ['inventory']),
        ctl('§4.D(4)', 'Encryption of Nonpublic Information', ['encryption']),
        ctl('§4.D(5)', 'Secure Development Practices', ['vulnSla']),
        ctl('§4.D(8)', 'Monitoring & Detection', ['mttd', 'soc']),
        ctl('§4.D(9)', 'Audit Trails', ['siem']),
        ctl('§4.D(11)', 'Incident Response Plan', ['irplan']),
        ctl('§4.E', 'Board Oversight', ['oversight', 'roles']),
        ctl('§4.F', 'Third-Party Service Provider Oversight', ['vendor']),
        ctl('§4.G', 'Program Adjustments', ['riskAssess']),
        ctl('§4.H', 'Incident Response Plan Maintenance', ['irplan', 'drTest']),
      ] },
      { id: 's5_6', name: 'Sections 5–6 — Investigation & Notification', controls: [
        ctl('§5', 'Investigation of Cybersecurity Events', ['forensics', 'irplan']),
        ctl('§6.A', '72-Hour Commissioner Notification', ['notify']),
        ctl('§6.B', 'Notification to Consumers', ['notify', 'recoveryComms']),
      ] },
    ],
  },
  iso27001: {
    label: 'ISO/IEC 27001:2022', standard: 'Annex A — all four control themes',
    sections: [
      { id: 'a5', name: 'A.5 Organizational Controls', controls: [
        ctl('A.5.1', 'Policies for Information Security', ['policy']),
        ctl('A.5.2', 'Information Security Roles & Responsibilities', ['roles']),
        ctl('A.5.7', 'Threat Intelligence', ['soc']),
        ctl('A.5.9', 'Inventory of Information & Assets', ['inventory']),
        ctl('A.5.12', 'Classification of Information', ['dlp', 'inventory']),
        ctl('A.5.15', 'Access Control', ['mfa', 'pam']),
        ctl('A.5.19', 'Information Security in Supplier Relationships', ['vendor']),
        ctl('A.5.24', 'Incident Management Planning & Preparation', ['irplan']),
        ctl('A.5.29', 'Information Security During Disruption', ['drTest', 'resilience']),
        ctl('A.5.30', 'ICT Readiness for Business Continuity', ['drTest']),
      ] },
      { id: 'a6', name: 'A.6 People Controls', controls: [
        ctl('A.6.3', 'Awareness, Education & Training', ['training', 'phishing']),
        ctl('A.6.6', 'Confidentiality / NDAs', ['policy']),
        ctl('A.6.8', 'Information Security Event Reporting', ['lessons', 'soc']),
      ] },
      { id: 'a7', name: 'A.7 Physical Controls', controls: [
        ctl('A.7.1', 'Physical Security Perimeters', ['inventory']),
        ctl('A.7.2', 'Physical Entry', ['inventory']),
        ctl('A.7.10', 'Storage Media', ['encryption']),
        ctl('A.7.14', 'Secure Disposal / Reuse of Equipment', ['inventory', 'encryption']),
      ] },
      { id: 'a8', name: 'A.8 Technological Controls', controls: [
        ctl('A.8.2', 'Privileged Access Rights', ['pam']),
        ctl('A.8.5', 'Secure Authentication', ['mfa']),
        ctl('A.8.7', 'Protection Against Malware', ['edr']),
        ctl('A.8.8', 'Management of Technical Vulnerabilities', ['vulnSla', 'patch']),
        ctl('A.8.12', 'Data Leakage Prevention', ['dlp']),
        ctl('A.8.13', 'Information Backup', ['resilience', 'drTest']),
        ctl('A.8.15', 'Logging', ['siem']),
        ctl('A.8.16', 'Monitoring Activities', ['mttd', 'soc']),
        ctl('A.8.24', 'Use of Cryptography', ['encryption']),
        ctl('A.8.25', 'Secure Development Life Cycle', ['vulnSla']),
      ] },
    ],
  },
  soc2: {
    label: 'SOC 2 Type II', standard: 'AICPA Trust Services Criteria (all categories)',
    sections: [
      { id: 'cc1', name: 'CC1 — Control Environment', controls: [
        ctl('CC1.2', 'Board Independence & Oversight', ['oversight']),
        ctl('CC1.3', 'Structures, Reporting Lines & Authorities', ['roles']),
        ctl('CC1.4', 'Commitment to Competence', ['training']),
      ] },
      { id: 'cc2_3', name: 'CC2–CC3 — Communication & Risk Assessment', controls: [
        ctl('CC2.1', 'Information Quality', ['siem']),
        ctl('CC3.2', 'Risk Identification & Analysis', ['riskAssess']),
        ctl('CC3.4', 'Vendor & Business Partner Risk', ['vendor']),
      ] },
      { id: 'cc4_5', name: 'CC4–CC5 — Monitoring & Control Activities', controls: [
        ctl('CC4.1', 'Ongoing & Separate Evaluations', ['soc', 'riskAssess']),
        ctl('CC5.2', 'Technology General Controls', ['patch', 'mfa']),
      ] },
      { id: 'cc6', name: 'CC6 — Logical & Physical Access', controls: [
        ctl('CC6.1', 'Logical Access Security & Encryption', ['mfa', 'encryption']),
        ctl('CC6.2', 'User Provisioning & Privileged Access', ['pam']),
        ctl('CC6.6', 'Boundary Protection', ['edr', 'soc']),
        ctl('CC6.7', 'Data Transmission & Movement', ['encryption', 'dlp']),
        ctl('CC6.8', 'Malware Prevention & Detection', ['edr']),
      ] },
      { id: 'cc7', name: 'CC7 — System Operations', controls: [
        ctl('CC7.1', 'Vulnerability Detection & Monitoring', ['vulnSla', 'siem']),
        ctl('CC7.2', 'Anomaly & Security Event Monitoring', ['mttd', 'soc']),
        ctl('CC7.3', 'Security Incident Evaluation', ['irplan']),
        ctl('CC7.4', 'Incident Response Program', ['irplan', 'mttr']),
        ctl('CC7.5', 'Recovery from Incidents', ['drTest', 'resilience']),
      ] },
      { id: 'cc8_9', name: 'CC8–CC9 — Change Management & Risk Mitigation', controls: [
        ctl('CC8.1', 'Change Management', ['patch']),
        ctl('CC9.2', 'Vendor & Business Partner Management', ['vendor']),
      ] },
      { id: 'aci', name: 'Availability / Confidentiality / Privacy', controls: [
        ctl('A1.2', 'Recovery Infrastructure & Backups', ['resilience', 'drTest']),
        ctl('C1.1', 'Confidential Information Protection', ['encryption', 'dlp']),
        ctl('P4.0', 'Privacy — Use, Retention & Disposal', ['policy', 'dlp']),
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
        ctl('§422.504(a)', 'Encryption of Member Data', ['encryption']),
      ] },
      { id: 'program', name: 'Program Integrity & Oversight', controls: [
        ctl('§422.503(b)', 'Compliance Program', ['policy', 'roles', 'training']),
        ctl('§422.504(i)', 'First-Tier/Downstream Entity (FDR) Oversight', ['vendor']),
        ctl('§422.516', 'Risk Program & Reporting', ['riskAssess', 'oversight']),
        ctl('§422.504(h)', 'FDR Monitoring & Auditing', ['vendor', 'soc']),
      ] },
      { id: 'incident', name: 'Incident & Continuity', controls: [
        ctl('Part D §423.504', '1-Business-Day Incident Reporting', ['notify', 'irplan']),
        ctl('§422.504(o)', 'Business Continuity Plan', ['drTest', 'resilience']),
        ctl('§422.504(g)', 'Breach Notification to CMS', ['notify']),
      ] },
    ],
  },
  pci: {
    label: 'PCI DSS v4.0', standard: 'All 12 requirements',
    sections: [
      { id: 'network', name: 'Build & Maintain a Secure Network (1–2)', controls: [
        ctl('Req 1', 'Install & Maintain Network Security Controls', ['edr', 'soc']),
        ctl('Req 2', 'Apply Secure Configurations', ['patch']),
      ] },
      { id: 'protect', name: 'Protect Account Data (3–4)', controls: [
        ctl('Req 3', 'Protect Stored Account Data', ['encryption', 'dlp']),
        ctl('Req 4', 'Strong Cryptography in Transmission', ['encryption']),
      ] },
      { id: 'vuln', name: 'Vulnerability Management (5–6)', controls: [
        ctl('Req 5', 'Protect Against Malicious Software', ['edr']),
        ctl('Req 6', 'Develop & Maintain Secure Systems', ['patch', 'vulnSla']),
      ] },
      { id: 'access', name: 'Access Control (7–9)', controls: [
        ctl('Req 7', 'Restrict Access by Need-to-Know', ['pam']),
        ctl('Req 8', 'Identify Users & Authenticate (MFA)', ['mfa']),
        ctl('Req 9', 'Restrict Physical Access', ['inventory']),
      ] },
      { id: 'monitor', name: 'Monitor & Test (10–11)', controls: [
        ctl('Req 10', 'Log & Monitor All Access', ['siem', 'mttd']),
        ctl('Req 11', 'Test Security of Systems Regularly', ['vulnSla', 'riskAssess']),
      ] },
      { id: 'policy', name: 'Maintain an Information Security Policy (12)', controls: [
        ctl('Req 12.1', 'Information Security Policy', ['policy']),
        ctl('Req 12.6', 'Security Awareness Education', ['training', 'phishing']),
        ctl('Req 12.8', 'Third-Party Service Providers', ['vendor']),
        ctl('Req 12.10', 'Incident Response Plan', ['irplan']),
      ] },
    ],
  },
  gdpr: {
    label: 'GDPR / Privacy', standard: 'EU 2016/679 — security & accountability articles',
    sections: [
      { id: 'principles', name: 'Principles & Accountability (Art 5, 24, 30)', controls: [
        ctl('Art 5(1)(f)', 'Integrity & Confidentiality', ['encryption', 'edr']),
        ctl('Art 5(2)', 'Accountability Principle', ['policy', 'oversight']),
        ctl('Art 24', 'Responsibility of the Controller', ['policy', 'roles']),
        ctl('Art 30', 'Records of Processing Activities', ['inventory']),
      ] },
      { id: 'security', name: 'Security of Processing (Art 25, 32, 35)', controls: [
        ctl('Art 25', 'Data Protection by Design & Default', ['dlp', 'encryption']),
        ctl('Art 32(1)(a)', 'Pseudonymisation & Encryption', ['encryption']),
        ctl('Art 32(1)(b)', 'Confidentiality, Integrity & Availability', ['mfa', 'pam']),
        ctl('Art 32(1)(c)', 'Restore Availability After Incident', ['resilience', 'drTest']),
        ctl('Art 32(1)(d)', 'Process for Testing & Evaluating', ['siem', 'mttd']),
        ctl('Art 35', 'Data Protection Impact Assessment', ['riskAssess']),
      ] },
      { id: 'processors', name: 'Processors & Breach (Art 28, 33–34)', controls: [
        ctl('Art 28', 'Processor Obligations', ['vendor']),
        ctl('Art 33', '72-Hour Supervisory Notification', ['notify', 'irplan']),
        ctl('Art 34', 'Communication to Data Subjects', ['recoveryComms', 'notify']),
      ] },
      { id: 'people', name: 'Governance & Awareness (Art 37–39)', controls: [
        ctl('Art 37', 'Designation of a DPO', ['roles']),
        ctl('Art 39', 'Tasks of the DPO / Staff Awareness', ['training', 'phishing']),
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
