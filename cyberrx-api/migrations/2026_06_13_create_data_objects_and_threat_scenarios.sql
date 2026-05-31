-- Migration: Create data_objects and threat_scenarios tables
-- This enables data classification and threat modeling for the correlation engine

-- Create data_objects table
CREATE TABLE IF NOT EXISTS data_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential')),
  sensitivity VARCHAR(50) NOT NULL CHECK (sensitivity IN ('Critical', 'High', 'Medium', 'Low')),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_count INTEGER,
  description TEXT,
  resides_in_systems JSONB DEFAULT '[]'::jsonb,
  accessed_by_apps JSONB DEFAULT '[]'::jsonb,
  protected_by_controls JSONB DEFAULT '[]'::jsonb,
  retention_period VARCHAR(100),
  data_owner VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create threat_scenarios table
CREATE TABLE IF NOT EXISTS threat_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('ransomware', 'phishing', 'insider', 'supply_chain', 'misconfig', 'ddos', 'api_abuse', 'zero_day')),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  impact_level VARCHAR(50) CHECK (impact_level IN ('Critical', 'High', 'Medium', 'Low')),
  description TEXT,
  mitre_technique JSONB DEFAULT '[]'::jsonb,
  exploited_risks JSONB DEFAULT '[]'::jsonb,
  mitre_tactic VARCHAR(100),
  mitigation_strategy TEXT,
  control_effectiveness INTEGER CHECK (control_effectiveness >= 0 AND control_effectiveness <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_objects_organization ON data_objects(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_objects_type ON data_objects(type);
CREATE INDEX IF NOT EXISTS idx_data_objects_sensitivity ON data_objects(sensitivity);
CREATE INDEX IF NOT EXISTS idx_data_objects_resides_in_systems ON data_objects USING GIN(resides_in_systems);
CREATE INDEX IF NOT EXISTS idx_data_objects_accessed_by_apps ON data_objects USING GIN(accessed_by_apps);
CREATE INDEX IF NOT EXISTS idx_data_objects_protected_by_controls ON data_objects USING GIN(protected_by_controls);

CREATE INDEX IF NOT EXISTS idx_threat_scenarios_organization ON threat_scenarios(organization_id);
CREATE INDEX IF NOT EXISTS idx_threat_scenarios_type ON threat_scenarios(type);
CREATE INDEX IF NOT EXISTS idx_threat_scenarios_probability ON threat_scenarios(probability);
CREATE INDEX IF NOT EXISTS idx_threat_scenarios_impact_level ON threat_scenarios(impact_level);
CREATE INDEX IF NOT EXISTS idx_threat_scenarios_mitre_technique ON threat_scenarios USING GIN(mitre_technique);
CREATE INDEX IF NOT EXISTS idx_threat_scenarios_exploited_risks ON threat_scenarios USING GIN(exploited_risks);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_data_objects_updated_at ON data_objects;
CREATE TRIGGER update_data_objects_updated_at
  BEFORE UPDATE ON data_objects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_threat_scenarios_updated_at ON threat_scenarios;
CREATE TRIGGER update_threat_scenarios_updated_at
  BEFORE UPDATE ON threat_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE data_objects IS 'Classified data objects (PHI, PII, PCI) with system mappings and control associations';
COMMENT ON TABLE threat_scenarios IS 'Threat scenarios with MITRE ATT&CK integration and risk analysis';
