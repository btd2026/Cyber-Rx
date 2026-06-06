-- Migration: Expand Comprehensive Audit Trail System
-- Created: T-MVP-015 HIPAA Compliance & SOC 2 Scope
-- Description: Expands audit_logs table to support comprehensive security event logging
-- Compliance: HIPAA 45 CFR §164.312(b) - Audit Controls
-- Compliance: SOC 2 CC4.1 - Monitoring, CC6.1 - Logical Access

-- This migration adds new columns to the existing audit_logs table
-- to support comprehensive audit logging across all system events

-- Add new columns to audit_logs table
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS event_type TEXT CHECK (event_type IN (
    'auth_login',
    'auth_logout',
    'auth_mfa_success',
    'auth_mfa_failure',
    'auth_login_failure',
    'authz_check_success',
    'authz_check_failure',
    'data_access',
    'data_query',
    'data_export',
    'agent_invoke',
    'agent_response',
    'agent_error',
    'config_change',
    'config_delete',
    'user_create',
    'user_update',
    'user_delete',
    'user_role_change',
    'security_failed_login',
    'security_privilege_escalation',
    'security_anomaly',
    'admin_action',
    'admin_bulk_export',
    'export_pdf',
    'export_csv',
    'connector_config_change',
    'connector_credential_rotation',
    'mapping_accepted',
    'mapping_rejected',
    'mapping_overridden',
    'credential_validation',
    'credential_save',
    'credential_delete'
  ));

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS resource_type TEXT CHECK (resource_type IN (
    'risk_object',
    'agent',
    'dashboard',
    'config',
    'user',
    'connector',
    'control',
    'asset',
    'data_object',
    'threat_scenario',
    'mapping',
    'user_account'
  ));

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS resource_id TEXT;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS action TEXT CHECK (action IN (
    'create',
    'read',
    'update',
    'delete',
    'export',
    'invoke',
    'accept',
    'reject',
    'override',
    'authenticate',
    'authorize'
  ));

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS success BOOLEAN;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS context_data JSONB DEFAULT '{}';

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS audit_logs_org_event_time ON audit_logs(organization_id, event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_time ON audit_logs(user_id, timestamp DESC);

-- Composite index for security monitoring queries
CREATE INDEX IF NOT EXISTS audit_logs_security_monitoring ON audit_logs(organization_id, timestamp DESC, event_type, success)
  WHERE event_type IN ('auth_login_failure', 'authz_check_failure', 'security_failed_login', 'security_anomaly');

-- Index for data access audit queries
CREATE INDEX IF NOT EXISTS audit_logs_data_access ON audit_logs(organization_id, event_type, timestamp DESC)
  WHERE event_type IN ('data_access', 'data_query', 'data_export', 'export_pdf', 'export_csv');

-- Index for agent invocation audit queries
CREATE INDEX IF NOT EXISTS audit_logs_agent_invocation ON audit_logs(user_id, event_type, timestamp DESC)
  WHERE event_type IN ('agent_invoke', 'agent_response', 'agent_error');

-- Update existing records to set default values
UPDATE audit_logs
SET
  event_type = COALESCE(event_type, action_type),
  resource_type = COALESCE(resource_type, resource_type),
  action = COALESCE(action, 'create'),
  success = COALESCE(success, true),
  timestamp = COALESCE(timestamp, created_at),
  context_data = COALESCE(context_data, details)
WHERE event_type IS NULL OR action IS NULL;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all security-relevant events (HIPAA/SOC 2 compliant)';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event (auth, access, agent, config, export, security)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (create, read, update, delete, export, invoke)';
COMMENT ON COLUMN audit_logs.success IS 'Whether the operation succeeded';
COMMENT ON COLUMN audit_logs.failure_reason IS 'Reason for failure (if success=false)';
COMMENT ON COLUMN audit_logs.timestamp IS 'When the event occurred';
COMMENT ON COLUMN audit_logs.context_data IS 'Additional event metadata (JSONB)';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address for security monitoring';
COMMENT ON COLUMN audit_logs.user_agent IS 'Client user agent for fraud detection';

-- Add retention policy note (10 years for HIPAA)
-- Note: This is a comment - actual retention policy should be implemented via database maintenance scripts
COMMENT ON TABLE audit_logs IS 'Retention: 10 years (HIPAA requirement) - implement via pg_cron or external scheduler';

-- Create audit log summary view for monitoring
CREATE OR REPLACE VIEW audit_summary AS
SELECT
  organization_id,
  event_type,
  DATE(timestamp) as event_date,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failure_count,
  MAX(timestamp) as last_occurrence
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY organization_id, event_type, DATE(timestamp)
ORDER BY event_date DESC, event_count DESC;

COMMENT ON VIEW audit_summary IS 'Daily summary of audit events for monitoring and compliance reporting';

-- Create security events view for SOC 2 monitoring
CREATE OR REPLACE VIEW security_events AS
SELECT
  organization_id,
  timestamp,
  event_type,
  user_id,
  ip_address,
  success,
  failure_reason,
  resource_type,
  resource_id,
  context_data
FROM audit_logs
WHERE event_type IN (
  'auth_login_failure',
  'authz_check_failure',
  'security_failed_login',
  'security_privilege_escalation',
  'security_anomaly',
  'admin_action',
  'admin_bulk_export'
)
ORDER BY timestamp DESC;

COMMENT ON VIEW security_events IS 'Security-relevant events for SOC 2 monitoring and incident response';
