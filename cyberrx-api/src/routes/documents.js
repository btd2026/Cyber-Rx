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
};

function extractText(buffer, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['txt', 'csv', 'md'].includes(ext)) {
    return buffer.toString('utf8');
  }
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
        found,
      });
      if (found) ctrlMatched++;
      totalAttrs++;
      if (found) totalMatched++;
    }

    const cmmi = scoreCMMI(ctrlMatched, ctrl.attrs.length);
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
    const potentialCMMI = scoreCMMI(ctrl.matched + 1, ctrl.total);
    const familyControls = controls.filter(c => c.family === ctrl.family);
    const currentFamilyAvg = familyControls.reduce((s, c) => s + c.cmmi, 0) / familyControls.length;
    const newCtrlCMMI = scoreCMMI(ctrl.matched + missing.length, ctrl.total);
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

module.exports = router;
