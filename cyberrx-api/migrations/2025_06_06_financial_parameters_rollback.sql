-- Rollback Migration: Financial Parameters & Threshold Configuration (T-PILOT-003)
-- Description: Rolls back all financial parameter tables and related objects
-- Author: Senior Backend Engineer
-- Date: 2025-06-06

-- ============================================================================
-- Drop Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_financial_params_updated_at ON financial_parameters;
DROP TRIGGER IF EXISTS trigger_mlr_target_updated_at ON mlr_target_configurations;
DROP TRIGGER IF EXISTS trigger_stop_loss_updated_at ON stop_loss_parameters;
DROP TRIGGER IF EXISTS trigger_reserve_positions_updated_at ON reserve_positions;
DROP TRIGGER IF EXISTS trigger_premium_revenue_updated_at ON premium_revenue_mappings;
DROP TRIGGER IF EXISTS trigger_risk_appetite_updated_at ON risk_appetite_thresholds;
DROP TRIGGER IF EXISTS trigger_alert_threshold_updated_at ON alert_threshold_configurations;
DROP TRIGGER IF EXISTS trigger_scenario_analysis_updated_at ON scenario_analysis_configurations;
DROP TRIGGER IF EXISTS trigger_parameter_validation_updated_at ON parameter_validation_records;
DROP TRIGGER IF EXISTS trigger_approval_workflow_updated_at ON parameter_approval_workflow;

-- ============================================================================
-- Drop Helper Functions
-- ============================================================================

DROP FUNCTION IF EXISTS update_financial_params_updated_at();
DROP FUNCTION IF EXISTS check_mlr_compliance(NUMERIC, TEXT);
DROP FUNCTION IF EXISTS calculate_stoploss_capacity(NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS check_threshold_breach(NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS calculate_mlr_impact_from_exposure(NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS validate_reserve_adequacy(NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS calculate_revenue_at_risk(NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS check_parameter_approval_required(TEXT, NUMERIC);

-- ============================================================================
-- Drop Indexes (explicitly)
-- ============================================================================

-- parameter_approval_workflow
DROP INDEX IF EXISTS paw_approver_idx;
DROP INDEX IF EXISTS paw_submitted_idx;
DROP INDEX IF EXISTS paw_status_idx;
DROP INDEX IF EXISTS paw_param_idx;
DROP INDEX IF EXISTS paw_org_idx;

-- parameter_validation_records
DROP INDEX IF EXISTS pvr_date_idx;
DROP INDEX IF EXISTS pvr_status_idx;
DROP INDEX IF EXISTS pvr_type_idx;
DROP INDEX IF EXISTS pvr_param_idx;
DROP INDEX IF EXISTS pvr_org_idx;

-- scenario_analysis_configurations
DROP INDEX IF EXISTS sac_name_idx;
DROP INDEX IF EXISTS sac_type_idx;
DROP INDEX IF EXISTS sac_org_idx;

-- alert_threshold_configurations
DROP INDEX IF EXISTS atc_active_idx;
DROP INDEX IF EXISTS atc_severity_idx;
DROP INDEX IF EXISTS atc_type_idx;
DROP INDEX IF EXISTS atc_org_idx;

-- risk_appetite_thresholds
DROP INDEX IF EXISTS rat_review_idx;
DROP INDEX IF EXISTS rat_metric_idx;
DROP INDEX IF EXISTS rat_category_idx;
DROP INDEX IF EXISTS rat_level_idx;
DROP INDEX IF EXISTS rat_org_idx;

-- premium_revenue_mappings
DROP INDEX IF EXISTS prm_revenue_idx;
DROP INDEX IF EXISTS prm_state_idx;
DROP INDEX IF EXISTS prm_lob_idx;
DROP INDEX IF EXISTS prm_process_idx;
DROP INDEX IF EXISTS prm_org_idx;

-- reserve_positions
DROP INDEX IF EXISTS rp_balance_idx;
DROP INDEX IF EXISTS rp_date_idx;
DROP INDEX IF EXISTS rp_type_idx;
DROP INDEX IF EXISTS rp_lob_idx;
DROP INDEX IF EXISTS rp_org_idx;

-- stop_loss_parameters
DROP INDEX IF EXISTS sl_expiry_idx;
DROP INDEX IF EXISTS sl_policy_idx;
DROP INDEX IF EXISTS sl_carrier_idx;
DROP INDEX IF EXISTS sl_lob_idx;
DROP INDEX IF EXISTS sl_org_idx;

-- mlr_target_configurations
DROP INDEX IF EXISTS mlr_target_idx;
DROP INDEX IF EXISTS mlr_year_idx;
DROP INDEX IF EXISTS mlr_segment_idx;
DROP INDEX IF EXISTS mlr_org_idx;

-- financial_parameters
DROP INDEX IF EXISTS fp_value_gin_idx;
DROP INDEX IF EXISTS fp_effective_idx;
DROP INDEX IF EXISTS fp_status_idx;
DROP INDEX IF EXISTS fp_type_idx;
DROP INDEX IF EXISTS fp_org_idx;

-- ============================================================================
-- Drop Tables (in correct order due to foreign key dependencies)
-- ============================================================================

DROP TABLE IF EXISTS parameter_approval_workflow;
DROP TABLE IF EXISTS parameter_validation_records;
DROP TABLE IF EXISTS scenario_analysis_configurations;
DROP TABLE IF EXISTS alert_threshold_configurations;
DROP TABLE IF EXISTS risk_appetite_thresholds;
DROP TABLE IF EXISTS premium_revenue_mappings;
DROP TABLE IF EXISTS reserve_positions;
DROP TABLE IF EXISTS stop_loss_parameters;
DROP TABLE IF EXISTS mlr_target_configurations;
DROP TABLE IF EXISTS financial_parameters;

-- ============================================================================
-- Rollback Complete
-- ============================================================================

-- All financial parameter tables and related objects have been dropped
-- Database is now in state before T-PILOT-003 migration
