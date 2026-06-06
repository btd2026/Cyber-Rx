-- Migration: T-MVP-014 Alerting & Notification System
-- Description: Creates tables for comprehensive alerting system supporting CFO, CISO, and Board agents
-- Date: 2025-06-06

-- ============================================
-- ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  alert_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL CHECK (role IN ('cfo', 'ciso', 'croe', 'clo', 'cio', 'board', 'critical')),
  severity              TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  metric_type           TEXT NOT NULL CHECK (metric_type IN
    ('dollar_exposure', 'blast_radius', 'risk_score', 'governance', 'mlr_impact',
     'stop_loss_exposure', 'attack_pathway_count', 'crown_jewel_tier', 'compliance_breach')),
  threshold_value       NUMERIC NOT NULL,
  actual_value          NUMERIC NOT NULL,
  triggered_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN
    ('active', 'acknowledged', 'dismissed', 'escalated', 'resolved')),
  acknowledged_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at       TIMESTAMPTZ,
  context_data          JSONB DEFAULT '{}',
  delivery_status       JSONB DEFAULT '{"email": "pending", "slack": "pending", "teams": "pending"}',
  retry_count          INTEGER DEFAULT 0,
  last_retry_at        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERT CONFIGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alert_configs (
  config_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL CHECK (role IN ('cfo', 'ciso', 'croe', 'clo', 'cio', 'board')),
  metric_type           TEXT NOT NULL CHECK (metric_type IN
    ('dollar_exposure', 'blast_radius', 'risk_score', 'governance', 'mlr_impact',
     'stop_loss_exposure', 'attack_pathway_count', 'crown_jewel_tier', 'compliance_breach')),
  threshold_value       NUMERIC NOT NULL,
  severity              TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  enabled               BOOLEAN NOT NULL DEFAULT true,
  cooldown_minutes      INTEGER NOT NULL DEFAULT 60 CHECK (cooldown_minutes >= 0),
  hysteresis_percent    NUMERIC(5,2) DEFAULT 10.0 CHECK (hysteresis_percent >= 0 AND hysteresis_percent <= 100),
  notification_channels JSONB DEFAULT '["email", "slack"]' CHECK
    (jsonb_array_length(notification_channels) > 0),
  email_recipients      JSONB DEFAULT '[]',
  slack_channels        JSONB DEFAULT '{}',
  teams_webhooks        JSONB DEFAULT '{}',
  escalation_rules      JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, role, metric_type)
);

-- ============================================
-- ALERT TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alert_templates (
  template_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT REFERENCES orgs(id) ON DELETE CASCADE,
  template_type         TEXT NOT NULL CHECK (template_type IN
    ('email', 'slack', 'teams')),
  alert_type            TEXT NOT NULL CHECK (alert_type IN
    ('cfo_dollar_exposure', 'cfo_mlr_impact', 'cfo_stop_loss',
     'ciso_blast_radius', 'ciso_risk_score', 'ciso_attack_pathway',
     'board_governance', 'board_critical', 'critical')),
  template_name         TEXT NOT NULL,
  subject_template      TEXT,
  body_template         TEXT NOT NULL,
  is_default            BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERT DELIVERY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alert_delivery_log (
  log_id                BIGSERIAL PRIMARY KEY,
  alert_id              UUID NOT NULL REFERENCES alerts(alert_id) ON DELETE CASCADE,
  channel               TEXT NOT NULL CHECK (channel IN ('email', 'slack', 'teams', 'websocket')),
  status                TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  recipient             TEXT NOT NULL,
  error_message         TEXT,
  retry_count           INTEGER DEFAULT 0,
  sent_at               TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR ALERTS
-- ============================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS alerts_tenant_id ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS alerts_role ON alerts(role);
CREATE INDEX IF NOT EXISTS alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS alerts_metric_type ON alerts(metric_type);

-- Status and lifecycle indexes
CREATE INDEX IF NOT EXISTS alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS alerts_triggered_at ON alerts(triggered_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS alerts_tenant_role_severity ON alerts(tenant_id, role, severity);
CREATE INDEX IF NOT EXISTS alerts_tenant_status_triggered ON alerts(tenant_id, status, triggered_at DESC);

-- Context data searches
CREATE INDEX IF NOT EXISTS alerts_context_data_gin ON alerts USING GIN (context_data);

-- ============================================
-- INDEXES FOR ALERT CONFIGS
-- ============================================

CREATE INDEX IF NOT EXISTS alert_configs_tenant_id ON alert_configs(tenant_id);
CREATE INDEX IF NOT EXISTS alert_configs_role ON alert_configs(role);
CREATE INDEX IF NOT EXISTS alert_configs_enabled ON alert_configs(enabled);

-- ============================================
-- INDEXES FOR ALERT DELIVERY LOG
-- ============================================

CREATE INDEX IF NOT EXISTS alert_delivery_log_alert_id ON alert_delivery_log(alert_id);
CREATE INDEX IF NOT EXISTS alert_delivery_log_status ON alert_delivery_log(status);
CREATE INDEX IF NOT EXISTS alert_delivery_log_channel ON alert_delivery_log(channel);
CREATE INDEX IF NOT EXISTS alert_delivery_log_created_at ON alert_delivery_log(created_at DESC);

-- ============================================
-- TIMESCALEDB HYPERFUNCTIONS (IF AVAILABLE)
-- ============================================

-- Enable TimescaleDB extension if available (for time-series optimization)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;

  -- Convert alerts table to hypertable for time-series optimization
  BEGIN
    CREATE TABLE IF NOT EXISTS alerts_timescale (
      LIKE alerts INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
    );

    -- Only create hypertable if extension is available
    PERFORM create_hypertable('alerts_timescale', 'triggered_at', if_not_exists => TRUE);

    -- Create continuous aggregate for hourly alert stats
    CREATE MATERIALIZED VIEW IF NOT EXISTS alert_hourly_stats
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket('1 hour', triggered_at) AS bucket,
      tenant_id,
      role,
      severity,
      COUNT(*) AS alert_count,
      COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count,
      COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) AS acknowledged_count,
      AVG(actual_value) AS avg_value,
      MAX(actual_value) AS max_value
    FROM alerts_timescale
    GROUP BY bucket, tenant_id, role, severity
    WITH NO DATA;

  EXCEPTION WHEN others THEN
    -- TimescaleDB not available, skip hypertable creation
    RAISE NOTICE 'TimescaleDB extension not available, using standard PostgreSQL tables';
  END;
END $$;

-- ============================================
-- RETENTION POLICY
-- ============================================

-- Create function to delete old alerts based on retention policy
CREATE OR REPLACE FUNCTION delete_old_alerts()
RETURNS void AS $$
BEGIN
  -- Delete resolved/dismissed/acknowledged alerts older than 90 days
  DELETE FROM alerts
  WHERE status IN ('resolved', 'dismissed', 'acknowledged')
    AND acknowledged_at < NOW() - INTERVAL '90 days'
    AND triggered_at < NOW() - INTERVAL '90 days';

  -- Log the deletion
  RAISE NOTICE 'Deleted old alerts successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_alert_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_updated_at();

CREATE TRIGGER alert_config_updated_at
  BEFORE UPDATE ON alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_updated_at();

CREATE TRIGGER alert_template_updated_at
  BEFORE UPDATE ON alert_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_updated_at();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active alerts by tenant and role
CREATE OR REPLACE VIEW active_alerts_by_role AS
SELECT
  tenant_id,
  role,
  severity,
  COUNT(*) FILTER (WHERE status = 'active') AS active_count,
  COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged_count,
  COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_count,
  COUNT(*) AS total_count
FROM alerts
WHERE triggered_at > NOW() - INTERVAL '30 days'
GROUP BY tenant_id, role, severity;

-- Alert delivery statistics
CREATE OR REPLACE VIEW alert_delivery_stats AS
SELECT
  a.alert_id,
  a.tenant_id,
  a.role,
  a.severity,
  a.delivery_status,
  COUNT(l.log_id) AS delivery_attempts,
  COUNT(l.log_id) FILTER (WHERE l.status = 'delivered') AS successful_deliveries,
  COUNT(l.log_id) FILTER (WHERE l.status = 'failed') AS failed_deliveries
FROM alerts a
LEFT JOIN alert_delivery_log l ON a.alert_id = l.alert_id
GROUP BY a.alert_id, a.tenant_id, a.role, a.severity, a.delivery_status;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE alerts IS 'Stores comprehensive alerts for CFO, CISO, and Board agents with threshold breach detection';
COMMENT ON TABLE alert_configs IS 'Stores per-tenant, per-role, per-metric alert threshold configurations';
COMMENT ON TABLE alert_templates IS 'Stores customizable email, Slack, and Teams notification templates';
COMMENT ON TABLE alert_delivery_log IS 'Tracks delivery status and attempts for each alert across all channels';

COMMENT ON COLUMN alerts.context_data IS 'JSONB field containing related risk objects, agent outputs, and contextual information';
COMMENT ON COLUMN alerts.delivery_status IS 'JSONB object tracking delivery status per channel: {email: "sent", slack: "pending", teams: "failed"}';
COMMENT ON COLUMN alert_configs.hysteresis_percent IS 'Percentage threshold must decrease before alert clears (prevents alert flapping)';
COMMENT ON COLUMN alert_configs.escalation_rules IS 'JSONB object defining escalation rules: {high: {escalate_to: ["board"], delay_minutes: 60}}';

-- ============================================
-- SAMPLE DEFAULT CONFIGURATIONS
-- ============================================

-- Insert default alert configurations for new tenants (reference implementation)
-- This would typically be done in tenant provisioning logic

-- Example: CFO Dollar Exposure Alert
-- INSERT INTO alert_configs (tenant_id, role, metric_type, threshold_value, severity, cooldown_minutes, hysteresis_percent, notification_channels)
-- VALUES ('tenant-uuid-1', 'cfo', 'dollar_exposure', 1000000, 'high', 60, 10.0, '["email", "slack", "teams"]');

-- Example: CISO Blast Radius Alert
-- INSERT INTO alert_configs (tenant_id, role, metric_type, threshold_value, severity, cooldown_minutes, hysteresis_percent, notification_channels)
-- VALUES ('tenant-uuid-1', 'ciso', 'blast_radius', 50, 'critical', 30, 15.0, '["email", "slack", "teams"]');

-- Example: Board Governance Alert
-- INSERT INTO alert_configs (tenant_id, role, metric_type, threshold_value, severity, cooldown_minutes, hysteresis_percent, notification_channels)
-- VALUES ('tenant-uuid-1', 'board', 'governance', 1, 'critical', 120, 0.0, '["email", "teams"]');

-- ============================================
-- GRANTS (ADJUST AS NEEDED FOR YOUR ROLE SYSTEM)
-- ============================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON alerts, alert_configs, alert_templates, alert_delivery_log TO your_app_role;
-- GRANT USAGE, SELECT ON SEQUENCE alert_delivery_log_log_id_seq TO your_app_role;

-- ============================================
-- END OF MIGRATION
-- ============================================
