-- Crown-Jewels analysis run cost ceiling (Stage 1, spec §3b). Mirrors the
-- idempotent definitions in src/utils/db.js init(); safe to run repeatedly.

CREATE TABLE IF NOT EXISTS analysis_run (
  id             TEXT PRIMARY KEY,
  scope_type     TEXT NOT NULL,            -- account|org|user
  scope_id       TEXT NOT NULL,
  mode           TEXT NOT NULL,            -- full|delta
  period_key     TEXT NOT NULL,            -- 'YYYY-MM' or 'rolling'
  status         TEXT NOT NULL,            -- reserved|running|completed|failed|refunded
  document_scope JSONB DEFAULT '{}',
  token_usage    JSONB DEFAULT '{}',
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analysis_run_window ON analysis_run(scope_type, scope_id, period_key, mode, status);
CREATE INDEX IF NOT EXISTS analysis_run_recent ON analysis_run(scope_type, scope_id, created_at);

CREATE TABLE IF NOT EXISTS analysis_run_grant (
  id TEXT PRIMARY KEY, scope_type TEXT NOT NULL, scope_id TEXT NOT NULL,
  period_key TEXT NOT NULL, extra INT NOT NULL, actor TEXT, reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analysis_run_grant_window ON analysis_run_grant(scope_type, scope_id, period_key);

CREATE TABLE IF NOT EXISTS analysis_run_audit (
  id TEXT PRIMARY KEY, scope_type TEXT, scope_id TEXT, period_key TEXT,
  action TEXT NOT NULL, run_id TEXT, actor TEXT, reason TEXT,
  detail JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analysis_run_audit_scope ON analysis_run_audit(scope_type, scope_id, created_at);
