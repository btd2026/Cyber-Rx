-- Grounded assessment engine tables (Stages 5–8). Mirror the idempotent
-- definitions in src/utils/db.js init(); safe to run repeatedly.

-- §4 scan record (Stage 5): status + token usage / est cost by stage.
CREATE TABLE IF NOT EXISTS scan_record (
  scan_id               TEXT PRIMARY KEY,
  scope_type            TEXT,
  scope_id              TEXT,
  document_id           TEXT,
  document_version_hash TEXT,
  framework_versions    JSONB DEFAULT '{}',
  quota_period_key      TEXT,
  status                TEXT,
  token_usage           JSONB DEFAULT '{}',
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS scan_record_scope ON scan_record(scope_type, scope_id, created_at);
CREATE INDEX IF NOT EXISTS scan_record_doc ON scan_record(document_id);

-- Analyst review queue + audit (Stage 7/8).
CREATE TABLE IF NOT EXISTS analyst_queue (
  id TEXT PRIMARY KEY, org_id TEXT NOT NULL, scan_id TEXT, item_type TEXT NOT NULL,
  framework TEXT, control_id TEXT, status TEXT NOT NULL DEFAULT 'open',
  payload JSONB DEFAULT '{}', reason TEXT, resolver TEXT, resolution JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(), resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS analyst_queue_org ON analyst_queue(org_id, status);
CREATE INDEX IF NOT EXISTS analyst_queue_scan ON analyst_queue(scan_id);
CREATE TABLE IF NOT EXISTS analyst_queue_audit (
  id TEXT PRIMARY KEY, queue_id TEXT NOT NULL, org_id TEXT, action TEXT NOT NULL,
  actor TEXT, reason TEXT, detail JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analyst_queue_audit_q ON analyst_queue_audit(queue_id);

-- Persisted grounded per-control verdicts (Stage 8).
CREATE TABLE IF NOT EXISTS grounded_assessment (
  id TEXT PRIMARY KEY, org_id TEXT NOT NULL, scan_id TEXT, upload_id TEXT,
  framework TEXT NOT NULL, control_id TEXT NOT NULL, status TEXT, control_nature TEXT,
  confidence NUMERIC, evidence JSONB DEFAULT '[]', gap_description TEXT, remediation_suggestion TEXT,
  operating_effectiveness_note TEXT, operating_effectiveness_evidence_type TEXT,
  assessment_method TEXT, propagated_from TEXT, needs_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS grounded_assessment_scan ON grounded_assessment(scan_id);
CREATE INDEX IF NOT EXISTS grounded_assessment_upload ON grounded_assessment(org_id, upload_id, framework);
