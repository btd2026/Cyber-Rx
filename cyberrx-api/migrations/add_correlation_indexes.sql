-- Migration: Add indexes for optimized Correlation Engine performance
-- Target: <3 second single correlation performance
-- Date: 2026-05-30

-- Indexes for Finding table correlation queries
-- These optimize the most common correlation lookup patterns

-- Composite index for finding + business process lookups (common in correlation)
CREATE INDEX IF NOT EXISTS findings_org_business_process
  ON findings(organization_id, business_process_id)
  WHERE business_process_id IS NOT NULL;

-- Composite index for finding + risk lookups
CREATE INDEX IF NOT EXISTS findings_org_risk
  ON findings(organization_id, risk_id)
  WHERE risk_id IS NOT NULL;

-- Composite index for finding + asset lookups (called twice in correlation)
CREATE INDEX IF NOT EXISTS findings_org_asset
  ON findings(organization_id, asset_id)
  WHERE asset_id IS NOT NULL;

-- Covering index for finding correlation lookups (includes all needed columns)
CREATE INDEX IF NOT EXISTS findings_correlation_covering
  ON findings(organization_id, risk_id, asset_id, business_process_id)
  INCLUDE (id, title, severity, status, discovered_date, tool, source);

-- Indexes for Risk table correlation queries

-- Index on risk business process IDs (already GIN, ensure it exists)
CREATE INDEX IF NOT EXISTS risks_business_processes
  ON risks USING GIN (business_process_ids);

-- Index on risk data object IDs (already GIN, ensure it exists)
CREATE INDEX IF NOT EXISTS risks_data_objects
  ON risks USING GIN (data_object_ids);

-- Index on risk legal obligation IDs (already GIN, ensure it exists)
CREATE INDEX IF NOT EXISTS risks_legal_obligations
  ON risks USING GIN (legal_obligation_ids);

-- Composite index for risk + threat scenario lookups
CREATE INDEX IF NOT EXISTS risks_org_threat
  ON risks(organization_id, threat_scenario_id)
  WHERE threat_scenario_id IS NOT NULL;

-- Indexes for Business Process table

-- Index on business process supported systems (for asset->process lookups)
CREATE INDEX IF NOT EXISTS business_processes_supported_systems
  ON business_processes USING GIN (supported_by_systems);

-- Index on business process creates data objects
CREATE INDEX IF NOT EXISTS business_processes_creates_data
  ON business_processes USING GIN (creates_data_objects);

-- Indexes for Data Object table

-- Index on data object resides in systems (for asset->data lookups)
CREATE INDEX IF NOT EXISTS data_objects_resides_in
  ON data_objects USING GIN (resides_in_systems);

-- Index on data object accessed by apps
CREATE INDEX IF NOT EXISTS data_objects_accessed_by
  ON data_objects USING GIN (accessed_by_apps);

-- Composite index for high-value data lookups
CREATE INDEX IF NOT EXISTS data_objects_high_value
  ON data_objects(organization_id, type, sensitivity)
  WHERE type IN ('PHI', 'PII', 'PCI') AND sensitivity IN ('Critical', 'High');

-- Indexes for Legal Obligations table

-- Partial index for HIPAA obligations (common in correlation)
CREATE INDEX IF NOT EXISTS legal_obligations_hipaa
  ON legal_obligations(organization_id, source)
  WHERE source = 'HIPAA';

-- Indexes for Executive Owners table

-- Index for user-based lookups
CREATE INDEX IF NOT EXISTS executive_owners_user_lookup
  ON executive_owers(user_id)
  WHERE user_id IS NOT NULL;

-- Index for role-based lookups with org scope
CREATE INDEX IF NOT EXISTS executive_owners_role_lookup
  ON executive_owners(organization_id, role_id);

-- Partial index for active executive owners
CREATE INDEX IF NOT EXISTS executive_owners_active
  ON executive_owners(organization_id, role_id, user_id)
  WHERE user_id IS NOT NULL;

-- Performance monitoring: Query execution stats

-- Enable pg_stat_statements if not already enabled (requires extension)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create a view to monitor slow correlation queries
CREATE OR REPLACE VIEW slow_correlation_queries AS
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE query LIKE '%correlation%' OR query LIKE '%findings%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Create a function to check index usage
CREATE OR REPLACE FUNCTION check_correlation_index_usage()
RETURNS TABLE(
  tablename TEXT,
  indexname TEXT,
  idx_scan BIGINT,
  idx_tup_read BIGINT,
  idx_tup_fetch BIGINT,
  usage_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || relname as tablename,
    indexrelname as indexname,
    COALESCE(idx_scan, 0) as idx_scan,
    COALESCE(idx_tup_read, 0) as idx_tup_read,
    COALESCE(idx_tup_fetch, 0) as idx_tup_fetch,
    CASE
      WHEN COALESCE(idx_scan, 0) = 0 THEN 'UNUSED'
      WHEN COALESCE(idx_scan, 0) < 100 THEN 'LOW_USAGE'
      ELSE 'ACTIVE'
    END as usage_status
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND relname IN ('findings', 'risks', 'business_processes', 'data_objects', 'legal_obligations', 'executive_owners')
  ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to analyze correlation performance
CREATE OR REPLACE FUNCTION analyze_correlation_performance()
RETURNS TABLE(
  finding_id TEXT,
  query_count BIGINT,
  total_time NUMERIC,
  cache_hit_rate NUMERIC,
  avg_query_time NUMERIC
) AS $$
BEGIN
  -- This function should be called after correlation runs to analyze performance
  -- For now, return placeholder structure
  RETURN QUERY
  SELECT
    f.id,
    0::BIGINT as query_count,
    0::NUMERIC as total_time,
    0.0::NUMERIC as cache_hit_rate,
    0.0::NUMERIC as avg_query_time
  FROM findings f
  LIMIT 0;
END;
$$ LANGUAGE plpgsql;

-- Create table for correlation performance tracking
CREATE TABLE IF NOT EXISTS correlation_performance_log (
  id SERIAL PRIMARY KEY,
  finding_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  query_count INTEGER DEFAULT 0,
  cache_hit BOOLEAN DEFAULT false,
  correlated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_finding FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE
);

-- Index for performance log queries
CREATE INDEX IF NOT EXISTS correlation_perf_finding
  ON correlation_performance_log(finding_id);

CREATE INDEX IF NOT EXISTS correlation_perf_org
  ON correlation_performance_log(organization_id);

CREATE INDEX IF NOT EXISTS correlation_perf_duration
  ON correlation_performance_log(duration_ms DESC);

CREATE INDEX IF NOT EXISTS correlation_perf_slow
  ON correlation_performance_log(duration_ms)
  WHERE duration_ms > 3000;

-- Create view for slow correlations (>3 seconds)
CREATE OR REPLACE VIEW slow_correlations AS
SELECT
  finding_id,
  organization_id,
  duration_ms,
  query_count,
  cache_hit,
  correlated_at
FROM correlation_performance_log
WHERE duration_ms > 3000
ORDER BY duration_ms DESC;

-- Create aggregate view for correlation performance stats
CREATE OR REPLACE VIEW correlation_performance_stats AS
SELECT
  DATE_TRUNC('hour', correlated_at) as hour,
  COUNT(*) as total_correlations,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END) as cache_misses,
  ROUND(100.0 * SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) / COUNT(*), 2) as cache_hit_rate_pct,
  SUM(CASE WHEN duration_ms > 3000 THEN 1 ELSE 0 END) as slow_correlations,
  ROUND(100.0 * SUM(CASE WHEN duration_ms > 3000 THEN 1 ELSE 0 END) / COUNT(*), 2) as slow_correlation_pct
FROM correlation_performance_log
WHERE correlated_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', correlated_at)
ORDER BY hour DESC;

-- Grant permissions (adjust based on your database user)
-- GRANT SELECT ON correlation_performance_stats TO your_app_user;
-- GRANT SELECT ON slow_correlations TO your_app_user;
-- GRANT EXECUTE ON FUNCTION check_correlation_index_usage() TO your_app_user;

-- Add comments for documentation
COMMENT ON TABLE correlation_performance_log IS 'Tracks correlation engine performance for optimization';
COMMENT ON VIEW slow_correlations IS 'View of correlations taking >3 seconds (performance issues)';
COMMENT ON VIEW correlation_performance_stats IS 'Hourly aggregation of correlation performance metrics';
COMMENT ON FUNCTION check_correlation_index_usage() IS 'Monitors index usage for correlation queries';
