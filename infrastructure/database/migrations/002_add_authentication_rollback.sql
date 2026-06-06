-- CyberRX Platform - Authentication Schema Rollback
-- Migration: 002_add_authentication_rollback
-- Description: Rollback authentication, authorization, and audit logging tables
-- Author: Security Engineer
-- Date: 2025-01-31

-- =====================================================
-- WARNING: This will delete all authentication data!
-- =====================================================

-- =====================================================
-- Drop Triggers
-- =====================================================

DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- =====================================================
-- Drop Row Level Security Policies
-- =====================================================

DROP POLICY IF EXISTS users_isolate_customers ON users;
DROP POLICY IF EXISTS sessions_isolate_customers ON sessions;
DROP POLICY IF EXISTS audit_log_isolate_customers ON audit_log;
DROP POLICY IF EXISTS users_admin_access ON users;

-- Disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- Drop Tables (in reverse order of creation)
-- =====================================================

-- Drop password reset tokens
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- Drop audit log (may be TimescaleDB hypertable)
DO $$
BEGIN
    -- Check if table is a hypertable
    SELECT remove_from_continuous_aggregate('audit_log');
    SELECT drop_chunks('audit_log', older_than => '0 seconds');
EXCEPTION
    WHEN OTHERS THEN
        -- Not a hypertable or doesn't exist
        RAISE NOTICE 'audit_log is not a hypertable or does not exist';
END $$;

DROP TABLE IF EXISTS audit_log CASCADE;

-- Drop sessions
DROP TABLE IF EXISTS sessions CASCADE;

-- Drop refresh tokens
DROP TABLE IF EXISTS refresh_tokens CASCADE;

-- Drop users
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- Drop Functions
-- =====================================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =====================================================
-- Rollback Verification
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('users', 'refresh_tokens', 'sessions', 'audit_log', 'password_reset_tokens');

    IF table_count > 0 THEN
        RAISE EXCEPTION 'Rollback verification failed: % tables still exist', table_count;
    END IF;

    RAISE NOTICE 'Migration 002_add_authentication rolled back successfully';
END $$;

-- =====================================================
-- End of Rollback
-- =====================================================
