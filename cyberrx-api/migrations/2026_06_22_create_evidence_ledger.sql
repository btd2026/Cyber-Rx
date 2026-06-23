-- Onboarding Redesign — Step 3: Unified Evidence Ledger + structured extraction
-- Additive only. Mirrors the tables created in src/utils/db.js init().
-- See docs/plans/onboarding-redesign-blueprint.md (§3.3, §3.4, §3.5 step M4).

CREATE TABLE IF NOT EXISTS control_evidence_ledger (
  id                 TEXT PRIMARY KEY,
  organization_id    TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  library_control_id TEXT NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  evidence_kind      TEXT NOT NULL,
  dimension          TEXT NOT NULL DEFAULT 'system',
  source_ref         TEXT NOT NULL,
  status             TEXT,
  confidence         NUMERIC,
  excerpt            TEXT,
  freshness_date     DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, library_control_id, source_ref)
);
CREATE INDEX IF NOT EXISTS evidence_ledger_org_ctl ON control_evidence_ledger(organization_id, library_control_id);
CREATE INDEX IF NOT EXISTS evidence_ledger_org_status ON control_evidence_ledger(organization_id, status);

CREATE TABLE IF NOT EXISTS document_extraction (
  id                 TEXT PRIMARY KEY,
  organization_id    TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  document_upload_id TEXT NOT NULL REFERENCES document_upload(id) ON DELETE CASCADE,
  extracted          JSONB NOT NULL,
  confidence         NUMERIC,
  engine             TEXT,
  model              TEXT,
  extracted_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS document_extraction_upload ON document_extraction(document_upload_id);
