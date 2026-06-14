-- Cross-tenant benchmarking (Phase 7 scaffold; flag-gated, consent-bounded).
-- Idempotent; mirrors the additions in src/utils/db.js.

CREATE TABLE IF NOT EXISTS benchmark_consent (
  org_id     TEXT PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  consented  BOOLEAN DEFAULT false,
  scope      TEXT DEFAULT 'capabilities',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared dependency assessed once, surfaced to dependents. No organization_id.
CREATE TABLE IF NOT EXISTS shared_dependency_assessment (
  id          TEXT PRIMARY KEY,
  catalog_ref TEXT NOT NULL,
  name        TEXT,
  score       NUMERIC,
  summary     TEXT,
  assessed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shared_dependency_assessment_ref ON shared_dependency_assessment(catalog_ref);
