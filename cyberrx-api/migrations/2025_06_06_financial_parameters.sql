-- Migration: Financial Parameters & Threshold Configuration (T-PILOT-003)
-- Description: Creates tables for comprehensive financial parameter management including MLR targets, stop-loss parameters, reserve positions, premium revenue mappings, risk appetite thresholds, alert thresholds, scenario analysis, and parameter validation
-- Author: Senior Backend Engineer
-- Date: 2025-06-06

-- ============================================================================
-- 1. Financial Parameters Table (Master Table)
-- ============================================================================
-- Stores all financial parameters with versioning and approval workflow
CREATE TABLE IF NOT EXISTS financial_parameters (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  parameter_type TEXT NOT NULL CHECK (parameter_type IN ('mlr_target', 'stop_loss', 'reserve', 'premium_revenue', 'risk_appetite', 'alert_threshold', 'scenario', 'validation')),
  parameter_name TEXT NOT NULL,
  parameter_value JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'deprecated', 'rejected')),
  effective_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  change_description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, parameter_type, parameter_name, version)
);

-- Indexes for financial_parameters
CREATE INDEX IF NOT EXISTS fp_org_idx ON financial_parameters(organization_id);
CREATE INDEX IF NOT EXISTS fp_type_idx ON financial_parameters(parameter_type);
CREATE INDEX IF NOT EXISTS fp_status_idx ON financial_parameters(status);
CREATE INDEX IF NOT EXISTS fp_effective_idx ON financial_parameters(effective_date);
CREATE INDEX IF NOT EXISTS fp_value_gin_idx ON financial_parameters USING GIN (parameter_value);

-- ============================================================================
-- 2. MLR Target Configuration Table
-- ============================================================================
-- Stores MLR (Medical Loss Ratio) target parameters
CREATE TABLE IF NOT EXISTS mlr_target_configurations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  financial_parameter_id TEXT NOT NULL REFERENCES financial_parameters(id) ON DELETE CASCADE,
  market_segment TEXT NOT NULL CHECK (market_segment IN ('individual', 'group', 'medicare', 'medicaid', 'all')),
  mlr_target_percentage NUMERIC(5,2) NOT NULL CHECK (mlr_target_percentage BETWEEN 0 AND 100),
  cms_minimum_percentage NUMERIC(5,2) DEFAULT 85.0,
  premium_revenue_baseline NUMERIC(20,2) NOT NULL,
  claims_cost_baseline NUMERIC(20,2) NOT NULL,
  quality_supplement_amount NUMERIC(20,2) DEFAULT 0,
  rebate_threshold_percentage NUMERIC(5,2) DEFAULT 80.0,
  mlr_impact_threshold_percentage NUMERIC(5,2) DEFAULT 2.0,
  tax_year INTEGER NOT NULL,
  reporting_quarter TEXT CHECK (reporting_quarter IN ('Q1', 'Q2', 'Q3', 'Q4', 'annual')),
  methodology TEXT,
  assumptions JSONB DEFAULT '[]',
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'failed')),
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, market_segment, tax_year, reporting_quarter)
);

-- Indexes for mlr_target_configurations
CREATE INDEX IF NOT EXISTS mlr_org_idx ON mlr_target_configurations(organization_id);
CREATE INDEX IF NOT EXISTS mlr_segment_idx ON mlr_target_configurations(market_segment);
CREATE INDEX IF NOT EXISTS mlr_year_idx ON mlr_target_configurations(tax_year);
CREATE INDEX IF NOT EXISTS mlr_target_idx ON mlr_target_configurations(mlr_target_percentage);

-- ============================================================================
-- 3. Stop-Loss Parameters Table
-- ============================================================================
-- Stores stop-loss insurance parameters
CREATE TABLE IF NOT EXISTS stop_loss_parameters (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  financial_parameter_id TEXT NOT NULL REFERENCES financial_parameters(id) ON DELETE CASCADE,
  line_of_business TEXT NOT NULL,
  specific_attachment_point NUMERIC(20,2) NOT NULL,
  specific_deductible NUMERIC(20,2) DEFAULT 0,
  aggregate_attachment_point NUMERIC(20,2) NOT NULL,
  aggregate_deductible NUMERIC(20,2) DEFAULT 0,
  aggregate_limit NUMERIC(20,2) NOT NULL,
  per_occurrence_limit NUMERIC(20,2) NOT NULL,
  current_aggregate_position NUMERIC(20,2) DEFAULT 0,
  carrier_name TEXT NOT NULL,
  carrier_contact_email TEXT,
  policy_number TEXT NOT NULL,
  policy_effective_date TIMESTAMPTZ NOT NULL,
  policy_expiry_date TIMESTAMPTZ NOT NULL,
  reinsurance_treaty JSONB DEFAULT '{}',
  laser_items JSONB DEFAULT '[]',
  exhaustion_scenarios JSONB DEFAULT '[]',
  contract_document_reference TEXT,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'failed')),
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, line_of_business, policy_number)
);

-- Indexes for stop_loss_parameters
CREATE INDEX IF NOT EXISTS sl_org_idx ON stop_loss_parameters(organization_id);
CREATE INDEX IF NOT EXISTS sl_lob_idx ON stop_loss_parameters(line_of_business);
CREATE INDEX IF NOT EXISTS sl_carrier_idx ON stop_loss_parameters(carrier_name);
CREATE INDEX IF NOT EXISTS sl_policy_idx ON stop_loss_parameters(policy_number);
CREATE INDEX IF NOT EXISTS sl_expiry_idx ON stop_loss_parameters(policy_expiry_date);

-- ============================================================================
-- 4. Reserve Positions Table
-- ============================================================================
-- Stores reserve positions by line of business and reserve type
CREATE TABLE IF NOT EXISTS reserve_positions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  financial_parameter_id TEXT NOT NULL REFERENCES financial_parameters(id) ON DELETE CASCADE,
  line_of_business TEXT NOT NULL,
  reserve_type TEXT NOT NULL CHECK (reserve_type IN ('ibnr', 'case_reserve', 'contractual', 'premium_deficiency', 'pending')),
  reserve_balance NUMERIC(20,2) NOT NULL,
  reserve_at_risk NUMERIC(20,2) DEFAULT 0,
  reserve_depletion_rate NUMERIC(5,2) DEFAULT 0,
  adequacy_percentage NUMERIC(5,2) DEFAULT 100.0,
  actuarial_assumptions JSONB DEFAULT '{}',
  reserve_impact_model JSONB DEFAULT '{}',
  validation_date DATE,
  validated_by_actuary TEXT,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, line_of_business, reserve_type, validation_date)
);

-- Indexes for reserve_positions
CREATE INDEX IF NOT EXISTS rp_org_idx ON reserve_positions(organization_id);
CREATE INDEX IF NOT EXISTS rp_lob_idx ON reserve_positions(line_of_business);
CREATE INDEX IF NOT EXISTS rp_type_idx ON reserve_positions(reserve_type);
CREATE INDEX IF NOT EXISTS rp_date_idx ON reserve_positions(validation_date);
CREATE INDEX IF NOT EXISTS rp_balance_idx ON reserve_positions(reserve_balance);

-- ============================================================================
-- 5. Premium Revenue Mappings Table
-- ============================================================================
-- Maps premium revenue to business processes and member populations
CREATE TABLE IF NOT EXISTS premium_revenue_mappings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  financial_parameter_id TEXT NOT NULL REFERENCES financial_parameters(id) ON DELETE CASCADE,
  business_process_id TEXT NOT NULL,
  line_of_business TEXT NOT NULL,
  state_code TEXT NOT NULL,
  monthly_premium_revenue NUMERIC(20,2) DEFAULT 0,
  quarterly_premium_revenue NUMERIC(20,2) DEFAULT 0,
  annual_premium_revenue NUMERIC(20,2) NOT NULL,
  member_count INTEGER DEFAULT 0,
  premium_per_member_month NUMERIC(10,2) DEFAULT 0,
  revenue_at_risk_percentage NUMERIC(5,2) DEFAULT 0,
  revenue_at_risk_amount NUMERIC(20,2) DEFAULT 0,
  seasonality_factor NUMERIC(5,4) DEFAULT 1.0,
  revenue_trend TEXT CHECK (revenue_trend IN ('increasing', 'stable', 'decreasing')),
  gl_account_reference TEXT,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'failed')),
  reconciled_by TEXT,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, business_process_id, line_of_business, state_code)
);

-- Indexes for premium_revenue_mappings
CREATE INDEX IF NOT EXISTS prm_org_idx ON premium_revenue_mappings(organization_id);
CREATE INDEX IF NOT EXISTS prm_process_idx ON premium_revenue_mappings(business_process_id);
CREATE INDEX IF NOT EXISTS prm_lob_idx ON premium_revenue_mappings(line_of_business);
CREATE INDEX IF NOT EXISTS prm_state_idx ON premium_revenue_mappings(state_code);
CREATE INDEX IF NOT EXISTS prm_revenue_idx ON premium_revenue_mappings(annual_premium_revenue);

-- ============================================================================
-- 6. Risk Appetite Thresholds Table
-- ============================================================================
-- Stores board-approved risk appetite thresholds
CREATE TABLE IF NOT EXISTS risk_appetite_thresholds (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  financial_parameter_id TEXT NOT NULL REFERENCES financial_parameters(id) ON DELETE CASCADE,
  threshold_level TEXT NOT NULL CHECK (threshold_level IN ('board', 'cro', 'ciso', 'cfo', 'audit')),
  threshold_category TEXT NOT NULL CHECK (threshold_category IN ('single_event_exposure', 'annual_aggregate_exposure', 'mlr_impact', 'regulatory_fine', 'daily_exposure', 'weekly_exposure', 'blast_radius', 'sla_breach', 'compliance_violation', 'vendor_risk')),
  threshold_metric TEXT NOT NULL,
  threshold_value NUMERIC(20,2) NOT NULL,
  threshold_unit TEXT NOT NULL,
  warning_threshold_percentage NUMERIC(5,2) DEFAULT 80.0,
  critical_threshold_percentage NUMERIC(5,2) DEFAULT 90.0,
  escalation_trigger TEXT,
  notification_recipients JSONB DEFAULT '[]',
  approval_document_reference TEXT,
  approved_by_board TEXT,
  approved_date DATE,
  review_frequency TEXT CHECK (review_frequency IN ('monthly', 'quarterly', 'annually')),
  next_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, threshold_level, threshold_category, threshold_metric)
);

-- Indexes for risk_appetite_thresholds
CREATE INDEX IF NOT EXISTS rat_org_idx ON risk_appetite_thresholds(organization_id);
CREATE INDEX IF NOT EXISTS rat_level_idx ON risk_appetite_thresholds(threshold_level);
CREATE INDEX IF NOT EXISTS rat_category_idx ON risk_appetite_thresholds(threshold_category);
CREATE INDEX IF NOT EXISTS rat_metric_idx ON risk_appetite_thresholds(threshold_metric);
CREATE INDEX IF NOT EXISTS rat_review_idx ON risk_appetite_thresholds(next_review_date);

-- ============================================================================
-- 7. Alert Threshold Configuration Table
-- ============================================================================
-- Stores alert threshold configuration for automated alerting
CREATE TABLE IF NOT EXISTS alert_threshold_configurations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  financial_parameter_id TEXT NOT NULL REFERENCES financial_parameters(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('dollar_exposure', 'mlr_impact', 'stop_loss_position', 'reserve_adequacy', 'revenue_risk', 'compliance_violation', 'vendor_breach', 'aggregation')),
  alert_condition JSONB NOT NULL,
  alert_threshold_value NUMERIC(20,2) NOT NULL,
  alert_severity TEXT NOT NULL CHECK (alert_severity IN ('info', 'warning', 'critical', 'emergency')),
  comparison_operator TEXT NOT NULL CHECK (comparison_operator IN ('>', '<', '>=', '<=', '=', '!=')),
  hysteresis_percentage NUMERIC(5,2) DEFAULT 5.0,
  cooldown_period_minutes INTEGER DEFAULT 60,
  notification_channels JSONB DEFAULT '[]',
  escalation_rules JSONB DEFAULT '[]',
  suppression_rules JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, alert_type, alert_severity)
);

-- Indexes for alert_threshold_configurations
CREATE INDEX IF NOT EXISTS atc_org_idx ON alert_threshold_configurations(organization_id);
CREATE INDEX IF NOT EXISTS atc_type_idx ON alert_threshold_configurations(alert_type);
CREATE INDEX IF NOT EXISTS atc_severity_idx ON alert_threshold_configurations(alert_severity);
CREATE INDEX IF NOT EXISTS atc_active_idx ON alert_threshold_configurations(is_active);

-- ============================================================================
-- 8. Scenario Analysis Configuration Table
-- ============================================================================
-- Stores scenario analysis configurations for what-if modeling
CREATE TABLE IF NOT EXISTS scenario_analysis_configurations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  financial_parameter_id TEXT NOT NULL REFERENCES financial_parameters(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('ransomware', 'data_breach', 'system_outage', 'third_party_failure', 'regulatory_fine', 'fraud', 'catastrophe', 'custom')),
  scenario_description TEXT,
  impact_parameters JSONB NOT NULL,
  financial_assumptions JSONB NOT NULL,
  probability_distribution TEXT CHECK (probability_distribution IN ('uniform', 'normal', 'triangular', 'pert', 'custom')),
  monte_carlo_iterations INTEGER DEFAULT 10000,
  sensitivity_variables JSONB DEFAULT '[]',
  stress_test_factors JSONB DEFAULT '[]',
  output_metrics JSONB DEFAULT '[]',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, scenario_name)
);

-- Indexes for scenario_analysis_configurations
CREATE INDEX IF NOT EXISTS sac_org_idx ON scenario_analysis_configurations(organization_id);
CREATE INDEX IF NOT EXISTS sac_type_idx ON scenario_analysis_configurations(scenario_type);
CREATE INDEX IF NOT EXISTS sac_name_idx ON scenario_analysis_configurations(scenario_name);

-- ============================================================================
-- 9. Parameter Validation Records Table
-- ============================================================================
-- Stores validation records for all financial parameters
CREATE TABLE IF NOT EXISTS parameter_validation_records (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  financial_parameter_id TEXT NOT NULL REFERENCES financial_parameters(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('data_quality', 'range_validation', 'cross_parameter', 'regulatory_compliance', 'actuarial_reasonableness', 'historical_trend')),
  validation_status TEXT NOT NULL CHECK (validation_status IN ('passed', 'failed', 'warning', 'skipped')),
  validation_score NUMERIC(5,2),
  validation_details JSONB NOT NULL,
  validation_errors JSONB DEFAULT '[]',
  validation_warnings JSONB DEFAULT '[]',
  compared_to_baseline BOOLEAN DEFAULT false,
  baseline_variance_percentage NUMERIC(5,2),
  validated_by TEXT,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, financial_parameter_id, validation_type, validated_at)
);

-- Indexes for parameter_validation_records
CREATE INDEX IF NOT EXISTS pvr_org_idx ON parameter_validation_records(organization_id);
CREATE INDEX IF NOT EXISTS pvr_param_idx ON parameter_validation_records(financial_parameter_id);
CREATE INDEX IF NOT EXISTS pvr_type_idx ON parameter_validation_records(validation_type);
CREATE INDEX IF NOT EXISTS pvr_status_idx ON parameter_validation_records(validation_status);
CREATE INDEX IF NOT EXISTS pvr_date_idx ON parameter_validation_records(validated_at);

-- ============================================================================
-- 10. Parameter Approval Workflow Table
-- ============================================================================
-- Tracks approval workflow for financial parameter changes
CREATE TABLE IF NOT EXISTS parameter_approval_workflow (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  financial_parameter_id TEXT NOT NULL REFERENCES financial_parameters(id) ON DELETE CASCADE,
  workflow_status TEXT NOT NULL DEFAULT 'pending' CHECK (workflow_status IN ('pending', 'under_review', 'approved', 'rejected', 'cancelled')),
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT,
  approval_chain JSONB DEFAULT '[]',
  current_approver TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  change_impact_assessment JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for parameter_approval_workflow
CREATE INDEX IF NOT EXISTS paw_org_idx ON parameter_approval_workflow(organization_id);
CREATE INDEX IF NOT EXISTS paw_param_idx ON parameter_approval_workflow(financial_parameter_id);
CREATE INDEX IF NOT EXISTS paw_status_idx ON parameter_approval_workflow(workflow_status);
CREATE INDEX IF NOT EXISTS paw_submitted_idx ON parameter_approval_workflow(submitted_at);
CREATE INDEX IF NOT EXISTS paw_approver_idx ON parameter_approval_workflow(current_approver);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to check if MLR target is within CMS regulatory requirements
CREATE OR REPLACE FUNCTION check_mlr_compliance(
  p_target NUMERIC,
  p_market_segment TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- CMS minimum MLR requirements
  IF p_market_segment = 'individual' AND p_target < 80.0 THEN
    RETURN false;
  ELSIF p_market_segment = 'group' AND p_target < 85.0 THEN
    RETURN false;
  ELSIF p_market_segment = 'medicare' AND p_target < 85.0 THEN
    RETURN false;
  ELSIF p_market_segment = 'medicaid' AND p_target < 85.0 THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate stop-loss remaining capacity
CREATE OR REPLACE FUNCTION calculate_stoploss_capacity(
  p_aggregate_limit NUMERIC,
  p_current_position NUMERIC,
  p_exposure NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN GREATEST(0, p_aggregate_limit - p_current_position - p_exposure);
END;
$$ LANGUAGE plpgsql;

-- Function to check if threshold is breached
CREATE OR REPLACE FUNCTION check_threshold_breach(
  p_current_value NUMERIC,
  p_threshold_value NUMERIC,
  p_operator TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  CASE p_operator
    WHEN '>' THEN RETURN p_current_value > p_threshold_value;
    WHEN '<' THEN RETURN p_current_value < p_threshold_value;
    WHEN '>=' THEN RETURN p_current_value >= p_threshold_value;
    WHEN '<=' THEN RETURN p_current_value <= p_threshold_value;
    WHEN '=' THEN RETURN p_current_value = p_threshold_value;
    WHEN '!=' THEN RETURN p_current_value != p_threshold_value;
    ELSE RAISE EXCEPTION 'Invalid comparison operator: %', p_operator;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate MLR impact from exposure
CREATE OR REPLACE FUNCTION calculate_mlr_impact_from_exposure(
  p_exposure NUMERIC,
  p_premium_revenue NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  IF p_premium_revenue = 0 THEN
    RETURN 0;
  END IF;
  RETURN (p_exposure / p_premium_revenue) * 100;
END;
$$ LANGUAGE plpgsql;

-- Function to validate reserve adequacy
CREATE OR REPLACE FUNCTION validate_reserve_adequacy(
  p_reserve_balance NUMERIC,
  p_reserve_at_risk NUMERIC,
  p_adequacy_threshold NUMERIC DEFAULT 100.0
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_reserve_at_risk = 0 THEN
    RETURN true; -- No risk means reserves are adequate
  END IF;
  RETURN ((p_reserve_balance / p_reserve_at_risk) * 100) >= p_adequacy_threshold;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate revenue at risk
CREATE OR REPLACE FUNCTION calculate_revenue_at_risk(
  p_annual_revenue NUMERIC,
  p_risk_percentage NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN p_annual_revenue * (p_risk_percentage / 100.0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if parameter needs approval
CREATE OR REPLACE FUNCTION check_parameter_approval_required(
  p_parameter_type TEXT,
  p_change_magnitude NUMERIC
) RETURNS BOOLEAN AS $$
BEGIN
  -- High-risk parameters always require approval
  IF p_parameter_type IN ('risk_appetite', 'alert_threshold') THEN
    RETURN true;
  END IF;

  -- Large changes require approval
  IF p_change_magnitude > 10.0 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_financial_params_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers for automatic timestamp updates
-- ============================================================================

CREATE TRIGGER trigger_financial_params_updated_at
  BEFORE UPDATE ON financial_parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

CREATE TRIGGER trigger_mlr_target_updated_at
  BEFORE UPDATE ON mlr_target_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

CREATE TRIGGER trigger_stop_loss_updated_at
  BEFORE UPDATE ON stop_loss_parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

CREATE TRIGGER trigger_reserve_positions_updated_at
  BEFORE UPDATE ON reserve_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

CREATE TRIGGER trigger_premium_revenue_updated_at
  BEFORE UPDATE ON premium_revenue_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

CREATE TRIGGER trigger_risk_appetite_updated_at
  BEFORE UPDATE ON risk_appetite_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

CREATE TRIGGER trigger_alert_threshold_updated_at
  BEFORE UPDATE ON alert_threshold_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

CREATE TRIGGER trigger_scenario_analysis_updated_at
  BEFORE UPDATE ON scenario_analysis_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

CREATE TRIGGER trigger_parameter_validation_updated_at
  BEFORE UPDATE ON parameter_validation_records
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

CREATE TRIGGER trigger_approval_workflow_updated_at
  BEFORE UPDATE ON parameter_approval_workflow
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_params_updated_at();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE financial_parameters IS 'Master table for all financial parameters with versioning and approval workflow';
COMMENT ON TABLE mlr_target_configurations IS 'MLR (Medical Loss Ratio) target configurations per market segment and tax year';
COMMENT ON TABLE stop_loss_parameters IS 'Stop-loss insurance parameters including attachment points, deductibles, and carrier information';
COMMENT ON TABLE reserve_positions IS 'Reserve positions by line of business and reserve type (IBNR, case, contractual)';
COMMENT ON TABLE premium_revenue_mappings IS 'Premium revenue mappings to business processes and member populations';
COMMENT ON TABLE risk_appetite_thresholds IS 'Board-approved risk appetite thresholds at different organizational levels';
COMMENT ON TABLE alert_threshold_configurations IS 'Alert threshold configuration for automated monitoring and alerting';
COMMENT ON TABLE scenario_analysis_configurations IS 'Scenario analysis configurations for what-if modeling and stress testing';
COMMENT ON TABLE parameter_validation_records IS 'Validation records for all financial parameters with scores and details';
COMMENT ON TABLE parameter_approval_workflow IS 'Approval workflow tracking for financial parameter changes';
