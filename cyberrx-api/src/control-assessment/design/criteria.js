'use strict';

/**
 * Design-effectiveness criteria — the auditor's checklist per control.
 *
 * For controls that cannot be proven by telemetry, design effectiveness is
 * tested the way an auditor reviews a policy / standard / SOP: decompose the
 * control OBJECTIVE into the specific things the document must ADDRESS, then
 * check (a) whether each is covered and (b) whether it is covered APPROPRIATELY
 * (the specifics a competent reviewer expects — a named owner, a cadence, a
 * threshold, a defined process). This registry is framework-NATIVE: each
 * framework's controls carry their own criteria; nothing is derived by crosswalk.
 *
 * Each criterion:
 *   id          short key
 *   text        what the document must address
 *   required    must be covered for design effectiveness (default true)
 *   concepts    phrases that indicate the topic is addressed (regex, case-insens.)
 *   qualifiers  phrases that indicate it is addressed APPROPRIATELY (specifics)
 *   good        one line: what "covered appropriately" looks like
 */

const crit = (id, text, o) => Object.assign({ id, text, required: true, concepts: [], qualifiers: [], good: '' }, o || {});

const REGISTRY = {
  // ---- NIST SP 800-53 Rev 5 ----
  'AC-1': {
    framework: 'NIST SP 800-53 Rev 5', control_id: 'AC-1', control_name: 'Access Control Policy and Procedures',
    control_objective: 'Develop, document and disseminate an access-control policy and the procedures to implement it.',
    primary_document_types: ['Access Control Policy', 'Identity & Authentication Policy'],
    criteria: [
      crit('purpose_scope', 'States the policy purpose and the scope of systems/personnel it applies to', { concepts: ['purpose', 'scope'], qualifiers: ['applies to', 'all (employees|users|systems|information systems)'], good: 'defines purpose and explicitly who/what it applies to' }),
      crit('roles', 'Assigns access-control roles and responsibilities', { concepts: ['responsibilit', '\\brole'], qualifiers: ['owner', 'responsible', 'accountable', 'administrator'], good: 'names accountable roles (e.g., system owner, administrator)' }),
      crit('least_privilege', 'Requires least privilege / need-to-know', { concepts: ['least privilege', 'need[ -]to[ -]know', 'minimum necessary'], qualifiers: [], good: 'explicitly requires least privilege' }),
      crit('approval', 'Requires access to be authorized/approved before granting', { concepts: ['approv', 'authoriz'], qualifiers: ['manager', 'owner', 'prior to', 'before'], good: 'requires documented approval before access is granted' }),
      crit('review_cadence', 'Requires periodic access reviews on a defined cadence', { concepts: ['access review', 'recertif', 'periodic review', 'review.{0,20}access'], qualifiers: ['annual', 'quarterly', 'semi-?annual', 'periodic', 'every \\d'], good: 'specifies a review cadence (e.g., at least annually)' }),
      crit('revocation', 'Requires timely revocation on termination/role change', { concepts: ['revoke', 'revocation', 'terminat', 'deprovision'], qualifiers: ['immediately', 'within \\d', 'same day', 'promptly'], good: 'requires timely revocation with a timeframe' }),
      crit('review_maintenance', 'Requires the policy itself to be reviewed/updated periodically', { required: false, concepts: ['policy.{0,20}(review|update)', 'reviewed (annually|periodically)'], qualifiers: ['annual', 'periodic', 'every \\d'], good: 'commits to reviewing the policy on a cadence' }),
    ],
  },
  'CP-1': {
    framework: 'NIST SP 800-53 Rev 5', control_id: 'CP-1', control_name: 'Contingency Planning Policy and Procedures',
    control_objective: 'Develop and disseminate a contingency-planning policy and procedures.',
    primary_document_types: ['Business Continuity / DR Plan'],
    criteria: [
      crit('purpose_scope', 'States purpose and scope', { concepts: ['purpose', 'scope'], qualifiers: ['applies to'], good: 'defines purpose and scope' }),
      crit('roles', 'Assigns contingency roles/responsibilities', { concepts: ['responsibilit', '\\brole'], qualifiers: ['coordinator', 'team', 'owner', 'responsible'], good: 'names a recovery coordinator/team' }),
      crit('rto_rpo', 'Defines recovery objectives (RTO/RPO)', { concepts: ['\\brto\\b', '\\brpo\\b', 'recovery time', 'recovery point'], qualifiers: ['\\d+\\s*(hour|hr|minute|min|day)'], good: 'states quantified RTO/RPO targets' }),
      crit('backup', 'Requires backups of essential information', { concepts: ['backup', 'back up'], qualifiers: ['immutable', 'offsite', 'encrypted', 'daily', 'frequency'], good: 'requires protected backups with a frequency' }),
      crit('testing', 'Requires the plan to be tested on a cadence', { concepts: ['test', 'exercise', 'tabletop'], qualifiers: ['annual', 'periodic', 'every \\d', 'quarterly'], good: 'requires periodic testing (e.g., annually)' }),
    ],
  },
  'IR-1': {
    framework: 'NIST SP 800-53 Rev 5', control_id: 'IR-1', control_name: 'Incident Response Policy and Procedures',
    control_objective: 'Develop and disseminate an incident-response policy and procedures.',
    primary_document_types: ['Incident Response Plan'],
    criteria: [
      crit('purpose_scope', 'States purpose and scope', { concepts: ['purpose', 'scope'], qualifiers: ['applies to'], good: 'defines purpose and scope' }),
      crit('roles', 'Defines an incident-response team and roles', { concepts: ['response team', 'csirt', 'responsibilit', '\\brole'], qualifiers: ['coordinator', 'lead', 'team', 'responsible'], good: 'names the IR team and roles' }),
      crit('phases', 'Covers the IR lifecycle (detect, contain, eradicate, recover)', { concepts: ['detect', 'contain', 'eradicat', 'recover'], qualifiers: [], good: 'addresses the full IR lifecycle' }),
      crit('reporting', 'Defines internal/external reporting and escalation', { concepts: ['report', 'escalat', 'notif'], qualifiers: ['within \\d', 'hours', 'regulator', 'authorities', 'management'], good: 'sets reporting timeframes and escalation' }),
      crit('testing', 'Requires periodic testing of the plan', { required: false, concepts: ['test', 'exercise', 'tabletop'], qualifiers: ['annual', 'periodic', 'every \\d'], good: 'requires periodic tabletop/exercise' }),
    ],
  },

  // ---- NIST CSF 2.0 ----
  'GV.PO-01': {
    framework: 'NIST CSF 2.0', control_id: 'GV.PO-01', control_name: 'Organizational cybersecurity policy is established and communicated',
    control_objective: 'A cybersecurity policy is established, communicated and enforced, reflecting risk and legal requirements.',
    primary_document_types: ['Information Security Policy'],
    criteria: [
      crit('management_approval', 'Approved and endorsed by leadership/management', { concepts: ['approv', 'endorse', 'management', 'board', 'ciso', 'executive'], qualifiers: ['approved by', 'signed', 'endorsed by'], good: 'shows leadership approval/endorsement' }),
      crit('scope', 'States scope and applicability', { concepts: ['scope', 'applies to'], qualifiers: ['all (employees|staff|users|systems)'], good: 'applies enterprise-wide' }),
      crit('risk_alignment', 'Reflects the organization\'s risk and legal/regulatory requirements', { concepts: ['risk', 'legal', 'regulat', 'complian'], qualifiers: [], good: 'ties policy to risk and legal/regulatory obligations' }),
      crit('communication', 'Communicated to the workforce', { concepts: ['communicat', 'disseminat', 'aware', 'acknowledg'], qualifiers: ['all (employees|staff)', 'annually', 'onboarding'], good: 'requires communication/acknowledgement' }),
      crit('review_cadence', 'Reviewed and updated periodically', { concepts: ['review', 'update'], qualifiers: ['annual', 'periodic', 'every \\d'], good: 'commits to periodic review' }),
    ],
  },
  'PR.AT-01': {
    framework: 'NIST CSF 2.0', control_id: 'PR.AT-01', control_name: 'Personnel are provided awareness and training',
    control_objective: 'A security awareness and training program exists so personnel understand their responsibilities.',
    primary_document_types: ['Security Awareness & Training Policy', 'Information Security Policy'],
    criteria: [
      crit('program', 'Establishes a security awareness/training program', { concepts: ['awareness', 'training'], qualifiers: ['program', 'annual', 'required'], good: 'defines a formal program' }),
      crit('audience', 'Applies to all workforce, incl. new hires', { concepts: ['all (employees|staff|workforce)', 'new (hire|employee)', 'onboarding'], qualifiers: [], good: 'covers all personnel including onboarding' }),
      crit('frequency', 'Defines training frequency', { concepts: ['frequency', 'annual', 'periodic', 'every \\d'], qualifiers: ['annual', 'quarterly', 'every \\d'], good: 'sets a training cadence (e.g., annually)' }),
      crit('role_based', 'Includes role-based training for higher-risk roles', { required: false, concepts: ['role-?based', 'privileged', 'developer', 'administrator'], qualifiers: [], good: 'adds role-based training for sensitive roles' }),
      crit('phishing', 'Includes phishing/social-engineering awareness', { concepts: ['phish', 'social engineer'], qualifiers: [], good: 'covers phishing awareness' }),
    ],
  },

  // ---- HIPAA Security Rule §164 ----
  '164.308(a)(1)(i)': {
    framework: 'HIPAA Security Rule §164', control_id: '164.308(a)(1)(i)', control_name: 'Security Management Process',
    control_objective: 'Policies and procedures to prevent, detect, contain and correct security violations (risk analysis + risk management).',
    primary_document_types: ['Information Security Policy', 'Risk Assessment / Register'],
    criteria: [
      crit('risk_analysis', 'Requires a risk analysis of ePHI', { concepts: ['risk (analysis|assessment)'], qualifiers: ['ephi', 'phi', 'accurate and thorough', 'periodic', 'annual'], good: 'requires a periodic ePHI risk analysis' }),
      crit('risk_management', 'Requires risk-management measures to reduce risk', { concepts: ['risk management', 'reduce risk', 'mitigat', 'remediat'], qualifiers: ['reasonable and appropriate', 'to an acceptable'], good: 'requires reducing risk to an acceptable level' }),
      crit('sanction', 'Includes a sanction policy for violations', { concepts: ['sanction', 'disciplinary'], qualifiers: ['workforce', 'violation'], good: 'defines sanctions for workforce violations' }),
      crit('activity_review', 'Requires information-system activity review (log review)', { concepts: ['activity review', 'audit log', 'log.{0,15}review', 'review.{0,15}log'], qualifiers: ['periodic', 'regular', 'ephi'], good: 'requires regular activity/log review' }),
      crit('assigned_responsibility', 'Assigns a security official', { concepts: ['security official', 'security officer', 'responsible for'], qualifiers: ['designated', 'appointed'], good: 'designates a security official' }),
    ],
  },
  '164.316(a)': {
    framework: 'HIPAA Security Rule §164', control_id: '164.316(a)', control_name: 'Policies and Procedures',
    control_objective: 'Implement reasonable and appropriate policies and procedures to comply with the Security Rule.',
    primary_document_types: ['Information Security Policy'],
    criteria: [
      crit('documented', 'Policies are documented and maintained', { concepts: ['policy', 'procedure'], qualifiers: ['documented', 'maintain', 'written'], good: 'policies are written and maintained' }),
      crit('reasonable_appropriate', 'Reflects a reasonable-and-appropriate standard', { concepts: ['reasonable and appropriate', 'reasonable', 'appropriate'], qualifiers: [], good: 'uses the HIPAA reasonable-and-appropriate standard' }),
      crit('retention', 'Requires 6-year retention of documentation', { concepts: ['retain', 'retention'], qualifiers: ['6 year', 'six year'], good: 'commits to 6-year retention' }),
      crit('review_update', 'Requires periodic review/update', { concepts: ['review', 'update'], qualifiers: ['periodic', 'annual', 'as needed', 'changes'], good: 'requires periodic review/update' }),
    ],
  },

  // ---- SOC 2 (2017 TSC) ----
  'CC1.1': {
    framework: 'SOC 2 (2017 TSC)', control_id: 'CC1.1', control_name: 'Ethics & integrity program (Nerion test)',
    control_objective: 'Nerion test: an ethics/code-of-conduct program is established, acknowledged by personnel, and enforced.',
    primary_document_types: ['Code of Conduct', 'Information Security Policy'],
    criteria: [
      crit('code_of_conduct', 'A code of conduct / ethics is established', { concepts: ['code of conduct', 'code of ethics', 'ethical'], qualifiers: [], good: 'a code of conduct exists' }),
      crit('acknowledgement', 'Personnel acknowledge the code', { concepts: ['acknowledg', 'sign', 'attest'], qualifiers: ['annual', 'onboarding', 'all (employees|staff)'], good: 'requires acknowledgement' }),
      crit('consequences', 'Defines consequences for violations', { concepts: ['violation', 'disciplinary', 'sanction', 'consequence'], qualifiers: [], good: 'states consequences for violations' }),
      crit('reporting', 'Provides a mechanism to report concerns', { required: false, concepts: ['whistleblow', 'report.{0,20}concern', 'hotline', 'anonym'], qualifiers: [], good: 'offers a reporting/whistleblower channel' }),
    ],
  },
  'CC5.3': {
    framework: 'SOC 2 (2017 TSC)', control_id: 'CC5.3', control_name: 'Control activities via policies & procedures (Nerion test)',
    control_objective: 'Nerion test: control activities are deployed through policies that set expectations and procedures that operationalize them, with assigned ownership.',
    primary_document_types: ['Information Security Policy', 'Standard Operating Procedures'],
    criteria: [
      crit('policies_exist', 'Policies establish control expectations', { concepts: ['policy', 'polic'], qualifiers: ['establish', 'require', 'must', 'shall'], good: 'policies set clear expectations' }),
      crit('procedures', 'Procedures put policies into action', { concepts: ['procedure', 'process', 'sop', 'step'], qualifiers: ['step', 'responsible', 'perform'], good: 'procedures operationalize the policy' }),
      crit('responsibility', 'Assigns responsibility for the control activity', { concepts: ['responsibilit', 'owner', '\\brole'], qualifiers: ['responsible', 'accountable', 'owner'], good: 'names who performs the control' }),
      crit('timeliness', 'Specifies timeliness/cadence of the activity', { required: false, concepts: ['cadence', 'frequency', 'annual', 'daily', 'periodic', 'every \\d'], qualifiers: ['annual', 'daily', 'weekly', 'monthly', 'quarterly', 'every \\d'], good: 'states how often the control runs' }),
    ],
  },

  // ---- CIS Controls v8.1 ----
  '14.1': {
    framework: 'CIS Controls v8.1', control_id: '14.1', control_name: 'Security awareness program (Nerion test)',
    control_objective: 'Nerion test: a security awareness program is established and maintained to drive secure workforce behavior.',
    primary_document_types: ['Security Awareness & Training Policy'],
    criteria: [
      crit('program', 'A documented awareness program exists', { concepts: ['awareness'], qualifiers: ['program', 'documented', 'maintain'], good: 'documents an awareness program' }),
      crit('frequency', 'Delivered at hire and at least annually', { concepts: ['annual', 'onboarding', 'new (hire|employee)', 'hire'], qualifiers: ['annual', 'at hire', 'onboarding'], good: 'delivered at hire and annually' }),
      crit('content', 'Covers relevant threats (phishing, social engineering, data handling)', { concepts: ['phish', 'social engineer', 'data handling', 'password'], qualifiers: [], good: 'covers current threats' }),
      crit('review', 'Program reviewed/updated periodically', { required: false, concepts: ['review', 'update'], qualifiers: ['annual', 'periodic'], good: 'reviewed periodically' }),
    ],
  },
};

const CONTROL_KEYS = Object.keys(REGISTRY);

module.exports = { REGISTRY, CONTROL_KEYS };
