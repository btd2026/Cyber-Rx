'use strict';

/**
 * CISO Security Posture Dashboard — data model + demo seed
 * --------------------------------------------------------
 * The 14 entities backing the dedicated CISO dashboard. This module is the
 * mock/demo data AND the schema shape: every export maps 1:1 to a future live
 * source (the `source` / `evidenceSource` fields name the tool that will
 * replace the mock value — Okta, Splunk, ServiceNow, CrowdStrike, Tenable,
 * SailPoint, Prisma, Panorama, backup platforms, etc.).
 *
 * Entities: SecurityDomain, SecurityMetric, ControlArea, ControlRisk,
 * Threshold, CISOQuestion, ExecutiveAnswer (generated in the service),
 * SecurityAction, CriticalBusinessProcess, AttackPathway, CyberReadinessItem,
 * SecurityInvestment, HiddenRisk, EvidenceSource.
 *
 * Persisted via ciso_entities (polymorphic) by seedCisoDashboard.js; the
 * service reads from there with this module as the fallback, so swapping a
 * mock for a live API is a single write to ciso_entities of the same shape.
 *
 * Scores are 0–100 (higher = healthier). Healthcare-payer context to match the
 * platform's demo orgs.
 */

// 8 weighted domains (overall posture) + 4 health-only domains (matrix).
const SECURITY_DOMAINS = [
  { id: 'iam', name: 'Identity & Access', weight: 20, current: 71, previous: 64, topImproving: { metric: 'MFA coverage', delta: +9 }, topDeteriorating: { metric: 'Dormant privileged accounts', delta: -4 }, source: 'Okta · SailPoint · CyberArk' },
  { id: 'detection', name: 'Detection & Response', weight: 20, current: 66, previous: 69, topImproving: { metric: 'Log source coverage', delta: +3 }, topDeteriorating: { metric: 'MTTD (hrs)', delta: -7 }, source: 'Splunk · CrowdStrike · ServiceNow' },
  { id: 'vuln', name: 'Vulnerability Management', weight: 15, current: 58, previous: 55, topImproving: { metric: 'Patch SLA compliance', delta: +5 }, topDeteriorating: { metric: 'Internet-facing critical aging', delta: -6 }, source: 'Tenable · Qualys' },
  { id: 'cloud', name: 'Cloud Security', weight: 10, current: 62, previous: 60, topImproving: { metric: 'IaC scanning coverage', delta: +4 }, topDeteriorating: { metric: 'Public storage exposure', delta: -3 }, source: 'Prisma Cloud · Wiz · Defender for Cloud' },
  { id: 'data', name: 'Data Protection', weight: 10, current: 64, previous: 63, topImproving: { metric: 'Encryption-at-rest coverage', delta: +2 }, topDeteriorating: { metric: 'DLP cloud egress gaps', delta: -3 }, source: 'Microsoft Purview · Zscaler' },
  { id: 'thirdparty', name: 'Third-Party Risk', weight: 10, current: 54, previous: 57, topImproving: { metric: 'Assessments completed', delta: +2 }, topDeteriorating: { metric: 'Critical vendors with open findings', delta: -8 }, source: 'BitSight · SecurityScorecard · Saraqael' },
  { id: 'recovery', name: 'Recovery & Resilience', weight: 10, current: 60, previous: 58, topImproving: { metric: 'Backup success rate', delta: +3 }, topDeteriorating: { metric: 'Restore test recency', delta: -5 }, source: 'Rubrik · Cohesity · Veeam' },
  { id: 'governance', name: 'Governance & Oversight', weight: 5, current: 73, previous: 71, topImproving: { metric: 'Policy review currency', delta: +4 }, topDeteriorating: { metric: 'Exception backlog', delta: -2 }, source: 'Vanta · Drata · GRC' },
  { id: 'supplychain', name: 'Software Supply Chain', weight: 8, current: 56, previous: 52, topImproving: { metric: 'Artifact signing coverage', delta: +5 }, topDeteriorating: { metric: 'Unpinned third-party CI actions', delta: -4 }, source: 'GitHub · Sigstore · Snyk' },
  // health-only (no posture weight)
  { id: 'appsec', name: 'Application Security', weight: 0, current: 57, previous: 53, topImproving: { metric: 'SAST coverage', delta: +6 }, topDeteriorating: { metric: 'Critical SCA findings', delta: -4 }, source: 'Snyk · GitGuardian' },
  { id: 'network', name: 'Network Security', weight: 0, current: 68, previous: 67, topImproving: { metric: 'Segmentation coverage', delta: +2 }, topDeteriorating: { metric: 'Flat-network legacy zones', delta: -2 }, source: 'Palo Alto / Panorama · Zscaler' },
  { id: 'endpoint', name: 'Endpoint Security', weight: 0, current: 70, previous: 66, topImproving: { metric: 'EDR coverage', delta: +5 }, topDeteriorating: { metric: 'Unmanaged endpoints', delta: -2 }, source: 'CrowdStrike · Defender for Endpoint' },
  { id: 'awareness', name: 'Security Awareness', weight: 0, current: 75, previous: 70, topImproving: { metric: 'Training completion', delta: +7 }, topDeteriorating: { metric: 'Phishing click rate', delta: -1 }, source: 'KnowBe4 · Workday' },
];

// 18 control areas ranked by enterprise risk contribution.
const CONTROL_AREAS = [
  { id: 'priv_access', name: 'Privileged Access Management', csf: 'PR.AA-05', cis: 'CIS 5 / 6', riskContribution: 88, likelihood: 'High', impact: 'Critical', blastRadius: 'Domain-wide (claims, EDW, AD)', threatRelevance: 'Active — ransomware actors target privileged identity', processAffected: 'Claims Processing', evidence: 'CyberArk: 43% of privileged accounts vaulted; 12 dormant admin accounts (Okta)', action: 'Vault remaining privileged accounts; enforce JIT + session recording' },
  { id: 'vuln_remediation', name: 'Vulnerability Remediation', csf: 'ID.RA-01 / PR.PS-02', cis: 'CIS 7', riskContribution: 82, likelihood: 'High', impact: 'High', blastRadius: 'Internet-facing claims & portal tier', threatRelevance: 'High — 3 KEV-listed CVEs exposed', processAffected: 'Member Portal', evidence: 'Tenable: 9 internet-facing critical CVEs aging >30d', action: 'Emergency-patch KEV CVEs; tighten internet-facing SLA to 7 days' },
  { id: 'mfa', name: 'MFA Coverage', csf: 'PR.AA-01 / PR.AA-03', cis: 'CIS 6', riskContribution: 74, likelihood: 'High', impact: 'High', blastRadius: 'All workforce SaaS + VPN', threatRelevance: 'Active — credential phishing is the #1 initial access', processAffected: 'Enrollment', evidence: 'Okta: 78% MFA coverage; 9% on phishing-resistant factors', action: 'Drive MFA to 95%+; migrate to FIDO2 for privileged users' },
  { id: 'third_party_access', name: 'Third-Party Access', csf: 'GV.SC-07', cis: 'CIS 15', riskContribution: 71, likelihood: 'Medium', impact: 'Critical', blastRadius: 'Vendor-connected claims & payment rails', threatRelevance: 'High — supply-chain compromise trend', processAffected: 'Provider Payments', evidence: 'Saraqael: 4 critical vendors with open high findings; 15 of 23 unassessed', action: 'Complete critical-vendor assessments; scope-limit vendor access' },
  { id: 'logging', name: 'Logging & Monitoring', csf: 'PR.PS-04 / DE.CM-01', cis: 'CIS 8', riskContribution: 68, likelihood: 'Medium', impact: 'High', blastRadius: 'Detection blind spots on legacy claims', threatRelevance: 'High — undetected dwell time', processAffected: 'Security Operations', evidence: 'Splunk: 2 tier-1 systems not forwarding logs; 90-day retention', action: 'Onboard legacy claims DB + EDI gateway to SIEM' },
  { id: 'backup_restore', name: 'Backup & Restore Testing', csf: 'PR.DS-11 / RC.RP-03', cis: 'CIS 11', riskContribution: 66, likelihood: 'Medium', impact: 'Critical', blastRadius: 'Ransomware recovery for claims platform', threatRelevance: 'Active — ransomware', processAffected: 'Claims Processing', evidence: 'Rubrik: backups succeed 98%; last full restore test 14 months ago', action: 'Run quarterly restore tests; confirm immutability on tier-1' },
  { id: 'cloud_config', name: 'Cloud Configuration Management', csf: 'PR.PS-01', cis: 'CIS 4', riskContribution: 63, likelihood: 'Medium', impact: 'High', blastRadius: 'Public cloud member-data stores', threatRelevance: 'Medium', processAffected: 'Data Exchange / APIs', evidence: 'Prisma: 37 high misconfigs; 2 publicly-exposed storage buckets', action: 'Remediate public exposure; enforce CIS benchmark guardrails' },
  { id: 'detection_eng', name: 'Detection Engineering', csf: 'DE.AE-02 / DE.CM-09', cis: 'CIS 13', riskContribution: 61, likelihood: 'Medium', impact: 'High', blastRadius: 'Coverage gaps vs ATT&CK', threatRelevance: 'High', processAffected: 'Security Operations', evidence: 'ATT&CK coverage: 38% detect/prevent of mapped techniques', action: 'Build detections for credential-access & lateral-movement gaps' },
  { id: 'access_recert', name: 'Access Recertification', csf: 'PR.AA-05', cis: 'CIS 6', riskContribution: 59, likelihood: 'Medium', impact: 'High', blastRadius: 'Entitlement creep across apps', threatRelevance: 'Medium', processAffected: 'Claims Processing', evidence: 'SailPoint: Q2 access review 80% complete; 3 apps overdue', action: 'Close overdue certifications; automate quarterly reviews' },
  { id: 'jml', name: 'Joiner / Mover / Leaver Access', csf: 'PR.AA-01', cis: 'CIS 6', riskContribution: 57, likelihood: 'Medium', impact: 'Medium', blastRadius: 'Orphan & stale entitlements', threatRelevance: 'Medium', processAffected: 'Customer Service Ops', evidence: 'SailPoint: 12 orphan accounts; leaver deprovision avg 4 days', action: 'Automate leaver deprovisioning to <24h; clear orphans' },
  { id: 'edr', name: 'Endpoint Protection Coverage', csf: 'DE.CM-03 / PR.PS-05', cis: 'CIS 10', riskContribution: 54, likelihood: 'Medium', impact: 'High', blastRadius: 'Unmanaged endpoint foothold', threatRelevance: 'High', processAffected: 'Security Operations', evidence: 'CrowdStrike: 71% EDR coverage; 6% of servers unmanaged', action: 'Deploy EDR to remaining servers; move policies to prevent' },
  { id: 'patch', name: 'Patch Management', csf: 'PR.PS-02', cis: 'CIS 7', riskContribution: 52, likelihood: 'Medium', impact: 'Medium', blastRadius: 'Workstation + server estate', threatRelevance: 'Medium', processAffected: 'Enrollment', evidence: 'Tenable: patch SLA compliance 90% workstations / 81% servers', action: 'Lift server patch SLA compliance to 95%' },
  { id: 'dlp', name: 'Data Loss Prevention', csf: 'PR.DS-01', cis: 'CIS 3', riskContribution: 50, likelihood: 'Medium', impact: 'High', blastRadius: 'PHI egress via cloud/SaaS', threatRelevance: 'Medium', processAffected: 'Member Portal', evidence: 'Purview: email+endpoint DLP only; no cloud/SaaS coverage', action: 'Extend DLP to cloud egress and GenAI endpoints' },
  { id: 'email_sec', name: 'Email Security', csf: 'PR.PS-05 / DE.CM-09', cis: 'CIS 9', riskContribution: 48, likelihood: 'High', impact: 'Medium', blastRadius: 'Initial-access surface', threatRelevance: 'Active — phishing', processAffected: 'Customer Service Ops', evidence: 'Phishing click rate 6%; impersonation controls partial', action: 'Tighten impersonation/DMARC; targeted training for high-click groups' },
  { id: 'ir_readiness', name: 'Incident Response Readiness', csf: 'RS.MA-01', cis: 'CIS 17', riskContribution: 46, likelihood: 'Low', impact: 'Critical', blastRadius: 'Enterprise incident handling', threatRelevance: 'Medium', processAffected: 'Security Operations', evidence: 'IR plan current; last tabletop 13 months ago', action: 'Run ransomware tabletop; validate third-party IR retainer' },
  { id: 'net_seg', name: 'Network Segmentation', csf: 'PR.IR-01', cis: 'CIS 12', riskContribution: 44, likelihood: 'Low', impact: 'High', blastRadius: 'Lateral movement on flat legacy zones', threatRelevance: 'Medium', processAffected: 'Claims Processing', evidence: 'Panorama: 2 legacy zones flat; east-west rules partial', action: 'Microsegment legacy claims zone; enforce east-west policy' },
  { id: 'appsec_testing', name: 'Application Security Testing', csf: 'PR.PS-06', cis: 'CIS 16', riskContribution: 42, likelihood: 'Low', impact: 'Medium', blastRadius: 'Member-facing app vulns', threatRelevance: 'Medium', processAffected: 'Provider Portal', evidence: 'Snyk: SAST on 60% of repos; 8 high SCA findings open', action: 'Expand SAST/SCA gates to all member-facing repos' },
  { id: 'awareness', name: 'Security Awareness Training', csf: 'PR.AT-01', cis: 'CIS 14', riskContribution: 33, likelihood: 'Low', impact: 'Medium', blastRadius: 'Workforce susceptibility', threatRelevance: 'Medium', processAffected: 'Enrollment', evidence: 'KnowBe4: 95% completion; click rate trending down', action: 'Sustain program; role-based modules for privileged users' },
];

// 15 internal security thresholds (risk-appetite breach view).
const THRESHOLDS = [
  { id: 'crit_vuln_age', name: 'Critical vulnerability aging', threshold: '≤ 14 days', current: 22, unit: 'days', direction: 'lte', limit: 14, breachSeverity: 'High', trend: 'worsening', policyRef: 'Vuln Mgmt Policy §4.2', action: 'Escalate overdue criticals to emergency change' },
  { id: 'inet_crit_age', name: 'Internet-facing critical vuln aging', threshold: '≤ 7 days', current: 19, unit: 'days', direction: 'lte', limit: 7, breachSeverity: 'Critical', trend: 'worsening', policyRef: 'Risk Appetite §2.1', action: 'Emergency-patch KEV CVEs on internet-facing tier' },
  { id: 'mfa_cov', name: 'MFA coverage', threshold: '≥ 95%', current: 78, unit: '%', direction: 'gte', limit: 95, breachSeverity: 'High', trend: 'improving', policyRef: 'IAM Standard §3', action: 'Close MFA enrollment gaps; enforce on legacy VPN' },
  { id: 'priv_review', name: 'Privileged account review completion', threshold: '≥ 95%', current: 80, unit: '%', direction: 'gte', limit: 95, breachSeverity: 'Medium', trend: 'improving', policyRef: 'IAM Standard §5', action: 'Complete overdue access certifications' },
  { id: 'orphan_accts', name: 'Orphan account count', threshold: '≤ 5', current: 12, unit: 'accounts', direction: 'lte', limit: 5, breachSeverity: 'Medium', trend: 'stable', policyRef: 'JML Procedure', action: 'Disable orphan accounts; automate leaver flow' },
  { id: 'edr_cov', name: 'EDR coverage', threshold: '≥ 95%', current: 71, unit: '%', direction: 'gte', limit: 95, breachSeverity: 'High', trend: 'improving', policyRef: 'Endpoint Standard §2', action: 'Deploy EDR to remaining servers' },
  { id: 'triage_sla', name: 'Critical alert triage SLA', threshold: '≤ 30 min', current: 41, unit: 'min', direction: 'lte', limit: 30, breachSeverity: 'Medium', trend: 'worsening', policyRef: 'SOC Runbook', action: 'Tune detections; add after-hours coverage' },
  { id: 'mttd', name: 'Mean time to detect (MTTD)', threshold: '≤ 24 hrs', current: 31, unit: 'hrs', direction: 'lte', limit: 24, breachSeverity: 'High', trend: 'worsening', policyRef: 'Detection Standard', action: 'Close ATT&CK detection gaps; correlation tuning' },
  { id: 'mttr', name: 'Mean time to respond (MTTR)', threshold: '≤ 48 hrs', current: 44, unit: 'hrs', direction: 'lte', limit: 48, breachSeverity: 'Medium', trend: 'stable', policyRef: 'IR Plan §6', action: 'Streamline containment runbooks' },
  { id: 'backup_success', name: 'Backup success rate', threshold: '≥ 99%', current: 99, unit: '%', direction: 'gte', limit: 99, breachSeverity: 'Low', trend: 'stable', policyRef: 'Resilience Standard', action: 'Investigate recurring job failures' },
  { id: 'restore_test', name: 'Restore test success rate', threshold: '≥ 95%', current: 0, unit: '%', direction: 'gte', limit: 95, breachSeverity: 'High', trend: 'worsening', policyRef: 'Resilience Standard §4', action: 'Run quarterly restore tests on tier-1 systems' },
  { id: 'log_cov', name: 'Critical system logging coverage', threshold: '≥ 98%', current: 98, unit: '%', direction: 'gte', limit: 98, breachSeverity: 'High', trend: 'stable', policyRef: 'Logging Standard', action: 'Onboard tier-1 systems missing from SIEM' },
  { id: 'vendor_findings', name: 'Vendor high-risk open findings', threshold: '≤ 2', current: 4, unit: 'vendors', direction: 'lte', limit: 2, breachSeverity: 'High', trend: 'worsening', policyRef: 'TPRM Policy §3', action: 'Drive critical-vendor remediation' },
  { id: 'cloud_misconfig', name: 'Cloud critical misconfigurations', threshold: '≤ 5', current: 37, unit: 'findings', direction: 'lte', limit: 5, breachSeverity: 'High', trend: 'worsening', policyRef: 'Cloud Security Standard', action: 'Remediate public exposure; enforce guardrails' },
  { id: 'dlp_incidents', name: 'DLP high-severity incidents', threshold: '≤ 3 / mo', current: 7, unit: '/mo', direction: 'lte', limit: 3, breachSeverity: 'Medium', trend: 'worsening', policyRef: 'Data Protection Standard', action: 'Investigate egress patterns; extend cloud DLP' },
];

// 10 critical business processes (process-centric protection view).
const BUSINESS_PROCESSES = [
  { id: 'claims', name: 'Claims Processing', protectionLevel: 58, supportingSystems: ['Claims platform', 'EDW', 'AD/Okta'], identityRisk: 'High', vulnRisk: 'High', detectionCoverage: 'Medium', dataProtection: 'Medium', recoveryReadiness: 'Low', thirdPartyRisk: 'Medium', resilienceRating: 'Moderate' },
  { id: 'member_portal', name: 'Member Portal', protectionLevel: 55, supportingSystems: ['Member portal', 'API gateway', 'Okta'], identityRisk: 'High', vulnRisk: 'High', detectionCoverage: 'Medium', dataProtection: 'Medium', recoveryReadiness: 'Medium', thirdPartyRisk: 'Low', resilienceRating: 'Moderate' },
  { id: 'provider_portal', name: 'Provider Portal', protectionLevel: 61, supportingSystems: ['Provider portal', 'API gateway'], identityRisk: 'Medium', vulnRisk: 'Medium', detectionCoverage: 'Medium', dataProtection: 'Medium', recoveryReadiness: 'Medium', thirdPartyRisk: 'Medium', resilienceRating: 'Moderate' },
  { id: 'provider_payments', name: 'Provider Payments', protectionLevel: 52, supportingSystems: ['Payment rails', 'ERP', 'Vendor gateway'], identityRisk: 'High', vulnRisk: 'Medium', detectionCoverage: 'Medium', dataProtection: 'Medium', recoveryReadiness: 'Medium', thirdPartyRisk: 'High', resilienceRating: 'Weak' },
  { id: 'prior_auth', name: 'Prior Authorization', protectionLevel: 64, supportingSystems: ['UM platform', 'EDW'], identityRisk: 'Medium', vulnRisk: 'Medium', detectionCoverage: 'Medium', dataProtection: 'High', recoveryReadiness: 'Medium', thirdPartyRisk: 'Medium', resilienceRating: 'Moderate' },
  { id: 'enrollment', name: 'Enrollment', protectionLevel: 60, supportingSystems: ['Enrollment system', 'EDI gateway'], identityRisk: 'Medium', vulnRisk: 'Medium', detectionCoverage: 'Low', dataProtection: 'Medium', recoveryReadiness: 'Medium', thirdPartyRisk: 'Medium', resilienceRating: 'Moderate' },
  { id: 'cust_service', name: 'Customer Service Operations', protectionLevel: 63, supportingSystems: ['CRM', 'Telephony', 'Okta'], identityRisk: 'Medium', vulnRisk: 'Low', detectionCoverage: 'Medium', dataProtection: 'Medium', recoveryReadiness: 'Medium', thirdPartyRisk: 'Medium', resilienceRating: 'Moderate' },
  { id: 'data_exchange', name: 'Data Exchange / API Integrations', protectionLevel: 56, supportingSystems: ['API gateway', 'EDI', 'Cloud'], identityRisk: 'Medium', vulnRisk: 'Medium', detectionCoverage: 'Medium', dataProtection: 'Medium', recoveryReadiness: 'Medium', thirdPartyRisk: 'High', resilienceRating: 'Moderate' },
  { id: 'finance_ops', name: 'Finance / Payment Operations', protectionLevel: 59, supportingSystems: ['ERP', 'Banking integration'], identityRisk: 'Medium', vulnRisk: 'Low', detectionCoverage: 'Medium', dataProtection: 'High', recoveryReadiness: 'Medium', thirdPartyRisk: 'Medium', resilienceRating: 'Moderate' },
  { id: 'secops', name: 'Security Operations', protectionLevel: 65, supportingSystems: ['Splunk', 'CrowdStrike', 'ServiceNow'], identityRisk: 'Medium', vulnRisk: 'Low', detectionCoverage: 'Medium', dataProtection: 'Medium', recoveryReadiness: 'Medium', thirdPartyRisk: 'Low', resilienceRating: 'Moderate' },
];

// Attack pathways threatening critical processes.
const ATTACK_PATHWAYS = [
  { id: 'ap_claims_ransom', process: 'Claims Processing', narrative: 'Phishing → Okta account compromise → privileged escalation via unvaulted admin → claims platform access → data encryption/exfiltration → claims disruption.', mitreStages: ['TA0001 Initial Access', 'TA0006 Credential Access', 'TA0004 Privilege Escalation', 'TA0008 Lateral Movement', 'TA0040 Impact'], initialAccess: 'Credential phishing (no phishing-resistant MFA)', escalation: 'Unvaulted domain-admin account (PAM gap)', lateral: 'Flat legacy claims network zone', target: 'Claims platform + EDW (PHI)', businessImpact: 'Claims halt; PHI breach; member & provider disruption', weakestControl: 'Privileged Access Management', breakingControls: ['Phishing-resistant MFA for admins', 'PAM vaulting + JIT', 'Microsegmentation of claims zone', 'Immutable, tested backups'], mitigation: 'Vault privileged accounts, enforce FIDO2 for admins, microsegment claims zone' },
  { id: 'ap_portal_data', process: 'Member Portal', narrative: 'Internet-facing critical CVE → web tier foothold → token theft → API abuse → bulk PHI export.', mitreStages: ['TA0001 Initial Access', 'TA0002 Execution', 'TA0006 Credential Access', 'TA0010 Exfiltration'], initialAccess: 'Unpatched internet-facing CVE (KEV)', escalation: 'Service-account token reuse', lateral: 'API gateway trust to data tier', target: 'Member portal + member-data API', businessImpact: 'Mass PHI exfiltration; regulatory breach notification', weakestControl: 'Vulnerability Remediation', breakingControls: ['7-day internet-facing patch SLA', 'WAF virtual patching', 'API rate-limiting + DLP', 'Short-lived tokens'], mitigation: 'Emergency-patch KEV CVEs; add API DLP and token hardening' },
  { id: 'ap_vendor_payments', process: 'Provider Payments', narrative: 'Compromised vendor with critical access → trusted connection → payment platform → fraudulent payment redirection.', mitreStages: ['TA0001 Initial Access', 'TA0008 Lateral Movement', 'TA0040 Impact'], initialAccess: 'Third-party compromise (unassessed critical vendor)', escalation: 'Over-scoped vendor access', lateral: 'Vendor gateway to payment rails', target: 'Provider payment platform', businessImpact: 'Payment fraud; provider trust damage; financial loss', weakestControl: 'Third-Party Access', breakingControls: ['Critical-vendor assessment', 'Scoped, time-bound vendor access', 'Payment anomaly detection', 'Out-of-band payment verification'], mitigation: 'Assess critical vendors; scope-limit access; add payment anomaly detection' },
  { id: 'ap_cloud_exposure', process: 'Data Exchange / API Integrations', narrative: 'Public cloud storage misconfiguration → direct data access → PHI exposure without authentication.', mitreStages: ['TA0001 Initial Access', 'TA0009 Collection', 'TA0010 Exfiltration'], initialAccess: 'Publicly-exposed storage bucket', escalation: 'n/a (direct access)', lateral: 'n/a', target: 'Cloud member-data store', businessImpact: 'Silent PHI exposure; breach notification', weakestControl: 'Cloud Configuration Management', breakingControls: ['CSPM guardrails blocking public exposure', 'Encryption + access logging', 'Continuous config monitoring'], mitigation: 'Remediate public exposure; enforce CIS guardrails and CSPM auto-remediation' },
];

// Cyber-event readiness items.
const READINESS_ITEMS = [
  { id: 'ir_playbooks', name: 'Incident response playbook coverage', status: 'Adequate', score: 72 },
  { id: 'tabletop', name: 'Tabletop exercise status', status: 'Overdue', score: 45 },
  { id: 'ransomware', name: 'Ransomware readiness', status: 'Weak', score: 48 },
  { id: 'backup_immutable', name: 'Backup immutability', status: 'Adequate', score: 70 },
  { id: 'restore_testing', name: 'Restore testing', status: 'Weak', score: 35 },
  { id: 'crisis_comms', name: 'Crisis communication readiness', status: 'Adequate', score: 66 },
  { id: 'reg_notify', name: 'Legal / regulatory notification readiness', status: 'Adequate', score: 68 },
  { id: 'soc_escalation', name: 'SOC escalation readiness', status: 'Moderate', score: 60 },
  { id: 'forensics', name: 'Forensics readiness', status: 'Moderate', score: 62 },
  { id: 'bc_alignment', name: 'Business continuity alignment', status: 'Moderate', score: 58 },
];

// Security investments → measurable risk reduction.
const INVESTMENTS = [
  { id: 'iam_modernization', name: 'SailPoint / IAM modernization', spend: '$1.8M', riskArea: 'Identity & Access', baselineRisk: 78, currentRisk: 60, futureReduction: 18, blockers: 'App onboarding backlog', decision: 'Approve phase-2 funding to finish privileged onboarding' },
  { id: 'crowdstrike', name: 'CrowdStrike rollout', spend: '$1.1M', riskArea: 'Endpoint / Detection', baselineRisk: 70, currentRisk: 52, futureReduction: 10, blockers: 'Server agent coverage gap', decision: 'None — on track; finish server coverage' },
  { id: 'splunk_soar', name: 'Splunk / SOAR enhancement', spend: '$900K', riskArea: 'Detection & Response', baselineRisk: 66, currentRisk: 55, futureReduction: 12, blockers: 'Detection-engineering headcount', decision: 'Approve 2 detection-engineer hires' },
  { id: 'prisma', name: 'Prisma / cloud security', spend: '$650K', riskArea: 'Cloud Security', baselineRisk: 64, currentRisk: 52, futureReduction: 14, blockers: 'Auto-remediation not enabled', decision: 'Approve CSPM auto-remediation rollout' },
  { id: 'dlp', name: 'DLP modernization', spend: '$500K', riskArea: 'Data Protection', baselineRisk: 60, currentRisk: 54, futureReduction: 16, blockers: 'Cloud/SaaS coverage not scoped', decision: 'Fund cloud-egress DLP extension' },
  { id: 'backup_modern', name: 'Backup / restore modernization', spend: '$750K', riskArea: 'Recovery & Resilience', baselineRisk: 62, currentRisk: 55, futureReduction: 15, blockers: 'Restore-test program not staffed', decision: 'Mandate quarterly restore testing' },
  { id: 'tprm', name: 'Third-party risk improvement', spend: '$400K', riskArea: 'Third-Party Risk', baselineRisk: 66, currentRisk: 58, futureReduction: 12, blockers: 'Assessment throughput', decision: 'Approve continuous-monitoring tooling' },
];

// Hidden / unknowingly-accepted risks.
const HIDDEN_RISKS = [
  { id: 'hr_iam_gap', risk: 'Critical systems not onboarded to IAM governance', whyHidden: 'Out of SailPoint scope, so absent from access reviews', evidence: 'SailPoint: legacy claims DB & EDI gateway not under governance', domain: 'Identity & Access', process: 'Claims Processing', impact: 'Unreviewed standing access to PHI', formalAcceptance: false, escalation: 'Escalate to CISO + Risk Committee for formal decision' },
  { id: 'hr_log_gap', risk: 'Missing logs from critical systems', whyHidden: 'Detection coverage appears green at aggregate level', evidence: 'Splunk: 2 tier-1 systems not forwarding logs', domain: 'Detection & Response', process: 'Security Operations', impact: 'Undetected compromise on tier-1 systems', formalAcceptance: false, escalation: 'Escalate; no formal acceptance on record' },
  { id: 'hr_restore', risk: 'Untested restore plans', whyHidden: 'Backup success rate is high and reported as healthy', evidence: 'Last full restore test 14 months ago', domain: 'Recovery & Resilience', process: 'Claims Processing', impact: 'Recovery may fail during ransomware event', formalAcceptance: false, escalation: 'Escalate ransomware recovery risk to Board' },
  { id: 'hr_pam', risk: 'Privileged accounts outside PAM', whyHidden: 'Vaulting metric reported as a percentage, not by criticality', evidence: 'CyberArk: 57% of privileged accounts unvaulted', domain: 'Identity & Access', process: 'Claims Processing', impact: 'Ransomware-grade blast radius', formalAcceptance: false, escalation: 'Escalate; require time-boxed remediation plan' },
  { id: 'hr_vendor', risk: 'Vendors with critical access but incomplete reviews', whyHidden: 'TPRM dashboard shows program coverage, not access criticality', evidence: 'Saraqael: 4 critical vendors unassessed with active access', domain: 'Third-Party Risk', process: 'Provider Payments', impact: 'Supply-chain compromise path to payments', formalAcceptance: false, escalation: 'Escalate to Vendor Risk + CISO' },
  { id: 'hr_exceptions', risk: 'Security exceptions past expiration', whyHidden: 'Exceptions granted then not re-reviewed', evidence: 'GRC: 6 exceptions expired but still in effect', domain: 'Governance & Oversight', process: 'Multiple', impact: 'Unmanaged accepted risk drifting open', formalAcceptance: 'expired', escalation: 'Re-review or formally re-accept each expired exception' },
];

// Top CISO attention items (prioritized risks).
const ATTENTION_ITEMS = [
  { id: 'att_pam', title: 'Privileged accounts outside PAM expose ransomware blast radius', severity: 'Critical', businessImpact: 'A single compromised admin could halt claims and encrypt PHI', whyNow: 'Active ransomware targeting of privileged identity; 57% unvaulted', process: 'Claims Processing', decision: 'Approve time-boxed PAM vaulting sprint + JIT', owner: 'IAM Lead', targetDate: '2026-07-15', escalationPath: 'CISO → Risk Committee', blockers: 'App-team coordination for service accounts' },
  { id: 'att_kev', title: 'Internet-facing KEV vulnerabilities aging past appetite', severity: 'Critical', businessImpact: 'Direct path to member-data exfiltration via the portal', whyNow: '3 KEV CVEs exposed >19 days vs 7-day appetite', process: 'Member Portal', decision: 'Authorize emergency change window', owner: 'Vuln Mgmt Lead', targetDate: '2026-06-20', escalationPath: 'CISO → CIO change board', blockers: 'Change-freeze conflict' },
  { id: 'att_restore', title: 'Ransomware recovery unproven — restore untested 14 months', severity: 'High', businessImpact: 'Recovery could fail, extending a claims outage for days', whyNow: 'Ransomware is the top modeled scenario; no recent restore proof', process: 'Claims Processing', decision: 'Mandate quarterly restore tests on tier-1', owner: 'Resilience Lead', targetDate: '2026-07-31', escalationPath: 'CISO → Board risk update', blockers: 'Restore-test program unstaffed' },
  { id: 'att_vendor', title: 'Critical vendors with active access remain unassessed', severity: 'High', businessImpact: 'Supply-chain path into provider payments', whyNow: '4 critical vendors with open high findings; 15 unassessed', process: 'Provider Payments', decision: 'Scope-limit access pending assessment', owner: 'TPRM Lead', targetDate: '2026-07-31', escalationPath: 'CISO → Vendor Risk Committee', blockers: 'Assessment throughput' },
  { id: 'att_cloud', title: 'Public cloud storage exposure of member data', severity: 'High', businessImpact: 'Silent PHI exposure with breach-notification risk', whyNow: '2 public buckets + 37 critical misconfigs', process: 'Data Exchange / APIs', decision: 'Approve CSPM auto-remediation', owner: 'Cloud Security Lead', targetDate: '2026-06-30', escalationPath: 'CISO → Cloud governance', blockers: 'Change approval for guardrails' },
  { id: 'att_logging', title: 'Detection blind spots on tier-1 claims systems', severity: 'High', businessImpact: 'Compromise of claims systems could go undetected', whyNow: '2 tier-1 systems not logging; MTTD trending up', process: 'Security Operations', decision: 'Prioritize SIEM onboarding of legacy claims', owner: 'SOC Manager', targetDate: '2026-07-10', escalationPath: 'CISO', blockers: 'Legacy log-format engineering' },
];

// Action-Now queue (ranked by severity × urgency × businessImpact × threatRel × remediationConfidence).
const ACTIONS = [
  { id: 'act_kev', action: 'Emergency-patch 3 internet-facing KEV CVEs', whyNow: 'Actively exploited; >19 days exposed vs 7-day appetite', riskReduced: 'Member-portal data exfiltration path', process: 'Member Portal', owner: 'Vuln Mgmt Lead', dueDate: '2026-06-20', dependency: 'Change window', automation: 'Auto-deploy via patch orchestration', escalation: true, severity: 5, urgency: 5, businessImpact: 5, threatRel: 5, remediationConfidence: 4 },
  { id: 'act_pam', action: 'Vault privileged accounts + enforce JIT (sprint 1)', whyNow: 'Ransomware blast-radius reduction; 57% unvaulted', riskReduced: 'Privileged-escalation path to claims', process: 'Claims Processing', owner: 'IAM Lead', dueDate: '2026-07-15', dependency: 'App-team service-account mapping', automation: 'CyberArk auto-onboarding', escalation: true, severity: 5, urgency: 4, businessImpact: 5, threatRel: 5, remediationConfidence: 3 },
  { id: 'act_cloud', action: 'Remediate 2 public buckets; enable CSPM guardrails', whyNow: 'Silent PHI exposure live now', riskReduced: 'Direct cloud data exposure', process: 'Data Exchange / APIs', owner: 'Cloud Security Lead', dueDate: '2026-06-30', dependency: 'Guardrail change approval', automation: 'Prisma auto-remediation', escalation: false, severity: 4, urgency: 5, businessImpact: 4, threatRel: 4, remediationConfidence: 5 },
  { id: 'act_restore', action: 'Execute tier-1 restore test (claims platform)', whyNow: 'Unproven ransomware recovery', riskReduced: 'Recovery failure during ransomware', process: 'Claims Processing', owner: 'Resilience Lead', dueDate: '2026-07-31', dependency: 'Maintenance window', automation: 'Orchestrated recovery runbook', escalation: false, severity: 4, urgency: 4, businessImpact: 5, threatRel: 4, remediationConfidence: 4 },
  { id: 'act_mfa', action: 'Drive MFA to 95%+ and FIDO2 for admins', whyNow: 'Phishing is #1 initial access; 78% coverage', riskReduced: 'Account-takeover initial access', process: 'Enrollment', owner: 'IAM Lead', dueDate: '2026-07-20', dependency: 'Legacy VPN enforcement', automation: 'Okta policy push', escalation: false, severity: 4, urgency: 4, businessImpact: 4, threatRel: 5, remediationConfidence: 5 },
  { id: 'act_vendor', action: 'Assess 4 critical vendors; scope-limit access', whyNow: 'Active supply-chain risk to payments', riskReduced: 'Third-party path to provider payments', process: 'Provider Payments', owner: 'TPRM Lead', dueDate: '2026-07-31', dependency: 'Vendor responsiveness', automation: 'Continuous monitoring feed', escalation: false, severity: 4, urgency: 3, businessImpact: 4, threatRel: 4, remediationConfidence: 3 },
  { id: 'act_logging', action: 'Onboard 2 tier-1 claims systems to SIEM', whyNow: 'Detection blind spot on PHI systems', riskReduced: 'Undetected compromise dwell time', process: 'Security Operations', owner: 'SOC Manager', dueDate: '2026-07-10', dependency: 'Legacy log-format work', automation: 'Log-forwarder templates', escalation: false, severity: 4, urgency: 3, businessImpact: 4, threatRel: 3, remediationConfidence: 4 },
  { id: 'act_tabletop', action: 'Run ransomware tabletop exercise', whyNow: 'Last exercise 13 months ago', riskReduced: 'Slow / uncoordinated incident response', process: 'Security Operations', owner: 'IR Lead', dueDate: '2026-08-15', dependency: 'Exec availability', automation: 'n/a', escalation: false, severity: 3, urgency: 3, businessImpact: 4, threatRel: 3, remediationConfidence: 5 },
  { id: 'act_supplychain', action: 'Sign build artifacts + pin third-party CI actions on critical pipelines', whyNow: 'Unsigned artifacts + unpinned Actions = SolarWinds / tj-actions exposure', riskReduced: 'Tampering between build and production deploy', process: 'Data Exchange / APIs', owner: 'Platform Eng Lead', dueDate: '2026-07-25', dependency: 'CI pipeline changes + Sigstore rollout', automation: 'Sigstore cosign + admission verification', escalation: false, severity: 4, urgency: 4, businessImpact: 4, threatRel: 4, remediationConfidence: 4 },
];

// Peer maturity comparison (where we trail).
const PEER_MATURITY = [
  { domain: 'Identity & Access', us: 71, peerMedian: 80, gap: -9 },
  { domain: 'Detection & Response', us: 66, peerMedian: 78, gap: -12 },
  { domain: 'Vulnerability Management', us: 58, peerMedian: 74, gap: -16 },
  { domain: 'Cloud Security', us: 62, peerMedian: 72, gap: -10 },
  { domain: 'Third-Party Risk', us: 54, peerMedian: 70, gap: -16 },
  { domain: 'Recovery & Resilience', us: 60, peerMedian: 75, gap: -15 },
];

// Emerging risks (faster than we adapt).
const EMERGING_RISKS = [
  { id: 'em_ai', risk: 'Shadow GenAI / AI-coding tool data leakage', velocity: 'High', ourAdaptation: 'Low', note: 'No DLP coverage for GenAI endpoints; policy pending' },
  { id: 'em_identity', risk: 'Identity-based ransomware (privileged compromise)', velocity: 'High', ourAdaptation: 'Medium', note: 'PAM modernization in progress but 57% unvaulted' },
  { id: 'em_supply', risk: 'Third-party / supply-chain compromise', velocity: 'High', ourAdaptation: 'Low', note: 'Critical-vendor assessment backlog' },
  { id: 'em_cloud', risk: 'Cloud misconfiguration exposure at scale', velocity: 'Medium', ourAdaptation: 'Medium', note: 'CSPM in place; auto-remediation not enabled' },
];

// Evidence-source registry (each maps a mock value to the live tool).
const EVIDENCE_SOURCES = [
  { id: 'okta', name: 'Okta', domain: 'Identity & Access', metric: 'MFA / accounts', live: false },
  { id: 'sailpoint', name: 'SailPoint', domain: 'Identity & Access', metric: 'Access reviews / orphans', live: false },
  { id: 'cyberark', name: 'CyberArk', domain: 'Identity & Access', metric: 'Privileged vaulting', live: false },
  { id: 'crowdstrike', name: 'CrowdStrike', domain: 'Endpoint / Detection', metric: 'EDR coverage', live: false },
  { id: 'splunk', name: 'Splunk', domain: 'Detection & Response', metric: 'Logging / MTTD', live: false },
  { id: 'servicenow', name: 'ServiceNow', domain: 'Detection & Response', metric: 'Incidents / MTTR', live: false },
  { id: 'tenable', name: 'Tenable', domain: 'Vulnerability Management', metric: 'Vuln aging / patch SLA', live: false },
  { id: 'prisma', name: 'Prisma Cloud', domain: 'Cloud Security', metric: 'Misconfigurations', live: false },
  { id: 'panorama', name: 'Palo Alto / Panorama', domain: 'Network Security', metric: 'Segmentation', live: false },
  { id: 'purview', name: 'Microsoft Purview', domain: 'Data Protection', metric: 'DLP incidents', live: false },
  { id: 'rubrik', name: 'Rubrik', domain: 'Recovery & Resilience', metric: 'Backup / restore', live: false },
  { id: 'bitsight', name: 'BitSight', domain: 'Third-Party Risk', metric: 'Vendor ratings', live: false },
];

// The 5 questions a CISO must answer to run the program (each consolidates
// several underlying themes). Executive answers are generated in the service.
const QUESTIONS = [
  { id: 'q1', n: 1, q: 'What is our security posture and how is it trending?' },
  { id: 'q2', n: 2, q: 'Where is our greatest risk and what must we act on now?' },
  { id: 'q3', n: 3, q: 'If we were attacked today, where would we be hit — and are we ready?' },
  { id: 'q4', n: 4, q: 'Are we within our risk thresholds, and what are we silently accepting?' },
  { id: 'q5', n: 5, q: 'Are our security investments reducing risk, and where do we trail?' },
];

module.exports = {
  SECURITY_DOMAINS, CONTROL_AREAS, THRESHOLDS, BUSINESS_PROCESSES, ATTACK_PATHWAYS,
  READINESS_ITEMS, INVESTMENTS, HIDDEN_RISKS, ATTENTION_ITEMS, ACTIONS,
  PEER_MATURITY, EMERGING_RISKS, EVIDENCE_SOURCES, QUESTIONS,
};
