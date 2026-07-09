'use strict';

/**
 * documentTypes — automatic classification of an uploaded governance document.
 *
 * The client is NOT trusted to label the document correctly. We classify from
 * the content (and the file name as a weak hint), return a confidence, name the
 * likely controls it supports, and flag when the document is the WRONG type for
 * a control the client selected. Low confidence → the caller marks the upload
 * Wrong Document Type or Not Enough Evidence rather than silently accepting it.
 */

// Each type: signals that indicate it, and whether it can support operating
// effectiveness on its own (records/reports can; policies/plans are design-only).
const TYPES = [
  { id: 'Information Security Policy', kind: 'Policy', operating: false, signals: ['information security policy', 'infosec policy', 'security policy'] },
  { id: 'Access Control Policy', kind: 'Policy', operating: false, signals: ['access control policy', 'least privilege', 'access authorization'] },
  { id: 'Identity and Access Management Policy', kind: 'Policy', operating: false, signals: ['identity and access management', 'iam policy', 'joiner mover leaver', 'provisioning'] },
  { id: 'Password / Authenticator Policy', kind: 'Policy', operating: false, signals: ['password policy', 'authenticator', 'passphrase', 'password complexity', 'mfa policy'] },
  { id: 'Incident Response Plan', kind: 'Plan', operating: false, signals: ['incident response plan', 'incident response lifecycle', 'containment', 'eradication', 'incident severity'] },
  { id: 'Incident Response Playbook', kind: 'Playbook', operating: false, signals: ['playbook', 'runbook', 'response steps', 'triage steps'] },
  { id: 'Business Continuity Plan', kind: 'Plan', operating: false, signals: ['business continuity plan', 'bcp', 'business impact analysis', 'continuity of operations'] },
  { id: 'Disaster Recovery Plan', kind: 'Plan', operating: false, signals: ['disaster recovery plan', 'dr plan', 'recovery time objective', 'recovery point objective', 'failover'] },
  { id: 'Backup and Recovery Procedure', kind: 'Procedure', operating: false, signals: ['backup and recovery', 'backup procedure', 'backup schedule', 'immutable backup', 'restore procedure'] },
  { id: 'Risk Assessment Methodology', kind: 'Procedure', operating: false, signals: ['risk assessment methodology', 'risk methodology', 'likelihood and impact', 'risk scoring'] },
  { id: 'Risk Register', kind: 'Record', operating: true, signals: ['risk register', 'risk id', 'inherent risk', 'residual risk', 'risk owner', 'treatment plan'] },
  { id: 'Vendor Risk Management Policy', kind: 'Policy', operating: false, signals: ['vendor risk', 'third party risk', 'supplier risk', 'tprm'] },
  { id: 'Data Classification Policy', kind: 'Policy', operating: false, signals: ['data classification', 'confidential restricted public', 'classification levels'] },
  { id: 'Data Retention Policy', kind: 'Policy', operating: false, signals: ['data retention', 'retention schedule', 'retention period', 'disposal', 'records retention'] },
  { id: 'Encryption Policy', kind: 'Policy', operating: false, signals: ['encryption policy', 'cryptographic', 'key management', 'tls', 'at rest and in transit'] },
  { id: 'Logging and Monitoring Standard', kind: 'Standard', operating: false, signals: ['logging and monitoring', 'log retention', 'audit log', 'siem', 'log sources'] },
  { id: 'Vulnerability Management Policy', kind: 'Policy', operating: false, signals: ['vulnerability management', 'remediation sla', 'scan cadence', 'severity thresholds'] },
  { id: 'Patch Management Procedure', kind: 'Procedure', operating: false, signals: ['patch management', 'patching', 'patch cadence', 'hotfix'] },
  { id: 'Security Awareness Policy', kind: 'Policy', operating: false, signals: ['security awareness', 'awareness training', 'phishing training', 'training program'] },
  { id: 'Acceptable Use Policy', kind: 'Policy', operating: false, signals: ['acceptable use', 'aup', 'acceptable use of'] },
  { id: 'Change Management Policy', kind: 'Policy', operating: false, signals: ['change management', 'change advisory board', 'cab', 'change approval'] },
  { id: 'Configuration Management Standard', kind: 'Standard', operating: false, signals: ['configuration management', 'baseline configuration', 'hardening standard', 'secure configuration'] },
  { id: 'Privacy / HIPAA Security Policy', kind: 'Policy', operating: false, signals: ['hipaa security', 'ephi', 'privacy policy', 'protected health information', 'security rule'] },
  { id: 'Exception Management Procedure', kind: 'Procedure', operating: false, signals: ['exception management', 'policy exception', 'risk acceptance', 'exception register'] },
  { id: 'Tabletop Exercise Report', kind: 'Record', operating: true, signals: ['tabletop exercise', 'tabletop report', 'exercise findings', 'after-action', 'after action report', 'lessons learned', 'exercise scenario'] },
  { id: 'Penetration Test Report', kind: 'Record', operating: true, signals: ['penetration test', 'pentest report', 'findings and recommendations', 'exploitation', 'cvss'] },
  { id: 'Internal Audit Report', kind: 'Record', operating: true, signals: ['internal audit report', 'audit finding', 'audit opinion', 'workpaper', 'control test results'] },
  { id: 'Incident Register or Incident Ticket Export', kind: 'Record', operating: true, signals: ['incident register', 'incident ticket', 'incident log', 'ticket export', 'incident id', 'closure date'] },
  { id: 'Restore Test Report', kind: 'Record', operating: true, signals: ['restore test', 'recovery test', 'restore validation', 'integrity verified', 'test failover result'] },
  { id: 'Access Review / Certification Report', kind: 'Record', operating: true, signals: ['access review', 'access certification', 'recertification campaign', 'reviewer sign-off', 'revocation'] },
];

const byId = {};
TYPES.forEach((t) => { byId[t.id] = t; });

function score(text, name, t) {
  const hay = (String(text || '').toLowerCase() + ' ' + String(name || '').toLowerCase());
  let hits = 0;
  t.signals.forEach((s) => { if (hay.indexOf(s) >= 0) hits += 1; });
  // name match is a strong single signal
  const nameHit = t.signals.some((s) => String(name || '').toLowerCase().indexOf(s) >= 0);
  return hits + (nameHit ? 1 : 0);
}

/**
 * classify(text, fileName, expectedType?) →
 *   { type, kind, confidence (0..1), operating_capable, alternatives[],
 *     wrong_type_for_selected (bool), reason }
 */
function classify(text, fileName, expectedType) {
  const scored = TYPES.map((t) => ({ t, s: score(text, fileName, t) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  if (!scored.length) {
    return { type: null, kind: null, confidence: 0, operating_capable: false, alternatives: [], wrong_type_for_selected: !!expectedType, reason: 'No recognizable document-type signals found in the text.' };
  }
  const top = scored[0];
  const second = scored[1];
  // confidence from margin + absolute strength (capped)
  const margin = top.s - (second ? second.s : 0);
  const confidence = Math.max(0, Math.min(1, Math.round(((0.35 + 0.15 * top.s + 0.15 * margin)) * 100) / 100));
  const result = {
    type: top.t.id, kind: top.t.kind, confidence, operating_capable: !!top.t.operating,
    alternatives: scored.slice(1, 4).map((x) => ({ type: x.t.id, score: x.s })),
    wrong_type_for_selected: false, reason: '',
  };
  if (expectedType && expectedType !== top.t.id) {
    // Only "wrong type" when the classifier is reasonably confident it's something else.
    result.wrong_type_for_selected = confidence >= 0.6;
    result.reason = result.wrong_type_for_selected
      ? ('Uploaded document classifies as ' + top.t.id + ', not the expected ' + expectedType + '.')
      : ('Low-confidence classification (' + confidence + '); could be ' + top.t.id + ' but treat as Not Enough Evidence for ' + expectedType + '.');
  }
  return result;
}

module.exports = { TYPES, byId, classify };
