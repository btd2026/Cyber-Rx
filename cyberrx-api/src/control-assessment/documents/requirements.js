'use strict';

/**
 * requirements — framework-NATIVE document evidence requirements.
 *
 * Each control that relies on document evidence defines its OWN required
 * document type(s), required design elements the document must contain, the
 * OPERATING evidence needed to go beyond design, required metadata, freshness /
 * approval / review-cadence requirements, and pass/partial/fail conditions.
 * Nothing is derived by crosswalk — a control is assessed only against its own
 * requirements. Existence never implies effectiveness.
 *
 * required_document_elements are design-criteria-shaped ({id,text,required,
 * concepts,qualifiers,good}) so the same reviewer that finds/cites elements in
 * the connector-side design engine runs here too.
 */

const el = (id, text, o) => Object.assign({ id, text, required: true, concepts: [], qualifiers: [], good: '' }, o || {});

// Reusable element sets.
const GOV = [
  el('purpose_scope', 'States purpose and the scope of systems/personnel it applies to', { concepts: ['purpose', 'scope'], qualifiers: ['applies to', 'all (employees|users|systems)'], good: 'defines purpose and applicability' }),
  el('roles', 'Assigns roles and responsibilities', { concepts: ['responsibilit', '\\brole'], qualifiers: ['owner', 'responsible', 'accountable'], good: 'names accountable roles' }),
  el('owner', 'Names a document owner', { required: false, concepts: ['document owner', 'policy owner', 'owned by', 'owner:'], qualifiers: [], good: 'a named owner' }),
];

const R = (o) => Object.assign({
  freshness_requirement_months: 12, approval_requirement: true, review_cadence_requirement_months: 12,
  minimum_design_evidence_threshold: 0.75, minimum_operating_evidence_threshold: 1,
  required_metadata: ['owner', 'approval_date', 'effective_date', 'last_review_date'],
  what_not_to_infer: 'Do not infer that the process operated, or that the control is effective, from the document alone.',
}, o);

const REGISTRY = {
  // ---- Incident response ----
  'nist_800_53_rev5:IR-8': R({
    framework: 'NIST SP 800-53 Rev 5', control_id: 'IR-8', control_name: 'Incident Response Plan',
    required_document_types: ['Incident Response Plan'],
    required_document_elements: GOV.concat([
      el('lifecycle', 'Defines the incident-response lifecycle (prepare, detect, contain, eradicate, recover)', { concepts: ['detect', 'contain', 'eradicat', 'recover'], qualifiers: [], good: 'covers the full IR lifecycle' }),
      el('severity', 'Defines incident severity levels', { concepts: ['severity', 'priority level', 'p1', 'critical/high/medium'], qualifiers: [], good: 'defines severity tiers' }),
      el('escalation', 'Defines escalation procedures', { concepts: ['escalat'], qualifiers: [], good: 'escalation path' }),
      el('comms', 'Internal and external communication procedures', { concepts: ['communicat', 'notif'], qualifiers: ['internal', 'external', 'regulator', 'customer'], good: 'internal + external comms' }),
      el('legal_coord', 'Coordination with legal / privacy / compliance', { concepts: ['legal', 'privacy', 'compliance'], qualifiers: [], good: 'names legal/privacy coordination' }),
      el('evidence_preservation', 'Evidence preservation', { concepts: ['evidence', 'preserv', 'chain of custody', 'forensic'], qualifiers: [], good: 'evidence preservation' }),
      el('lessons', 'Lessons-learned / post-incident process', { concepts: ['lessons learned', 'post-incident', 'after-action'], qualifiers: [], good: 'lessons-learned process' }),
    ]),
    required_operational_evidence: ['Tabletop Exercise Report', 'Incident Register or Incident Ticket Export', 'Internal Audit Report'],
    pass_conditions: 'Current, approved IR Plan with all required elements AND operating evidence (a tabletop report or real incident records with after-action).',
    partial_conditions: 'Plan present with elements but no operating evidence → Design only.',
    fail_conditions: 'Wrong document, or required elements absent.',
    not_enough_evidence_conditions: 'Text not extractable, or fewer than the design threshold of elements found.',
    examples_of_sufficient_evidence: 'IR Plan + latest tabletop after-action report + incident register.',
    examples_of_insufficient_evidence: 'IR Plan alone (proves design intent, not that IR operates).',
  }),
  'hipaa_164:164.308(a)(6)': R({
    framework: 'HIPAA Security Rule §164', control_id: '164.308(a)(6)', control_name: 'Security Incident Procedures',
    required_document_types: ['Incident Response Plan', 'Privacy / HIPAA Security Policy'],
    required_document_elements: GOV.concat([
      el('identify', 'Procedures to identify security incidents', { concepts: ['identif', 'detect'], qualifiers: [], good: 'identification procedures' }),
      el('respond', 'Procedures to respond to incidents', { concepts: ['respond', 'response', 'contain'], qualifiers: [], good: 'response procedures' }),
      el('report_escalate', 'Reporting and escalation', { concepts: ['report', 'escalat', 'notif'], qualifiers: [], good: 'reporting/escalation' }),
      el('document_outcomes', 'Documentation of incidents and outcomes', { concepts: ['document', 'record', 'log'], qualifiers: ['outcome', 'incident'], good: 'documents incident outcomes' }),
      el('workforce', 'Workforce responsibilities', { concepts: ['workforce', 'employee', 'staff'], qualifiers: ['responsib'], good: 'workforce responsibilities' }),
      el('ephi_impact', 'Consideration of ePHI impact / breach escalation', { concepts: ['ephi', 'phi', 'breach'], qualifiers: [], good: 'ePHI/breach escalation path' }),
    ]),
    required_operational_evidence: ['Incident Register or Incident Ticket Export', 'Internal Audit Report'],
    pass_conditions: 'Current approved procedures with elements AND an incident log/response records showing the procedures operated.',
    partial_conditions: 'Procedures present, no operational records → Design only.',
    fail_conditions: 'Wrong document or required elements absent.',
    not_enough_evidence_conditions: 'Text not extractable or ePHI scope undefined.',
    examples_of_sufficient_evidence: 'Security incident procedures + incident log with closure evidence.',
    examples_of_insufficient_evidence: 'A generic incident policy with no ePHI/breach escalation and no records.',
  }),
  'soc2_2017_tsc:CC7.4': R({
    framework: 'SOC 2 (2017 TSC)', control_id: 'CC7.4', control_name: 'Responds to identified security incidents',
    required_document_types: ['Incident Response Plan', 'Incident Response Playbook'],
    required_document_elements: GOV.concat([
      el('process', 'Defined incident response process', { concepts: ['incident response', 'response process'], qualifiers: [], good: 'defined IR process' }),
      el('classification', 'Incident classification', { concepts: ['classif', 'severity', 'category'], qualifiers: [], good: 'incident classification' }),
      el('containment', 'Containment / eradication / recovery', { concepts: ['contain', 'eradicat', 'recover'], qualifiers: [], good: 'containment→recovery' }),
      el('post_incident', 'Post-incident review', { concepts: ['post-incident', 'postmortem', 'lessons learned', 'after-action'], qualifiers: [], good: 'post-incident review' }),
      el('comms', 'Communication requirements', { concepts: ['communicat', 'notif'], qualifiers: [], good: 'communication requirements' }),
    ]),
    required_operational_evidence: ['Incident Register or Incident Ticket Export', 'Tabletop Exercise Report'],
    pass_conditions: 'IR process documented AND incident records with response timelines + postmortems + remediation tracking.',
    partial_conditions: 'Process documented, no incident records → Design only.',
    fail_conditions: 'Wrong document or elements absent.',
    not_enough_evidence_conditions: 'Text not extractable.',
    examples_of_sufficient_evidence: 'IR runbook + incident records with postmortems.',
    examples_of_insufficient_evidence: 'Runbook alone.',
  }),

  // ---- Backup / recovery ----
  'nist_800_53_rev5:CP-9': R({
    framework: 'NIST SP 800-53 Rev 5', control_id: 'CP-9', control_name: 'System Backup',
    required_document_types: ['Backup and Recovery Procedure', 'Disaster Recovery Plan'],
    required_document_elements: GOV.concat([
      el('scope_systems', 'Identifies systems/data in scope for backup', { concepts: ['backup', 'critical system', 'in scope'], qualifiers: [], good: 'backup scope' }),
      el('frequency', 'Backup frequency / schedule', { concepts: ['frequency', 'schedule', 'daily', 'hourly'], qualifiers: [], good: 'a backup cadence' }),
      el('protection', 'Backup protection (immutable / offsite / encrypted)', { concepts: ['immutable', 'offsite', 'encrypt', 'air-gap', 'worm'], qualifiers: [], good: 'protection of backups' }),
      el('restore_proc', 'Restore/recovery procedure', { concepts: ['restore', 'recover'], qualifiers: [], good: 'restore procedure' }),
    ]),
    required_operational_evidence: ['Restore Test Report'],
    pass_conditions: 'Backup procedure with elements AND a restore-test report (recoverability proven).',
    partial_conditions: 'Procedure present, no restore-test evidence → Design only. Backup existence does NOT prove restore capability.',
    fail_conditions: 'Wrong document or elements absent.',
    not_enough_evidence_conditions: 'Text not extractable.',
    examples_of_sufficient_evidence: 'Backup & recovery procedure + restore test report with integrity verification.',
    examples_of_insufficient_evidence: 'Backup policy alone; a "backups configured" claim with no restore test.',
    what_not_to_infer: 'Do not infer restore capability from a backup policy. Restore-test evidence is required.',
  }),

  // ---- Access review ----
  'nist_800_53_rev5:AC-6': R({
    framework: 'NIST SP 800-53 Rev 5', control_id: 'AC-6', control_name: 'Least Privilege',
    required_document_types: ['Access Control Policy', 'Identity and Access Management Policy'],
    required_document_elements: GOV.concat([
      el('least_privilege', 'Requires least privilege / need-to-know', { concepts: ['least privilege', 'need[ -]to[ -]know', 'minimum necessary'], qualifiers: [], good: 'requires least privilege' }),
      el('review_cadence', 'Requires periodic access reviews on a cadence', { concepts: ['access review', 'recertif', 'periodic review'], qualifiers: ['annual', 'quarterly', 'periodic', 'every \\d'], good: 'a review cadence' }),
      el('approval', 'Requires approval before access is granted', { concepts: ['approv', 'authoriz'], qualifiers: ['owner', 'manager', 'prior to'], good: 'approval before grant' }),
    ]),
    required_operational_evidence: ['Access Review / Certification Report'],
    pass_conditions: 'Access procedure with elements AND access-review campaign completion / revocation records.',
    partial_conditions: 'Procedure present, no campaign records → Design only.',
    fail_conditions: 'Wrong document or elements absent.',
    not_enough_evidence_conditions: 'Text not extractable.',
    examples_of_sufficient_evidence: 'Access control policy + completed access-review certification with revocations.',
    examples_of_insufficient_evidence: 'Access policy alone.',
  }),

  // ---- Risk assessment ----
  'nist_800_53_rev5:RA-3': R({
    framework: 'NIST SP 800-53 Rev 5', control_id: 'RA-3', control_name: 'Risk Assessment',
    required_document_types: ['Risk Assessment Methodology', 'Risk Register'],
    required_document_elements: GOV.concat([
      el('methodology', 'Defines a risk methodology (likelihood × impact)', { concepts: ['likelihood', 'impact', 'risk scoring', 'methodology'], qualifiers: [], good: 'likelihood/impact methodology' }),
      el('cadence', 'Requires risk assessment on a cadence', { concepts: ['risk assessment', 'reassess'], qualifiers: ['annual', 'periodic', 'every \\d'], good: 'assessment cadence' }),
      el('treatment', 'Requires risk treatment / acceptance', { concepts: ['treatment', 'mitigat', 'accept', 'remediat'], qualifiers: [], good: 'risk treatment' }),
    ]),
    required_operational_evidence: ['Risk Register', 'Internal Audit Report'],
    pass_conditions: 'Methodology with elements AND a populated, dated risk register with owners and treatment.',
    partial_conditions: 'Methodology present, no populated register → Design only.',
    fail_conditions: 'Wrong document or elements absent.',
    not_enough_evidence_conditions: 'Text not extractable.',
    examples_of_sufficient_evidence: 'Risk methodology + current risk register with owners/treatment.',
    examples_of_insufficient_evidence: 'Methodology alone; an empty register.',
  }),

  // ---- Security awareness ----
  'nist_csf_2_0:PR.AT-01': R({
    framework: 'NIST CSF 2.0', control_id: 'PR.AT-01', control_name: 'Personnel awareness and training',
    required_document_types: ['Security Awareness Policy'],
    required_document_elements: GOV.concat([
      el('program', 'Establishes an awareness/training program', { concepts: ['awareness', 'training'], qualifiers: ['program', 'required', 'annual'], good: 'a formal program' }),
      el('frequency', 'Defines training frequency', { concepts: ['frequency', 'annual', 'periodic'], qualifiers: ['annual', 'quarterly', 'every \\d'], good: 'training cadence' }),
      el('audience', 'Applies to all workforce incl. new hires', { concepts: ['all (employees|staff|workforce)', 'new (hire|employee)', 'onboarding'], qualifiers: [], good: 'covers all personnel' }),
    ]),
    required_operational_evidence: ['Internal Audit Report'],
    pass_conditions: 'Awareness policy with elements AND training completion / attestation records.',
    partial_conditions: 'Policy present, no completion records → Design only.',
    fail_conditions: 'Wrong document or elements absent.',
    not_enough_evidence_conditions: 'Text not extractable.',
    examples_of_sufficient_evidence: 'Awareness policy + training completion export.',
    examples_of_insufficient_evidence: 'Policy alone.',
  }),

  // ---- Change management ----
  'soc2_2017_tsc:CC8.1': R({
    framework: 'SOC 2 (2017 TSC)', control_id: 'CC8.1', control_name: 'Change management',
    required_document_types: ['Change Management Policy'],
    required_document_elements: GOV.concat([
      el('approval', 'Requires change approval', { concepts: ['approv', 'change advisory', 'cab'], qualifiers: [], good: 'change approval' }),
      el('testing', 'Requires testing before implementation', { concepts: ['test', 'qa', 'validation'], qualifiers: [], good: 'pre-implementation testing' }),
      el('emergency', 'Defines emergency-change handling', { required: false, concepts: ['emergency change', 'expedited'], qualifiers: [], good: 'emergency-change process' }),
    ]),
    required_operational_evidence: ['Internal Audit Report'],
    pass_conditions: 'Change policy with elements AND change records with approvals + testing evidence.',
    partial_conditions: 'Policy present, no change records → Design only.',
    fail_conditions: 'Wrong document or elements absent.',
    not_enough_evidence_conditions: 'Text not extractable.',
    examples_of_sufficient_evidence: 'Change policy + change tickets with approvals + test evidence.',
    examples_of_insufficient_evidence: 'Policy alone.',
  }),

  // ---- Data retention (privacy/records) ----
  'soc2_2017_tsc:C1.2': R({
    framework: 'SOC 2 (2017 TSC)', control_id: 'C1.2', control_name: 'Disposal of confidential information',
    required_document_types: ['Data Retention Policy', 'Data Classification Policy'],
    required_document_elements: GOV.concat([
      el('retention_schedule', 'Defines a retention schedule / periods', { concepts: ['retention', 'retain'], qualifiers: ['\\d+\\s*(year|month|day)', 'schedule', 'period'], good: 'defined retention periods' }),
      el('disposal', 'Defines secure disposal', { concepts: ['dispos', 'destruct', 'delet', 'purge', 'sanitiz'], qualifiers: [], good: 'secure disposal' }),
      el('classification', 'References data classification', { concepts: ['classif', 'confidential', 'sensitive'], qualifiers: [], good: 'ties to classification' }),
    ]),
    required_operational_evidence: ['Internal Audit Report'],
    pass_conditions: 'Retention policy with defined periods + disposal AND disposal/evidence records.',
    partial_conditions: 'Policy present, no disposal records → Design only.',
    fail_conditions: 'Wrong document or elements absent.',
    not_enough_evidence_conditions: 'Text not extractable.',
    examples_of_sufficient_evidence: 'Retention policy + disposal logs.',
    examples_of_insufficient_evidence: 'Policy alone.',
  }),
};

function get(frameworkKey, controlId) { return REGISTRY[frameworkKey + ':' + controlId] || null; }
function all() { return Object.keys(REGISTRY).map((k) => REGISTRY[k]); }

module.exports = { REGISTRY, get, all, el };
