-- Migration: Business Process Graph Construction (T-PILOT-002)
-- Description: Creates tables for comprehensive business process graph with dependencies, financial values, and visualization support
-- Author: Senior Backend Engineer
-- Date: 2025-06-06

-- ============================================================================
-- 1. Business Process Graph Table
-- ============================================================================
-- Stores the complete graph structure with nodes and edges
CREATE TABLE IF NOT EXISTS business_process_graph (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT '1.0',
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'locked')),
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for business_process_graph
CREATE INDEX IF NOT EXISTS bpg_org_idx ON business_process_graph(organization_id);
CREATE INDEX IF NOT EXISTS bpg_status_idx ON business_process_graph(status);
CREATE INDEX IF NOT EXISTS bpg_version_idx ON business_process_graph(version);
CREATE INDEX IF NOT EXISTS bpg_nodes_gin_idx ON business_process_graph USING GIN (nodes);
CREATE INDEX IF NOT EXISTS bpg_edges_gin_idx ON business_process_graph USING GIN (edges);

-- ============================================================================
-- 2. Process Dependencies Table
-- ============================================================================
-- Stores upstream/downstream dependencies between processes
CREATE TABLE IF NOT EXISTS process_dependencies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source_process_id TEXT NOT NULL,
  target_process_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('depends_on', 'enables', 'triggers', 'impacts')),
  criticality TEXT CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, source_process_id, target_process_id, dependency_type)
);

-- Indexes for process_dependencies
CREATE INDEX IF NOT EXISTS pd_org_idx ON process_dependencies(organization_id);
CREATE INDEX IF NOT EXISTS pd_source_idx ON process_dependencies(source_process_id);
CREATE INDEX IF NOT EXISTS pd_target_idx ON process_dependencies(target_process_id);
CREATE INDEX IF NOT EXISTS pd_type_idx ON process_dependencies(dependency_type);

-- ============================================================================
-- 3. Process Financial Values Table
-- ============================================================================
-- Stores financial values per process for impact calculation
CREATE TABLE IF NOT EXISTS process_financial_values (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  process_id TEXT NOT NULL,
  annual_premium_revenue NUMERIC(20,2) DEFAULT 0,
  mlr_impact_percentage NUMERIC(5,2) DEFAULT 0,
  stop_loss_exposure NUMERIC(20,2) DEFAULT 0,
  reserves_at_risk NUMERIC(20,2) DEFAULT 0,
  regulatory_fine_potential NUMERIC(20,2) DEFAULT 0,
  downtime_cost_per_day NUMERIC(20,2) DEFAULT 0,
  downtime_cost_per_hour NUMERIC(20,2) DEFAULT 0,
  data_breach_cost NUMERIC(20,2) DEFAULT 0,
  customer_impact_cost NUMERIC(20,2) DEFAULT 0,
  revenue_at_risk NUMERIC(20,2) DEFAULT 0,
  methodology TEXT,
  assumptions JSONB DEFAULT '[]',
  confidence_score NUMERIC(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, process_id)
);

-- Indexes for process_financial_values
CREATE INDEX IF NOT EXISTS pfv_org_idx ON process_financial_values(organization_id);
CREATE INDEX IF NOT EXISTS pfv_process_idx ON process_financial_values(process_id);
CREATE INDEX IF NOT EXISTS pfv_revenue_idx ON process_financial_values(annual_premium_revenue);
CREATE INDEX IF NOT EXISTS pfv_confidence_idx ON process_financial_values(confidence_score);

-- ============================================================================
-- 4. System-to-Process Mapping Table
-- ============================================================================
-- Maps IT systems to business processes
CREATE TABLE IF NOT EXISTS system_process_mappings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  system_id TEXT NOT NULL,
  process_id TEXT NOT NULL,
  mapping_type TEXT NOT NULL CHECK (mapping_type IN ('primary', 'secondary', 'supporting')),
  criticality_score NUMERIC(3,2) CHECK (criticality_score BETWEEN 0 AND 1),
  coverage_status TEXT CHECK (coverage_status IN ('instrumented', 'partial', 'unmapped')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, system_id, process_id)
);

-- Indexes for system_process_mappings
CREATE INDEX IF NOT EXISTS spm_org_idx ON system_process_mappings(organization_id);
CREATE INDEX IF NOT EXISTS spm_system_idx ON system_process_mappings(system_id);
CREATE INDEX IF NOT EXISTS spm_process_idx ON system_process_mappings(process_id);
CREATE INDEX IF NOT EXISTS spm_coverage_idx ON system_process_mappings(coverage_status);

-- ============================================================================
-- 5. Process Validation Workflow Table
-- ============================================================================
-- Tracks customer validation workflow status
CREATE TABLE IF NOT EXISTS process_validation_workflow (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  graph_id TEXT REFERENCES business_process_graph(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('structure', 'financial', 'dependencies', 'complete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'changes_requested')),
  stakeholder TEXT NOT NULL,
  stakeholder_role TEXT NOT NULL,
  comments TEXT,
  change_requests JSONB DEFAULT '[]',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for process_validation_workflow
CREATE INDEX IF NOT EXISTS pvw_org_idx ON process_validation_workflow(organization_id);
CREATE INDEX IF NOT EXISTS pvw_graph_idx ON process_validation_workflow(graph_id);
CREATE INDEX IF NOT EXISTS pvw_status_idx ON process_validation_workflow(status);
CREATE INDEX IF NOT EXISTS pvw_type_idx ON process_validation_workflow(validation_type);

-- ============================================================================
-- 6. Process Impact Analysis Table
-- ============================================================================
-- Stores blast radius and impact analysis results
CREATE TABLE IF NOT EXISTS process_impact_analysis (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  process_id TEXT NOT NULL,
  scenario TEXT NOT NULL,
  blast_radius_processes JSONB DEFAULT '[]',
  blast_radius_systems JSONB DEFAULT '[]',
  upstream_impact JSONB DEFAULT '{}',
  downstream_impact JSONB DEFAULT '{}',
  financial_impact NUMERIC(20,2) DEFAULT 0,
  operational_impact_score NUMERIC(3,2) CHECK (operational_impact_score BETWEEN 0 AND 1),
  single_points_of_failure JSONB DEFAULT '[]',
  cascade_pathways JSONB DEFAULT '[]',
  analysis_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for process_impact_analysis
CREATE INDEX IF NOT EXISTS pia_org_idx ON process_impact_analysis(organization_id);
CREATE INDEX IF NOT EXISTS pia_process_idx ON process_impact_analysis(process_id);
CREATE INDEX IF NOT EXISTS pia_scenario_idx ON process_impact_analysis(scenario);
CREATE INDEX IF NOT EXISTSpia_financial_idx ON process_impact_analysis(financial_impact);

-- ============================================================================
-- 7. Process Catalog Table
-- ============================================================================
-- Catalog of discovered business processes
CREATE TABLE IF NOT EXISTS process_catalog (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  process_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  process_type TEXT NOT NULL CHECK (process_type IN ('core', 'supporting', 'enabling')),
  tier TEXT CHECK (tier IN ('crown_jewel', 'critical', 'important', 'standard')),
  category TEXT,
  sub_processes JSONB DEFAULT '[]',
  activities JSONB DEFAULT '[]',
  critical_systems JSONB DEFAULT '[]',
  data_objects JSONB DEFAULT '[]',
  owner TEXT,
  owner_department TEXT,
  business_criticality_score NUMERIC(3,2) CHECK (business_criticality_score BETWEEN 0 AND 1),
  discovery_method TEXT,
  discovery_date TIMESTAMPTZ DEFAULT NOW(),
  validated_by_business BOOLEAN DEFAULT false,
  validated_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for process_catalog
CREATE INDEX IF NOT EXISTS pc_org_idx ON process_catalog(organization_id);
CREATE INDEX IF NOT EXISTS pc_process_id_idx ON process_catalog(process_id);
CREATE INDEX IF NOT EXISTS pc_type_idx ON process_catalog(process_type);
CREATE INDEX IF NOT EXISTS pc_tier_idx ON process_catalog(tier);
CREATE INDEX IF NOT EXISTS pc_category_idx ON process_catalog(category);
CREATE INDEX IF NOT EXISTS pc_criticality_idx ON process_catalog(business_criticality_score);

-- ============================================================================
-- 8. Graph Visualization Exports Table
-- ============================================================================
-- Stores exported graph visualizations
CREATE TABLE IF NOT EXISTS graph_visualization_exports (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  graph_id TEXT REFERENCES business_process_graph(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'png', 'svg', 'json')),
  export_format TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  visualization_config JSONB DEFAULT '{}',
  exported_by TEXT,
  export_date TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for graph_visualization_exports
CREATE INDEX IF NOT EXISTS gve_org_idx ON graph_visualization_exports(organization_id);
CREATE INDEX IF NOT EXISTS gve_graph_idx ON graph_visualization_exports(graph_id);
CREATE INDEX IF NOT EXISTS gve_type_idx ON graph_visualization_exports(export_type);
CREATE INDEX IF NOT EXISTS gve_date_idx ON graph_visualization_exports(export_date);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_process_graph_updated_at BEFORE UPDATE ON business_process_graph
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_dependencies_updated_at BEFORE UPDATE ON process_dependencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_financial_values_updated_at BEFORE UPDATE ON process_financial_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_process_mappings_updated_at BEFORE UPDATE ON system_process_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_validation_workflow_updated_at BEFORE UPDATE ON process_validation_workflow
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_impact_analysis_updated_at BEFORE UPDATE ON process_impact_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_catalog_updated_at BEFORE UPDATE ON process_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Functions for Graph Queries
-- ============================================================================

-- Function to get downstream dependencies
CREATE OR REPLACE FUNCTION get_downstream_dependencies(
  p_organization_id TEXT,
  p_process_id TEXT,
  p_max_depth INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  visited TEXT[] := ARRAY[p_process_id];
  current_level TEXT[] := ARRAY[p_process_id];
  depth INTEGER := 0;
BEGIN
  WHILE depth < p_max_depth AND array_length(current_level, 1) > 0 LOOP
    -- Get all downstream dependencies
    SELECT DISTINCT target_process_id
    INTO current_level
    FROM process_dependencies
    WHERE organization_id = p_organization_id
      AND source_process_id = ANY(current_level)
      AND NOT target_process_id = ANY(visited);

    -- Add to visited and result
    IF array_length(current_level, 1) > 0 THEN
      visited := array_cat(visited, current_level);
      result := result || to_jsonb(current_level);
    END IF;

    depth := depth + 1;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get upstream dependencies
CREATE OR REPLACE FUNCTION get_upstream_dependencies(
  p_organization_id TEXT,
  p_process_id TEXT,
  p_max_depth INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  visited TEXT[] := ARRAY[p_process_id];
  current_level TEXT[] := ARRAY[p_process_id];
  depth INTEGER := 0;
BEGIN
  WHILE depth < p_max_depth AND array_length(current_level, 1) > 0 LOOP
    -- Get all upstream dependencies
    SELECT DISTINCT source_process_id
    INTO current_level
    FROM process_dependencies
    WHERE organization_id = p_organization_id
      AND target_process_id = ANY(current_level)
      AND NOT source_process_id = ANY(visited);

    -- Add to visited and result
    IF array_length(current_level, 1) > 0 THEN
      visited := array_cat(visited, current_level);
      result := result || to_jsonb(current_level);
    END IF;

    depth := depth + 1;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate process criticality score
CREATE OR REPLACE FUNCTION calculate_process_criticality(
  p_organization_id TEXT,
  p_process_id TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  financial_value NUMERIC;
  dependency_count INTEGER;
  upstream_count INTEGER;
  downstream_count INTEGER;
  criticality_score NUMERIC;
BEGIN
  -- Get financial value
  SELECT COALESCE(annual_premium_revenue, 0) +
         COALESCE(revenue_at_risk, 0) +
         COALESCE(downtime_cost_per_day, 0)
  INTO financial_value
  FROM process_financial_values
  WHERE organization_id = p_organization_id
    AND process_id = p_process_id;

  -- Count dependencies
  SELECT COUNT(*)
  INTO dependency_count
  FROM process_dependencies
  WHERE organization_id = p_organization_id
    AND (source_process_id = p_process_id OR target_process_id = p_process_id);

  -- Count upstream
  SELECT COUNT(DISTINCT source_process_id)
  INTO upstream_count
  FROM process_dependencies
  WHERE organization_id = p_organization_id
    AND target_process_id = p_process_id;

  -- Count downstream
  SELECT COUNT(DISTINCT target_process_id)
  INTO downstream_count
  FROM process_dependencies
  WHERE organization_id = p_organization_id
    AND source_process_id = p_process_id;

  -- Calculate criticality score (0-1)
  criticality := (
    (LEAST(financial_value / 10000000.0, 1.0) * 0.4) +  -- 40% financial
    (LEAST(dependency_count::NUMERIC / 20.0, 1.0) * 0.3) +  -- 30% dependencies
    (LEAST(downstream_count::NUMERIC / 10.0, 1.0) * 0.2) +  -- 20% downstream impact
    (LEAST(upstream_count::NUMERIC / 10.0, 1.0) * 0.1)  -- 10% upstream risk
  );

  RETURN criticality_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE business_process_graph IS 'Stores complete business process graph structure with nodes and edges';
COMMENT ON TABLE process_dependencies IS 'Stores upstream/downstream dependencies between processes';
COMMENT ON TABLE process_financial_values IS 'Stores financial values per process for impact calculation';
COMMENT ON TABLE system_process_mappings IS 'Maps IT systems to business processes';
COMMENT ON TABLE process_validation_workflow IS 'Tracks customer validation workflow status';
COMMENT ON TABLE process_impact_analysis IS 'Stores blast radius and impact analysis results';
COMMENT ON TABLE process_catalog IS 'Catalog of discovered business processes';
COMMENT ON TABLE graph_visualization_exports IS 'Stores exported graph visualizations';
