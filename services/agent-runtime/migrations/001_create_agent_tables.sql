-- Migration 001: Create Agent Runtime Tables
-- Creates tables for agent states, briefings, and metrics
--
-- This migration creates the database schema for the Agent Runtime service.
-- It includes:
-- 1. agent_states - Persistent agent configuration and state
-- 2. agent_briefings - Generated briefings with metadata
-- 3. agent_metrics - Usage metrics tracking
--
-- Author: T-MVP-007 Agent Runtime Foundation
-- Date: 2025-01-31

-- =====================================================
-- Table: agent_states
-- Purpose: Store persistent agent configuration and state
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_states (
    -- Primary Key
    agent_id VARCHAR(50) PRIMARY KEY,

    -- Agent Metadata
    agent_type VARCHAR(50) NOT NULL,  -- 'cfo', 'ciso', 'board'
    status VARCHAR(20) NOT NULL,      -- 'running', 'stopped', 'error'

    -- Configuration (JSONB for flexibility)
    config JSONB NOT NULL,

    -- Agent State (JSONB for flexible state storage)
    state JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Briefing Tracking
    last_briefing_id UUID,

    -- Metrics
    briefings_generated INTEGER NOT NULL DEFAULT 0,
    total_tokens_used BIGINT NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,

    -- Constraints
    CONSTRAINT check_agent_type CHECK (agent_type IN ('cfo', 'ciso', 'board')),
    CONSTRAINT check_status CHECK (status IN ('running', 'stopped', 'error')),
    CONSTRAINT check_briefings_generated CHECK (briefings_generated >= 0),
    CONSTRAINT check_total_tokens_used CHECK (total_tokens_used >= 0),
    CONSTRAINT check_total_cost CHECK (total_cost >= 0)
);

-- Create indexes for agent_states
CREATE INDEX IF NOT EXISTS idx_agent_states_type ON agent_states(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_states_status ON agent_states(status);
CREATE INDEX IF NOT EXISTS idx_agent_states_created_at ON agent_states(created_at);

-- Add comment
COMMENT ON TABLE agent_states IS 'Persistent agent configuration and state for AI agents';
COMMENT ON COLUMN agent_states.config IS 'Agent configuration (temperature, max_tokens, etc.)';
COMMENT ON COLUMN agent_states.state IS 'Current agent state (memory, context, etc.)';
COMMENT ON COLUMN agent_states.last_briefing_id IS 'ID of the most recent briefing';
COMMENT ON COLUMN agent_states.briefings_generated IS 'Total number of briefings generated';
COMMENT ON COLUMN agent_states.total_tokens_used IS 'Total tokens used across all briefings';
COMMENT ON COLUMN agent_states.total_cost IS 'Total cost in USD across all briefings';

-- =====================================================
-- Table: agent_briefings
-- Purpose: Store generated briefings with metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_briefings (
    -- Primary Key
    briefing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Agent Reference
    agent_id VARCHAR(50) NOT NULL REFERENCES agent_states(agent_id) ON DELETE CASCADE,

    -- Query and Context
    query TEXT NOT NULL,
    context JSONB NOT NULL,

    -- Generated Briefing
    briefing JSONB NOT NULL,

    -- Timestamps
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Token Usage and Cost
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    token_cost DECIMAL(10, 4) NOT NULL,

    -- Constraints
    CONSTRAINT check_input_tokens CHECK (input_tokens >= 0),
    CONSTRAINT check_output_tokens CHECK (output_tokens >= 0),
    CONSTRAINT check_token_cost CHECK (token_cost >= 0)
);

-- Create indexes for agent_briefings
CREATE INDEX IF NOT EXISTS idx_agent_briefings_agent_id ON agent_briefings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_briefings_generated_at ON agent_briefings(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_briefings_agent_id_generated_at
    ON agent_briefings(agent_id, generated_at DESC);

-- Add comment
COMMENT ON TABLE agent_briefings IS 'Generated briefings with full context and metadata';
COMMENT ON COLUMN agent_briefings.context IS 'Complete context used for briefing generation';
COMMENT ON COLUMN agent_briefings.briefing IS 'Generated briefing content (structured JSON)';
COMMENT ON COLUMN agent_briefings.input_tokens IS 'Input tokens used for LLM call';
COMMENT ON COLUMN agent_briefings.output_tokens IS 'Output tokens from LLM response';
COMMENT ON COLUMN agent_briefings.token_cost IS 'Cost in USD for this briefing';

-- =====================================================
-- Table: agent_metrics
-- Purpose: Track agent usage metrics (daily aggregation)
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_metrics (
    -- Composite Primary Key
    agent_id VARCHAR(50) NOT NULL REFERENCES agent_states(agent_id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,

    -- Metrics
    briefings_generated INTEGER NOT NULL DEFAULT 0,
    total_tokens_used BIGINT NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,

    -- Timestamp
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Primary Key Constraint
    PRIMARY KEY (agent_id, metric_date),

    -- Constraints
    CONSTRAINT check_metrics_briefings_generated CHECK (briefings_generated >= 0),
    CONSTRAINT check_metrics_total_tokens_used CHECK (total_tokens_used >= 0),
    CONSTRAINT check_metrics_total_cost CHECK (total_cost >= 0)
);

-- Create indexes for agent_metrics
CREATE INDEX IF NOT EXISTS idx_agent_metrics_date ON agent_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_id_date
    ON agent_metrics(agent_id, metric_date DESC);

-- Add comment
COMMENT ON TABLE agent_metrics IS 'Daily usage metrics for agents (aggregated counters)';
COMMENT ON COLUMN agent_metrics.metric_date IS 'Date for metrics aggregation';
COMMENT ON COLUMN agent_metrics.briefings_generated IS 'Number of briefings generated on this date';
COMMENT ON COLUMN agent_metrics.total_tokens_used IS 'Total tokens used on this date';
COMMENT ON COLUMN agent_metrics.total_cost IS 'Total cost in USD on this date';

-- =====================================================
-- Grant Permissions (if needed for your setup)
-- =====================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON agent_states TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON agent_briefings TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON agent_metrics TO your_app_user;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Run validation queries to verify:
-- 1. Tables created: \dt agent_*
-- 2. Indexes created: \di idx_agent_*
-- 3. Constraints valid: SELECT * FROM agent_states LIMIT 1;
