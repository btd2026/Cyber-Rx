-- Narrative Storage Table
-- Enables storage and retrieval of generated executive narratives
-- Supports version history and publishing workflow

CREATE TABLE IF NOT EXISTS narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Full narrative data as JSONB for flexible schema
  narrative_data JSONB NOT NULL,

  -- Metadata
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,

  -- Template information
  template_id VARCHAR(100),
  template_version INTEGER DEFAULT 1,

  -- Timestamps
  generated_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes for efficient queries
  CONSTRAINT unique_finding_narrative UNIQUE (finding_id, organization_id, version)
);

CREATE INDEX IF NOT EXISTS idx_narratives_finding_id ON narratives(finding_id);
CREATE INDEX IF NOT EXISTS idx_narratives_organization_id ON narratives(organization_id);
CREATE INDEX IF NOT EXISTS idx_narratives_is_published ON narratives(is_published);
CREATE INDEX IF NOT EXISTS idx_narratives_generated_at ON narratives(generated_at DESC);

-- Narrative Templates Table
-- Stores organization-customizable narrative templates

CREATE TABLE IF NOT EXISTS narrative_templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type VARCHAR(50) NOT NULL, -- 'critical', 'high', 'compliance', 'vendor'
  template_content JSONB NOT NULL,
  default_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization Template Customizations
-- Stores organization-specific overrides for templates

CREATE TABLE IF NOT EXISTS organization_template_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id VARCHAR(100) NOT NULL REFERENCES narrative_templates(id) ON DELETE CASCADE,
  customizations JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_org_template UNIQUE (organization_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_org_template_customizations_org_id ON organization_template_customizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_template_customizations_template_id ON organization_template_customizations(template_id);

-- Insert default narrative templates

INSERT INTO narrative_templates (id, name, description, template_type, template_content, default_template) VALUES
(
  'critical_severity',
  'Critical Severity Narrative',
  'Template for critical severity findings requiring immediate action',
  'critical',
  '{
    "summaryTemplate": "{{severity}} {{title}} on {{system}} affecting {{businessProcess}} ({{tier}} tier) involving {{dataTypes}} with potential for {{threatType}}, exposing ${{formatNumber financialExposure}} financial exposure",
    "priority": 1,
    "recommendedActions": [
      {
        "action": "Immediate patching of {{vulnerability}}",
        "owner": "{{remediationOwner}}",
        "targetDate": "{{addDays 7}}",
        "priority": 1
      },
      {
        "action": "Validate control effectiveness",
        "owner": "{{validationOwner}}",
        "targetDate": "{{addDays 14}}",
        "priority": 2
      },
      {
        "action": "Prepare breach notification materials",
        "owner": "{{legalOwner}}",
        "targetDate": "{{addDays 7}}",
        "priority": 1
      }
    ]
  }',
  true
),
(
  'high_severity',
  'High Severity Narrative',
  'Template for high severity findings requiring prompt attention',
  'high',
  '{
    "summaryTemplate": "{{severity}} {{title}} detected on {{system}} affecting {{businessProcess}} involving {{dataTypes}}",
    "priority": 2,
    "recommendedActions": [
      {
        "action": "Schedule remediation of {{vulnerability}}",
        "owner": "{{remediationOwner}}",
        "targetDate": "{{addDays 30}}",
        "priority": 2
      },
      {
        "action": "Review control effectiveness",
        "owner": "{{validationOwner}}",
        "targetDate": "{{addDays 45}}",
        "priority": 3
      }
    ]
  }',
  true
),
(
  'compliance_finding',
  'Compliance Finding Narrative',
  'Template for compliance-related findings',
  'compliance',
  '{
    "summaryTemplate": "{{severity}} compliance finding: {{title}} potentially impacting {{regulatoryFrameworks}} requirements",
    "priority": 2,
    "recommendedActions": [
      {
        "action": "Address compliance gap: {{title}}",
        "owner": "{{complianceOwner}}",
        "targetDate": "{{addDays 30}}",
        "priority": 2
      },
      {
        "action": "Document evidence of compliance",
        "owner": "{{evidenceOwner}}",
        "targetDate": "{{addDays 45}}",
        "priority": 3
      }
    ]
  }',
  true
),
(
  'vendor_finding',
  'Vendor Risk Narrative',
  'Template for vendor-related findings',
  'vendor',
  '{
    "summaryTemplate": "{{severity}} finding at {{vendorName}} affecting {{businessProcess}} with {{dataTypes}} involvement",
    "priority": 2,
    "recommendedActions": [
      {
        "action": "Notify vendor of {{title}}",
        "owner": "{{vendorManager}}",
        "targetDate": "{{addDays 5}}",
        "priority": 1
      },
      {
        "action": "Review vendor contract terms",
        "owner": "{{legalOwner}}",
        "targetDate": "{{addDays 14}}",
        "priority": 2
      },
      {
        "action": "Validate vendor remediation",
        "owner": "{{validationOwner}}",
        "targetDate": "{{addDays 30}}",
        "priority": 2
      }
    ]
  }',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_content = EXCLUDED.template_content;

-- Add comments
COMMENT ON TABLE narratives IS 'Stores generated executive narratives for findings';
COMMENT ON TABLE narrative_templates IS 'Default narrative templates for different finding types';
COMMENT ON TABLE organization_template_customizations IS 'Organization-specific template customizations';

COMMENT ON COLUMN narratives.narrative_data IS 'Complete narrative structure including summary, business process, data involvement, threat, financial, regulatory, ownership, and recommended actions';
COMMENT ON COLUMN narratives.is_published IS 'Whether narrative has been published to stakeholders';
COMMENT ON COLUMN narrative_templates.template_content IS 'Template structure with handlebars-style placeholders';
