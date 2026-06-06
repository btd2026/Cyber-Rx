-- CyberRX Platform - Authentication Schema Migration
-- Migration: 002_add_authentication
-- Description: Add authentication, authorization, and audit logging tables
-- Author: Security Engineer
-- Date: 2025-01-31

-- =====================================================
-- Users Table
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,

    -- Multi-Factor Authentication
    totp_secret VARCHAR(255) NOT NULL,
    backup_codes TEXT[] NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- Account Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('cfo', 'cro', 'clo', 'cio', 'ciso', 'board', 'admin')),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_username CHECK (length(username) >= 3 AND length(username) <= 100)
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Comments
COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (work factor 12)';
COMMENT ON COLUMN users.totp_secret IS 'TOTP secret for MFA (Base32-encoded)';
COMMENT ON COLUMN users.backup_codes IS 'Backup codes for MFA recovery (single-use)';
COMMENT ON COLUMN users.failed_login_attempts IS 'Failed login attempt counter';
COMMENT ON COLUMN users.locked_until IS 'Account lockout expiration timestamp';

-- =====================================================
-- Refresh Tokens Table
-- =====================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_token CHECK (revoked_at IS NULL OR expires_at > revoked_at)
);

-- Indexes for refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at) WHERE revoked_at IS NOT NULL;

-- Comments
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for token rotation';
COMMENT ON COLUMN refresh_tokens.token IS 'Hashed refresh token';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Token revocation timestamp';

-- =====================================================
-- Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token_hash VARCHAR(500) NOT NULL,
    refresh_token_id UUID NOT NULL REFERENCES refresh_tokens(id) ON DELETE CASCADE,
    customer_id VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,

    -- Constraints
    CONSTRAINT valid_session CHECK (logout_at IS NULL OR login_at < logout_at),
    CONSTRAINT valid_session_expiry CHECK (expires_at > login_at)
);

-- Indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_logout_at ON sessions(logout_at) WHERE logout_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_ip_address ON sessions(ip_address);

-- Comments
COMMENT ON TABLE sessions IS 'User sessions for audit and session management';
COMMENT ON COLUMN sessions.access_token_hash IS 'Hashed access token for audit';
COMMENT ON COLUMN sessions.ip_address IS 'Client IP address (IPv4 or IPv6)';
COMMENT ON COLUMN sessions.user_agent IS 'Client user agent string';

-- =====================================================
-- Audit Log Table (TimescaleDB Hypertable)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),
    customer_id VARCHAR(255),
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    details JSONB,

    -- Constraints
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'login_attempt', 'logout', 'api_request', 'data_access',
        'agent_action', 'permission_denied', 'admin_action',
        'token_refresh', 'mfa_verification', 'account_locked',
        'password_change', 'role_change'
    ))
);

-- Create TimescaleDB hypertable (if TimescaleDB extension is available)
DO $$
BEGIN
    -- Create TimescaleDB extension if not exists
    CREATE EXTENSION IF NOT EXISTS timescaledb;

    -- Convert to hypertable
    PERFORM create_hypertable('audit_log', 'timestamp', if_not_exists => TRUE);
EXCEPTION
    WHEN OTHERS THEN
        -- TimescaleDB not available, use regular table
        RAISE NOTICE 'TimescaleDB not available, using regular table for audit_log';
END $$;

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_customer_id ON audit_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_success ON audit_log(success);
CREATE INDEX IF NOT EXISTS idx_audit_log_role ON audit_log(role);
CREATE INDEX IF NOT EXISTS idx_audit_log_details ON audit_log USING GIN(details);

-- Partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_failed_logins ON audit_log(timestamp DESC)
    WHERE event_type = 'login_attempt' AND success = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_log_permissions_denied ON audit_log(timestamp DESC)
    WHERE event_type = 'permission_denied';

-- Comments
COMMENT ON TABLE audit_log IS 'Audit log for HIPAA compliance (7-year retention)';
COMMENT ON COLUMN audit_log.details IS 'Additional event details (JSONB)';
COMMENT ON COLUMN audit_log.ip_address IS 'Client IP address';
COMMENT ON COLUMN audit_log.user_agent IS 'Client user agent';

-- =====================================================
-- Password Reset Tokens Table
-- =====================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_reset_token CHECK (used_at IS NULL OR expires_at > used_at)
);

-- Indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Comments
COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens for self-service password reset';

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) for Multi-Tenancy
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY users_isolate_customers ON users
    FOR ALL
    USING (customer_id = current_setting('app.customer_id', true));

CREATE POLICY sessions_isolate_customers ON sessions
    FOR ALL
    USING (customer_id = current_setting('app.customer_id', true));

CREATE POLICY audit_log_isolate_customers ON audit_log
    FOR SELECT
    USING (customer_id = current_setting('app.customer_id', true));

-- Admins can see all data
CREATE POLICY users_admin_access ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_user_id()
            AND role = 'admin'
        )
    );

-- =====================================================
-- Initial Data (Optional)
-- =====================================================

-- Create default admin user (password: Admin123456789)
-- Password hash is generated with bcrypt work factor 12
INSERT INTO users (username, email, password_hash, full_name, role, customer_id, totp_secret, backup_codes, mfa_enabled, is_verified)
VALUES (
    'admin',
    'admin@cyberrx.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7TiYTTAM1e', -- Admin123456789
    'System Administrator',
    'admin',
    'system',
    'JBSWY3DPEHPK3PXP', -- Example TOTP secret
    ARRAY['ABCD1234', 'EFGH5678', 'IJKL9012', 'MNOP3456', 'QRST7890', 'UVWX2345', 'YZAB8901', 'CDEF3456', 'GHIJ6789', 'KLMN0123'],
    TRUE,
    TRUE
) ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- Migration Verification
-- =====================================================

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('users', 'refresh_tokens', 'sessions', 'audit_log', 'password_reset_tokens');

    IF table_count < 5 THEN
        RAISE EXCEPTION 'Migration verification failed: Only % tables created', table_count;
    END IF;

    RAISE NOTICE 'Migration 002_add_authentication completed successfully';
END $$;

-- =====================================================
-- Performance Optimization
-- =====================================================

-- Set statistics targets for better query planning
ALTER TABLE users ALTER COLUMN username SET STATISTICS 1000;
ALTER TABLE users ALTER COLUMN email SET STATISTICS 1000;
ALTER TABLE users ALTER COLUMN customer_id SET STATISTICS 1000;
ALTER TABLE audit_log ALTER COLUMN timestamp SET STATISTICS 1000;
ALTER TABLE audit_log ALTER COLUMN event_type SET STATISTICS 1000;
ALTER TABLE audit_log ALTER COLUMN customer_id SET STATISTICS 1000;

-- =====================================================
-- End of Migration
-- =====================================================
