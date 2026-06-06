-- Rollback Migration: T-MVP-014 Alerting & Notification System
-- Description: Removes all alerting system tables and related objects
-- Date: 2025-06-06

-- ============================================
-- DROP VIEWS
-- ============================================

DROP VIEW IF EXISTS alert_delivery_stats;
DROP VIEW IF EXISTS active_alerts_by_role;

-- ============================================
-- DROP MATERIALIZED VIEWS (IF TIMESCALEDB WAS USED)
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS alert_hourly_stats;

-- ============================================
-- DROP TIMESCALEDB HYPERTABLE (IF CREATED)
-- ============================================

DROP TABLE IF EXISTS alerts_timescale;

-- ============================================
-- DROP TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS alert_template_updated_at ON alert_templates;
DROP TRIGGER IF EXISTS alert_config_updated_at ON alert_configs;
DROP TRIGGER IF EXISTS alert_updated_at ON alerts;

-- ============================================
-- DROP FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS delete_old_alerts();
DROP FUNCTION IF EXISTS update_alert_updated_at();

-- ============================================
-- DROP INDEXES
-- ============================================

-- Alert delivery log indexes
DROP INDEX IF EXISTS alert_delivery_log_created_at;
DROP INDEX IF EXISTS alert_delivery_log_channel;
DROP INDEX IF EXISTS alert_delivery_log_status;
DROP INDEX IF EXISTS alert_delivery_log_alert_id;

-- Alert config indexes
DROP INDEX IF EXISTS alert_configs_enabled;
DROP INDEX IF EXISTS alert_configs_role;
DROP INDEX IF EXISTS alert_configs_tenant_id;

-- Alert indexes
DROP INDEX IF EXISTS alerts_context_data_gin;
DROP INDEX IF EXISTS alerts_tenant_status_triggered;
DROP INDEX IF EXISTS alerts_tenant_role_severity;
DROP INDEX IF EXISTS alerts_triggered_at;
DROP INDEX IF EXISTS alerts_status;
DROP INDEX IF EXISTS alerts_metric_type;
DROP INDEX IF EXISTS alerts_severity;
DROP INDEX IF EXISTS alerts_role;
DROP INDEX IF EXISTS alerts_tenant_id;

-- ============================================
-- DROP TABLES
-- ============================================

DROP TABLE IF EXISTS alert_delivery_log;
DROP TABLE IF EXISTS alert_templates;
DROP TABLE IF EXISTS alert_configs;
DROP TABLE IF EXISTS alerts;

-- ============================================
-- DROP TIMESCALEDB EXTENSION (OPTIONAL)
-- ============================================

-- Uncomment if you want to remove TimescaleDB extension entirely
-- DROP EXTENSION IF EXISTS timescaledb;

-- ============================================
-- END OF ROLLBACK
-- ============================================
