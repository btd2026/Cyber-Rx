'use strict';

/**
 * connectorProfiles — the STATIC, connector-specific onboarding requirements:
 * authentication, read-only permissions, tenant/environment fields, and the
 * category-driven scope + denominator fields. Everything else in a manifest
 * (which controls the connector supports, the evidence they need, readiness
 * rules) is DERIVED from the framework-native control registries, so a control
 * and its onboarding requirements can never drift apart.
 *
 * The client is only ever asked for what appears here for their tool.
 */

const f = (key, label, o) => Object.assign({ key, label, type: 'text' }, o || {});
const secret = (key, label, o) => f(key, label, Object.assign({ secret: true }, o || {}));

// ---- category-level scope + denominator questions (the only scope/denominator
//      the client is asked for, driven purely by the tool's category) ----------
const CATEGORY = {
  'Identity / SSO': {
    area: 'Identity & Access',
    scope: [
      f('in_scope_user_groups', 'Which user groups are in scope?', { type: 'list', help: 'The populations Nerion assesses (e.g., All Employees, Contractors).' }),
      f('excluded_user_groups', 'Which users/groups are excluded?', { type: 'list', optional: true }),
      f('privileged_role_scope', 'Which privileged roles are in scope?', { type: 'list' }),
      f('service_account_handling', 'Are service accounts included or excluded?', { type: 'select', options: ['included', 'excluded'] }),
      f('break_glass_account_handling', 'Which accounts are break-glass?', { type: 'list', optional: true }),
    ],
    denominator: [
      f('authoritative_user_source', 'Authoritative user directory (denominator for coverage %)', { help: 'The system of record for “all users”.' }),
      f('active_user_population_source', 'Active-user population source', { optional: true }),
      f('privileged_account_population_source', 'Privileged-account population source', { optional: true }),
    ],
  },
  'Endpoint / EDR': {
    area: 'Endpoint Protection',
    scope: [
      f('endpoint_groups_in_scope', 'Which endpoint groups are in scope?', { type: 'list' }),
      f('include_servers', 'Include servers?', { type: 'select', options: ['yes', 'no'] }),
      f('include_workstations', 'Include workstations?', { type: 'select', options: ['yes', 'no'] }),
      f('include_cloud_workloads', 'Include cloud workloads?', { type: 'select', options: ['yes', 'no'] }),
      f('stale_sensor_threshold', 'Stale-sensor threshold (days without check-in)', { type: 'number', default: 7 }),
    ],
    denominator: [f('endpoint_denominator_source', 'Authoritative endpoint inventory (CMDB/MDM) — coverage denominator')],
  },
  'Vulnerability management': {
    area: 'Vulnerability Management',
    scope: [
      f('asset_groups_in_scope', 'Which asset groups are in scope?', { type: 'list' }),
      f('severity_thresholds', 'Severity thresholds to track', { type: 'list', default: ['critical', 'high'] }),
      f('remediation_sla_thresholds', 'Remediation SLA (days) for critical / high', { help: 'e.g., critical 15, high 30' }),
      f('exception_handling_source', 'Exception/acceptance source', { optional: true }),
      f('business_criticality_source', 'Asset business-criticality source', { optional: true }),
    ],
    denominator: [f('asset_denominator_source', 'Authoritative asset inventory — coverage denominator')],
  },
  'SIEM / Log analytics': {
    area: 'Detection & Monitoring',
    scope: [
      f('expected_log_source_inventory', 'Expected critical log sources (inventory)', { type: 'list', help: 'What SHOULD be sending logs — the coverage denominator.' }),
      f('critical_system_scope', 'Critical applications/systems in scope', { type: 'list' }),
      f('required_log_types', 'Required log types', { type: 'list', optional: true }),
      f('retention_requirement', 'Required retention (days)', { type: 'number' }),
      f('parser_health_requirement', 'Require parser-health check?', { type: 'select', options: ['yes', 'no'], optional: true }),
    ],
    denominator: [f('expected_log_source_inventory', 'Expected log-source inventory — coverage denominator')],
  },
  'Privileged access (PAM)': {
    area: 'Privileged Access',
    scope: [
      f('vault_scope', 'Which systems/accounts are in the vault scope?', { type: 'list' }),
      f('break_glass_account_handling', 'Break-glass account handling', { type: 'list', optional: true }),
      f('rotation_policy_source', 'Rotation-policy source', { optional: true }),
      f('session_review_scope', 'Session recording/review scope', { type: 'list', optional: true }),
    ],
    denominator: [f('privileged_account_population_source', 'Authoritative privileged-account population — denominator')],
  },
  'Access governance / IGA': {
    area: 'Identity Governance',
    scope: [
      f('applications_in_scope', 'Which applications are in scope?', { type: 'list' }),
      f('review_campaign_scope', 'Access-review campaign scope', { type: 'list' }),
      f('revocation_sla', 'Revocation SLA (days)', { type: 'number' }),
      f('orphan_dormant_thresholds', 'Orphan/dormant threshold (days without login)', { type: 'number', default: 90 }),
    ],
    denominator: [f('authoritative_identity_source', 'Authoritative identity source — denominator')],
  },
  'Cloud security posture (CSPM)': {
    area: 'Cloud Posture',
    scope: [
      f('cloud_accounts_in_scope', 'Which cloud accounts/subscriptions/projects are in scope?', { type: 'list' }),
      f('prod_nonprod_scope', 'Production / non-production scope', { type: 'select', options: ['production only', 'all'] }),
      f('resource_owner_source', 'Resource-owner source', { optional: true }),
      f('business_service_mapping_source', 'Business-service mapping source', { optional: true }),
      f('regulated_ephi_tagging_source', 'Regulated / ePHI tagging source', { optional: true }),
      f('exception_handling_source', 'Exception-handling source', { optional: true }),
    ],
    denominator: [f('cloud_accounts_in_scope', 'In-scope cloud accounts — evaluated-resource denominator')],
  },
  'Backup & disaster recovery': {
    area: 'Backup & Recovery',
    scope: [
      f('critical_systems_in_scope', 'Which critical systems are in scope?', { type: 'list' }),
      f('rpo_target', 'RPO target (minutes)', { type: 'number' }),
      f('rto_target', 'RTO target (hours)', { type: 'number' }),
      f('immutable_backup_requirement', 'Require immutable backups?', { type: 'select', options: ['yes', 'no'], default: 'yes' }),
      f('restore_test_requirement', 'Require restore testing?', { type: 'select', options: ['yes', 'no'], default: 'yes' }),
    ],
    denominator: [f('protected_system_denominator', 'Critical-system inventory — coverage denominator')],
  },
  'Data loss prevention (DLP)': {
    area: 'Data Loss Prevention',
    scope: [
      f('channels_in_scope', 'Channels in scope', { type: 'list', options: ['endpoint', 'email', 'cloud apps', 'web'], help: 'Endpoint / email / cloud apps / web.' }),
      f('sensitive_data_types', 'Sensitive data types', { type: 'list' }),
      f('ephi_regulated_scope', 'ePHI / regulated data scope', { type: 'list', optional: true }),
      f('enforced_vs_monitor_handling', 'Count monitor-only policies?', { type: 'select', options: ['enforced only', 'include monitor-only'] }),
      f('exception_handling', 'Exception handling', { optional: true }),
    ],
    denominator: [f('endpoint_email_cloud_scope', 'Monitored endpoint / mailbox / cloud-app population — denominator')],
  },
  'Network segmentation / Zero-Trust': {
    area: 'Network Segmentation',
    scope: [
      f('workload_groups_in_scope', 'Which workload groups are in scope?', { type: 'list' }),
      f('enforcement_mode', 'Segmentation enforcement mode counted', { type: 'select', options: ['enforced only', 'include test/monitor'] }),
      f('critical_app_segments', 'Critical application segments', { type: 'list' }),
      f('regulated_ephi_segments', 'Regulated / ePHI segments', { type: 'list', optional: true }),
      f('flow_collection', 'Collect allowed/denied flows?', { type: 'select', options: ['yes', 'no'], optional: true }),
    ],
    denominator: [f('in_scope_workload_inventory', 'In-scope workload inventory — coverage denominator')],
  },
  'Security awareness & email security': {
    area: 'Awareness & Email Security',
    scope: [
      f('assigned_user_population', 'Assigned user population', { type: 'list' }),
      f('required_training_campaigns', 'Required training campaigns', { type: 'list', optional: true }),
      f('role_based_training_groups', 'Role-based training groups', { type: 'list', optional: true }),
      f('training_frequency', 'Required training frequency', { type: 'select', options: ['annual', 'semi-annual', 'quarterly'] }),
      f('protected_domains', 'Protected domains (email security)', { type: 'list', optional: true }),
      f('protected_mailbox_population', 'Protected mailbox population (email security)', { optional: true }),
      f('phishing_bec_scope', 'Phishing/BEC detection scope', { type: 'list', optional: true }),
    ],
    denominator: [f('assigned_user_population', 'Assigned user population — denominator')],
  },
};

// Auth templates by shape.
const AUTH = {
  oauth_ms: { auth: [f('tenant_id', 'Directory (tenant) ID'), f('client_id', 'Application (client) ID'), secret('client_secret_or_certificate', 'Client secret or certificate')], tenant: [f('tenant_id', 'Tenant ID'), f('environment_name', 'Environment name'), f('environment_type', 'Environment type', { type: 'select', options: ['production', 'non-production'] })] },
  okta: { auth: [f('org_url', 'Okta org URL (https://…okta.com)'), secret('api_token', 'API token (read-only)')], tenant: [f('org_url', 'Org URL'), f('environment_type', 'Environment type', { type: 'select', options: ['production', 'preview'] })] },
  base_token: { auth: [f('base_url', 'API base URL'), secret('api_token', 'API token (read-only)')], tenant: [f('base_url', 'Base URL'), f('environment_type', 'Environment type', { type: 'select', options: ['production', 'non-production'] })] },
  base_userpass: { auth: [f('base_url', 'API base URL'), f('username', 'Username (read-only)'), secret('password', 'Password')], tenant: [f('base_url', 'Base URL')] },
  key_secret: { auth: [f('base_url', 'API base URL'), f('client_id', 'API key / client ID'), secret('client_secret', 'API secret')], tenant: [f('base_url', 'Base URL')] },
  aws: { auth: [f('role_arn', 'Read-only IAM role ARN'), f('external_id', 'External ID', { optional: true })], tenant: [f('account_scope', 'Accounts/regions in scope')] },
};

// connector key → { name, category, authTemplate, permissions[] , tenant? override }
const P = (name, category, authTemplate, permissions) => ({ name, category, authTemplate, permissions: permissions || [] });

const PROFILES = {
  // Identity / SSO
  entra: P('Microsoft Entra ID', 'Identity / SSO', 'oauth_ms', ['Directory.Read.All', 'Policy.Read.All', 'AuditLog.Read.All', 'User.Read.All', 'RoleManagement.Read.Directory']),
  okta: P('Okta', 'Identity / SSO', 'okta', ['okta.users.read', 'okta.policies.read', 'okta.logs.read', 'okta.roles.read']),
  ping: P('Ping Identity', 'Identity / SSO', 'key_secret', ['p1:read:user', 'p1:read:mfaDevice', 'p1:read:policy']),
  duo: P('Cisco Duo', 'Identity / SSO', 'key_secret', ['Admin API — read (users, logs)']),
  onelogin: P('OneLogin', 'Identity / SSO', 'key_secret', ['Read Users', 'Read Auth/MFA', 'Read Events']),
  // Endpoint / EDR
  crowdstrike: P('CrowdStrike Falcon', 'Endpoint / EDR', 'key_secret', ['Hosts: Read', 'Detections: Read', 'Prevention Policies: Read']),
  defender: P('Microsoft Defender for Endpoint', 'Endpoint / EDR', 'oauth_ms', ['Machine.Read.All', 'Alert.Read.All', 'SecurityConfiguration.Read.All']),
  sentinelone: P('SentinelOne', 'Endpoint / EDR', 'base_token', ['Viewer — Agents, Threats']),
  cortexxdr: P('Palo Alto Cortex XDR', 'Endpoint / EDR', 'key_secret', ['Endpoint Administrator — read']),
  // Vulnerability management
  tenable: P('Tenable.io', 'Vulnerability management', 'key_secret', ['Vulnerabilities: View', 'Assets: View']),
  qualys: P('Qualys VMDR', 'Vulnerability management', 'base_userpass', ['VM: Read (API access)']),
  rapid7: P('Rapid7 InsightVM', 'Vulnerability management', 'base_userpass', ['Read-only user (assets, vulnerabilities)']),
  defender_vm: P('Microsoft Defender Vulnerability Management', 'Vulnerability management', 'oauth_ms', ['Vulnerability.Read.All', 'Machine.Read.All']),
  // SIEM / Log analytics
  splunk: P('Splunk', 'SIEM / Log analytics', 'base_token', ['Search (read-only role)', 'REST access to metadata/indexes']),
  sentinel: P('Microsoft Sentinel', 'SIEM / Log analytics', 'oauth_ms', ['Log Analytics Reader', 'Microsoft Sentinel Reader']),
  elastic: P('Elastic Security', 'SIEM / Log analytics', 'base_token', ['read for detections + indices (API key)']),
  qradar: P('IBM QRadar', 'SIEM / Log analytics', 'base_token', ['Offenses: Read', 'Log Sources: Read']),
  chronicle: P('Google Chronicle', 'SIEM / Log analytics', 'key_secret', ['Chronicle API — read (alerts, feeds)']),
  // PAM
  cyberark: P('CyberArk', 'Privileged access (PAM)', 'base_userpass', ['Auditor / read-only (accounts, sessions)']),
  beyondtrust: P('BeyondTrust', 'Privileged access (PAM)', 'key_secret', ['Password Safe — read (managed accounts/systems)']),
  delinea: P('Delinea Secret Server', 'Privileged access (PAM)', 'base_userpass', ['Read-only (secrets, reports, discovery)']),
  oneidentity: P('One Identity Safeguard', 'Privileged access (PAM)', 'key_secret', ['Auditor — read (asset accounts)']),
  // IGA
  sailpoint: P('SailPoint', 'Access governance / IGA', 'base_token', ['idn:read (accounts, campaigns, identities)']),
  saviynt: P('Saviynt', 'Access governance / IGA', 'base_userpass', ['Read (certifications, users)']),
  entra_id_gov: P('Microsoft Entra ID Governance', 'Access governance / IGA', 'oauth_ms', ['AccessReview.Read.All', 'User.Read.All', 'AuditLog.Read.All']),
  okta_iga: P('Okta Identity Governance', 'Access governance / IGA', 'okta', ['okta.governance.read', 'okta.users.read']),
  // CSPM
  wiz: P('Wiz', 'Cloud security posture (CSPM)', 'key_secret', ['read:configuration_findings', 'read:cloud_resources']),
  prisma: P('Prisma Cloud', 'Cloud security posture (CSPM)', 'key_secret', ['Account/Compliance — read']),
  azure: P('Microsoft Defender for Cloud', 'Cloud security posture (CSPM)', 'oauth_ms', ['Security Reader']),
  aws: P('AWS Security Hub', 'Cloud security posture (CSPM)', 'aws', ['securityhub:Get*', 'securityhub:List*']),
  gcp: P('Google Security Command Center', 'Cloud security posture (CSPM)', 'key_secret', ['securitycenter.findings.list (viewer)']),
  orca: P('Orca Security', 'Cloud security posture (CSPM)', 'base_token', ['read (alerts, compliance)']),
  // Backup
  rubrik: P('Rubrik', 'Backup & disaster recovery', 'base_token', ['read-only (SLA, protection, recovery)']),
  veeam: P('Veeam', 'Backup & disaster recovery', 'base_userpass', ['read-only (repositories, jobs)']),
  cohesity: P('Cohesity', 'Backup & disaster recovery', 'base_userpass', ['Viewer (policies, protection)']),
  commvault: P('Commvault', 'Backup & disaster recovery', 'base_userpass', ['read-only (storage pools, jobs)']),
  // DLP
  purview: P('Microsoft Purview', 'Data loss prevention (DLP)', 'oauth_ms', ['InformationProtectionPolicy.Read.All', 'SecurityEvents.Read.All']),
  forcepoint: P('Forcepoint DLP', 'Data loss prevention (DLP)', 'base_userpass', ['read (policies, incidents)']),
  symantec_dlp: P('Symantec DLP', 'Data loss prevention (DLP)', 'base_userpass', ['read (policies, incidents)']),
  zscaler_dlp: P('Zscaler DLP', 'Data loss prevention (DLP)', 'base_userpass', ['read (DLP rules, engines)']),
  netskope: P('Netskope', 'Data loss prevention (DLP)', 'base_token', ['read (DLP profiles, incidents)']),
  // Segmentation
  illumio: P('Illumio', 'Network segmentation / Zero-Trust', 'key_secret', ['read-only (workloads, policy)']),
  zscaler_zpa: P('Zscaler ZPA', 'Network segmentation / Zero-Trust', 'key_secret', ['read (applications, policy)']),
  paloalto_seg: P('Palo Alto Networks', 'Network segmentation / Zero-Trust', 'base_token', ['read (zones, security policy)']),
  cisco_workload: P('Cisco Secure Workload', 'Network segmentation / Zero-Trust', 'key_secret', ['read (workloads, enforcement)']),
  guardicore: P('Akamai Guardicore', 'Network segmentation / Zero-Trust', 'base_userpass', ['read (assets, segmentation policy)']),
  // Awareness / Email
  knowbe4: P('KnowBe4', 'Security awareness & email security', 'base_token', ['Reporting API — read']),
  proofpoint: P('Proofpoint', 'Security awareness & email security', 'key_secret', ['TAP/People — read']),
  abnormal: P('Abnormal Security', 'Security awareness & email security', 'base_token', ['read (threats)']),
  mimecast: P('Mimecast', 'Security awareness & email security', 'key_secret', ['read (impersonation, message tracking)']),
  mdo365: P('Microsoft Defender for Office 365', 'Security awareness & email security', 'oauth_ms', ['ThreatHunting.Read.All', 'SecurityEvents.Read.All']),
};

module.exports = { PROFILES, CATEGORY, AUTH, connectorKeys: Object.keys(PROFILES) };
