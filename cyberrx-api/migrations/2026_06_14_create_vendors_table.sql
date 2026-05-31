-- Migration: Create vendors table
-- This enables vendor risk management and third-party ecosystem tracking

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('Critical', 'High', 'Medium', 'Low')),
  risk_rating VARCHAR(50) CHECK (risk_rating IN ('Critical', 'High', 'Medium', 'Low', 'Info')),
  category VARCHAR(100),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_process_ids JSONB DEFAULT '[]'::jsonb,
  contract_value NUMERIC(15, 2),
  contract_expiry DATE,
  description TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website VARCHAR(500),
  data_access JSONB DEFAULT '[]'::jsonb,
  security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
  compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
  last_assessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_organization ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_tier ON vendors(tier);
CREATE INDEX IF NOT EXISTS idx_vendors_risk_rating ON vendors(risk_rating);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_business_process_ids ON vendors USING GIN(business_process_ids);
CREATE INDEX IF NOT EXISTS idx_vendors_contract_expiry ON vendors(contract_expiry);
CREATE INDEX IF NOT EXISTS idx_vendors_security_score ON vendors(security_score);
CREATE INDEX IF NOT EXISTS idx_vendors_compliance_score ON vendors(compliance_score);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE vendors IS 'Vendor and third-party risk management with contract tracking and process mapping';
COMMENT ON COLUMN vendors.tier IS 'Vendor tier: Critical, High, Medium, Low';
COMMENT ON COLUMN vendors.risk_rating IS 'Current risk rating based on assessment';
COMMENT ON COLUMN vendors.business_process_ids IS 'Business processes supported by this vendor';
COMMENT ON COLUMN vendors.data_access IS 'Data types accessed by vendor (PHI, PII, etc)';
COMMENT ON COLUMN vendors.security_score IS 'Security posture score (0-100)';
COMMENT ON COLUMN vendors.compliance_score IS 'Compliance posture score (0-100)';
