'use strict';

/**
 * POST /api/documents/analyze — document evidence analysis against NIST CSF 2.0
 * and NIST SP 800-53 Rev 5 controls.
 *
 * Each document type maps to specific control families. For every control, the
 * analyzer checks for required attributes (policy language, scope, roles,
 * metrics, review cadence, etc.). Each attribute found or missing feeds a CMMI
 * maturity score (1–5) per control, per family, and overall.
 *
 * Returns:
 *   - Per-control CMMI scores with attribute-level evidence
 *   - Per-family/category aggregate scores
 *   - Improvement recommendations with projected score uplift
 *   - Overall document maturity grade
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const logger = require('../utils/logger');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// CMMI maturity levels
const CMMI = {
  1: { label: 'Initial', desc: 'Ad hoc, undocumented' },
  2: { label: 'Managed', desc: 'Documented but inconsistent' },
  3: { label: 'Defined', desc: 'Standardized and repeatable' },
  4: { label: 'Quantitatively Managed', desc: 'Measured and controlled' },
  5: { label: 'Optimizing', desc: 'Continuously improving' },
};

// Control-level attribute requirements per document type.
// Each control has required attributes that must be present for a mature policy.
// Attributes are grouped: policy (P), procedure (R), measurement (M), improvement (I).
const CONTROL_MAP = {
  d1: {
    framework: 'NIST CSF 2.0 / 800-53',
    controls: [
      { id: 'GV.OC-01', family: 'GV', name: 'Organizational Context', attrs: [
        { tag: 'P', key: 'purpose', pat: 'purpose|objective|mission', label: 'Policy purpose statement' },
        { tag: 'P', key: 'scope', pat: 'scope|applicability|all employees|organization-wide', label: 'Scope definition' },
        { tag: 'P', key: 'roles', pat: 'roles|responsibilit|accountab|ciso|security officer', label: 'Roles & responsibilities' },
        { tag: 'R', key: 'enforce', pat: 'enforce|violation|disciplin|sanction|consequence', label: 'Enforcement provisions' },
        { tag: 'M', key: 'review', pat: 'review|annual|periodic|update cycle', label: 'Review cadence' },
        { tag: 'I', key: 'exception', pat: 'exception|waiver|deviation|risk accept', label: 'Exception process' },
      ]},
      { id: 'GV.OC-02', family: 'GV', name: 'Internal Stakeholders', attrs: [
        { tag: 'P', key: 'stakeholders', pat: 'stakeholder|board|executive|management|employee', label: 'Stakeholder identification' },
        { tag: 'P', key: 'communicate', pat: 'communicat|disseminat|awareness|distribute', label: 'Communication plan' },
        { tag: 'R', key: 'training', pat: 'training|awareness|education|onboard', label: 'Training requirement' },
      ]},
      { id: 'PM-1', family: 'PM', name: 'Information Security Program Plan', attrs: [
        { tag: 'P', key: 'program', pat: 'program|framework|nist|iso|security program', label: 'Program definition' },
        { tag: 'P', key: 'governance', pat: 'governance|oversight|committee|steering', label: 'Governance structure' },
        { tag: 'R', key: 'resource', pat: 'resource|budget|fund|staffing|fte', label: 'Resource allocation' },
        { tag: 'M', key: 'metrics', pat: 'metric|measure|kpi|indicator|report', label: 'Performance metrics' },
        { tag: 'I', key: 'improve', pat: 'improve|continuous|lesson|gap|remediat', label: 'Continuous improvement' },
      ]},
      { id: 'PL-1', family: 'PL', name: 'Policy & Procedures', attrs: [
        { tag: 'P', key: 'hierarchy', pat: 'policy|standard|procedure|guideline|hierarchy', label: 'Document hierarchy' },
        { tag: 'P', key: 'approval', pat: 'approv|sign.off|authoriz|endorse', label: 'Approval authority' },
        { tag: 'R', key: 'distribution', pat: 'distribut|publish|intranet|accessible|available', label: 'Distribution method' },
        { tag: 'M', key: 'version', pat: 'version|revision|change log|document control', label: 'Version control' },
      ]},
    ],
  },
  d2: {
    framework: 'NIST CSF 2.0 ID.RA / 800-53 RA',
    controls: [
      { id: 'ID.RA-01', family: 'ID', name: 'Asset Vulnerabilities Identified', attrs: [
        { tag: 'P', key: 'methodology', pat: 'methodolog|approach|framework|process', label: 'Risk methodology' },
        { tag: 'P', key: 'scope', pat: 'scope|asset|system|boundary', label: 'Assessment scope' },
        { tag: 'R', key: 'frequency', pat: 'annual|quarterly|periodic|cadence|schedule', label: 'Assessment frequency' },
        { tag: 'M', key: 'likelihood', pat: 'likelihood|probability|frequenc', label: 'Likelihood scoring' },
        { tag: 'M', key: 'impact', pat: 'impact|consequence|severity|magnitude', label: 'Impact scoring' },
      ]},
      { id: 'ID.RA-02', family: 'ID', name: 'Threat Intelligence', attrs: [
        { tag: 'P', key: 'threat', pat: 'threat|intelligence|adversar|attack|ttp', label: 'Threat identification' },
        { tag: 'R', key: 'sources', pat: 'source|feed|isac|cisa|vendor|intel', label: 'Intelligence sources' },
      ]},
      { id: 'RA-3', family: 'RA', name: 'Risk Assessment', attrs: [
        { tag: 'P', key: 'register', pat: 'register|catalog|inventory|log', label: 'Risk register' },
        { tag: 'P', key: 'appetite', pat: 'appetite|tolerance|threshold|accept', label: 'Risk appetite defined' },
        { tag: 'R', key: 'inherent', pat: 'inherent|gross|before.control', label: 'Inherent risk rating' },
        { tag: 'R', key: 'residual', pat: 'residual|net|after.control|remaining', label: 'Residual risk rating' },
        { tag: 'M', key: 'owner', pat: 'owner|accountab|assign|responsible party', label: 'Risk ownership' },
        { tag: 'I', key: 'treatment', pat: 'treat|mitigat|transfer|accept|avoid|remediat', label: 'Treatment plans' },
      ]},
    ],
  },
  d3: {
    framework: 'NIST CSF 2.0 GV.SC / 800-53 SR',
    controls: [
      { id: 'GV.SC-01', family: 'GV', name: 'Supply Chain Risk Management', attrs: [
        { tag: 'P', key: 'policy', pat: 'third.party|vendor|supplier|supply chain|outsourc', label: 'TPRM policy' },
        { tag: 'P', key: 'tiering', pat: 'tier|critical|classification|categor|risk.rate', label: 'Vendor tiering' },
        { tag: 'R', key: 'diligence', pat: 'due diligence|assessment|questionnaire|review', label: 'Due diligence process' },
        { tag: 'R', key: 'contract', pat: 'contract|sla|agreement|clause|right to audit', label: 'Contractual controls' },
        { tag: 'M', key: 'monitor', pat: 'monitor|ongoing|continuous|reassess|periodic', label: 'Ongoing monitoring' },
        { tag: 'I', key: 'exit', pat: 'exit|terminat|transition|offboard|contingency', label: 'Exit strategy' },
      ]},
      { id: 'SR-2', family: 'SR', name: 'Supply Chain Risk Assessment', attrs: [
        { tag: 'P', key: 'identify', pat: 'identify|inventory|catalog|list', label: 'Vendor inventory' },
        { tag: 'R', key: 'subcontract', pat: 'subcontract|fourth.party|nth.party|sub.process', label: 'Subcontractor oversight' },
      ]},
    ],
  },
  d4: {
    framework: 'NIST CSF 2.0 PR.AA / 800-53 AC',
    controls: [
      { id: 'PR.AA-01', family: 'PR', name: 'Identity Management', attrs: [
        { tag: 'P', key: 'lifecycle', pat: 'lifecycle|provisioning|deprovisioning|onboard|offboard', label: 'Identity lifecycle' },
        { tag: 'P', key: 'leastpriv', pat: 'least privilege|minimum necessary|need.to.know', label: 'Least privilege' },
        { tag: 'R', key: 'rbac', pat: 'role.based|rbac|group|privilege|segregat|sod', label: 'RBAC / SoD' },
        { tag: 'R', key: 'review', pat: 'access review|recertif|periodic review|attestation', label: 'Access review' },
        { tag: 'M', key: 'privileged', pat: 'privileged|admin|root|elevated|pam|service account', label: 'Privileged access mgmt' },
        { tag: 'I', key: 'remote', pat: 'remote|vpn|zero trust|network access', label: 'Remote access controls' },
      ]},
      { id: 'AC-2', family: 'AC', name: 'Account Management', attrs: [
        { tag: 'P', key: 'approval', pat: 'approv|authori|request|workflow', label: 'Approval workflow' },
        { tag: 'R', key: 'disable', pat: 'disab|suspend|lock|inactive|terminat', label: 'Account disablement' },
        { tag: 'M', key: 'monitor', pat: 'monitor|audit|log|alert|anomal', label: 'Account monitoring' },
      ]},
    ],
  },
  d5: {
    framework: '800-53 IA / CSF PR.AA',
    controls: [
      { id: 'IA-2', family: 'IA', name: 'Identification & Authentication', attrs: [
        { tag: 'P', key: 'mfa', pat: 'multi.factor|mfa|two.factor|2fa', label: 'MFA requirement' },
        { tag: 'P', key: 'password', pat: 'password|passphrase|complexity|length|expir', label: 'Password standards' },
        { tag: 'R', key: 'credential', pat: 'credential|secret|token|certificate|key', label: 'Credential management' },
        { tag: 'R', key: 'biometric', pat: 'biometric|fido|webauthn|hardware.key|yubikey', label: 'Strong authenticators' },
        { tag: 'M', key: 'sso', pat: 'single sign|sso|saml|oidc|federation', label: 'SSO / federation' },
      ]},
    ],
  },
  d6: {
    framework: 'NIST CSF 2.0 RS/RC / 800-53 IR',
    controls: [
      { id: 'RS.MA-01', family: 'RS', name: 'Incident Management', attrs: [
        { tag: 'P', key: 'classification', pat: 'classif|severity|priority|sev.1|critical|triage', label: 'Severity classification' },
        { tag: 'P', key: 'escalation', pat: 'escalat|notification|chain|contact|call tree', label: 'Escalation procedures' },
        { tag: 'R', key: 'contain', pat: 'contain|isolat|quarantine|block|eradicat', label: 'Containment steps' },
        { tag: 'R', key: 'forensics', pat: 'forensic|evidence|preserv|chain of custody|image', label: 'Forensics & evidence' },
        { tag: 'M', key: 'playbook', pat: 'playbook|runbook|procedure|response plan', label: 'Response playbooks' },
        { tag: 'M', key: 'metrics', pat: 'mttd|mttr|metric|time to|sla|kpi', label: 'Response metrics' },
        { tag: 'I', key: 'lessons', pat: 'lesson|post.mortem|after.action|root cause|retrospect', label: 'Lessons learned process' },
      ]},
      { id: 'IR-4', family: 'IR', name: 'Incident Handling', attrs: [
        { tag: 'P', key: 'team', pat: 'team|csirt|soc|incident response team|sirt', label: 'Response team definition' },
        { tag: 'R', key: 'exercise', pat: 'exercise|drill|tabletop|simulation|test', label: 'Exercise program' },
      ]},
    ],
  },
  d7: {
    framework: 'NIST CSF 2.0 RC / 800-53 CP',
    controls: [
      { id: 'RC.RP-01', family: 'RC', name: 'Recovery Plan Execution', attrs: [
        { tag: 'P', key: 'rto', pat: 'rto|recovery time|time objective|recovery target', label: 'RTO defined' },
        { tag: 'P', key: 'rpo', pat: 'rpo|recovery point|data loss|point objective', label: 'RPO defined' },
        { tag: 'R', key: 'backup', pat: 'backup|restore|replication|immutable|snapshot', label: 'Backup procedures' },
        { tag: 'R', key: 'failover', pat: 'failover|redundan|hot.site|warm.site|alternate', label: 'Failover capability' },
        { tag: 'M', key: 'test', pat: 'test|exercise|drill|tabletop|simulation|validate', label: 'Testing program' },
        { tag: 'I', key: 'update', pat: 'update|review|annual|maintain|current', label: 'Plan maintenance' },
      ]},
      { id: 'CP-2', family: 'CP', name: 'Contingency Plan', attrs: [
        { tag: 'P', key: 'bia', pat: 'business impact|bia|critical process|essential function', label: 'Business impact analysis' },
        { tag: 'R', key: 'comms', pat: 'communicat|notification|stakeholder|crisis comm', label: 'Crisis communications' },
        { tag: 'R', key: 'succession', pat: 'succession|alternate|delegation|deputy|backup person', label: 'Succession planning' },
      ]},
    ],
  },
  d8: {
    framework: '800-53 CM / SOC 2 CC8',
    controls: [
      { id: 'CM-3', family: 'CM', name: 'Configuration Change Control', attrs: [
        { tag: 'P', key: 'process', pat: 'change.management|change.control|change process|lifecycle', label: 'Change process defined' },
        { tag: 'P', key: 'cab', pat: 'cab|advisory board|review board|approval', label: 'CAB / approval body' },
        { tag: 'R', key: 'categorize', pat: 'categor|standard|normal|emergency|expedit', label: 'Change categorization' },
        { tag: 'R', key: 'rollback', pat: 'rollback|backout|revert|undo', label: 'Rollback procedure' },
        { tag: 'M', key: 'test', pat: 'test|validate|verify|qa|staging', label: 'Pre-deployment testing' },
        { tag: 'I', key: 'audit', pat: 'audit|log|record|trail|document', label: 'Change audit trail' },
      ]},
    ],
  },
  d9: {
    framework: '800-53 CM',
    controls: [
      { id: 'CM-2', family: 'CM', name: 'Baseline Configuration', attrs: [
        { tag: 'P', key: 'baseline', pat: 'baseline|golden.image|standard.build|hardening', label: 'Baseline defined' },
        { tag: 'P', key: 'benchmark', pat: 'cis|stig|benchmark|standard|disa', label: 'Industry benchmarks' },
        { tag: 'R', key: 'patch', pat: 'patch|update|hotfix|remediat|vulnerability', label: 'Patch management' },
        { tag: 'R', key: 'scan', pat: 'scan|assess|audit|check|compliance check', label: 'Compliance scanning' },
        { tag: 'M', key: 'deviation', pat: 'deviat|drift|exception|waiver|variance', label: 'Deviation handling' },
        { tag: 'I', key: 'automation', pat: 'automat|orchestrat|pipeline|ci.cd|infrastructure.as.code', label: 'Automation' },
      ]},
    ],
  },
  d10: {
    framework: 'NIST CSF 2.0 PR.DS / 800-53 MP/SC',
    controls: [
      { id: 'PR.DS-01', family: 'PR', name: 'Data Protection', attrs: [
        { tag: 'P', key: 'classify', pat: 'classif|categor|label|sensitive|confidential|restricted|public', label: 'Classification scheme' },
        { tag: 'P', key: 'handling', pat: 'handling|storage|transmit|dispos|destruct|shred', label: 'Handling procedures' },
        { tag: 'R', key: 'retention', pat: 'retention|archiv|lifecycle|disposal|purge', label: 'Retention schedule' },
        { tag: 'R', key: 'dlp', pat: 'dlp|data loss|prevent|exfiltrat|monitor', label: 'DLP controls' },
        { tag: 'M', key: 'owner', pat: 'owner|custodian|steward|responsible', label: 'Data ownership' },
      ]},
    ],
  },
  d11: {
    framework: '800-53 SC-13 / HIPAA §164.312(a)(2)(iv)',
    controls: [
      { id: 'SC-13', family: 'SC', name: 'Cryptographic Protection', attrs: [
        { tag: 'P', key: 'standard', pat: 'aes|rsa|sha|fips|algorithm|cipher|protocol', label: 'Algorithm standards' },
        { tag: 'P', key: 'rest', pat: 'at rest|storage|disk|database|volume', label: 'Encryption at rest' },
        { tag: 'P', key: 'transit', pat: 'in transit|tls|ssl|https|ipsec|vpn', label: 'Encryption in transit' },
        { tag: 'R', key: 'keyMgmt', pat: 'key.management|key.rotation|hsm|kms|escrow', label: 'Key management' },
        { tag: 'M', key: 'cert', pat: 'certificate|pki|ca|expir|renewal', label: 'Certificate management' },
      ]},
    ],
  },
  d12: {
    framework: 'GDPR / HIPAA Privacy Rule',
    controls: [
      { id: 'PRIV-01', family: 'PRIV', name: 'Privacy Program', attrs: [
        { tag: 'P', key: 'notice', pat: 'notice|transparency|inform|disclose', label: 'Privacy notice' },
        { tag: 'P', key: 'consent', pat: 'consent|opt.in|opt.out|choice|preference', label: 'Consent management' },
        { tag: 'R', key: 'rights', pat: 'right|access|delet|portab|rectif|erasure|data subject', label: 'Data subject rights' },
        { tag: 'R', key: 'dpia', pat: 'dpia|impact assessment|privacy impact|pia', label: 'Privacy impact assessment' },
        { tag: 'M', key: 'breach', pat: 'breach|notification|72.hour|report|incident', label: 'Breach notification' },
        { tag: 'I', key: 'crossborder', pat: 'cross.border|transfer|adequacy|sccs|binding corporate', label: 'Cross-border transfers' },
      ]},
    ],
  },
  d13: {
    framework: 'SOC 2 Type II',
    controls: [
      { id: 'SOC2-TSC', family: 'TSC', name: 'Trust Services Criteria', attrs: [
        { tag: 'P', key: 'scope', pat: 'scope|system|boundary|service|description', label: 'Scope definition' },
        { tag: 'P', key: 'criteria', pat: 'criteria|cc[1-9]|common criteria|trust service', label: 'Trust criteria coverage' },
        { tag: 'R', key: 'controls', pat: 'control|safeguard|measure|procedure', label: 'Control descriptions' },
        { tag: 'R', key: 'testing', pat: 'test|sample|evidence|walk.?through|inquiry|inspect', label: 'Testing methodology' },
        { tag: 'M', key: 'exceptions', pat: 'exception|deviation|qualification|gap|finding', label: 'Exceptions noted' },
        { tag: 'M', key: 'opinion', pat: 'opinion|unqualified|qualified|adverse|assurance', label: 'Auditor opinion' },
        { tag: 'I', key: 'monitoring', pat: 'monitor|continuous|ongoing|detect|response', label: 'Continuous monitoring' },
      ]},
    ],
  },
  d14: {
    framework: 'NIST CSF 2.0 ID.RA / 800-53 CA-8',
    controls: [
      { id: 'CA-8', family: 'CA', name: 'Penetration Testing', attrs: [
        { tag: 'P', key: 'scope', pat: 'scope|target|system|asset|network|application', label: 'Test scope' },
        { tag: 'P', key: 'methodology', pat: 'methodolog|owasp|ptes|nist|approach|standard', label: 'Testing methodology' },
        { tag: 'R', key: 'findings', pat: 'finding|vulnerabilit|weakness|issue|risk', label: 'Findings documented' },
        { tag: 'R', key: 'cvss', pat: 'cvss|severity|critical|high|medium|low|score', label: 'Severity scoring' },
        { tag: 'M', key: 'remediation', pat: 'remediat|fix|patch|mitigat|action plan|timeline', label: 'Remediation tracking' },
        { tag: 'I', key: 'retest', pat: 'retest|verify|validat|follow.up|close', label: 'Retest validation' },
      ]},
    ],
  },
  d15: {
    framework: 'NIST CSF 2.0 PR.AT / 800-53 AT',
    controls: [
      { id: 'AT-2', family: 'AT', name: 'Awareness Training', attrs: [
        { tag: 'P', key: 'program', pat: 'program|curriculum|module|course|training', label: 'Training program' },
        { tag: 'P', key: 'frequency', pat: 'annual|quarterly|periodic|cadence|schedule', label: 'Training frequency' },
        { tag: 'R', key: 'phishing', pat: 'phishing|simulation|social engineer|test|campaign', label: 'Phishing simulation' },
        { tag: 'M', key: 'completion', pat: 'completion|participation|rate|track|record', label: 'Completion tracking' },
        { tag: 'I', key: 'tailored', pat: 'role.based|tailored|specialized|privileged|developer', label: 'Role-based content' },
      ]},
    ],
  },
  d16: {
    framework: '800-53 AU / CSF DE',
    controls: [
      { id: 'AU-2', family: 'AU', name: 'Event Logging', attrs: [
        { tag: 'P', key: 'events', pat: 'event|log|audit|record|what to log', label: 'Loggable events defined' },
        { tag: 'P', key: 'retention', pat: 'retention|archiv|storage|period|days|year', label: 'Retention policy' },
        { tag: 'R', key: 'centralize', pat: 'central|siem|aggregat|collect|correlat', label: 'Centralized logging' },
        { tag: 'R', key: 'tamper', pat: 'tamper|integrity|immutable|write.once|protect', label: 'Tamper protection' },
        { tag: 'M', key: 'alert', pat: 'alert|detect|trigger|threshold|anomal|rule', label: 'Alert rules' },
        { tag: 'I', key: 'review', pat: 'review|analys|monitor|investigate|periodic', label: 'Log review process' },
      ]},
    ],
  },
  // AI governance documents (uploaded from the onboarding AI risk & governance section).
  // Reviewed exactly like any other policy — control-by-control against the AI frameworks.
  d17: {
    framework: 'NIST AI RMF 1.0',
    controls: [
      { id: 'GOVERN-1', family: 'GV', name: 'AI governance & accountability', attrs: [
        { tag: 'P', key: 'policy', pat: 'ai polic|governance|responsible ai|accountab|oversight', label: 'AI governance policy' },
        { tag: 'P', key: 'roles', pat: 'role|responsib|owner|committee|steward|raci', label: 'Roles & accountability' },
        { tag: 'R', key: 'riskproc', pat: 'risk management|risk process|assess|tolerance|appetite', label: 'Risk-management process' },
        { tag: 'M', key: 'inventory', pat: 'inventory|catalog|register|ai.?bom|model registry', label: 'AI inventory / registry' },
        { tag: 'I', key: 'lifecycle', pat: 'lifecycle|deploy|monitor|retire|decommission', label: 'Lifecycle governance' },
      ]},
      { id: 'MAP-1', family: 'MP', name: 'AI risk context & mapping', attrs: [
        { tag: 'P', key: 'context', pat: 'context|use case|purpose|intended use|deployment', label: 'Use-case context' },
        { tag: 'P', key: 'categorize', pat: 'categor|classif|risk tier|high.?risk|impact level', label: 'Risk categorization' },
        { tag: 'R', key: 'impact', pat: 'impact|harm|bias|fairness|safety|discriminat', label: 'Impact & harm analysis' },
        { tag: 'M', key: 'stakeholder', pat: 'stakeholder|affected|end user|community|subject', label: 'Stakeholder identification' },
      ]},
      { id: 'MEASURE-2', family: 'MS', name: 'AI measurement & testing', attrs: [
        { tag: 'P', key: 'metrics', pat: 'metric|measure|evaluat|benchmark|test', label: 'Evaluation metrics' },
        { tag: 'R', key: 'redteam', pat: 'red.?team|adversar|robustness|owasp|atlas|penetration', label: 'Adversarial testing' },
        { tag: 'R', key: 'monitor', pat: 'monitor|drift|performance|accuracy|continuous', label: 'Ongoing monitoring' },
        { tag: 'M', key: 'validate', pat: 'validat|verif|assur|audit|evidence', label: 'Validation & assurance' },
      ]},
      { id: 'MANAGE-4', family: 'MG', name: 'AI risk response & incident mgmt', attrs: [
        { tag: 'P', key: 'response', pat: 'respon|mitigat|treat|remediat|control', label: 'Risk-response plan' },
        { tag: 'R', key: 'incident', pat: 'incident|escalat|report|playbook|response plan', label: 'AI incident response' },
        { tag: 'R', key: 'oversight', pat: 'human.in.the.loop|human oversight|review|approval|kill switch|override', label: 'Human oversight' },
        { tag: 'I', key: 'improve', pat: 'improv|feedback|update|retrain|lesson', label: 'Continuous improvement' },
      ]},
    ],
  },
  d18: {
    framework: 'ISO/IEC 42001:2023 AIMS',
    controls: [
      { id: 'A.5', family: 'AIMS', name: 'AI management system & policy', attrs: [
        { tag: 'P', key: 'policy', pat: 'ai management|aims|policy|objective|scope', label: 'AIMS policy & scope' },
        { tag: 'P', key: 'leadership', pat: 'leadership|top management|commitment|resource', label: 'Leadership commitment' },
        { tag: 'R', key: 'planning', pat: 'plan|risk|opportunit|objective|control', label: 'Planning & objectives' },
        { tag: 'M', key: 'support', pat: 'competence|awareness|communication|document', label: 'Support & documentation' },
      ]},
      { id: 'A.6', family: 'AIMS', name: 'AI lifecycle & operation', attrs: [
        { tag: 'P', key: 'lifecycle', pat: 'lifecycle|design|develop|deploy|operat', label: 'AI system lifecycle' },
        { tag: 'R', key: 'impact', pat: 'impact assessment|ai.?ia|risk assessment|consequence', label: 'AI impact assessment' },
        { tag: 'R', key: 'data', pat: 'data|training data|quality|provenance|governance', label: 'Data governance' },
        { tag: 'M', key: 'performance', pat: 'performance|evaluat|monitor|measure|audit', label: 'Performance evaluation' },
        { tag: 'I', key: 'improve', pat: 'nonconform|corrective|improv|continual', label: 'Continual improvement' },
      ]},
    ],
  },
  d19: {
    framework: 'AI Acceptable-Use Policy',
    controls: [
      { id: 'AUP-01', family: 'PR', name: 'Acceptable use of AI', attrs: [
        { tag: 'P', key: 'scope', pat: 'acceptable use|permitted|prohibited|scope|appl', label: 'Permitted / prohibited use' },
        { tag: 'P', key: 'approval', pat: 'approv|sanction|authoriz|board|sign.?off', label: 'Approval & authorization' },
        { tag: 'R', key: 'data', pat: 'confidential|sensitive|pii|phi|do not|prohibit', label: 'Data-handling limits' },
        { tag: 'R', key: 'tools', pat: 'tool|genai|chatgpt|copilot|assistant|shadow', label: 'Sanctioned tools' },
        { tag: 'M', key: 'enforce', pat: 'enforc|violation|discipline|consequence|monitor', label: 'Enforcement' },
        { tag: 'I', key: 'training', pat: 'train|aware|educat|guidance|onboard', label: 'User guidance & training' },
      ]},
    ],
  },
};

// ---------------------------------------------------------------------------
// Full NIST CSF 2.0 sub-category coverage (additive).
//
// The hand-tuned CONTROL_MAP above scores one representative control per family.
// But the cockpit's framework tab renders the ENTIRE CSF 2.0 catalog (106
// sub-categories), so a perfect Access-Control Policy used to light only
// PR.AA-01 and leave PR.AA-02..06 stuck at "Non-existent". That was a coverage
// gap in the analyzer, not a gap in the customer's documents.
//
// CSF_DOC_COVERAGE maps every remaining sub-category to the ONE policy document
// that authoritatively evidences it, with attribute patterns drawn from the
// control's actual intent. It is merged into CONTROL_MAP at load. Scoring is the
// SAME proportion-based engine (keyword fallback) / semantic LLM path — a family
// a policy genuinely covers scores high, one it barely addresses scores low. No
// score is hard-coded; a control the uploaded doc doesn't discuss still lands at
// Initial (1), which is the honest reading of "policy exists, ad hoc here."
//
// Detection controls that are fundamentally operational telemetry (DE.CM-*,
// PR.IR-01 network access) are intentionally NOT document-mapped — they are
// evidenced by connected tools (SIEM/EDR/segmentation) in the cockpit, so the
// two evidence sources together cover the full catalog with no overlap.
const CSF_DOC_COVERAGE = {
  // d1 Information Security Policy → the governance backbone (GV.OC/RR/PO/OV) + PR.AT
  d1: [
    { id: 'GV.OC-03', family: 'GV', name: 'Legal, regulatory & contractual requirements', attrs: [
      { tag: 'P', key: 'legal', pat: 'legal|regulator|statut|\\blaw\\b|compliance obligation', label: 'Legal & regulatory obligations' },
      { tag: 'P', key: 'contract', pat: 'contract|obligation|shareholder|nyse|customer', label: 'Contractual obligations' },
      { tag: 'M', key: 'manage', pat: 'understood|managed|align|maintain|obligation', label: 'Requirements understood & managed' },
    ]},
    { id: 'GV.OC-04', family: 'GV', name: 'Critical objectives, capabilities & services', attrs: [
      { tag: 'P', key: 'mission', pat: 'mission|business strateg|objective|critical', label: 'Critical objectives understood' },
      { tag: 'P', key: 'services', pat: 'platform|portfolio|service|capabilit|operation', label: 'Key capabilities & services identified' },
    ]},
    { id: 'GV.OC-05', family: 'GV', name: 'Dependencies & required outcomes', attrs: [
      { tag: 'P', key: 'depend', pat: 'depend|underpin|support|reli|infrastructure', label: 'Dependencies understood' },
      { tag: 'P', key: 'cia', pat: 'confidential|integrity|availab', label: 'Required outcomes (CIA)' },
    ]},
    { id: 'GV.RR-01', family: 'GV', name: 'Leadership accountable for cyber risk', attrs: [
      { tag: 'P', key: 'board', pat: 'board|audit committee|leadership|executive', label: 'Board / leadership oversight' },
      { tag: 'P', key: 'accountable', pat: 'accountab|oversight|ultimate|steering committee', label: 'Leadership accountability' },
    ]},
    { id: 'GV.RR-02', family: 'GV', name: 'Roles, responsibilities & authorities enforced', attrs: [
      { tag: 'P', key: 'roles', pat: 'role|responsib|ciso|owner', label: 'Roles & responsibilities defined' },
      { tag: 'R', key: 'enforce', pat: 'enforce|mandatory|comply|complian|shared', label: 'Established & enforced' },
    ]},
    { id: 'GV.RR-03', family: 'GV', name: 'Resources allocated to risk strategy', attrs: [
      { tag: 'R', key: 'resource', pat: 'resource|budget|fund|staffing|fte', label: 'Adequate resources allocated' },
    ]},
    { id: 'GV.RR-04', family: 'GV', name: 'Cybersecurity in human-resources practices', attrs: [
      { tag: 'R', key: 'hr', pat: 'human resource|\\bhr\\b|onboard|training', label: 'HR integration' },
      { tag: 'R', key: 'disciplin', pat: 'disciplin|termination|sanction|conduct', label: 'HR consequences' },
    ]},
    { id: 'GV.PO-01', family: 'GV', name: 'Policy for managing cyber risk established', attrs: [
      { tag: 'P', key: 'policy', pat: 'policy|establish|program|framework', label: 'Policy established' },
      { tag: 'P', key: 'approve', pat: 'approv|authoriz|endorse|sign', label: 'Approved & authorized' },
    ]},
    { id: 'GV.PO-02', family: 'GV', name: 'Policy reviewed, updated, communicated & enforced', attrs: [
      { tag: 'M', key: 'review', pat: 'review|annual|update cycle|periodic', label: 'Reviewed & updated' },
      { tag: 'R', key: 'comm', pat: 'communicat|disseminat|publish|distribut|intranet', label: 'Communicated' },
      { tag: 'R', key: 'enforce', pat: 'enforce|violation|disciplin|mandatory', label: 'Enforced' },
    ]},
    { id: 'GV.OV-01', family: 'GV', name: 'Risk strategy outcomes reviewed', attrs: [
      { tag: 'M', key: 'outcome', pat: 'outcome|effectiveness|kpi|metric|review', label: 'Outcomes reviewed' },
      { tag: 'I', key: 'inform', pat: 'inform|adjust|improve|strateg|decision', label: 'Used to inform strategy' },
    ]},
    { id: 'GV.OV-02', family: 'GV', name: 'Risk strategy reviewed to cover requirements', attrs: [
      { tag: 'M', key: 'cover', pat: 'review|cover|requirement|benchmark|gap|assessment', label: 'Coverage reviewed' },
    ]},
    { id: 'GV.OV-03', family: 'GV', name: 'Risk management performance evaluated', attrs: [
      { tag: 'M', key: 'perf', pat: 'performance|metric|measure|evaluat|report|indicator', label: 'Performance evaluated' },
    ]},
    { id: 'PR.AT-01', family: 'PR', name: 'Personnel awareness & training', attrs: [
      { tag: 'P', key: 'program', pat: 'awareness|training|educat', label: 'Awareness program' },
      { tag: 'P', key: 'freq', pat: 'annual|onboard|refresher|periodic|mandatory', label: 'Delivered on a cadence' },
      { tag: 'R', key: 'phish', pat: 'phishing|simulation|campaign|culture', label: 'Reinforcement' },
    ]},
    { id: 'PR.AT-02', family: 'PR', name: 'Role-based training for specialized roles', attrs: [
      { tag: 'I', key: 'role', pat: 'role.based|specialized|tailored|privileged|developer', label: 'Role-based content' },
    ]},
  ],
  // d2 Risk Assessment / Register → GV.RM (risk strategy) + ID.RA (assessment) + ID.IM-01
  d2: [
    { id: 'GV.RM-01', family: 'GV', name: 'Risk management objectives established', attrs: [
      { tag: 'P', key: 'obj', pat: 'risk management|objective|methodolog|framework', label: 'Objectives established' },
      { tag: 'P', key: 'agree', pat: 'approved|board|agreed|defensible|consistent', label: 'Agreed by stakeholders' },
    ]},
    { id: 'GV.RM-02', family: 'GV', name: 'Risk appetite & tolerance established', attrs: [
      { tag: 'P', key: 'appetite', pat: 'appetite|tolerance|threshold', label: 'Appetite & tolerance defined' },
      { tag: 'R', key: 'accept', pat: 'accept|within.{0,12}tolerance|band|sign.off', label: 'Acceptance rules' },
    ]},
    { id: 'GV.RM-03', family: 'GV', name: 'Cyber risk included in enterprise risk management', attrs: [
      { tag: 'P', key: 'erm', pat: 'enterprise risk|\\berm\\b|business objective|corporate risk|council', label: 'Integrated with ERM' },
    ]},
    { id: 'GV.RM-04', family: 'GV', name: 'Strategic direction for risk response established', attrs: [
      { tag: 'P', key: 'direction', pat: 'treat|mitigat|transfer|avoid|response|remediat', label: 'Response direction set' },
    ]},
    { id: 'GV.RM-05', family: 'GV', name: 'Lines of communication for cyber risk established', attrs: [
      { tag: 'R', key: 'comm', pat: 'report|council|committee|leadership|communicat|escalat', label: 'Communication lines' },
    ]},
    { id: 'GV.RM-06', family: 'GV', name: 'Standardized method to calculate & prioritize risk', attrs: [
      { tag: 'M', key: 'method', pat: 'scor|likelihood|impact|prioriti|rating|scale', label: 'Standardized scoring' },
      { tag: 'M', key: 'inherent', pat: 'inherent|gross|residual|net', label: 'Inherent vs residual' },
    ]},
    { id: 'GV.RM-07', family: 'GV', name: 'Strategic opportunities (positive risk) characterized', attrs: [
      { tag: 'I', key: 'opp', pat: 'opportunit|positive risk|risk.based decision|business objective', label: 'Opportunities characterized' },
    ]},
    { id: 'ID.RA-03', family: 'ID', name: 'Internal & external threats identified & recorded', attrs: [
      { tag: 'P', key: 'threat', pat: 'threat|adversar|attack|ttp|mitre', label: 'Threats identified' },
      { tag: 'R', key: 'record', pat: 'register|record|catalog|document', label: 'Threats recorded' },
    ]},
    { id: 'ID.RA-04', family: 'ID', name: 'Impacts & likelihoods of threats identified', attrs: [
      { tag: 'M', key: 'like', pat: 'likelihood|probability|frequenc', label: 'Likelihood assessed' },
      { tag: 'M', key: 'impact', pat: 'impact|consequence|severity|magnitude', label: 'Impact assessed' },
    ]},
    { id: 'ID.RA-05', family: 'ID', name: 'Threats, vulns, likelihoods & impacts inform risk', attrs: [
      { tag: 'M', key: 'inherent', pat: 'inherent|gross|residual|net|risk rating', label: 'Risk determination' },
      { tag: 'M', key: 'inform', pat: 'inform|determine|derive|prioriti', label: 'Used to prioritize' },
    ]},
    { id: 'ID.RA-06', family: 'ID', name: 'Risk responses chosen, prioritized & tracked', attrs: [
      { tag: 'R', key: 'treat', pat: 'treat|mitigat|transfer|accept|avoid', label: 'Responses chosen' },
      { tag: 'M', key: 'track', pat: 'track|closure|remediation|status|target', label: 'Tracked to closure' },
    ]},
    { id: 'ID.RA-07', family: 'ID', name: 'Changes & exceptions managed & tracked', attrs: [
      { tag: 'R', key: 'except', pat: 'exception|waiver|off.cycle|material change|re.assess', label: 'Changes & exceptions managed' },
    ]},
    { id: 'ID.IM-01', family: 'ID', name: 'Improvements identified from evaluations', attrs: [
      { tag: 'I', key: 'eval', pat: 'audit|assessment|evaluat|finding|gap|lesson|re.validat', label: 'Improvements from evaluations' },
    ]},
  ],
  // d3 Third-Party / Supply-Chain Policy → GV.SC (whole family) + ID.RA-09/10 (supplier integrity)
  d3: [
    { id: 'GV.SC-02', family: 'GV', name: 'Cyber roles for suppliers & partners established', attrs: [
      { tag: 'P', key: 'roles', pat: 'role|responsib|business owner|relationship manager|flow.down|committee', label: 'Supplier roles established' },
    ]},
    { id: 'GV.SC-03', family: 'GV', name: 'C-SCRM integrated into cyber & enterprise risk', attrs: [
      { tag: 'P', key: 'integrate', pat: 'integrat|enterprise|escalat|report|committee|board', label: 'Integrated into risk mgmt' },
    ]},
    { id: 'GV.SC-04', family: 'GV', name: 'Suppliers known & prioritized by criticality', attrs: [
      { tag: 'P', key: 'inventory', pat: 'inventory|catalog|register|identif', label: 'Supplier inventory' },
      { tag: 'P', key: 'tier', pat: 'tier|criticalit|prioriti|classif', label: 'Prioritized by criticality' },
    ]},
    { id: 'GV.SC-05', family: 'GV', name: 'Supply-chain requirements integrated into contracts', attrs: [
      { tag: 'R', key: 'contract', pat: 'contract|clause|\\bsla\\b|agreement|right.{0,6}audit', label: 'Requirements in contracts' },
    ]},
    { id: 'GV.SC-06', family: 'GV', name: 'Due diligence before supplier relationships', attrs: [
      { tag: 'R', key: 'dd', pat: 'due diligence|questionnaire|assessment|before contract|prior to', label: 'Pre-engagement due diligence' },
    ]},
    { id: 'GV.SC-07', family: 'GV', name: 'Supplier risks assessed, recorded & monitored', attrs: [
      { tag: 'R', key: 'assess', pat: 'assess|risk.rat|classif|finding', label: 'Risks assessed' },
      { tag: 'M', key: 'monitor', pat: 'monitor|reassess|ongoing|continuous|periodic', label: 'Ongoing monitoring' },
    ]},
    { id: 'DE.CM-06', family: 'DE', name: 'External service-provider activities are monitored', attrs: [
      { tag: 'M', key: 'monitor', pat: 'continuous monitor|ongoing monitor|security.{0,4}rating|reassess|breach alert|sla performance|external.{0,12}monitor', label: 'External provider monitoring' },
    ]},
    { id: 'GV.SC-08', family: 'GV', name: 'Suppliers included in incident planning & recovery', attrs: [
      { tag: 'R', key: 'incident', pat: 'incident|contingency|breach.{0,6}notif|business.{0,4}continuit|resilience', label: 'Supplier incident planning' },
    ]},
    { id: 'GV.SC-09', family: 'GV', name: 'Supply-chain security integrated across the lifecycle', attrs: [
      { tag: 'P', key: 'lifecycle', pat: 'lifecycle|onboard|offboard|provenance|integrity|counterfeit', label: 'Lifecycle security' },
    ]},
    { id: 'GV.SC-10', family: 'GV', name: 'C-SCRM plans cover post-partnership activities', attrs: [
      { tag: 'I', key: 'exit', pat: 'exit|terminat|offboard|transition|destruction|return', label: 'Exit & offboarding' },
    ]},
    { id: 'ID.RA-09', family: 'ID', name: 'Authenticity & integrity of hardware/software assessed', attrs: [
      { tag: 'R', key: 'integrity', pat: 'provenance|counterfeit|integrity|authentic|hardware|firmware', label: 'Hw/sw integrity assessed' },
    ]},
    { id: 'ID.RA-10', family: 'ID', name: 'Critical suppliers assessed prior to acquisition', attrs: [
      { tag: 'R', key: 'preacq', pat: 'due diligence|prior to|before|tier 1|critical supplier|onboard', label: 'Pre-acquisition assessment' },
    ]},
  ],
  // d4 Access Control Policy → PR.AA-05 (least privilege / SoD), PR.AA-06 (physical)
  d4: [
    { id: 'PR.AA-05', family: 'PR', name: 'Access enforces least privilege & separation of duties', attrs: [
      { tag: 'P', key: 'leastpriv', pat: 'least privilege|minimum necessary|need.to.know', label: 'Least privilege' },
      { tag: 'R', key: 'sod', pat: 'separation of duties|\\bsod\\b|segregat|rbac|role.based', label: 'Separation of duties / RBAC' },
      { tag: 'R', key: 'review', pat: 'access review|recertif|attestation|periodic review', label: 'Access review & recertification' },
    ]},
    { id: 'PR.AA-06', family: 'PR', name: 'Physical access to assets managed & monitored', attrs: [
      { tag: 'P', key: 'physical', pat: 'physical access|facilit|badge|premises|data center access|visitor', label: 'Physical access managed' },
      { tag: 'M', key: 'monitor', pat: 'monitor|cctv|surveillance|log|escort', label: 'Physical access monitored' },
    ]},
    { id: 'DE.CM-03', family: 'DE', name: 'Personnel activity & technology usage are monitored', attrs: [
      { tag: 'M', key: 'monitor', pat: 'monitor|anomal|alert|siem|impossible.travel|behavior|audit trail', label: 'User & usage monitoring' },
    ]},
  ],
  // d5 Identity & Authentication Policy → PR.AA-02/03/04
  d5: [
    { id: 'PR.AA-02', family: 'PR', name: 'Identities proofed & bound to credentials', attrs: [
      { tag: 'P', key: 'proof', pat: 'identity|proof|verif|onboard|provision|joiner|binding', label: 'Identity proofing & binding' },
      { tag: 'R', key: 'lifecycle', pat: 'lifecycle|joiner|mover|leaver|deprovision', label: 'Lifecycle managed' },
    ]},
    { id: 'PR.AA-03', family: 'PR', name: 'Users, services & hardware are authenticated', attrs: [
      { tag: 'P', key: 'mfa', pat: 'multi.factor|\\bmfa\\b|2fa|two.factor|authenticat', label: 'MFA enforced' },
      { tag: 'R', key: 'strong', pat: 'password|passphrase|credential|certificate|biometric|fido|webauthn', label: 'Strong authenticators' },
    ]},
    { id: 'PR.AA-04', family: 'PR', name: 'Identity assertions are protected & verified', attrs: [
      { tag: 'M', key: 'sso', pat: 'sso|single sign|saml|oidc|openid|federation|token|assertion', label: 'Federated assertions protected' },
    ]},
  ],
  // d6 Incident Response Plan → DE.AE (analysis) + RS.MA/AN/CO/MI + ID.IM-02/03/04
  d6: [
    { id: 'DE.AE-02', family: 'DE', name: 'Potentially adverse events are analyzed', attrs: [
      { tag: 'R', key: 'analyze', pat: 'triage|validat|analy|scoping|detect', label: 'Events analyzed' },
    ]},
    { id: 'DE.AE-03', family: 'DE', name: 'Information is correlated from multiple sources', attrs: [
      { tag: 'R', key: 'correlate', pat: 'siem|correlat|multiple|feed|telemetry|edr|xdr', label: 'Multi-source correlation' },
    ]},
    { id: 'DE.AE-04', family: 'DE', name: 'Impact & scope of adverse events are understood', attrs: [
      { tag: 'M', key: 'scope', pat: 'scope|impact|blast radius|asset criticalit|business impact', label: 'Impact & scope understood' },
    ]},
    { id: 'DE.AE-06', family: 'DE', name: 'Event information is provided to authorized staff', attrs: [
      { tag: 'R', key: 'notify', pat: 'escalat|notif|\\bsoc\\b|csirt|report|call tree', label: 'Escalated to staff' },
    ]},
    { id: 'DE.AE-07', family: 'DE', name: 'Threat intelligence is integrated into analysis', attrs: [
      { tag: 'R', key: 'ti', pat: 'threat intel|intelligence|feed|ioc|mitre|att.ck', label: 'Threat intel integrated' },
    ]},
    { id: 'DE.AE-08', family: 'DE', name: 'Incidents are declared when criteria are met', attrs: [
      { tag: 'P', key: 'declare', pat: 'classif|severity|sev.1|criteria|declar|confirmed incident', label: 'Declaration criteria' },
    ]},
    { id: 'RS.MA-02', family: 'RS', name: 'Incident reports are triaged & validated', attrs: [
      { tag: 'R', key: 'triage', pat: 'triage|validat|alert|confirm', label: 'Triaged & validated' },
    ]},
    { id: 'RS.MA-03', family: 'RS', name: 'Incidents are categorized & prioritized', attrs: [
      { tag: 'P', key: 'prioritize', pat: 'classif|severity|priority|categor', label: 'Categorized & prioritized' },
    ]},
    { id: 'RS.MA-04', family: 'RS', name: 'Incidents are escalated or elevated as needed', attrs: [
      { tag: 'R', key: 'escalate', pat: 'escalat|elevat|call tree|chain|notif', label: 'Escalation path' },
    ]},
    { id: 'RS.MA-05', family: 'RS', name: 'Criteria for initiating recovery are applied', attrs: [
      { tag: 'P', key: 'recover', pat: 'recover|restor|resume|closing|normal operation', label: 'Recovery initiation criteria' },
    ]},
    { id: 'RS.AN-03', family: 'RS', name: 'Root cause & sequence of events are established', attrs: [
      { tag: 'M', key: 'rca', pat: 'root cause|sequence|timeline|post.mortem|after.action', label: 'Root-cause analysis' },
    ]},
    { id: 'RS.AN-06', family: 'RS', name: 'Investigation actions are recorded with integrity', attrs: [
      { tag: 'R', key: 'record', pat: 'record|log|case management|document|integrity|hash', label: 'Actions recorded' },
    ]},
    { id: 'RS.AN-07', family: 'RS', name: 'Incident data & metadata are preserved', attrs: [
      { tag: 'R', key: 'preserve', pat: 'preserv|evidence|chain of custody|imaging|hash|locker', label: 'Evidence preserved' },
    ]},
    { id: 'RS.AN-08', family: 'RS', name: 'An incident magnitude is estimated & validated', attrs: [
      { tag: 'M', key: 'magnitude', pat: 'magnitude|scope|impact|estimat|extent|blast', label: 'Magnitude estimated' },
    ]},
    { id: 'RS.CO-02', family: 'RS', name: 'Stakeholders are notified of incidents', attrs: [
      { tag: 'R', key: 'notify', pat: 'notif|report|regulat|72.hour|customer|disclos', label: 'Stakeholder notification' },
    ]},
    { id: 'RS.CO-03', family: 'RS', name: 'Information is shared with designated stakeholders', attrs: [
      { tag: 'R', key: 'share', pat: 'communicat|share|stakeholder|liaison|status|bridge', label: 'Information sharing' },
    ]},
    { id: 'RS.MI-01', family: 'RS', name: 'Incidents are contained', attrs: [
      { tag: 'R', key: 'contain', pat: 'contain|isolat|quarantine|block|disabl', label: 'Containment' },
    ]},
    { id: 'RS.MI-02', family: 'RS', name: 'Incidents are eradicated', attrs: [
      { tag: 'R', key: 'eradicate', pat: 'eradicat|remov|rebuild|rotat|clos', label: 'Eradication' },
    ]},
    { id: 'ID.IM-02', family: 'ID', name: 'Improvements identified from tests & exercises', attrs: [
      { tag: 'I', key: 'exercise', pat: 'exercise|drill|tabletop|simulation|test|red.team', label: 'Exercise program' },
    ]},
    { id: 'ID.IM-03', family: 'ID', name: 'Improvements identified from operations', attrs: [
      { tag: 'I', key: 'ops', pat: 'lesson|post.mortem|after.action|retrospect|remediation', label: 'Operational learning' },
    ]},
    { id: 'ID.IM-04', family: 'ID', name: 'Incident response & other plans maintained & improved', attrs: [
      { tag: 'I', key: 'maintain', pat: 'review|update|annual|maintain|revision', label: 'Plans maintained' },
    ]},
  ],
  // d7 Business Continuity / DR Plan → PR.DS-11, PR.IR-02/03/04, RC.RP-02..06, RC.CO-03/04
  d7: [
    { id: 'PR.DS-11', family: 'PR', name: 'Backups are created, protected & tested', attrs: [
      { tag: 'P', key: 'backup', pat: 'backup|snapshot|replicat|immutable', label: 'Backups created & protected' },
      { tag: 'M', key: 'test', pat: 'restore|test|rehearsal|verif|validat', label: 'Backups tested' },
    ]},
    { id: 'PR.IR-02', family: 'PR', name: 'Assets protected from environmental threats', attrs: [
      { tag: 'P', key: 'env', pat: 'data center|facilit|environmental|carrier|power|colocation', label: 'Environmental protection' },
    ]},
    { id: 'DE.CM-02', family: 'DE', name: 'The physical environment is monitored', attrs: [
      { tag: 'M', key: 'physmon', pat: 'physical.{0,20}monitor|environmental.{0,12}monitor|data center.{0,20}monitor|facility.{0,12}monitor|surveillance|cctv|sensor', label: 'Physical-environment monitoring' },
    ]},
    { id: 'PR.IR-03', family: 'PR', name: 'Mechanisms achieve resilience requirements', attrs: [
      { tag: 'P', key: 'resil', pat: 'redundan|failover|hot.site|warm.site|resilien|alternate', label: 'Resilience mechanisms' },
    ]},
    { id: 'PR.IR-04', family: 'PR', name: 'Adequate resource capacity is maintained', attrs: [
      { tag: 'M', key: 'capacity', pat: 'capacity|scal|load|provision|resource', label: 'Capacity maintained' },
    ]},
    { id: 'RC.RP-02', family: 'RC', name: 'Recovery actions are selected, scoped & performed', attrs: [
      { tag: 'R', key: 'scope', pat: 'recover|failover|runbook|restore|activate|cutover', label: 'Recovery actions scoped' },
    ]},
    { id: 'RC.RP-03', family: 'RC', name: 'Integrity of backups verified before restoration', attrs: [
      { tag: 'M', key: 'verify', pat: 'restore.{0,12}verif|integrity|validat|rehearsal|3.2.1', label: 'Backup integrity verified' },
    ]},
    { id: 'RC.RP-04', family: 'RC', name: 'Post-incident operational norms established', attrs: [
      { tag: 'P', key: 'norms', pat: 'normal operation|resume|production|post.incident|business.as.usual', label: 'Operational norms restored' },
    ]},
    { id: 'RC.RP-05', family: 'RC', name: 'Integrity of restored assets is verified', attrs: [
      { tag: 'M', key: 'restored', pat: 'confirm|verif|integrity|monitor|validate recovery|reinfection', label: 'Restored integrity verified' },
    ]},
    { id: 'RC.RP-06', family: 'RC', name: 'End of recovery is declared & documented', attrs: [
      { tag: 'P', key: 'declare', pat: 'declar|closing|after.action|certif|complete|report', label: 'Recovery closed & documented' },
    ]},
    { id: 'RC.CO-03', family: 'RC', name: 'Recovery progress communicated to stakeholders', attrs: [
      { tag: 'R', key: 'comm', pat: 'communicat|status page|notif|stakeholder|update', label: 'Progress communicated' },
    ]},
    { id: 'RC.CO-04', family: 'RC', name: 'Public updates shared via approved methods', attrs: [
      { tag: 'R', key: 'public', pat: 'public|customer|status page|holding statement|channel', label: 'Public updates' },
    ]},
  ],
  // d8 Change Management Policy → PR.PS-06 (secure software delivery / SDLC gate)
  d8: [
    { id: 'PR.PS-06', family: 'PR', name: 'Secure software development practices integrated', attrs: [
      { tag: 'P', key: 'sdlc', pat: 'software|develop|deploy|change|pipeline|release', label: 'Managed software delivery' },
      { tag: 'R', key: 'test', pat: 'test|validat|qa|staging|verify', label: 'Pre-deployment testing gate' },
      { tag: 'R', key: 'rollback', pat: 'rollback|back.out|revert|approv', label: 'Controlled promotion' },
    ]},
  ],
  // d9 Configuration & Vulnerability Management → ID.AM (inventory) + PR.PS (platform) + ID.RA-08
  d9: [
    { id: 'ID.AM-01', family: 'ID', name: 'Hardware inventories are maintained', attrs: [
      { tag: 'P', key: 'hw', pat: 'hardware|asset|inventory|cmdb|endpoint|device|network device', label: 'Hardware inventory' },
    ]},
    { id: 'ID.AM-02', family: 'ID', name: 'Software, services & systems inventories maintained', attrs: [
      { tag: 'P', key: 'sw', pat: 'software|application|package|container|image|system', label: 'Software inventory' },
    ]},
    { id: 'ID.AM-03', family: 'ID', name: 'Network communication & data flows maintained', attrs: [
      { tag: 'P', key: 'flow', pat: 'network|data flow|topology|communicat|boundary|segment', label: 'Network & data flows' },
    ]},
    { id: 'ID.AM-04', family: 'ID', name: 'Inventories of supplier-provided services maintained', attrs: [
      { tag: 'P', key: 'supplier', pat: 'cloud|third.party|supplier|external|saas|hybrid', label: 'Supplier services inventory' },
    ]},
    { id: 'ID.AM-08', family: 'ID', name: 'Assets are managed throughout their lifecycle', attrs: [
      { tag: 'P', key: 'lifecycle', pat: 'lifecycle|provision|decommission|maintain|retire|build|golden image', label: 'Lifecycle management' },
    ]},
    { id: 'PR.PS-01', family: 'PR', name: 'Configuration management practices are applied', attrs: [
      { tag: 'P', key: 'baseline', pat: 'baseline|golden image|standard build|harden', label: 'Secure baseline' },
      { tag: 'P', key: 'benchmark', pat: 'cis|stig|benchmark|800.53', label: 'Industry benchmarks' },
      { tag: 'R', key: 'drift', pat: 'drift|deviation|variance|exception', label: 'Drift handling' },
    ]},
    { id: 'PR.PS-02', family: 'PR', name: 'Software is maintained, replaced & removed by risk', attrs: [
      { tag: 'R', key: 'patch', pat: 'patch|update|hotfix|remediat|version', label: 'Patch management' },
    ]},
    { id: 'PR.PS-03', family: 'PR', name: 'Hardware is maintained, replaced & removed by risk', attrs: [
      { tag: 'R', key: 'hw', pat: 'firmware|hardware|maintain|replace|decommission|end.of.life', label: 'Hardware maintenance' },
    ]},
    { id: 'PR.PS-04', family: 'PR', name: 'Log records are generated for monitoring', attrs: [
      { tag: 'R', key: 'log', pat: 'log|audit|record|monitor|scan|dashboard', label: 'Log generation' },
    ]},
    { id: 'PR.PS-05', family: 'PR', name: 'Unauthorized software execution is prevented', attrs: [
      { tag: 'R', key: 'exec', pat: 'unauthorized|allowlist|prohibit|prevent|signed|approved baseline', label: 'Execution control' },
    ]},
    { id: 'ID.RA-08', family: 'ID', name: 'Vulnerability disclosure & remediation processes', attrs: [
      { tag: 'R', key: 'vuln', pat: 'vulnerabilit|cvss|disclos|triage|remediat|scan', label: 'Vulnerability handling' },
    ]},
  ],
  // d10 Data Protection & Classification → ID.AM-05/07 + PR.DS-02/10
  d10: [
    { id: 'ID.AM-05', family: 'ID', name: 'Assets prioritized by classification & criticality', attrs: [
      { tag: 'P', key: 'classify', pat: 'classif|categor|criticalit|sensitiv|tier|label', label: 'Classification & criticality' },
    ]},
    { id: 'ID.AM-07', family: 'ID', name: 'Inventories of data & metadata are maintained', attrs: [
      { tag: 'P', key: 'datainv', pat: 'data|inventory|catalog|label|metadata|record', label: 'Data inventory' },
    ]},
    { id: 'PR.DS-02', family: 'PR', name: 'Data-in-transit is protected', attrs: [
      { tag: 'P', key: 'transit', pat: 'transit|tls|encrypt|https|channel', label: 'Encryption in transit' },
    ]},
    { id: 'PR.DS-10', family: 'PR', name: 'Data-in-use is protected', attrs: [
      { tag: 'P', key: 'inuse', pat: 'least privilege|need.to.know|access control|tokeniz|mask|truncat', label: 'Data-in-use protection' },
    ]},
  ],
};

// Merge the full-catalog coverage into CONTROL_MAP additively — never overwrite a
// hand-tuned control that already exists for that document type.
for (const dt of Object.keys(CSF_DOC_COVERAGE)) {
  if (!CONTROL_MAP[dt]) continue;
  const have = new Set(CONTROL_MAP[dt].controls.map((c) => c.id));
  CSF_DOC_COVERAGE[dt].forEach((c) => { if (!have.has(c.id)) CONTROL_MAP[dt].controls.push(c); });
}

// How much extracted text we return to the client for later re-scoring. Policy
// text is small (tens of KB); this cap keeps the response and localStorage sane.
const TEXT_STORE_CAP = 200000;

function extractText(buffer, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['txt', 'csv', 'md', 'json'].includes(ext)) {
    return buffer.toString('utf8');
  }
  // pdf/docx/xlsx are binary/zip containers — a printable-byte sweep of the COMPRESSED
  // bytes is garbage (the LLM/keyword reviewer then scores noise). Use the real
  // DocumentNormalizer (PDF text extractor + OOXML zip reader); only fall back to the
  // byte sweep if it can't produce readable text.
  try {
    const Normalizer = require('../services/DocumentNormalizer');
    if (Normalizer && typeof Normalizer.normalize === 'function') {
      const out = Normalizer.normalize(buffer, filename || ('file.' + ext));
      const t = out && typeof out.text === 'string' ? out.text : '';
      if (t && t.trim().length) return t;
    }
  } catch (_) { /* fall through to the printable-byte sweep */ }
  let text = '';
  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i];
    if (c >= 32 && c <= 126) text += String.fromCharCode(c);
    else if (c === 10 || c === 13) text += ' ';
  }
  return text;
}

function scoreCMMI(matched, total) {
  if (total === 0) return 1;
  const pct = matched / total;
  if (pct >= 0.9) return 5;
  if (pct >= 0.75) return 4;
  if (pct >= 0.55) return 3;
  if (pct >= 0.35) return 2;
  return 1;
}

// Tag-aware document maturity — the same "don't over-claim" doctrine the cockpit
// applies to tool telemetry (capAutoCeil), now applied to document review.
// A policy that merely DEFINES a control (policy + procedure language) can be at
// most Defined (3): you can't prove a control is measured or optimizing just by
// having a document. Evidence of measurement (M attrs — metrics, KPIs, review
// cadence) lifts the ceiling to Quantitatively Managed (4); evidence of
// continuous improvement (I attrs — lessons learned, gap remediation, maturation)
// lifts it to Optimizing (5). So the score is min(coverage tier, evidence ceiling)
// — this is what stops "every control is a 5" and produces a defensible spread.
// `attrResults` is the array of { tag, found } already computed for the control.
function docControlCMMI(attrResults) {
  const total = attrResults.length;
  if (!total) return 1;
  const matched = attrResults.filter((a) => a.found).length;
  if (matched === 0) return 1;                         // doc reviewed, control ad hoc
  const base = scoreCMMI(matched, total);              // coverage tier 1..5
  const hasM = attrResults.some((a) => a.tag === 'M' && a.found);
  const hasI = attrResults.some((a) => a.tag === 'I' && a.found);
  let ceil = 3;                                        // documented → Defined
  if (hasM) ceil = 4;                                  // + measured → Quant. Managed
  if (hasM && hasI) ceil = 5;                          // + improving → Optimizing
  return Math.min(base, ceil);
}

function analyzeDeep(text, docType) {
  const lower = text.toLowerCase();
  const mapping = CONTROL_MAP[docType];
  if (!mapping) return { cmmi: 1, controls: [], families: {}, recommendations: [], coverage: 0 };

  const controls = [];
  const familyScores = {};
  let totalAttrs = 0, totalMatched = 0;

  for (const ctrl of mapping.controls) {
    const attrResults = [];
    let ctrlMatched = 0;

    for (const attr of ctrl.attrs) {
      const found = new RegExp(attr.pat, 'i').test(lower);
      attrResults.push({
        tag: attr.tag,
        key: attr.key,
        label: attr.label,
        // Carry the matching pattern so the reader can locate WHERE in the document
        // a keyword match landed (highlight its passage), not just report that it matched.
        pat: attr.pat,
        found,
      });
      if (found) ctrlMatched++;
      totalAttrs++;
      if (found) totalMatched++;
    }

    const cmmi = docControlCMMI(attrResults);
    controls.push({
      id: ctrl.id,
      family: ctrl.family,
      name: ctrl.name,
      cmmi,
      cmmiLabel: CMMI[cmmi].label,
      matched: ctrlMatched,
      total: ctrl.attrs.length,
      attrs: attrResults,
    });

    if (!familyScores[ctrl.family]) familyScores[ctrl.family] = { sum: 0, count: 0, controls: [] };
    familyScores[ctrl.family].sum += cmmi;
    familyScores[ctrl.family].count++;
    familyScores[ctrl.family].controls.push(ctrl.id);
  }

  const families = {};
  for (const [fam, data] of Object.entries(familyScores)) {
    const avg = data.sum / data.count;
    families[fam] = {
      cmmi: Math.round(avg * 10) / 10,
      cmmiLabel: CMMI[Math.round(avg)].label,
      controlCount: data.count,
      controls: data.controls,
    };
  }

  const overallCMMI = scoreCMMI(totalMatched, totalAttrs);
  const coverage = totalAttrs > 0 ? Math.round((totalMatched / totalAttrs) * 100) : 0;

  // Generate improvement recommendations
  const recommendations = [];
  for (const ctrl of controls) {
    const missing = ctrl.attrs.filter(a => !a.found);
    if (missing.length === 0) continue;

    const highestImpact = missing[0];
    // Project uplift through the SAME tag-aware ceiling, so a recommendation can't
    // promise a jump to 5 that a document could never evidence.
    const potentialCMMI = docControlCMMI(ctrl.attrs.map(a => ({ tag: a.tag, found: a.found || a.key === highestImpact.key })));
    const familyControls = controls.filter(c => c.family === ctrl.family);
    const currentFamilyAvg = familyControls.reduce((s, c) => s + c.cmmi, 0) / familyControls.length;
    const newCtrlCMMI = docControlCMMI(ctrl.attrs.map(a => ({ tag: a.tag, found: true })));
    const newFamilyAvg = familyControls.reduce((s, c) => s + (c.id === ctrl.id ? newCtrlCMMI : c.cmmi), 0) / familyControls.length;

    recommendations.push({
      controlId: ctrl.id,
      controlName: ctrl.name,
      currentCMMI: ctrl.cmmi,
      missingAttrs: missing.map(m => m.label),
      priority: missing.length >= 3 ? 'high' : missing.length >= 2 ? 'medium' : 'low',
      suggestion: `Add language covering: ${missing.map(m => m.label).join(', ')}`,
      impact: {
        controlFrom: ctrl.cmmi,
        controlTo: newCtrlCMMI,
        familyFrom: Math.round(currentFamilyAvg * 10) / 10,
        familyTo: Math.round(newFamilyAvg * 10) / 10,
        overallDelta: Math.round(((missing.length / totalAttrs) * 100) * 10) / 10,
      },
    });
  }

  recommendations.sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 };
    return (prio[a.priority] || 2) - (prio[b.priority] || 2);
  });

  return {
    cmmi: overallCMMI,
    cmmiLabel: CMMI[overallCMMI].label,
    coverage,
    matched: totalMatched,
    total: totalAttrs,
    controls,
    families,
    recommendations,
    framework: mapping.framework,
    words: text.split(/\s+/).filter(Boolean).length,
  };
}

router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const docType = req.body.doc_type || '';
    const text = extractText(req.file.buffer, req.file.originalname);

    if (!text || text.trim().length < 20) {
      return res.status(422).json({ error: 'Could not extract readable text from this file.' });
    }

    // Analyst-grade LLM review (semantic control-intent matching + evidence quotes
    // + gap reasoning) when a model is configured; deterministic keyword analysis
    // is the always-available fallback and the shape both paths return is identical.
    let result = null;
    const mapping = CONTROL_MAP[docType];
    if (mapping) {
      try {
        const LlmReview = require('../services/LlmDocumentReviewService');
        result = await LlmReview.review(text, mapping, { label: req.file.originalname });
      } catch (e) { logger.warn('LLM doc review error, using keyword fallback', { error: e.message }); result = null; }
    }
    if (!result) { result = analyzeDeep(text, docType); result.engine = 'keyword'; }
    result.filename = req.file.originalname;
    result.size = req.file.size;
    result.docType = docType;
    // Return the server-extracted text (capped) so the client can persist it and
    // RE-SCORE the document later against an updated control map — without asking
    // the user to re-upload. This is what makes "Recompute" able to re-evidence
    // controls whose coverage was added after the original upload.
    result.text = String(text || '').slice(0, TEXT_STORE_CAP);

    // Backward compat fields
    const oldKw = require('./documents-legacy-keywords');
    if (oldKw[docType]) {
      const found = oldKw[docType].filter(k => new RegExp(k, 'i').test(text.toLowerCase()));
      result.maturity = result.cmmiLabel;
      result.gaps = oldKw[docType].filter(k => !new RegExp(k, 'i').test(text.toLowerCase())).slice(0, 5);
      result.matchedKeywords = found;
    }

    logger.info('document analyzed', {
      docType,
      filename: req.file.originalname,
      engine: result.engine || 'keyword',
      cmmi: result.cmmi,
      coverage: result.coverage,
      controls: result.controls.length,
      cost_usd: result.cost_usd || 0,
    });
    // Ledger the review so volume + cost are queryable (best-effort). Local runs
    // cost $0 but are still counted so you can see review throughput per engine.
    if (result.engine === 'llm' || result.engine === 'local') {
      try {
        require('../services/DocumentSpendService').record({
          orgId: req.headers['x-org-id'] || req.body.org_id || null,
          model: result.model, engine: result.engine, docType,
          label: req.file.originalname, usage: result.usage, costUsd: result.cost_usd,
        });
      } catch (_) { /* non-fatal */ }
    }
    res.json(result);
  } catch (e) {
    logger.error('document analysis failed', { error: e.message });
    res.status(500).json({ error: 'Document analysis failed: ' + e.message });
  }
});

/**
 * GET /api/documents/spend — cumulative LLM document-review spend.
 * Optional X-Org-Id / ?org_id scopes totals to one organization.
 * Returns today / last-30 / all-time cost + token totals, a per-model breakdown,
 * a 14-day daily rollup, and the 20 most recent reviews.
 */
router.get('/spend', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || req.query.org_id || null;
    const out = await require('../services/DocumentSpendService').summary({ orgId });
    res.json(out);
  } catch (e) {
    logger.error('document spend summary error', { error: e.message });
    res.status(500).json({ error: 'Failed to compute spend: ' + e.message });
  }
});

/**
 * POST /api/documents/analyze-text — re-score a document from previously-extracted
 * text (JSON: { doc_type, text, filename }). Stateless and deterministic: it runs
 * the keyword engine against the CURRENT control map, so a document uploaded before
 * a coverage expansion re-evidences the newly-mapped controls with no re-upload and
 * no LLM cost. The response shape matches /analyze.
 */
router.post('/analyze-text', express.json({ limit: '4mb' }), (req, res) => {
  try {
    const docType = String(req.body.doc_type || '');
    const text = String(req.body.text || '');
    if (!CONTROL_MAP[docType]) return res.status(400).json({ error: 'Unknown doc_type: ' + docType });
    if (text.trim().length < 20) return res.status(422).json({ error: 'Text too short to analyze.' });
    const result = analyzeDeep(text, docType);
    result.engine = 'keyword';
    result.filename = String(req.body.filename || '') || docType;
    result.docType = docType;
    res.json(result);
  } catch (e) {
    logger.error('document re-analysis failed', { error: e.message });
    res.status(500).json({ error: 'Re-analysis failed: ' + e.message });
  }
});

/**
 * GET /api/documents/coverage — deployment self-check. Reports how many distinct
 * NIST CSF 2.0 sub-categories THIS running backend can score by document review
 * (after the CSF_DOC_COVERAGE merge), so you can confirm an environment is running
 * the current engine. A stale deployment reports far fewer than 100.
 */
router.get('/coverage', (_req, res) => {
  try {
    const csf = new Set();
    const perDocType = {};
    for (const dt of Object.keys(CONTROL_MAP)) {
      perDocType[dt] = CONTROL_MAP[dt].controls.length;
      CONTROL_MAP[dt].controls.forEach((c) => { if (/^[A-Z]{2}\.[A-Z]{2}-/.test(c.id)) csf.add(c.id); });
    }
    res.json({
      csfControls: csf.size,
      csfIds: Array.from(csf).sort(),
      docTypes: Object.keys(CONTROL_MAP).length,
      perDocType,
      note: 'Distinct NIST CSF 2.0 sub-categories scoreable by document review on this backend. Expect ~103 when the coverage expansion is deployed.',
    });
  } catch (e) {
    res.status(500).json({ error: 'coverage check failed: ' + e.message });
  }
});

module.exports = router;
