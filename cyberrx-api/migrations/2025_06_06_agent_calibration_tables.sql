-- Migration: Agent Calibration & Executive Onboarding Tables
-- Task: T-PILOT-004
-- Date: 2025-06-06
-- Description: Create tables for agent activation, threshold calibration, context configuration,
--              executive onboarding, first briefing, and feedback collection

-- Agent Configurations Table
CREATE TABLE IF NOT EXISTS agent_configurations (
    id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    config JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, organization_id)
);

CREATE INDEX idx_agent_config_agent ON agent_configurations(agent_id);
CREATE INDEX idx_agent_config_org ON agent_configurations(organization_id);

-- Agent Contexts Table
CREATE TABLE IF NOT EXISTS agent_contexts (
    id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    context_data JSONB NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, organization_id)
);

CREATE INDEX idx_agent_context_agent ON agent_contexts(agent_id);
CREATE INDEX idx_agent_context_org ON agent_contexts(organization_id);

-- Alert Thresholds Table
CREATE TABLE IF NOT EXISTS alert_thresholds (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    thresholds JSONB NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

-- Calibration History Table
CREATE TABLE IF NOT EXISTS calibration_history (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    calibration_results JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calibration_history_org ON calibration_history(organization_id);
CREATE INDEX idx_calibration_history_date ON calibration_history(created_at);

-- Calibration Reviews Table
CREATE TABLE IF NOT EXISTS calibration_reviews (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    review_data JSONB NOT NULL,
    requested_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    feedback_data JSONB,
    approved BOOLEAN,
    reviewed_at TIMESTAMP,
    reviewer_id VARCHAR(50) REFERENCES users(id)
);

CREATE INDEX idx_calibration_reviews_org ON calibration_reviews(organization_id);
CREATE INDEX idx_calibration_reviews_status ON calibration_reviews(status);

-- Context Configurations Table
CREATE TABLE IF NOT EXISTS context_configurations (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    configuration_results JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_context_config_org ON context_configurations(organization_id);

-- Executive Onboarding Table
CREATE TABLE IF NOT EXISTS executive_onboarding (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    onboarding_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exec_onboarding_org ON executive_onboarding(organization_id);

-- Onboarding Checklists Table
CREATE TABLE IF NOT EXISTS onboarding_checklists (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    checklist_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX idx_onboarding_checklist_user ON onboarding_checklists(user_id);

-- Training Sessions Table
CREATE TABLE IF NOT EXISTS training_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    session_data JSONB NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    completed_at TIMESTAMP
);

CREATE INDEX idx_training_sessions_user ON training_sessions(user_id);
CREATE INDEX idx_training_sessions_status ON training_sessions(status);
CREATE INDEX idx_training_sessions_scheduled ON training_sessions(scheduled_for);

-- First Briefings Table
CREATE TABLE IF NOT EXISTS first_briefings (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    briefing_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_first_briefings_org ON first_briefings(organization_id);

-- Briefing Feedback Table
CREATE TABLE IF NOT EXISTS briefing_feedback (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    executive_id VARCHAR(50) NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    suggestions JSONB,
    action_items JSONB,
    captured_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_briefing_feedback_org ON briefing_feedback(organization_id);
CREATE INDEX idx_briefing_feedback_executive ON briefing_feedback(executive_id);

-- Agent Output Validation Table
CREATE TABLE IF NOT EXISTS agent_output_validation (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id),
    agent_id VARCHAR(50) NOT NULL,
    briefing_id VARCHAR(50) NOT NULL,
    validation_results JSONB NOT NULL,
    validated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    validator_id VARCHAR(50) REFERENCES users(id)
);

CREATE INDEX idx_agent_output_validation_org ON agent_output_validation(organization_id);
CREATE INDEX idx_agent_output_validation_agent ON agent_output_validation(agent_id);

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_agent_configurations_updated_at BEFORE UPDATE ON agent_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_contexts_updated_at BEFORE UPDATE ON agent_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_thresholds_updated_at BEFORE UPDATE ON alert_thresholds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration completed successfully
