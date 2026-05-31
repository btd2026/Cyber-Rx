-- Migration: Add audit_logs table for credential validation tracking
-- Created: T-002 Credential Validation Implementation
-- Description: Creates audit_logs table to track all credential validation attempts

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id              SERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  action_type     TEXT NOT NULL CHECK (action_type IN ('credential_validation', 'credential_save', 'credential_delete')),
  resource_type   TEXT NOT NULL,
  details         JSONB DEFAULT '{}',
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_org_action ON audit_logs(organization_id, action_type);

-- Index for security investigations (recent validations by org)
CREATE INDEX IF NOT EXISTS audit_logs_security_investigation ON audit_logs(organization_id, action_type, created_at DESC)
  WHERE action_type = 'credential_validation';

-- Comment for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail for security-sensitive operations like credential validation';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action performed (credential_validation, credential_save, credential_delete)';
COMMENT ON COLUMN audit_logs.details IS 'JSON details including masked API keys, validation results, error messages';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address for fraud detection and security monitoring';
