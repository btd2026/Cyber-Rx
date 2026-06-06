-- Rollback Migration 001: Drop Agent Runtime Tables
--
-- This rollback drops all agent runtime tables and their dependencies.
-- WARNING: This will delete all agent states, briefings, and metrics.
--
-- Author: T-MVP-007 Agent Runtime Foundation
-- Date: 2025-01-31

-- =====================================================
-- Drop Tables (in correct order due to foreign keys)
-- =====================================================

-- Drop agent_metrics first (depends on agent_states)
DROP TABLE IF EXISTS agent_metrics CASCADE;

-- Drop agent_briefings (depends on agent_states)
DROP TABLE IF EXISTS agent_briefings CASCADE;

-- Drop agent_states last (no dependencies)
DROP TABLE IF EXISTS agent_states CASCADE;

-- =====================================================
-- Rollback Complete
-- =====================================================
-- Tables dropped: agent_metrics, agent_briefings, agent_states
-- All data deleted - ensure you have backups if needed
