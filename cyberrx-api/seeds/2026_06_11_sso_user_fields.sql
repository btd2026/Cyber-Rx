-- SSO User Fields Migration
-- Migration Date: 2026-06-11
-- Description: Add SSO and MFA fields to users table for enterprise authentication

-- Add SSO provider field (okta, azure-ad, local)
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(20) DEFAULT 'local';

-- Add SSO unique identifier field (from IdP)
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_id VARCHAR(255) UNIQUE;

-- Add MFA enabled flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;

-- Add MFA secret field (encrypted TOTP secret)
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255);

-- Add index for SSO ID lookups
CREATE INDEX IF NOT EXISTS idx_users_sso_id ON users(sso_id);

-- Add index for SSO provider lookups
CREATE INDEX IF NOT EXISTS idx_users_sso_provider ON users(sso_provider);

-- Add check constraint for valid SSO providers
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_sso_provider;
ALTER TABLE users ADD CONSTRAINT check_sso_provider
  CHECK (sso_provider IN ('local', 'okta', 'azure-ad'));

-- Verification Query:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name IN ('sso_provider', 'sso_id', 'mfa_enabled', 'mfa_secret')
-- ORDER BY column_name;
