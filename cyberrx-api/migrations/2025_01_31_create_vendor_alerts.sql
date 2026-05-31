-- =====================================================
-- Vendor Alerts Table Migration
-- Stores alert history for vendor monitoring system
-- =====================================================

CREATE TABLE vendor_alerts (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL CHECK (
    alert_type IN (
      'critical_signal',
      'score_increase',
      'grade_degradation',
      'sync_failure',
      'multi_provider_confirmed'
    )
  ),
  severity VARCHAR(20) NOT NULL CHECK (
    severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')
  ),
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (
    delivery_status IN ('pending', 'sent', 'failed')
  ),
  sent_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Organization alert history (most recent first)
CREATE INDEX idx_vendor_alerts_org_created
  ON vendor_alerts(organization_id, created_at DESC);

-- Vendor alert history
CREATE INDEX idx_vendor_alerts_vendor_created
  ON vendor_alerts(vendor_id, created_at DESC);

-- Filter by severity
CREATE INDEX idx_vendor_alerts_severity_created
  ON vendor_alerts(severity, created_at DESC);

-- Filter by alert type
CREATE INDEX idx_vendor_alerts_type_created
  ON vendor_alerts(alert_type, created_at DESC);

-- Pending alerts for worker
CREATE INDEX idx_vendor_alerts_delivery_status
  ON vendor_alerts(delivery_status, created_at);

-- Composite index for org severity filtering
CREATE INDEX idx_vendor_alerts_org_severity
  ON vendor_alerts(organization_id, severity, created_at DESC);

-- =====================================================
-- Update Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_vendor_alerts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendor_alerts_update_timestamp
  BEFORE UPDATE ON vendor_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_alerts_timestamp();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Get recent alerts for organization
CREATE OR REPLACE FUNCTION get_org_alerts(
  p_org_id INTEGER,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  alert_type VARCHAR(50),
  severity VARCHAR(20),
  message TEXT,
  vendor_name VARCHAR(255),
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    va.id,
    va.alert_type,
    va.severity,
    va.message,
    v.name AS vendor_name,
    va.created_at
  FROM vendor_alerts va
  LEFT JOIN vendors v ON va.vendor_id = v.id
  WHERE va.organization_id = p_org_id
  ORDER BY va.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get alert statistics for dashboard
CREATE OR REPLACE FUNCTION get_alert_stats(
  p_org_id INTEGER,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total BIGINT,
  critical BIGINT,
  high BIGINT,
  medium BIGINT,
  low BIGINT,
  info BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE severity = 'Critical')::BIGINT,
    COUNT(*) FILTER (WHERE severity = 'High')::BIGINT,
    COUNT(*) FILTER (WHERE severity = 'Medium')::BIGINT,
    COUNT(*) FILTER (WHERE severity = 'Low')::BIGINT,
    COUNT(*) FILTER (WHERE severity = 'Info')::BIGINT
  FROM vendor_alerts
  WHERE organization_id = p_org_id
    AND created_at > NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Acknowledge alert
CREATE OR REPLACE FUNCTION acknowledge_alert(
  p_alert_id INTEGER,
  p_user_id INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE vendor_alerts
  SET acknowledged_at = NOW(),
      data = jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{acknowledgedBy}',
        to_jsonb(p_user_id)
      )
  WHERE id = p_alert_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
