/**
 * Framework explorer model — collect-once / map-to-many.
 *
 * EVIDENCE is the single store of collected proof; each item lists the controls it
 * satisfies ACROSS frameworks (collect once → map to many). Each framework's controls
 * point back to an evidence id, so the same Okta/PAM/SIEM/KMS/GRC/Backup signal
 * answers NIST CSF, 800-53, CIS, ISO and SOC 2 at once.
 *
 * (TODO real data) — structure is real; bind these to your control/evidence API.
 */

export const EVIDENCE = {
  'okta-mfa':       { source: 'Okta API',              method: 'Automated API',       last: '2026-06-22 14:05 UTC', result: 'MFA enforced on 98% of accounts; 12 break-glass exceptions reviewed', satisfies: ['NIST CSF PR.AA-03', 'NIST 800-53 IA-2', 'CIS v8 6.3', 'ISO 27001 A.5.17', 'SOC 2 CC6.1'] },
  'pam-cyberark':   { source: 'CyberArk PAM',          method: 'Automated API',       last: '2026-06-22 13:50 UTC', result: '60% of privileged accounts onboarded; vaulting in progress', satisfies: ['NIST CSF PR.AA-05', 'NIST 800-53 AC-2(7)', 'CIS v8 5.4', 'ISO 27001 A.8.2', 'SOC 2 CC6.3'] },
  'siem-monitor':   { source: 'SIEM (Splunk)',         method: 'Agent telemetry',     last: '2026-06-22 14:08 UTC', result: '4,102 events blocked in last 24h; detections tuned', satisfies: ['NIST CSF DE.CM-01', 'NIST 800-53 SI-4', 'CIS v8 8.2', 'ISO 27001 A.8.16', 'SOC 2 CC7.2'] },
  'encryption-kms': { source: 'Cloud KMS',             method: 'Automated API',       last: '2026-06-22 02:00 UTC', result: 'Encryption-at-rest enforced across regulated stores', satisfies: ['NIST CSF PR.DS-01', 'NIST 800-53 SC-28', 'CIS v8 3.11', 'ISO 27001 A.8.24', 'SOC 2 CC6.7'] },
  'cmdb-assets':    { source: 'CMDB (ServiceNow)',     method: 'Automated API',       last: '2026-06-21 06:00 UTC', result: 'Asset inventory 96% complete', satisfies: ['NIST CSF ID.AM-01', 'NIST 800-53 CM-8', 'CIS v8 1.1', 'ISO 27001 A.5.9', 'SOC 2 CC6.1'] },
  'vendor-attest':  { source: 'GRC platform',          method: 'Manual attestation',  last: '2026-05-30',           result: 'Third-party reviews lagging; 14 vendors overdue', satisfies: ['NIST CSF GV.SC-07', 'NIST 800-53 SR-6', 'CIS v8 15.4', 'ISO 27001 A.5.22', 'SOC 2 CC9.2'] },
  'backup-test':    { source: 'Backup/DR program',     method: 'Auditor sample',      last: '2026-04-18',           result: 'Recovery test partial; RTO unmet for claims DB', satisfies: ['NIST CSF RC.RP-01', 'NIST 800-53 CP-10', 'CIS v8 11.5', 'ISO 27001 A.8.13', 'SOC 2 A1.2'] },
};

export const FW_ORDER = ['NIST CSF 2.0', 'NIST 800-53', 'CIS v8', 'ISO 27001', 'SOC 2'];

export const FRAMEWORKS = {
  'NIST CSF 2.0': {
    score: 82, trend: '↑',
    functions: [
      { id: 'GV', name: 'Govern', score: 78, trend: '→', categories: [
        { id: 'GV.SC', name: 'Supply Chain Risk Mgmt', controls: [
          { id: 'GV.SC-07', name: 'Suppliers assessed & prioritized', status: 'Partial', evidence: 'vendor-attest' },
        ] },
      ] },
      { id: 'ID', name: 'Identify', score: 84, trend: '↑', categories: [
        { id: 'ID.AM', name: 'Asset Management', controls: [
          { id: 'ID.AM-01', name: 'Hardware inventory maintained', status: 'Met', evidence: 'cmdb-assets' },
        ] },
      ] },
      { id: 'PR', name: 'Protect', score: 80, trend: '↑', categories: [
        { id: 'PR.AA', name: 'Identity Mgmt & Access Control', controls: [
          { id: 'PR.AA-03', name: 'Users & devices authenticated', status: 'Met', evidence: 'okta-mfa' },
          { id: 'PR.AA-05', name: 'Privileged access managed (PAM)', status: 'Partial', evidence: 'pam-cyberark' },
        ] },
        { id: 'PR.DS', name: 'Data Security', controls: [
          { id: 'PR.DS-01', name: 'Data-at-rest protected', status: 'Met', evidence: 'encryption-kms' },
        ] },
      ] },
      { id: 'DE', name: 'Detect', score: 85, trend: '↑', categories: [
        { id: 'DE.CM', name: 'Continuous Monitoring', controls: [
          { id: 'DE.CM-01', name: 'Networks & services monitored', status: 'Met', evidence: 'siem-monitor' },
        ] },
      ] },
      { id: 'RC', name: 'Recover', score: 74, trend: '↓', categories: [
        { id: 'RC.RP', name: 'Recovery Plan Execution', controls: [
          { id: 'RC.RP-01', name: 'Recovery plan executed during/after incident', status: 'Partial', evidence: 'backup-test' },
        ] },
      ] },
    ],
  },

  'NIST 800-53': {
    score: 80, trend: '↑',
    functions: [
      { id: 'AC', name: 'Access Control', score: 79, trend: '↑', categories: [
        { id: 'AC-2', name: 'Account Management', controls: [
          { id: 'AC-2(7)', name: 'Privileged user accounts', status: 'Partial', evidence: 'pam-cyberark' },
        ] },
      ] },
      { id: 'IA', name: 'Identification & Authentication', score: 88, trend: '↑', categories: [
        { id: 'IA-2', name: 'User identification & MFA', controls: [
          { id: 'IA-2', name: 'Multifactor authentication', status: 'Met', evidence: 'okta-mfa' },
        ] },
      ] },
      { id: 'SI', name: 'System & Information Integrity', score: 84, trend: '→', categories: [
        { id: 'SI-4', name: 'System monitoring', controls: [
          { id: 'SI-4', name: 'Information system monitoring', status: 'Met', evidence: 'siem-monitor' },
        ] },
      ] },
      { id: 'CP', name: 'Contingency Planning', score: 72, trend: '↓', categories: [
        { id: 'CP-10', name: 'System recovery & reconstitution', controls: [
          { id: 'CP-10', name: 'Recovery & reconstitution', status: 'Partial', evidence: 'backup-test' },
        ] },
      ] },
    ],
  },

  'CIS v8': {
    score: 84, trend: '↑',
    functions: [
      { id: 'CIS-5', name: 'Account Management', score: 81, trend: '↑', categories: [
        { id: 'CIS-5.4', name: 'Restrict admin privileges', controls: [
          { id: 'CIS 5.4', name: 'Restrict administrator privileges to dedicated accounts', status: 'Partial', evidence: 'pam-cyberark' },
        ] },
      ] },
      { id: 'CIS-6', name: 'Access Control Management', score: 89, trend: '↑', categories: [
        { id: 'CIS-6.3', name: 'MFA for externally-exposed apps', controls: [
          { id: 'CIS 6.3', name: 'Require MFA for externally-exposed applications', status: 'Met', evidence: 'okta-mfa' },
        ] },
      ] },
      { id: 'CIS-8', name: 'Audit Log Management', score: 86, trend: '→', categories: [
        { id: 'CIS-8.2', name: 'Collect audit logs', controls: [
          { id: 'CIS 8.2', name: 'Collect audit logs', status: 'Met', evidence: 'siem-monitor' },
        ] },
      ] },
    ],
  },

  'ISO 27001': {
    score: 83, trend: '→',
    functions: [
      { id: 'A.5', name: 'Organizational Controls', score: 80, trend: '→', categories: [
        { id: 'A.5.17', name: 'Authentication information', controls: [
          { id: 'A.5.17', name: 'Authentication information', status: 'Met', evidence: 'okta-mfa' },
        ] },
        { id: 'A.5.22', name: 'Supplier service monitoring', controls: [
          { id: 'A.5.22', name: 'Monitoring & review of supplier services', status: 'Partial', evidence: 'vendor-attest' },
        ] },
      ] },
      { id: 'A.8', name: 'Technological Controls', score: 85, trend: '↑', categories: [
        { id: 'A.8.24', name: 'Use of cryptography', controls: [
          { id: 'A.8.24', name: 'Use of cryptography', status: 'Met', evidence: 'encryption-kms' },
        ] },
        { id: 'A.8.13', name: 'Information backup', controls: [
          { id: 'A.8.13', name: 'Information backup', status: 'Partial', evidence: 'backup-test' },
        ] },
      ] },
    ],
  },

  'SOC 2': {
    score: 86, trend: '↑',
    functions: [
      { id: 'CC6', name: 'Logical & Physical Access', score: 85, trend: '↑', categories: [
        { id: 'CC6.1', name: 'Logical access controls', controls: [
          { id: 'CC6.1', name: 'Logical access security', status: 'Met', evidence: 'okta-mfa' },
        ] },
        { id: 'CC6.3', name: 'Privileged access', controls: [
          { id: 'CC6.3', name: 'Manages privileged access', status: 'Partial', evidence: 'pam-cyberark' },
        ] },
      ] },
      { id: 'CC7', name: 'System Operations', score: 88, trend: '→', categories: [
        { id: 'CC7.2', name: 'Monitoring for anomalies', controls: [
          { id: 'CC7.2', name: 'Monitors system components for anomalies', status: 'Met', evidence: 'siem-monitor' },
        ] },
      ] },
      { id: 'A1', name: 'Availability', score: 78, trend: '↓', categories: [
        { id: 'A1.2', name: 'Recovery & backups', controls: [
          { id: 'A1.2', name: 'Environmental protections, backup, recovery', status: 'Partial', evidence: 'backup-test' },
        ] },
      ] },
    ],
  },
};
