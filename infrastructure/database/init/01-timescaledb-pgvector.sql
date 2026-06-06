-- CyberRX Database Initialization
-- Enables TimescaleDB and pgvector extensions

\c cyberrx

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extensions
SELECT extname, extversion FROM pg_extension WHERE extname IN ('timescaledb', 'vector');

-- Create schema for risk objects
CREATE SCHEMA IF NOT EXISTS risk;

-- Create schema for events
CREATE SCHEMA IF NOT EXISTS events;

-- Create schema for agents
CREATE SCHEMA IF NOT EXISTS agents;

-- Create schema for normalization
CREATE SCHEMA IF NOT EXISTS normalization;

-- Grant permissions to cyberrx_user
GRANT ALL PRIVILEGES ON SCHEMA risk, events, agents, normalization TO cyberrx_user;
GRANT ALL PRIVILEGES ON DATABASE cyberrx TO cyberrx_user;

-- Create initial tables (placeholders for actual schemas)
CREATE TABLE IF NOT EXISTS events.raw (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(255),
    event_type VARCHAR(100),
    event_data JSONB,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('events.raw', 'received_at', if_not_exists => TRUE);

-- Create vector search table for semantic similarity
CREATE TABLE IF NOT EXISTS risk.embeddings (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON risk.embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Insert test data
INSERT INTO events.raw (source, event_type, event_data)
VALUES
    ('splunk', 'security_alert', '{"severity": "high", "source_ip": "192.168.1.1"}'),
    ('crowdstrike', 'detection', '{"alert_type": "malware", "confidence": 85}');

-- Print success message
DO $$
BEGIN
    RAISE NOTICE 'CyberRX database initialized successfully!';
    RAISE NOTICE 'TimescaleDB extension: ENABLED';
    RAISE NOTICE 'pgvector extension: ENABLED';
    RAISE NOTICE 'Schemas created: risk, events, agents, normalization';
END $$;
