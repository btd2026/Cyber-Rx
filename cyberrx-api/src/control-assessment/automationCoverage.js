'use strict';

/**
 * automationCoverage — how much of each framework can be assessed automatically
 * (from connected-tool telemetry) vs needs a document or human, at the level of
 * the framework's OWN control catalog. This is the honest denominator behind
 * "how many controls can Nerion automate."
 *
 * Tiering rule (applied to every control the same way, no crosswalk):
 *   auto    — a connected tool proves the control end-to-end from technical
 *             state/telemetry, no human input (e.g. MFA coverage %, EDR sensor
 *             health, backup+restore results, patch SLA, config compliance).
 *   partial — a tool supplies the measurement but design/intent still needs a
 *             document or human to confirm (e.g. access-review executed AND a
 *             policy requires it; logging live AND a retention policy exists).
 *   manual  — no API can emit it: governance, roles, risk appetite, board
 *             oversight, physical, process, training-program design, contracts.
 *             These are what the document-review engine covers.
 *
 * CSF 2.0 is read live from nistCsfControlLibrary (test: auto|partial|manual).
 * CIS/HIPAA/SOC 2/800-53 are enumerated here at the granularity noted per
 * framework; 800-53 Rev 5 is tiered at the family level over its published base-
 * control counts (enumerating ~300 base controls by hand would trade accuracy
 * for false precision — the family split is the defensible unit).
 */

let CSF;
try { CSF = require('../data/nistCsfControlLibrary'); } catch (_) { CSF = { CONTROLS: [] }; }

// ---- NIST CSF 2.0 — from the live library (106 subcategories) ----------------
function csfTier(t) { return t === 'auto' ? 'auto' : (t === 'partial' ? 'partial' : 'manual'); }
const NIST_CSF_2_0 = {
  name: 'NIST CSF 2.0', unit: 'subcategory', granularity: 'per-subcategory (full catalog)',
  controls: (CSF.CONTROLS || []).map((c) => ({ id: c.id, name: c.name, tier: csfTier(c.test) })),
};

// ---- CIS Controls v8.1 — 18 controls / 153 safeguards ------------------------
// Enumerated per CIS Safeguard with its official count, split into tiers by the
// nature of each safeguard set (CIS is designed to be measured, so it skews auto).
const cis = (id, name, safeguards, auto, partial, manual) => ({ id, name, safeguards, auto, partial, manual });
const CIS_V8_1 = {
  name: 'CIS Controls v8.1', unit: 'safeguard', granularity: 'per-safeguard (full catalog, 153 safeguards)',
  groups: [
    cis('1', 'Enterprise asset inventory', 5, 4, 1, 0),
    cis('2', 'Software asset inventory', 7, 5, 2, 0),
    cis('3', 'Data protection & handling', 14, 4, 6, 4),
    cis('4', 'Configuration hardening', 12, 7, 4, 1),
    cis('5', 'Account lifecycle', 6, 4, 2, 0),
    cis('6', 'Access enforcement', 8, 5, 3, 0),
    cis('7', 'Vulnerability remediation', 7, 5, 2, 0),
    cis('8', 'Log management & retention', 12, 6, 5, 1),
    cis('9', 'Email & web threat filtering', 7, 4, 3, 0),
    cis('10', 'Endpoint malware defense', 7, 5, 2, 0),
    cis('11', 'Backup & recovery', 5, 3, 2, 0),
    cis('12', 'Network device management', 8, 4, 4, 0),
    cis('13', 'Network detection & response', 11, 6, 5, 0),
    cis('14', 'Workforce security training', 9, 1, 4, 4),
    cis('15', 'Third-party management', 7, 1, 3, 3),
    cis('16', 'Application security testing', 14, 5, 6, 3),
    cis('17', 'Incident response capability', 9, 1, 4, 4),
    cis('18', 'Offensive testing', 5, 0, 2, 3),
  ],
};

// ---- HIPAA Security Rule §164 — standards & implementation specifications -----
// Enumerated per requirement (standard or implementation spec).
const h = (id, name, tier) => ({ id, name, tier });
const HIPAA_164 = {
  name: 'HIPAA Security Rule §164', unit: 'requirement', granularity: 'per standard / implementation specification (full catalog)',
  controls: [
    // Administrative safeguards §164.308
    h('164.308(a)(1)(i)', 'Security Management Process', 'manual'),
    h('164.308(a)(1)(ii)(A)', 'Risk Analysis', 'partial'),
    h('164.308(a)(1)(ii)(B)', 'Risk Management', 'partial'),
    h('164.308(a)(1)(ii)(C)', 'Sanction Policy', 'manual'),
    h('164.308(a)(1)(ii)(D)', 'Information System Activity Review', 'partial'),
    h('164.308(a)(2)', 'Assigned Security Responsibility', 'manual'),
    h('164.308(a)(3)(i)', 'Workforce Security', 'partial'),
    h('164.308(a)(3)(ii)(A)', 'Authorization and/or Supervision', 'partial'),
    h('164.308(a)(3)(ii)(B)', 'Workforce Clearance Procedure', 'manual'),
    h('164.308(a)(3)(ii)(C)', 'Termination Procedures', 'partial'),
    h('164.308(a)(4)(i)', 'Information Access Management', 'partial'),
    h('164.308(a)(4)(ii)(A)', 'Isolating Health Care Clearinghouse Functions', 'manual'),
    h('164.308(a)(4)(ii)(B)', 'Access Authorization', 'partial'),
    h('164.308(a)(4)(ii)(C)', 'Access Establishment and Modification', 'partial'),
    h('164.308(a)(5)(i)', 'Security Awareness and Training', 'partial'),
    h('164.308(a)(5)(ii)(A)', 'Security Reminders', 'manual'),
    h('164.308(a)(5)(ii)(B)', 'Protection from Malicious Software', 'auto'),
    h('164.308(a)(5)(ii)(C)', 'Log-in Monitoring', 'auto'),
    h('164.308(a)(5)(ii)(D)', 'Password Management', 'auto'),
    h('164.308(a)(6)(i)', 'Security Incident Procedures', 'manual'),
    h('164.308(a)(6)(ii)', 'Response and Reporting', 'partial'),
    h('164.308(a)(7)(i)', 'Contingency Plan', 'manual'),
    h('164.308(a)(7)(ii)(A)', 'Data Backup Plan', 'auto'),
    h('164.308(a)(7)(ii)(B)', 'Disaster Recovery Plan', 'partial'),
    h('164.308(a)(7)(ii)(C)', 'Emergency Mode Operation Plan', 'manual'),
    h('164.308(a)(7)(ii)(D)', 'Testing and Revision Procedures', 'partial'),
    h('164.308(a)(7)(ii)(E)', 'Applications and Data Criticality Analysis', 'manual'),
    h('164.308(a)(8)', 'Evaluation', 'partial'),
    h('164.308(b)(1)', 'Business Associate Contracts', 'manual'),
    h('164.308(b)(3)', 'Written Contract or Other Arrangement', 'manual'),
    // Physical safeguards §164.310
    h('164.310(a)(1)', 'Facility Access Controls', 'partial'),
    h('164.310(a)(2)(i)', 'Contingency Operations', 'manual'),
    h('164.310(a)(2)(ii)', 'Facility Security Plan', 'manual'),
    h('164.310(a)(2)(iii)', 'Access Control and Validation Procedures', 'partial'),
    h('164.310(a)(2)(iv)', 'Maintenance Records', 'manual'),
    h('164.310(b)', 'Workstation Use', 'manual'),
    h('164.310(c)', 'Workstation Security', 'partial'),
    h('164.310(d)(1)', 'Device and Media Controls', 'partial'),
    h('164.310(d)(2)(i)', 'Disposal', 'partial'),
    h('164.310(d)(2)(ii)', 'Media Re-use', 'partial'),
    h('164.310(d)(2)(iii)', 'Accountability', 'partial'),
    h('164.310(d)(2)(iv)', 'Data Backup and Storage', 'auto'),
    // Technical safeguards §164.312
    h('164.312(a)(1)', 'Access Control', 'auto'),
    h('164.312(a)(2)(i)', 'Unique User Identification', 'auto'),
    h('164.312(a)(2)(ii)', 'Emergency Access Procedure', 'partial'),
    h('164.312(a)(2)(iii)', 'Automatic Logoff', 'auto'),
    h('164.312(a)(2)(iv)', 'Encryption and Decryption', 'auto'),
    h('164.312(b)', 'Audit Controls', 'auto'),
    h('164.312(c)(1)', 'Integrity', 'partial'),
    h('164.312(c)(2)', 'Mechanism to Authenticate ePHI', 'partial'),
    h('164.312(d)', 'Person or Entity Authentication', 'auto'),
    h('164.312(e)(1)', 'Transmission Security', 'auto'),
    h('164.312(e)(2)(i)', 'Integrity Controls', 'auto'),
    h('164.312(e)(2)(ii)', 'Encryption', 'auto'),
    // Organizational / documentation §164.314 / §164.316
    h('164.314(a)', 'Business Associate Contracts or Other Arrangements', 'manual'),
    h('164.314(b)', 'Requirements for Group Health Plans', 'manual'),
    h('164.316(a)', 'Policies and Procedures', 'manual'),
    h('164.316(b)(1)', 'Documentation', 'manual'),
    h('164.316(b)(2)(i)', 'Time Limit (retention)', 'manual'),
    h('164.316(b)(2)(ii)', 'Availability', 'manual'),
    h('164.316(b)(2)(iii)', 'Updates', 'manual'),
  ],
};

// ---- SOC 2 (2017 TSC) — Common Criteria + category criteria ------------------
const s = (id, name, tier) => ({ id, name, tier });
const SOC2_2017_TSC = {
  name: 'SOC 2 (2017 TSC)', unit: 'criterion', granularity: 'per point-of-focus criterion (full catalog)',
  controls: [
    // CC1 Control Environment
    s('CC1.1', 'Commitment to integrity and ethical values', 'manual'),
    s('CC1.2', 'Board independence and oversight', 'manual'),
    s('CC1.3', 'Management establishes structures, reporting lines, authorities', 'manual'),
    s('CC1.4', 'Commitment to competence', 'manual'),
    s('CC1.5', 'Accountability enforced', 'manual'),
    // CC2 Communication & Information
    s('CC2.1', 'Uses relevant, quality information', 'partial'),
    s('CC2.2', 'Internal communication of objectives & responsibilities', 'manual'),
    s('CC2.3', 'External communication', 'manual'),
    // CC3 Risk Assessment
    s('CC3.1', 'Specifies objectives for risk identification', 'manual'),
    s('CC3.2', 'Identifies and analyzes risk', 'partial'),
    s('CC3.3', 'Considers potential for fraud', 'manual'),
    s('CC3.4', 'Identifies and assesses change', 'partial'),
    // CC4 Monitoring
    s('CC4.1', 'Selects, develops, performs evaluations', 'partial'),
    s('CC4.2', 'Evaluates and communicates deficiencies', 'partial'),
    // CC5 Control Activities
    s('CC5.1', 'Selects control activities that mitigate risk', 'manual'),
    s('CC5.2', 'Selects general control activities over technology', 'partial'),
    s('CC5.3', 'Deploys through policies and procedures', 'manual'),
    // CC6 Logical & Physical Access
    s('CC6.1', 'Logical access security software & infrastructure', 'auto'),
    s('CC6.2', 'Registers and authorizes new users', 'auto'),
    s('CC6.3', 'Role-based access & least privilege', 'auto'),
    s('CC6.4', 'Restricts physical access', 'partial'),
    s('CC6.5', 'Discontinues logical/physical protections on disposal', 'partial'),
    s('CC6.6', 'Protects against external threats', 'auto'),
    s('CC6.7', 'Restricts movement of information', 'auto'),
    s('CC6.8', 'Prevents/detects unauthorized software', 'auto'),
    // CC7 System Operations
    s('CC7.1', 'Detects config changes & vulnerabilities', 'auto'),
    s('CC7.2', 'Monitors for anomalies', 'auto'),
    s('CC7.3', 'Evaluates security events', 'partial'),
    s('CC7.4', 'Responds to security incidents', 'partial'),
    s('CC7.5', 'Recovers from incidents', 'partial'),
    // CC8 Change Management
    s('CC8.1', 'Authorizes, designs, tests, approves changes', 'partial'),
    // CC9 Risk Mitigation
    s('CC9.1', 'Identifies & mitigates business disruption risk', 'manual'),
    s('CC9.2', 'Assesses & manages vendor/partner risk', 'partial'),
    // Availability
    s('A1.1', 'Maintains capacity to meet demand', 'auto'),
    s('A1.2', 'Environmental protections, backup, recovery infrastructure', 'auto'),
    s('A1.3', 'Tests recovery plan', 'partial'),
    // Confidentiality
    s('C1.1', 'Identifies and maintains confidential information', 'partial'),
    s('C1.2', 'Disposes of confidential information', 'partial'),
    // Processing Integrity
    s('PI1.1', 'Uses quality information for processing', 'partial'),
    s('PI1.2', 'Inputs are complete and accurate', 'partial'),
    s('PI1.3', 'Processing is complete, accurate, timely', 'partial'),
    s('PI1.4', 'Outputs are complete and accurate', 'partial'),
    s('PI1.5', 'Stores inputs/outputs completely and accurately', 'auto'),
    // Privacy
    s('P1.1', 'Notice of privacy practices', 'manual'),
    s('P2.1', 'Choice and consent', 'manual'),
    s('P3.1', 'Collection consistent with objectives', 'manual'),
    s('P3.2', 'Explicit consent for sensitive information', 'manual'),
    s('P4.1', 'Use, retention limited to purpose', 'partial'),
    s('P4.2', 'Retention of personal information', 'partial'),
    s('P4.3', 'Disposal of personal information', 'partial'),
    s('P5.1', 'Data subject access to their information', 'partial'),
    s('P5.2', 'Correction/amendment of personal information', 'partial'),
    s('P6.1', 'Discloses only for identified purposes', 'manual'),
    s('P6.2', 'Records of authorized disclosures', 'partial'),
    s('P6.3', 'Records of unauthorized disclosures', 'partial'),
    s('P6.4', 'Third parties honor privacy commitments', 'manual'),
    s('P6.5', 'Notification of unauthorized disclosure by third parties', 'manual'),
    s('P6.6', 'Breach notification to affected individuals', 'partial'),
    s('P6.7', 'Accounting of disclosures on request', 'partial'),
    s('P7.1', 'Data quality maintained', 'partial'),
    s('P8.1', 'Privacy complaint & dispute handling', 'manual'),
  ],
};

// ---- NIST SP 800-53 Rev 5 — family-level over published base-control counts ---
// base = number of base controls in the family (Rev 5, excluding enhancements).
// The tier split is assigned per family from the family's nature; PM/PL/PS/PT/AT
// families are governance/process (manual-heavy), AC/AU/IA/SC/SI/CM are technical
// (automation-heavy). Assessed at the family unit, not per enhancement.
const f = (id, name, base, auto, partial, manual) => ({ id, name, base, auto, partial, manual });
const NIST_800_53_REV5 = {
  name: 'NIST SP 800-53 Rev 5', unit: 'base control', granularity: 'per family over published base-control counts (322 base controls)',
  families: [
    f('AC', 'Access Control', 25, 14, 8, 3),
    f('AT', 'Awareness and Training', 6, 1, 2, 3),
    f('AU', 'Audit and Accountability', 16, 9, 5, 2),
    f('CA', 'Assessment, Authorization, and Monitoring', 9, 2, 4, 3),
    f('CM', 'Configuration Management', 14, 8, 4, 2),
    f('CP', 'Contingency Planning', 13, 5, 4, 4),
    f('IA', 'Identification and Authentication', 12, 9, 2, 1),
    f('IR', 'Incident Response', 10, 2, 4, 4),
    f('MA', 'Maintenance', 7, 2, 2, 3),
    f('MP', 'Media Protection', 8, 3, 3, 2),
    f('PE', 'Physical and Environmental Protection', 23, 6, 8, 9),
    f('PL', 'Planning', 11, 0, 2, 9),
    f('PM', 'Program Management', 32, 1, 6, 25),
    f('PS', 'Personnel Security', 9, 1, 3, 5),
    f('PT', 'PII Processing and Transparency', 8, 1, 3, 4),
    f('RA', 'Risk Assessment', 10, 3, 4, 3),
    f('SA', 'System and Services Acquisition', 23, 2, 8, 13),
    f('SC', 'System and Communications Protection', 51, 28, 15, 8),
    f('SI', 'System and Information Integrity', 23, 13, 7, 3),
    f('SR', 'Supply Chain Risk Management', 12, 1, 4, 7),
  ],
};

// ---- roll-up ----------------------------------------------------------------
function tallyControls(list) {
  const t = { auto: 0, partial: 0, manual: 0, total: 0 };
  list.forEach((c) => { t[c.tier] = (t[c.tier] || 0) + 1; t.total += 1; });
  return t;
}
function tallyGroups(groups) {
  const t = { auto: 0, partial: 0, manual: 0, total: 0 };
  groups.forEach((g) => { t.auto += g.auto; t.partial += g.partial; t.manual += g.manual; t.total += (g.auto + g.partial + g.manual); });
  return t;
}

// IMPORTANT — what these numbers ARE and ARE NOT.
// `basis: 'automatable-by-control-nature'` means: of a framework's full published catalog,
// how many controls are the KIND a connector could assess end-to-end (auto), need a tool +
// a document/human (partial), or can only be a document/human (manual). This is the
// ADDRESSABLE-automatability denominator — NOT a count of controls Nerion assesses today.
// Actual assessed-today coverage is far smaller and lives in the per-framework registries
// (control-assessment/registries/*). Never surface these as "controls assessed/covered".
// `estimated: true` marks a hand-curated tier table (CIS/HIPAA/SOC 2/800-53); CSF is derived
// live from nistCsfControlLibrary — itself under separate review for over-tiering `auto`
// against capabilities that have no wired connector, so treat even CSF `auto` as addressable,
// not proven.
const COVERAGE_NOTE = 'Automatability of the full catalog by control nature (addressable), NOT controls assessed today. Assessed-today coverage is smaller and comes from the per-framework registries.';
function annotate(row, estimated) {
  return Object.assign(row, { basis: 'automatable-by-control-nature', estimated: !!estimated, note: COVERAGE_NOTE });
}
function summary() {
  const out = {};
  out.nist_csf_2_0 = annotate(Object.assign({ framework: NIST_CSF_2_0.name, granularity: NIST_CSF_2_0.granularity }, tallyControls(NIST_CSF_2_0.controls)), false);
  out.cis_v8_1 = annotate(Object.assign({ framework: CIS_V8_1.name, granularity: CIS_V8_1.granularity }, tallyGroups(CIS_V8_1.groups)), true);
  out.hipaa_164 = annotate(Object.assign({ framework: HIPAA_164.name, granularity: HIPAA_164.granularity }, tallyControls(HIPAA_164.controls)), true);
  out.soc2_2017_tsc = annotate(Object.assign({ framework: SOC2_2017_TSC.name, granularity: SOC2_2017_TSC.granularity }, tallyControls(SOC2_2017_TSC.controls)), true);
  out.nist_800_53_rev5 = annotate(Object.assign({ framework: NIST_800_53_REV5.name, granularity: NIST_800_53_REV5.granularity }, tallyGroups(NIST_800_53_REV5.families)), true);
  const grand = { auto: 0, partial: 0, manual: 0, total: 0 };
  Object.keys(out).forEach((k) => { const r = out[k]; grand.auto += r.auto; grand.partial += r.partial; grand.manual += r.manual; grand.total += r.total; });
  out.all_frameworks = annotate(Object.assign({ framework: 'All frameworks (union of catalogs)' }, grand), true);
  out._meaning = COVERAGE_NOTE;
  return out;
}

module.exports = {
  NIST_CSF_2_0, CIS_V8_1, HIPAA_164, SOC2_2017_TSC, NIST_800_53_REV5,
  tallyControls, tallyGroups, summary,
};
