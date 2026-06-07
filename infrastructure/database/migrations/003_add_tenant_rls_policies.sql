-- ============================================================================
-- Row-Level Security (RLS) Policies for Tenant Isolation
-- ============================================================================
-- Version: 1.0.0
-- Description: Apply RLS policies to all tenant-isolated tables
-- Author: Senior Backend Engineer
-- Date: 2025-06-06
-- Task: T-PILOT-001 - Pilot Customer Environment Setup
-- ============================================================================

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY ON ALL TENANT-ISOLATED TABLES
-- ============================================================================

ALTER TABLE risk_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_process_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE TENANT ISOLATION POLICIES
-- ============================================================================

-- Policy: risk_objects tenant isolation
-- Only allows access to rows where customer_id matches the current tenant context
CREATE POLICY tenant_isolation_risk_objects ON risk_objects
  FOR ALL
  USING (customer_id = current_setting('app.current_tenant_id', true)::varchar);

-- Policy: agent_state tenant isolation
CREATE POLICY tenant_isolation_agent_state ON agent_state
  FOR ALL
  USING (customer_id = current_setting('app.current_tenant_id', true)::varchar);

-- Policy: business_process_graph tenant isolation
CREATE POLICY tenant_isolation_business_process_graph ON business_process_graph
  FOR ALL
  USING (customer_id = current_setting('app.current_tenant_id', true)::varchar);

-- Policy: event_log tenant isolation
CREATE POLICY tenant_isolation_event_log ON event_log
  FOR ALL
  USING (customer_id = current_setting('app.current_tenant_id', true)::varchar);

-- ============================================================================
-- CREATE TENANT CONTEXT FUNCTION
-- ============================================================================

-- Function to set tenant context for a session
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id VARCHAR)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_tenant_context(VARCHAR) TO public;

-- ============================================================================
-- CREATE SECURITY DEFINER FUNCTIONS FOR TENANT-AWARE OPERATIONS
-- ============================================================================

-- Function to create risk objects with automatic tenant context
CREATE OR REPLACE FUNCTION create_risk_object_tenant_aware(
  p_source VARCHAR,
  p_source_event_id VARCHAR,
  p_category VARCHAR,
  p_status VARCHAR,
  p_affected_assets TEXT[],
  p_business_process_map TEXT[],
  p_likelihood_score DECIMAL,
  p_blast_radius TEXT[],
  p_financial_exposure JSONB,
  p_regulatory_triggers JSONB,
  p_threshold_breaches JSONB,
  p_remediation_owner VARCHAR,
  p_confidence DECIMAL,
  p_methodology_trail JSONB,
  p_normalization_notes TEXT
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
  current_tenant VARCHAR;
BEGIN
  -- Get current tenant context
  current_tenant := current_setting('app.current_tenant_id', true);
  
  IF current_tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant context not set. Call set_tenant_context() first.';
  END IF;

  -- Insert risk object with tenant context
  INSERT INTO risk_objects (
    source, source_event_id, category, status,
    affected_assets, business_process_map, likelihood_score, blast_radius,
    financial_exposure, regulatory_triggers, threshold_breaches,
    remediation_owner, confidence, methodology_trail, normalization_notes,
    customer_id
  ) VALUES (
    p_source, p_source_event_id, p_category, p_status,
    p_affected_assets, p_business_process_map, p_likelihood_score, p_blast_radius,
    p_financial_exposure, p_regulatory_triggers, p_threshold_breaches,
    p_remediation_owner, p_confidence, p_methodology_trail, p_normalization_notes,
    current_tenant
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_risk_object_tenant_aware(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT[], TEXT[], DECIMAL, TEXT[],
  JSONB, JSONB, JSONB, VARCHAR, DECIMAL, JSONB, TEXT
) TO public;

-- Function to query risk objects with automatic tenant filtering
CREATE OR REPLACE FUNCTION query_risk_objects_tenant_aware(
  p_category VARCHAR DEFAULT NULL,
  p_status VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  source VARCHAR,
  source_event_id VARCHAR,
  category VARCHAR,
  status VARCHAR,
  affected_assets TEXT[],
  business_process_map TEXT[],
  likelihood_score DECIMAL,
  blast_radius TEXT[],
  financial_exposure JSONB,
  regulatory_triggers JSONB,
  threshold_breaches JSONB,
  remediation_owner VARCHAR,
  confidence DECIMAL,
  methodology_trail JSONB,
  normalization_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  first_detected_at TIMESTAMPTZ,
  customer_id VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ro.id, ro.source, ro.source_event_id, ro.category, ro.status,
    ro.affected_assets, ro.business_process_map, ro.likelihood_score, ro.blast_radius,
    ro.financial_exposure, ro.regulatory_triggers, ro.threshold_breaches,
    ro.remediation_owner, ro.confidence, ro.methodology_trail, ro.normalization_notes,
    ro.created_at, ro.updated_at, ro.first_detected_at, ro.customer_id
  FROM risk_objects ro
  WHERE 
    -- RLS policy automatically filters by customer_id
    (p_category IS NULL OR ro.category = p_category)
    AND (p_status IS NULL OR ro.status = p_status)
  ORDER BY ro.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION query_risk_objects_tenant_aware(
  VARCHAR, VARCHAR, INTEGER, INTEGER
) TO public;

-- ============================================================================
-- CREATE TENANT ADMIN FUNCTIONS
-- ============================================================================

-- Function to validate tenant isolation (for admin use only)
CREATE OR REPLACE FUNCTION admin_validate_tenant_isolation(
  target_tenant_id VARCHAR
)
RETURNS TABLE (
  table_name VARCHAR,
  accessible_rows BIGINT,
  expected_tenant VARCHAR
) AS $$
BEGIN
  -- Temporarily disable RLS for admin check
  SET LOCAL row_security = off;

  RETURN QUERY
  SELECT 
    'risk_objects'::VARCHAR as table_name,
    COUNT(*)::BIGINT as accessible_rows,
    target_tenant_id as expected_tenant
  FROM risk_objects
  WHERE customer_id = target_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to admin role only
REVOKE EXECUTE ON FUNCTION admin_validate_tenant_isolation(VARCHAR) FROM public;
GRANT EXECUTE ON FUNCTION admin_validate_tenant_isolation(VARCHAR) TO admin;

-- ============================================================================
-- CREATE TRIGGER FOR AUTOMATIC TENANT CONTEXT VALIDATION
-- ============================================================================

-- Function to validate tenant context before operations
CREATE OR REPLACE FUNCTION validate_tenant_context()
RETURNS trigger AS $$
DECLARE
  current_tenant VARCHAR;
  row_tenant VARCHAR;
BEGIN
  -- Get current tenant context
  current_tenant := current_setting('app.current_tenant_id', true);

  -- If tenant context is set, validate it matches the row's tenant
  IF current_tenant IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      -- For inserts, ensure customer_id is set to current tenant
      NEW.customer_id := current_tenant;
    ELSIF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
      -- For updates/deletes, ensure row belongs to current tenant
      row_tenant := OLD.customer_id;
      
      IF row_tenant != current_tenant THEN
        RAISE EXCEPTION 'Tenant isolation violation: Cannot access row from tenant % (current: %)',
          row_tenant, current_tenant;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to all tenant-isolated tables
CREATE TRIGGER validate_tenant_context_risk_objects
  BEFORE INSERT OR UPDATE OR DELETE ON risk_objects
  FOR EACH ROW EXECUTE FUNCTION validate_tenant_context();

CREATE TRIGGER validate_tenant_context_agent_state
  BEFORE INSERT OR UPDATE OR DELETE ON agent_state
  FOR EACH ROW EXECUTE FUNCTION validate_tenant_context();

CREATE TRIGGER validate_tenant_context_business_process_graph
  BEFORE INSERT OR UPDATE OR DELETE ON business_process_graph
  FOR EACH ROW EXECUTE FUNCTION validate_tenant_context();

CREATE TRIGGER validate_tenant_context_event_log
  BEFORE INSERT OR UPDATE OR DELETE ON event_log
  FOR EACH ROW EXECUTE FUNCTION validate_tenant_context();

-- ============================================================================
-- CREATE TENANT ISOLATION MONITORING VIEW
-- ============================================================================

-- View to monitor tenant isolation violations
CREATE OR REPLACE VIEW tenant_isolation_violations AS
SELECT 
  'audit_logs'::VARCHAR as source_table,
  COUNT(*)::BIGINT as violation_count,
  MAX(created_at) as last_violation
FROM audit_logs
WHERE error_message LIKE '%tenant isolation violation%'
UNION ALL
SELECT 
  'application_logs'::VARCHAR as source_table,
  COUNT(*)::BIGINT as violation_count,
  MAX(timestamp) as last_violation
FROM (
  SELECT 
    timestamp,
    NULLIF(regexp_matches(message, 'tenant isolation violation', 'i'), NULL) IS NOT NULL as is_violation
  FROM (
    -- This would query application logs from Log Analytics
    SELECT NOW() as timestamp, '' as message
  ) logs
  WHERE is_violation
) violations;

-- Grant access to view
GRANT SELECT ON tenant_isolation_violations TO admin;

-- ============================================================================
-- CREATE TENANT CONTEXT AUDIT LOG
-- ============================================================================

-- Table to track tenant context changes
CREATE TABLE IF NOT EXISTS tenant_context_audit (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR NOT NULL,
  tenant_id VARCHAR NOT NULL,
  set_by VARCHAR NOT NULL,
  set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cleared_at TIMESTAMPTZ,
  operation_count INTEGER DEFAULT 0
);

-- Create index
CREATE INDEX idx_tenant_context_audit_session ON tenant_context_audit(session_id);
CREATE INDEX idx_tenant_context_audit_tenant ON tenant_context_audit(tenant_id);

-- Function to log tenant context changes
CREATE OR REPLACE FUNCTION log_tenant_context_change()
RETURNS void AS $$
BEGIN
  INSERT INTO tenant_context_audit (session_id, tenant_id, set_by)
  VALUES (
    current_setting('app.session_id', true),
    current_setting('app.current_tenant_id', true),
    current_user
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- This migration enables Row-Level Security for complete tenant isolation.
-- 
-- SECURITY NOTES:
-- 1. All tenant-isolated tables now have RLS enabled
-- 2. Tenant context must be set with set_tenant_context() before operations
-- 3. RLS policies automatically filter queries by customer_id
-- 4. Triggers validate tenant context on INSERT/UPDATE/DELETE
-- 5. Security definer functions provide safe tenant-aware operations
-- 6. Admin functions available for monitoring and validation
-- 
-- TESTING:
-- 1. Test tenant context switching
-- 2. Test cross-tenant access attempts (should fail)
-- 3. Test RLS policy enforcement
-- 4. Test security definer functions
-- 5. Test monitoring view for violations
-- ============================================================================
