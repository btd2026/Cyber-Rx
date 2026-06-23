-- Migration: security_audit_logs — durable trail for tenant-isolation / auth events
-- Created: Security hardening stream (slice: real audit_logs)
-- Description: Persists the security events that the tenant-isolation scaffolding
--   currently only writes to stdout (org_scope_violation, unauth_nondemo_org_access,
--   org_access_blocked, ...). Kept separate from the credential-scoped audit_logs
--   table so neither schema constrains the other.
--
-- NOTE: deliberately NO foreign key to orgs(id). These rows record spoofed and
--   unknown organization ids by design; an FK would reject (and thus erase) the
--   exact evidence a security investigation needs.

CREATE TABLE IF NOT EXISTS security_audit_logs (
  id               BIGSERIAL PRIMARY KEY,
  event_type       TEXT NOT NULL,
  severity         TEXT NOT NULL DEFAULT 'warning',  -- info | warning | critical
  user_id          TEXT,
  token_org_id     TEXT,
  requested_org_id TEXT,
  path             TEXT,
  ip_address       TEXT,
  user_agent       TEXT,
  enforced         BOOLEAN DEFAULT false,
  details          JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS security_audit_event ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS security_audit_created ON security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_requested_org ON security_audit_logs(requested_org_id, created_at DESC);

COMMENT ON TABLE security_audit_logs IS 'Durable audit trail for tenant-isolation and authentication security events';
COMMENT ON COLUMN security_audit_logs.enforced IS 'Whether the request was actually blocked (STRICT_TENANT_ISOLATION on) vs observed-only';
COMMENT ON COLUMN security_audit_logs.requested_org_id IS 'Organization the caller attempted to reach — may be spoofed/unknown (no FK by design)';
