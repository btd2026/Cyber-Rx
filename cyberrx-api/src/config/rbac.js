'use strict';

/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * Defines 6 executive roles with 40+ permissions across domains.
 * Each role has specific permissions aligned with executive responsibilities.
 */

/**
 * Executive Roles
 */
const ROLES = {
  CIO: 'CIO',                  // Chief Information Officer
  CISO: 'CISO',                // Chief Information Security Officer
  CFO: 'CFO',                  // Chief Financial Officer
  CLO: 'CLO',                  // Chief Legal Officer
  CRO: 'CRO',                  // Chief Risk Officer
  AUDIT_DIRECTOR: 'AUDIT_DIRECTOR'  // Audit Director
};

/**
 * Permission Domains & Permissions
 * Format: domain.action (e.g., security.findings.view)
 */
const PERMISSIONS = {
  // Security Domain
  'security.findings.view': 'View security findings and vulnerabilities',
  'security.findings.create': 'Create new security findings',
  'security.findings.update': 'Update existing security findings',
  'security.findings.delete': 'Delete security findings',
  'security.risks.view': 'View risk register and risk correlations',
  'security.risks.create': 'Create new risk entries',
  'security.risks.update': 'Update risk assessments',
  'security.risks.delete': 'Delete risk entries',
  'security.threats.view': 'View threat scenarios and threat intelligence',
  'security.threats.create': 'Create threat scenarios',
  'security.threats.update': 'Update threat scenarios',
  'security.controls.view': 'View security controls and frameworks',
  'security.controls.create': 'Create security controls',
  'security.controls.update': 'Update security controls',
  'security.controls.delete': 'Delete security controls',
  'security.vendor_monitoring.view': 'View vendor risk monitoring data',
  'security.vendor_monitoring.manage': 'Manage vendor monitoring configurations',

  // Legal & Compliance Domain
  'legal.obligations.view': 'View legal and regulatory obligations',
  'legal.obligations.create': 'Create new legal obligations',
  'legal.obligations.update': 'Update legal obligations',
  'legal.obligations.delete': 'Delete legal obligations',
  'legal.frameworks.view': 'View compliance frameworks (NIST, HIPAA, etc.)',
  'legal.frameworks.manage': 'Manage compliance framework mappings',
  'legal.evidence.view': 'View compliance evidence',
  'legal.evidence.upload': 'Upload compliance evidence',
  'legal.evidence.delete': 'Delete compliance evidence',

  // Financial Domain
  'financial.exposure.view': 'View financial exposure and risk quantification',
  'financial.exposure.create': 'Create financial exposure records',
  'financial.exposure.update': 'Update financial exposure data',
  'financial.budget.view': 'View cybersecurity budget and spend',
  'financial.budget.manage': 'Manage cybersecurity budget allocations',
  'financial.analytics.view': 'View financial risk analytics and reporting',

  // Operations & IT Domain
  'operations.assets.view': 'View IT assets and infrastructure',
  'operations.assets.create': 'Create asset records',
  'operations.assets.update': 'Update asset information',
  'operations.assets.delete': 'Delete asset records',
  'operations.business_processes.view': 'View business process mappings',
  'operations.business_processes.create': 'Create business process records',
  'operations.business_processes.update': 'Update business processes',
  'operations.data_objects.view': 'View data object classifications',
  'operations.data_objects.create': 'Create data object records',
  'operations.data_objects.update': 'Update data object classifications',
  'operations.tools.view': 'View security tool integrations',
  'operations.tools.manage': 'Manage security tool connections',
  'operations.itsm.view': 'View ITSM integrations and tickets',

  // Risk Management Domain
  'risk.correlation.view': 'View risk correlation analysis',
  'risk.correlation.run': 'Execute risk correlation engine',
  'risk.register.view': 'View enterprise risk register',
  'risk.register.create': 'Create risk register entries',
  'risk.register.update': 'Update risk register entries',
  'risk.register.delete': 'Delete risk register entries',
  'risk.reporting.view': 'View risk management reports',
  'risk.reporting.create': 'Generate risk reports',

  // Audit & Compliance Domain
  'audit.findings.view': 'View audit findings and deficiencies',
  'audit.findings.create': 'Create audit findings',
  'audit.findings.update': 'Update audit findings',
  'audit.evidence.review': 'Review and approve audit evidence',
  'audit.tests.view': 'View audit test plans and results',
  'audit.tests.create': 'Create audit test plans',
  'audit.tests.execute': 'Execute audit tests',
  'audit.reports.view': 'View audit reports',
  'audit.reports.generate': 'Generate audit reports',

  // Administrative Permissions
  'admin.organizations.view': 'View organization settings',
  'admin.organizations.manage': 'Manage organization settings',
  'admin.users.view': 'View user accounts',
  'admin.users.create': 'Create user accounts',
  'admin.users.update': 'Update user accounts',
  'admin.users.delete': 'Delete user accounts',
  'admin.seeds.run': 'Run database seed operations (admin only)',
  'admin.system.health': 'View system health and diagnostics'
};

/**
 * Role-to-Permission Mappings
 * Each role has specific permissions based on executive responsibilities
 */
const ROLE_PERMISSIONS = {
  /**
   * CIO - Chief Information Officer
   * Focus: IT operations, assets, tools, infrastructure
   */
  [ROLES.CIO]: [
    // Operations & IT
    'operations.assets.view',
    'operations.assets.create',
    'operations.assets.update',
    'operations.assets.delete',
    'operations.business_processes.view',
    'operations.business_processes.create',
    'operations.business_processes.update',
    'operations.data_objects.view',
    'operations.data_objects.create',
    'operations.data_objects.update',
    'operations.tools.view',
    'operations.tools.manage',
    'operations.itsm.view',

    // Security (limited)
    'security.controls.view',
    'security.controls.update',
    'security.findings.view',

    // Risk (limited)
    'risk.register.view',
    'risk.reporting.view',

    // Admin
    'admin.organizations.view',
    'admin.users.view',
    'admin.system.health'
  ],

  /**
   * CISO - Chief Information Security Officer
   * Focus: Security operations, threats, vulnerabilities, vendor risk
   */
  [ROLES.CISO]: [
    // Security - full access
    'security.findings.view',
    'security.findings.create',
    'security.findings.update',
    'security.findings.delete',
    'security.risks.view',
    'security.risks.create',
    'security.risks.update',
    'security.risks.delete',
    'security.threats.view',
    'security.threats.create',
    'security.threats.update',
    'security.controls.view',
    'security.controls.create',
    'security.controls.update',
    'security.controls.delete',
    'security.vendor_monitoring.view',
    'security.vendor_monitoring.manage',

    // Risk
    'risk.correlation.view',
    'risk.correlation.run',
    'risk.register.view',
    'risk.register.create',
    'risk.register.update',
    'risk.reporting.view',
    'risk.reporting.create',

    // Operations (read-only)
    'operations.assets.view',
    'operations.business_processes.view',
    'operations.data_objects.view',
    'operations.tools.view',

    // Legal (limited)
    'legal.obligations.view',
    'legal.evidence.view',
    'legal.evidence.upload',

    // Financial (limited)
    'financial.exposure.view',

    // Admin
    'admin.organizations.view',
    'admin.system.health'
  ],

  /**
   * CFO - Chief Financial Officer
   * Focus: Financial exposure, budget, risk quantification
   */
  [ROLES.CFO]: [
    // Financial
    'financial.exposure.view',
    'financial.exposure.create',
    'financial.exposure.update',
    'financial.budget.view',
    'financial.budget.manage',
    'financial.analytics.view',

    // Risk
    'risk.register.view',
    'risk.reporting.view',

    // Security (read-only)
    'security.findings.view',
    'security.risks.view',
    'security.controls.view',

    // Legal (read-only)
    'legal.obligations.view',
    'legal.frameworks.view',

    // Admin
    'admin.organizations.view',
    'admin.system.health'
  ],

  /**
   * CLO - Chief Legal Officer
   * Focus: Legal obligations, compliance, evidence, frameworks
   */
  [ROLES.CLO]: [
    // Legal & Compliance
    'legal.obligations.view',
    'legal.obligations.create',
    'legal.obligations.update',
    'legal.obligations.delete',
    'legal.frameworks.view',
    'legal.frameworks.manage',
    'legal.evidence.view',
    'legal.evidence.upload',
    'legal.evidence.delete',

    // Audit
    'audit.findings.view',
    'audit.evidence.review',
    'audit.tests.view',
    'audit.reports.view',

    // Risk (read-only)
    'risk.register.view',
    'security.risks.view',

    // Operations (read-only)
    'operations.assets.view',
    'operations.business_processes.view',

    // Admin
    'admin.organizations.view',
    'admin.system.health'
  ],

  /**
   * CRO - Chief Risk Officer
   * Focus: Enterprise risk, correlation, reporting
   */
  [ROLES.CRO]: [
    // Risk Management
    'risk.correlation.view',
    'risk.correlation.run',
    'risk.register.view',
    'risk.register.create',
    'risk.register.update',
    'risk.register.delete',
    'risk.reporting.view',
    'risk.reporting.create',

    // Security (read-only)
    'security.findings.view',
    'security.risks.view',
    'security.threats.view',
    'security.controls.view',

    // Legal (read-only)
    'legal.obligations.view',
    'legal.frameworks.view',

    // Financial (read-only)
    'financial.exposure.view',

    // Operations (read-only)
    'operations.assets.view',
    'operations.business_processes.view',

    // Admin
    'admin.organizations.view',
    'admin.system.health'
  ],

  /**
   * AUDIT_DIRECTOR - Audit Director
   * Focus: Audit findings, evidence review, audit testing
   */
  [ROLES.AUDIT_DIRECTOR]: [
    // Audit & Compliance
    'audit.findings.view',
    'audit.findings.create',
    'audit.findings.update',
    'audit.evidence.review',
    'audit.tests.view',
    'audit.tests.create',
    'audit.tests.execute',
    'audit.reports.view',
    'audit.reports.generate',

    // Legal
    'legal.obligations.view',
    'legal.frameworks.view',
    'legal.evidence.view',
    'legal.evidence.upload',

    // Security (read-only)
    'security.findings.view',
    'security.controls.view',
    'security.risks.view',

    // Risk (read-only)
    'risk.register.view',
    'risk.reporting.view',

    // Operations (read-only)
    'operations.assets.view',
    'operations.business_processes.view',

    // Admin
    'admin.organizations.view',
    'admin.system.health'
  ]
};

/**
 * Get all permissions for a role
 * @param {string} role - Role name
 * @returns {Array<string>} Array of permissions
 */
function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role has specific permission
 * @param {string} role - Role name
 * @param {string} permission - Permission to check
 * @returns {boolean} True if role has permission
 */
function roleHasPermission(role, permission) {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Get all available roles
 * @returns {Array<string>} Array of role names
 */
function getAllRoles() {
  return Object.values(ROLES);
}

/**
 * Get all available permissions
 * @returns {Object} Permission object with descriptions
 */
function getAllPermissions() {
  return PERMISSIONS;
}

/**
 * Validate if a role is valid
 * @param {string} role - Role name to validate
 * @returns {boolean} True if role exists
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Validate if a permission is valid
 * @param {string} permission - Permission to validate
 * @returns {boolean} True if permission exists
 */
function isValidPermission(permission) {
  return Object.keys(PERMISSIONS).hasOwnProperty(permission);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  roleHasPermission,
  getAllRoles,
  getAllPermissions,
  isValidRole,
  isValidPermission
};
