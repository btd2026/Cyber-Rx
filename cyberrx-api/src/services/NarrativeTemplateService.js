'use strict';

const { query } = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Narrative Template Service
 *
 * Manages narrative templates and organization customizations
 * Provides template-based narrative generation with healthcare-specific defaults
 */
class NarrativeTemplateService {
  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @param {string} organizationId - Organization ID (for customizations)
   * @returns {Promise<Object>} Template with customizations applied
   */
  static async getTemplate(templateId, organizationId = null) {
    // Get base template
    const result = await query(
      'SELECT * FROM narrative_templates WHERE id = $1',
      [templateId]
    );

    if (result.length === 0) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const template = result[0];

    // Get organization customizations if provided
    let customizations = null;
    if (organizationId) {
      const customResult = await query(
        `SELECT customizations FROM organization_template_customizations
         WHERE organization_id = $1 AND template_id = $2 AND is_active = true`,
        [organizationId, templateId]
      );

      if (customResult.length > 0) {
        customizations = customResult[0].customizations;
      }
    }

    // Merge customizations with base template
    const templateContent = template.template_content;
    if (customizations) {
      return this._mergeCustomizations(templateContent, customizations);
    }

    return templateContent;
  }

  /**
   * Get template for finding based on severity and type
   * @param {Object} finding - Finding object
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Template
   */
  static async getTemplateForFinding(finding, organizationId) {
    let templateId;

    // Determine template based on finding characteristics
    if (finding.metadata?.vendorId) {
      templateId = 'vendor_finding';
    } else if (finding.metadata?.complianceFrameworks || finding.metadata?.compliance) {
      templateId = 'compliance_finding';
    } else if (finding.severity === 'Critical') {
      templateId = 'critical_severity';
    } else if (finding.severity === 'High') {
      templateId = 'high_severity';
    } else {
      templateId = 'high_severity'; // Default
    }

    return this.getTemplate(templateId, organizationId);
  }

  /**
   * Apply template to narrative data
   * @param {Object} template - Template object
   * @param {Object} data - Narrative data
   * @returns {Promise<Object>} Narrative with template applied
   */
  static async applyTemplate(template, data) {
    const narrative = { ...data };

    // Apply summary template
    if (template.summaryTemplate) {
      narrative.executiveNarrative.summary = this._renderTemplate(
        template.summaryTemplate,
        this._buildTemplateContext(narrative)
      );
    }

    // Apply recommended actions from template
    if (template.recommendedActions && Array.isArray(template.recommendedActions)) {
      const actions = template.recommendedActions.map(action => ({
        ...action,
        action: this._renderTemplate(action.action, this._buildTemplateContext(narrative)),
        owner: this._renderTemplate(action.owner, this._buildTemplateContext(narrative)),
        targetDate: this._renderTemplate(action.targetDate, this._buildTemplateContext(narrative)),
        status: 'pending'
      }));

      narrative.executiveNarrative.recommendedActions = actions;
    }

    return narrative;
  }

  /**
   * Create or update organization template customization
   * @param {string} organizationId - Organization ID
   * @param {string} templateId - Template ID
   * @param {Object} customizations - Customization data
   * @returns {Promise<Object>} Created customization
   */
  static async setCustomization(organizationId, templateId, customizations) {
    const id = uuidv4();

    const result = await query(
      `INSERT INTO organization_template_customizations (id, organization_id, template_id, customizations)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (organization_id, template_id) DO UPDATE SET
        customizations = EXCLUDED.customizations,
        is_active = true,
        updated_at = NOW()
      RETURNING *`,
      [id, organizationId, templateId, JSON.stringify(customizations)]
    );

    return result[0];
  }

  /**
   * Get all templates
   * @returns {Promise<Array>} Array of templates
   */
  static async getAllTemplates() {
    const result = await query(
      'SELECT * FROM narrative_templates ORDER BY template_type, name'
    );
    return result.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      templateType: row.template_type,
      templateContent: row.template_content,
      defaultTemplate: row.default_template
    }));
  }

  /**
   * Get organization customizations
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of customizations
   */
  static async getOrganizationCustomizations(organizationId) {
    const result = await query(
      `SELECT otc.*, nt.name as template_name, nt.template_type
       FROM organization_template_customizations otc
       JOIN narrative_templates nt ON otc.template_id = nt.id
       WHERE otc.organization_id = $1
       ORDER BY otc.created_at DESC`,
      [organizationId]
    );

    return result.map(row => ({
      id: row.id,
      templateId: row.template_id,
      templateName: row.template_name,
      templateType: row.template_type,
      customizations: row.customizations,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Delete organization customization
   * @param {string} customizationId - Customization ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async deleteCustomization(customizationId) {
    const result = await query(
      'DELETE FROM organization_template_customizations WHERE id = $1 RETURNING id',
      [customizationId]
    );
    return result.length > 0;
  }

  /**
   * Merge customizations with base template
   * @private
   */
  static _mergeCustomizations(baseTemplate, customizations) {
    const merged = { ...baseTemplate };

    // Deep merge customizations
    for (const key in customizations) {
      if (typeof customizations[key] === 'object' && !Array.isArray(customizations[key])) {
        merged[key] = { ...baseTemplate[key], ...customizations[key] };
      } else {
        merged[key] = customizations[key];
      }
    }

    return merged;
  }

  /**
   * Build template context from narrative data
   * @private
   */
  static _buildTemplateContext(narrative) {
    const finding = narrative.finding;
    const execNarrative = narrative.executiveNarrative;

    return {
      severity: finding.severity,
      title: finding.title,
      system: execNarrative.systemImpact?.system || 'Unknown System',
      businessProcess: execNarrative.businessProcess?.name || 'Unknown Process',
      tier: execNarrative.businessProcess?.tier || 'Unknown',
      dataTypes: execNarrative.dataInvolvement?.map(d => d.type).join(', ') || 'No data',
      threatType: execNarrative.threatScenario?.type || 'unknown threat',
      financialExposure: execNarrative.financialExposure?.totalGrossExposure || 0,
      regulatoryFrameworks: execNarrative.regulatoryObligations?.map(o => o.source).join(', ') || 'None',
      remediationOwner: execNarrative.executiveOwnership?.remediation?.roleId || 'CISO',
      validationOwner: execNarrative.executiveOwnership?.validation?.roleId || 'CIO',
      legalOwner: execNarrative.executiveOwnership?.legal?.roleId || 'CLO',
      complianceOwner: execNarrative.businessProcess?.owner || 'CIO',
      evidenceOwner: execNarrative.executiveOwnership?.validation?.roleId || 'CISO',
      vendorManager: execNarrative.executiveOwnership?.remediation?.roleId || 'CIO',
      vulnerability: finding.title?.match(/CVE-\d{4}-\d+/)?.[0] || 'vulnerability'
    };
  }

  /**
   * Render template with context
   * @private
   */
  static _renderTemplate(template, context) {
    let rendered = template;

    // Simple handlebars-style rendering
    for (const key in context) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, context[key]);
    }

    // Handle formatNumber helper
    rendered = rendered.replace(/{{formatNumber (\d+(?:\.\d+)?)}}/g, (match, number) => {
      return parseFloat(number).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    });

    // Handle addDays helper
    rendered = rendered.replace(/{{addDays (\d+)}}/g, (match, days) => {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(days));
      return date.toISOString().split('T')[0];
    });

    return rendered;
  }

  /**
   * Get healthcare-specific templates
   * @returns {Promise<Array>} Array of healthcare templates
   */
  static async getHealthcareTemplates() {
    const result = await query(
      `SELECT * FROM narrative_templates
       WHERE template_type IN ('critical', 'high', 'compliance', 'vendor')
       ORDER BY template_type, name`
    );
    return result.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      templateType: row.template_type,
      templateContent: row.template_content
    }));
  }
}

module.exports = NarrativeTemplateService;
