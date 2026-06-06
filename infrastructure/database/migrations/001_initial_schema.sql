-- ============================================================================
-- CyberRX Platform - Initial Database Schema
-- ============================================================================
-- Version: 1.0.0
-- Description: Create initial database schema for CyberRX Multi-Agent Platform
-- Author: Senior Backend Engineer (Data Modeling Specialist)
-- Date: 2025-06-06
-- Task: T-FOUND-003 - Core Data Models & Schema Design
-- ============================================================================

-- ============================================================================
-- EXTENSION SETUP
-- ============================================================================
-- Enable TimescaleDB for time-series optimization
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable pgvector for vector similarity search
CREATE EXTENSION IF NOT EXISTS pgvector;

-- ============================================================================
-- RISK OBJECTS TABLE
-- ============================================================================
-- Core table for risk objects - the canonical representation of risk
-- TimescaleDB hypertable for time-series optimization
CREATE TABLE risk_objects (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(255) NOT NULL,
    source_event_id VARCHAR(255) NOT NULL,

    -- Classification
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,

    -- What's affected
    affected_assets TEXT[] NOT NULL,
    business_process_map TEXT[] NOT NULL,

    -- Risk assessment
    likelihood_score DECIMAL(3,2) NOT NULL,
    blast_radius TEXT[] NOT NULL,

    -- Complex data (JSONB for flexibility)
    financial_exposure JSONB NOT NULL,
    regulatory_triggers JSONB NOT NULL,
    threshold_breaches JSONB NOT NULL,

    -- Resolution
    remediation_owner VARCHAR(255) NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confidence DECIMAL(3,2) NOT NULL,

    -- Audit trail
    methodology_trail JSONB NOT NULL,
    normalization_notes TEXT,

    -- Tenant isolation
    customer_id VARCHAR(255) NOT NULL,

    -- Constraints
    CONSTRAINT valid_category CHECK (category IN ('threat', 'vulnerability', 'compliance', 'vendor', 'operational')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'remediated', 'accepted', 'escalated')),
    CONSTRAINT valid_likelihood_score CHECK (likelihood_score >= 0 AND likelihood_score <= 1),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Create unique constraint on source + source_event_id to prevent duplicates
CREATE UNIQUE INDEX idx_risk_objects_source_event ON risk_objects(source, source_event_id);

-- Convert to hypertable for time-series optimization (partition by created_at)
SELECT create_hypertable('risk_objects', 'created_at', if_not_exists => TRUE);

-- Create indexes for query performance
CREATE INDEX idx_risk_objects_customer_id ON risk_objects(customer_id);
CREATE INDEX idx_risk_objects_category ON risk_objects(category);
CREATE INDEX idx_risk_objects_status ON risk_objects(status);
CREATE INDEX idx_risk_objects_business_process_map ON risk_objects USING GIN(business_process_map);
CREATE INDEX idx_risk_objects_created_at ON risk_objects(created_at DESC);
CREATE INDEX idx_risk_objects_likelihood_score ON risk_objects(likelihood_score);

-- Add comments for documentation
COMMENT ON TABLE risk_objects IS 'Core risk objects - canonical representation of risk flowing through the CyberRX system';
COMMENT ON COLUMN risk_objects.financial_exposure IS 'Financial impact calculation (CFO board-meeting defensible)';
COMMENT ON COLUMN risk_objects.methodology_trail IS 'Complete audit trail for CFO defensibility';
COMMENT ON COLUMN risk_objects.business_process_map IS 'Links to BusinessProcessGraph for impact analysis';

-- ============================================================================
-- AGENT STATE TABLE
-- ============================================================================
-- Persistent state for AI agents
CREATE TABLE agent_state (
    -- Identity
    agent_id VARCHAR(255) PRIMARY KEY,
    agent_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,

    -- Current state
    current_risk_objects TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    risk_posture JSONB NOT NULL,
    threshold_history JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Financial context
    financial_context JSONB NOT NULL,

    -- Briefing history
    briefing_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_briefing JSONB,

    -- Calibration
    thresholds JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_agent_type CHECK (agent_type IN ('cfo', 'cro', 'clo', 'cio', 'ciso', 'board'))
);

-- Create indexes
CREATE INDEX idx_agent_state_customer_id ON agent_state(customer_id);
CREATE INDEX idx_agent_state_agent_type ON agent_state(agent_type);
CREATE INDEX idx_agent_state_updated_at ON agent_state(updated_at DESC);

-- Add comments
COMMENT ON TABLE agent_state IS 'Persistent state for AI agents across briefings';
COMMENT ON COLUMN agent_state.risk_posture IS 'Current risk posture with trend analysis';
COMMENT ON COLUMN agent_state.financial_context IS 'Financial context (MLR, stop-loss, reserves, premium)';

-- ============================================================================
-- BUSINESS PROCESS GRAPH TABLE
-- ============================================================================
-- Customer-specific business process mapping
CREATE TABLE business_process_graph (
    -- Identity
    customer_id VARCHAR(255) NOT NULL,
    graph_id VARCHAR(255) NOT NULL,
    graph_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',

    -- Graph structure
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    metadata JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Primary key
    PRIMARY KEY (customer_id, graph_id)
);

-- Create indexes
CREATE INDEX idx_business_process_graph_version ON business_process_graph(graph_version);
CREATE INDEX idx_business_process_graph_updated_at ON business_process_graph(updated_at DESC);

-- Add comments
COMMENT ON TABLE business_process_graph IS 'Customer-specific business process mapping for impact analysis';
COMMENT ON COLUMN business_process_graph.nodes IS 'Process nodes (systems, processes, operations)';
COMMENT ON COLUMN business_process_graph.edges IS 'Process edges (dependencies, data flows, control)';

-- ============================================================================
-- EVENT LOG TABLE
-- ============================================================================
-- Event log for all raw events (TimescaleDB hypertable)
CREATE TABLE event_log (
    -- Identity
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(255) NOT NULL,
    source_event_id VARCHAR(255) NOT NULL,

    -- Event details
    event_type VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_data JSONB NOT NULL,

    -- Tenant isolation
    customer_id VARCHAR(255) NOT NULL,

    -- Processing status
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization (partition by timestamp)
SELECT create_hypertable('event_log', 'timestamp', if_not_exists => TRUE);

-- Create indexes
CREATE INDEX idx_event_log_customer_id ON event_log(customer_id);
CREATE INDEX idx_event_log_processed ON event_log(processed);
CREATE INDEX idx_event_log_timestamp ON event_log(timestamp DESC);
CREATE INDEX idx_event_log_source ON event_log(source);

-- Add comments
COMMENT ON TABLE event_log IS 'Raw event log from all connectors';
COMMENT ON COLUMN event_log.raw_data IS 'Raw event data from source system';

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_risk_objects_updated_at BEFORE UPDATE ON risk_objects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_state_updated_at BEFORE UPDATE ON agent_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_process_graph_updated_at BEFORE UPDATE ON business_process_graph
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- This migration creates the core database schema for CyberRX.
-- Next steps:
-- 1. Test migration on local database
-- 2. Verify TimescaleDB and pgvector extensions
-- 3. Test rollback procedure
-- ============================================================================
