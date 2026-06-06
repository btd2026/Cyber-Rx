-- ============================================================================
-- CyberRX Platform - Initial Schema Rollback
-- ============================================================================
-- Version: 1.0.0
-- Description: Rollback initial database schema for CyberRX
-- Author: Senior Backend Engineer (Data Modeling Specialist)
-- Date: 2025-06-06
-- Task: T-FOUND-003 - Core Data Models & Schema Design
--
-- WARNING: This script will DELETE ALL DATA in the rolled back tables.
-- Ensure you have a backup before running this script.
-- ============================================================================

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS update_risk_objects_updated_at ON risk_objects;
DROP TRIGGER IF EXISTS update_agent_state_updated_at ON agent_state;
DROP TRIGGER IF EXISTS update_business_process_graph_updated_at ON business_process_graph;

-- ============================================================================
-- DROP FUNCTION
-- ============================================================================
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- DROP TABLES (in reverse order of creation)
-- ============================================================================

-- Drop event_log (hypertable)
-- This automatically drops the associated chunk tables
DROP TABLE IF EXISTS event_log CASCADE;

-- Drop business_process_graph
DROP TABLE IF EXISTS business_process_graph CASCADE;

-- Drop agent_state
DROP TABLE IF EXISTS agent_state CASCADE;

-- Drop risk_objects (hypertable)
-- This automatically drops the associated chunk tables
DROP TABLE IF EXISTS risk_objects CASCADE;

-- ============================================================================
-- DROP EXTENSIONS (OPTIONAL)
-- ============================================================================
-- WARNING: Only drop extensions if they are not used by other tables
-- Uncomment the following lines if you want to remove the extensions

-- DROP EXTENSION IF EXISTS pgvector;
-- DROP EXTENSION IF EXISTS timescaledb;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
-- This migration rolls back the initial schema.
-- All data in the dropped tables has been permanently deleted.
-- ============================================================================
