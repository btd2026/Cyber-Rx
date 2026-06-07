-- Rollback Migration: Business Process Graph Construction (T-PILOT-002)
-- Description: Rollback script for business process graph tables
-- Author: Senior Backend Engineer
-- Date: 2025-06-06

-- Drop indexes first
DROP INDEX IF EXISTS gve_date_idx;
DROP INDEX IF EXISTS gve_type_idx;
DROP INDEX IF EXISTS gve_graph_idx;
DROP INDEX IF EXISTS gve_org_idx;
DROP INDEX IF EXISTS pc_criticality_idx;
DROP INDEX IF EXISTS pc_category_idx;
DROP INDEX IF EXISTS pc_tier_idx;
DROP INDEX IF EXISTS pc_type_idx;
DROP INDEX IF EXISTS pc_process_id_idx;
DROP INDEX IF EXISTS pc_org_idx;
DROP INDEX IF EXISTS pia_financial_idx;
DROP INDEX IF EXISTS pia_scenario_idx;
DROP INDEX IF EXISTS pia_process_idx;
DROP INDEX IF EXISTS pia_org_idx;
DROP INDEX IF EXISTS pvw_type_idx;
DROP INDEX IF EXISTS pvw_status_idx;
DROP INDEX IF EXISTS pvw_graph_idx;
DROP INDEX IF EXISTS pvw_org_idx;
DROP INDEX IF EXISTS spm_coverage_idx;
DROP INDEX IF EXISTS spm_process_idx;
DROP INDEX IF EXISTS spm_system_idx;
DROP INDEX IF EXISTS spm_org_idx;
DROP INDEX IF EXISTS pfv_confidence_idx;
DROP INDEX IF EXISTS pfv_revenue_idx;
DROP INDEX IF EXISTS pfv_process_idx;
DROP INDEX IF EXISTS pfv_org_idx;
DROP INDEX IF EXISTS pd_type_idx;
DROP INDEX IF EXISTS pd_target_idx;
DROP INDEX IF EXISTS pd_source_idx;
DROP INDEX IF EXISTS pd_org_idx;
DROP INDEX IF EXISTS bpg_edges_gin_idx;
DROP INDEX IF EXISTS bpg_nodes_gin_idx;
DROP INDEX IF EXISTS bpg_version_idx;
DROP INDEX IF EXISTS bpg_status_idx;
DROP INDEX IF EXISTS bpg_org_idx;

-- Drop triggers
DROP TRIGGER IF EXISTS update_process_catalog_updated_at ON process_catalog;
DROP TRIGGER IF EXISTS update_process_impact_analysis_updated_at ON process_impact_analysis;
DROP TRIGGER IF EXISTS update_process_validation_workflow_updated_at ON process_validation_workflow;
DROP TRIGGER IF EXISTS update_system_process_mappings_updated_at ON system_process_mappings;
DROP TRIGGER IF EXISTS update_process_financial_values_updated_at ON process_financial_values;
DROP TRIGGER IF EXISTS update_process_dependencies_updated_at ON process_dependencies;
DROP TRIGGER IF EXISTS update_business_process_graph_updated_at ON business_process_graph;

-- Drop helper functions
DROP FUNCTION IF EXISTS calculate_process_criticality(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_upstream_dependencies(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_downstream_dependencies(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order of creation
DROP TABLE IF EXISTS graph_visualization_exports CASCADE;
DROP TABLE IF EXISTS process_catalog CASCADE;
DROP TABLE IF EXISTS process_impact_analysis CASCADE;
DROP TABLE IF EXISTS process_validation_workflow CASCADE;
DROP TABLE IF EXISTS system_process_mappings CASCADE;
DROP TABLE IF EXISTS process_financial_values CASCADE;
DROP TABLE IF EXISTS process_dependencies CASCADE;
DROP TABLE IF EXISTS business_process_graph CASCADE;
