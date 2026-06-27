-- Scan-quota ledger (hard cost ceiling — spec §3b).
-- Mirrors the idempotent definitions in src/utils/db.js init(); kept here as the
-- documented migration. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS scan_quota_reservation (
  id           TEXT PRIMARY KEY,
  scope_type   TEXT NOT NULL,                 -- org | user | account
  scope_id     TEXT NOT NULL,
  period_key   TEXT NOT NULL,                 -- 'YYYY-MM' (calendar_month) or 'rolling' (rolling_30d)
  status       TEXT NOT NULL CHECK (status IN ('reserved','consumed','refunded')),
  scan_id      TEXT,
  document_id  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS scan_quota_reservation_window
  ON scan_quota_reservation(scope_type, scope_id, period_key, status);
CREATE INDEX IF NOT EXISTS scan_quota_reservation_recent
  ON scan_quota_reservation(scope_type, scope_id, created_at);

CREATE TABLE IF NOT EXISTS scan_quota_grant (
  id           TEXT PRIMARY KEY,
  scope_type   TEXT NOT NULL,
  scope_id     TEXT NOT NULL,
  period_key   TEXT NOT NULL,
  extra        INT  NOT NULL,
  actor        TEXT,
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS scan_quota_grant_window
  ON scan_quota_grant(scope_type, scope_id, period_key);

CREATE TABLE IF NOT EXISTS scan_quota_audit (
  id             TEXT PRIMARY KEY,
  scope_type     TEXT,
  scope_id       TEXT,
  period_key     TEXT,
  action         TEXT NOT NULL,               -- reserve|consume|refund|reject|admin_grant|admin_reset
  reservation_id TEXT,
  actor          TEXT,
  reason         TEXT,
  detail         JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS scan_quota_audit_scope
  ON scan_quota_audit(scope_type, scope_id, created_at);
