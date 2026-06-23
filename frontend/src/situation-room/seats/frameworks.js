/**
 * Framework explorer model — collect-once / map-to-many, fully populated.
 *
 * Every control carries real evidence (source · method · last collected · result),
 * so drilling function → category → control → evidence always lands on proof.
 * The same signals (Okta, PAM, SIEM, CMDB, KMS, GRC, Backup) recur across NIST CSF,
 * 800-53, CIS, ISO 27001 and SOC 2 — collected once, mapped to many.
 *
 * Illustrative sample data; bind to your control/evidence API to go live.
 */

// Kept for compatibility (the /api/cae binding path builds inline evidence objects).
export const EVIDENCE = {};

export const FW_ORDER = ['NIST CSF 2.0', 'NIST 800-53', 'CIS v8', 'ISO 27001', 'SOC 2'];

const ev = (source, method, last, result) => ({ source, method, last, result });

export const FRAMEWORKS = {
  'NIST CSF 2.0': {
    score: 82, trend: '↑', sub: '6 functions · validated against live evidence',
    functions: [
      { id: 'GV', name: 'Govern (GV)', score: 85, trend: '→', categories: [
        { id: 'GV.RM', name: 'Risk Management Strategy', score: 84, controls: [
          { id: 'GV.RM-01', name: 'Risk management objectives are established', status: 'Met', evidence: ev('GRC policy register', 'Manual attestation + document control', 'Quarterly · last 12 days ago', 'Board-approved objectives on file, current version') },
          { id: 'GV.RM-02', name: 'Risk appetite is expressed and communicated', status: 'Met', evidence: ev('Board risk-appetite statement', 'Manual attestation', 'Quarterly · last 12 days ago', 'Appetite thresholds defined and mapped to KRIs') },
        ] },
        { id: 'GV.RR', name: 'Roles, Responsibilities & Authorities', score: 83, controls: [
          { id: 'GV.RR-02', name: 'Roles & responsibilities are established', status: 'Met', evidence: ev('IGA · role catalog', 'Automated — API pull', 'Continuous · last 14:02', 'RACI mapped across 1,180 roles') },
        ] },
      ] },
      { id: 'ID', name: 'Identify (ID)', score: 79, trend: '↑', categories: [
        { id: 'ID.AM', name: 'Asset Management', score: 82, controls: [
          { id: 'ID.AM-01', name: 'Hardware inventory is maintained', status: 'Met', evidence: ev('CMDB + cloud asset APIs (AWS, Azure)', 'Automated — API reconciliation', 'Continuous · last 14:06', '24,318 assets · 99.4% reconciled') },
          { id: 'ID.AM-02', name: 'Software inventory is maintained', status: 'Partial', evidence: ev('EDR software inventory', 'Automated — agent telemetry', 'Continuous · last 14:05', '94% endpoint coverage · 6% unmanaged') },
        ] },
        { id: 'ID.RA', name: 'Risk Assessment', score: 76, controls: [
          { id: 'ID.RA-01', name: 'Vulnerabilities are identified and recorded', status: 'Met', evidence: ev('Vulnerability scanner + cloud posture', 'Automated — scheduled scan', 'Daily · last 06:00', '0 unpatched internet-facing criticals') },
        ] },
      ] },
      { id: 'PR', name: 'Protect (PR)', score: 74, trend: '↑', categories: [
        { id: 'PR.AA', name: 'Identity Management & Access Control', score: 78, controls: [
          { id: 'PR.AA-01', name: 'Identities and credentials are managed', status: 'Met', evidence: ev('Okta (IdP) · API', 'Automated — API pull', 'Continuous · last 14:02', 'MFA enforced on 98.1% of identities') },
          { id: 'PR.AA-05', name: 'Access permissions enforce least privilege', status: 'Partial', evidence: ev('PAM platform + IGA', 'Automated — API pull', 'Continuous · last 14:03', 'PAM at 60% · privileged gap on legacy claims') },
        ] },
        { id: 'PR.DS', name: 'Data Security', score: 71, controls: [
          { id: 'PR.DS-01', name: 'Data-at-rest is protected', status: 'Partial', evidence: ev('Cloud KMS + DLP', 'Automated — configuration check', 'Continuous · last 13:50', '1 EU workload drifted from encryption baseline') },
        ] },
      ] },
      { id: 'DE', name: 'Detect (DE)', score: 88, trend: '↑', categories: [
        { id: 'DE.CM', name: 'Continuous Monitoring', score: 90, controls: [
          { id: 'DE.CM-01', name: 'Networks and services are monitored', status: 'Met', evidence: ev('SIEM · streaming telemetry', 'Automated — log ingestion', 'Real-time · streaming', '1.2B events/day · 0 ingestion gaps') },
        ] },
        { id: 'DE.AE', name: 'Adverse Event Analysis', score: 86, controls: [
          { id: 'DE.AE-02', name: 'Detected events are analyzed', status: 'Met', evidence: ev('SIEM detections + SOAR', 'Automated — correlation rules', 'Real-time', 'MTTD 8 min · 4,102 attacks blocked/24h') },
        ] },
      ] },
      { id: 'RS', name: 'Respond (RS)', score: 81, trend: '→', categories: [
        { id: 'RS.MA', name: 'Incident Management', score: 83, controls: [
          { id: 'RS.MA-01', name: 'Incident response plan is executed', status: 'Met', evidence: ev('SOAR + ticketing', 'Automated — workflow logs', 'Per incident · last 14:02', 'Compensating control auto-applied in 2 seconds') },
        ] },
      ] },
      { id: 'RC', name: 'Recover (RC)', score: 69, trend: '↓', categories: [
        { id: 'RC.RP', name: 'Incident Recovery Plan Execution', score: 66, controls: [
          { id: 'RC.RP-01', name: 'Recovery plan is executed during/after an incident', status: 'Partial', evidence: ev('Backup platform + DR runbooks', 'Automated + manual recovery test', 'Last full test 5 months ago', 'Recovery tested on 83% of critical apps') },
        ] },
      ] },
    ],
  },

  'NIST 800-53': {
    score: 77, trend: '↑', sub: 'control families · automated control tests',
    functions: [
      { id: 'AC', name: 'AC · Access Control', score: 76, trend: '↑', categories: [
        { id: 'AC.AM', name: 'Account Management', score: 79, controls: [
          { id: 'AC-2', name: 'Account management', status: 'Met', evidence: ev('IGA platform', 'Automated — daily reconciliation', 'Daily · last 02:00', 'Joiners/movers/leavers reconciled · 0 orphan admin accounts') },
        ] },
        { id: 'AC.LP', name: 'Least Privilege', score: 72, controls: [
          { id: 'AC-6', name: 'Least privilege', status: 'Partial', evidence: ev('PAM platform', 'Automated — API pull', 'Continuous · last 14:03', '60% of privileged access under PAM') },
        ] },
      ] },
      { id: 'AU', name: 'AU · Audit & Accountability', score: 84, trend: '→', categories: [
        { id: 'AU.LOG', name: 'Audit Logging', score: 84, controls: [
          { id: 'AU-2', name: 'Event logging', status: 'Met', evidence: ev('SIEM', 'Automated — log ingestion', 'Real-time', 'Logging coverage on 99.6% of in-scope systems') },
        ] },
      ] },
      { id: 'CM', name: 'CM · Configuration Management', score: 72, trend: '↑', categories: [
        { id: 'CM.BASE', name: 'Baseline Configuration', score: 72, controls: [
          { id: 'CM-2', name: 'Baseline configuration', status: 'Partial', evidence: ev('Cloud posture management', 'Automated — config drift check', 'Continuous · last 13:50', '1 EU workload drifted from baseline') },
        ] },
      ] },
      { id: 'IA', name: 'IA · Identification & Authentication', score: 78, trend: '↑', categories: [
        { id: 'IA.MFA', name: 'Multi-factor Authentication', score: 81, controls: [
          { id: 'IA-2', name: 'Identification & authentication (org users)', status: 'Met', evidence: ev('Okta (IdP)', 'Automated — API pull', 'Continuous · last 14:02', 'MFA enforced on 98.1% of identities') },
        ] },
      ] },
      { id: 'IR', name: 'IR · Incident Response', score: 83, trend: '→', categories: [
        { id: 'IR.HND', name: 'Incident Handling', score: 83, controls: [
          { id: 'IR-4', name: 'Incident handling', status: 'Met', evidence: ev('SOAR', 'Automated — workflow logs', 'Per incident', 'Containment auto-applied · MTTC 41 min') },
        ] },
      ] },
      { id: 'SI', name: 'SI · System & Information Integrity', score: 80, trend: '↑', categories: [
        { id: 'SI.FLAW', name: 'Flaw Remediation', score: 80, controls: [
          { id: 'SI-2', name: 'Flaw remediation', status: 'Met', evidence: ev('Patch management + vuln scanner', 'Automated — SLA tracking', 'Daily', 'Critical patch SLA met on 97% of assets') },
        ] },
      ] },
    ],
  },

  'CIS v8': {
    score: 74, trend: '↑', sub: '18 controls · safeguard-level evidence',
    functions: [
      { id: 'CIS1', name: 'CIS 1 · Inventory of Enterprise Assets', score: 82, trend: '↑', categories: [
        { id: 'CIS1.SG', name: 'Safeguards', score: 82, controls: [
          { id: '1.1', name: 'Establish & maintain detailed asset inventory', status: 'Met', evidence: ev('CMDB + cloud asset APIs', 'Automated — API reconciliation', 'Continuous · last 14:06', '24,318 assets · 99.4% reconciled') },
          { id: '1.2', name: 'Address unauthorized assets', status: 'Partial', evidence: ev('NAC + EDR', 'Automated — agent telemetry', 'Continuous', 'Auto-quarantine on 94% of segments') },
        ] },
      ] },
      { id: 'CIS5', name: 'CIS 5 · Account Management', score: 78, trend: '↑', categories: [
        { id: 'CIS5.SG', name: 'Safeguards', score: 78, controls: [
          { id: '5.1', name: 'Establish & maintain an inventory of accounts', status: 'Met', evidence: ev('IGA platform', 'Automated — API pull', 'Daily', 'All accounts inventoried & owner-mapped') },
          { id: '5.3', name: 'Disable dormant accounts', status: 'Met', evidence: ev('IGA platform', 'Automated — policy enforcement', 'Daily', 'Dormant >45 days auto-disabled') },
        ] },
      ] },
      { id: 'CIS6', name: 'CIS 6 · Access Control Management', score: 75, trend: '↑', categories: [
        { id: 'CIS6.SG', name: 'Safeguards', score: 75, controls: [
          { id: '6.5', name: 'Require MFA for administrative access', status: 'Partial', evidence: ev('Okta + PAM', 'Automated — API pull', 'Continuous', 'MFA on admin access except legacy claims (PAM rollout)') },
        ] },
      ] },
      { id: 'CIS8', name: 'CIS 8 · Audit Log Management', score: 86, trend: '→', categories: [
        { id: 'CIS8.SG', name: 'Safeguards', score: 86, controls: [
          { id: '8.2', name: 'Collect audit logs', status: 'Met', evidence: ev('SIEM', 'Automated — log ingestion', 'Real-time', '99.6% log coverage · 0 ingestion gaps') },
        ] },
      ] },
      { id: 'CIS11', name: 'CIS 11 · Data Recovery', score: 68, trend: '↓', categories: [
        { id: 'CIS11.SG', name: 'Safeguards', score: 68, controls: [
          { id: '11.1', name: 'Establish & maintain a data recovery process', status: 'Partial', evidence: ev('Backup platform + DR runbooks', 'Automated + manual test', 'Last test 5 months ago', 'Tested on 83% of critical apps') },
        ] },
      ] },
      { id: 'CIS16', name: 'CIS 16 · Application Software Security', score: 70, trend: '↑', categories: [
        { id: 'CIS16.SG', name: 'Safeguards', score: 70, controls: [
          { id: '16.1', name: 'Establish & maintain a secure development process', status: 'Partial', evidence: ev('CI/CD + SAST/DAST', 'Automated — pipeline gates', 'Per build', 'SAST on 88% of repos · gaps on AI services') },
        ] },
      ] },
    ],
  },

  'ISO 27001': {
    score: 79, trend: '→', sub: 'Annex A · 4 control themes',
    functions: [
      { id: 'A5', name: 'A.5 · Organizational controls', score: 82, trend: '→', categories: [
        { id: 'A5.TS', name: 'Threat & supplier security', score: 82, controls: [
          { id: 'A.5.7', name: 'Threat intelligence', status: 'Met', evidence: ev('Threat-intel feeds + SIEM', 'Automated — feed integration', 'Real-time', 'TI enrichment on 100% of detections') },
          { id: 'A.5.23', name: 'Information security for use of cloud services', status: 'Partial', evidence: ev('Cloud posture management', 'Automated — config check', 'Continuous', '1 EU workload off baseline') },
        ] },
      ] },
      { id: 'A6', name: 'A.6 · People controls', score: 80, trend: '↑', categories: [
        { id: 'A6.AW', name: 'Awareness', score: 80, controls: [
          { id: 'A.6.3', name: 'Security awareness, education & training', status: 'Met', evidence: ev('LMS + phishing-sim platform', 'Automated — completion + sim results', 'Monthly', '96% training completion · phish-fail 4.2%') },
        ] },
      ] },
      { id: 'A7', name: 'A.7 · Physical controls', score: 88, trend: '→', categories: [
        { id: 'A7.PA', name: 'Physical access', score: 88, controls: [
          { id: 'A.7.2', name: 'Physical entry', status: 'Met', evidence: ev('Badge access system', 'Automated — access logs', 'Real-time', 'All data-center entries logged & reviewed') },
        ] },
      ] },
      { id: 'A8', name: 'A.8 · Technological controls', score: 74, trend: '↑', categories: [
        { id: 'A8.AM', name: 'Access & monitoring', score: 74, controls: [
          { id: 'A.8.2', name: 'Privileged access rights', status: 'Partial', evidence: ev('PAM platform', 'Automated — API pull', 'Continuous · last 14:03', '60% of privileged access under PAM') },
          { id: 'A.8.16', name: 'Monitoring activities', status: 'Met', evidence: ev('SIEM', 'Automated — log ingestion', 'Real-time', 'MTTD 8 min · full coverage') },
        ] },
      ] },
    ],
  },

  'SOC 2': {
    score: 81, trend: '↑', sub: 'Trust Services Criteria · auditor-aligned',
    functions: [
      { id: 'CC6', name: 'CC6 · Logical & Physical Access', score: 83, trend: '↑', categories: [
        { id: 'CC6.AC', name: 'Access controls', score: 83, controls: [
          { id: 'CC6.1', name: 'Logical access security controls', status: 'Met', evidence: ev('Okta + PAM', 'Auditor sample + automated control test', 'Continuous · sampled quarterly', 'Controls operating effectively over period') },
          { id: 'CC6.6', name: 'Boundary protection against external threats', status: 'Met', evidence: ev('WAF + firewall + EDR', 'Automated — config + telemetry', 'Continuous', '0 unpatched internet-facing criticals') },
        ] },
      ] },
      { id: 'CC7', name: 'CC7 · System Operations', score: 82, trend: '→', categories: [
        { id: 'CC7.MON', name: 'Monitoring', score: 82, controls: [
          { id: 'CC7.2', name: 'Security monitoring of system components', status: 'Met', evidence: ev('SIEM + SOAR', 'Auditor sample + automated control test', 'Continuous', 'Detection & response operating effectively') },
        ] },
      ] },
      { id: 'A1', name: 'A1 · Availability', score: 78, trend: '→', categories: [
        { id: 'A1.REC', name: 'Recovery', score: 78, controls: [
          { id: 'A1.2', name: 'Recovery & backup infrastructure', status: 'Partial', evidence: ev('Backup platform + DR test records', 'Auditor sample + recovery test', 'Last test 5 months ago', 'Backup success 99.7% · recovery tested 83%') },
        ] },
      ] },
      { id: 'C1', name: 'C1 · Confidentiality', score: 81, trend: '↑', categories: [
        { id: 'C1.DP', name: 'Data protection', score: 81, controls: [
          { id: 'C1.1', name: 'Confidential information is protected', status: 'Met', evidence: ev('DLP + KMS', 'Auditor sample + automated control test', 'Continuous', 'Encryption & DLP operating effectively') },
        ] },
      ] },
    ],
  },
};
