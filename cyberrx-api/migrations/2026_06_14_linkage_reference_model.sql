-- Linkage & multi-tenant reference model (Phase 1)
-- Chain: BusinessFunction -> Process -> Application -> Asset -> Risk -> Control
-- Shared canonical reference tables carry NO organization_id.
-- Idempotent; mirrors the additions in src/utils/db.js.

-- Canonical, versioned, plan-agnostic capability taxonomy (SHARED).
CREATE TABLE IF NOT EXISTS capability_library_version (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  version      TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS capability (
  id            TEXT PRIMARY KEY,
  version_id    TEXT NOT NULL REFERENCES capability_library_version(id),
  parent_id     TEXT,
  content_tier  TEXT NOT NULL,
  kind          TEXT NOT NULL,
  name          TEXT NOT NULL,
  default_tier  INTEGER,
  default_rto   TEXT
);
CREATE INDEX IF NOT EXISTS capability_version ON capability(version_id);
CREATE TABLE IF NOT EXISTS capability_pack (
  id          TEXT PRIMARY KEY,
  version_id  TEXT NOT NULL REFERENCES capability_library_version(id),
  label       TEXT
);
CREATE TABLE IF NOT EXISTS capability_pack_item (
  pack_id       TEXT NOT NULL REFERENCES capability_pack(id),
  capability_id TEXT NOT NULL REFERENCES capability(id),
  PRIMARY KEY (pack_id, capability_id)
);

-- Tenant business model.
CREATE TABLE IF NOT EXISTS business_functions (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  capability_id   TEXT,
  owner           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS business_functions_org ON business_functions(organization_id);

CREATE TABLE IF NOT EXISTS applications (
  id                 TEXT PRIMARY KEY,
  organization_id    TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  owner              TEXT,
  criticality        TEXT,
  tier               INTEGER,
  rto                TEXT,
  external_ref       TEXT,
  vendor_dependency_id TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS applications_org ON applications(organization_id);

CREATE TABLE IF NOT EXISTS criticality_profile (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  tier            INTEGER,
  rto             TEXT,
  derivation      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS process_capability_map (
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  process_id      TEXT NOT NULL,
  capability_id   TEXT NOT NULL,
  confidence      NUMERIC,
  source          TEXT,
  confirmed       BOOLEAN DEFAULT false,
  confirmed_by    TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, process_id, capability_id)
);
CREATE TABLE IF NOT EXISTS app_process_map (
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  application_id  TEXT NOT NULL,
  process_id      TEXT NOT NULL,
  confidence      NUMERIC,
  source          TEXT,
  confirmed       BOOLEAN DEFAULT false,
  confirmed_by    TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, application_id, process_id)
);

CREATE TABLE IF NOT EXISTS third_party_dependency (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  kind            TEXT,
  catalog_ref     TEXT,
  supports_processes JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS third_party_dependency_org ON third_party_dependency(organization_id);

CREATE TABLE IF NOT EXISTS connector (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  provider        TEXT NOT NULL,
  config          JSONB DEFAULT '{}',
  status          TEXT DEFAULT 'configured',
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS connector_org ON connector(organization_id);

CREATE TABLE IF NOT EXISTS ingestion_source (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source_kind     TEXT NOT NULL,
  origin          TEXT NOT NULL,
  connector_id    TEXT,
  label           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ingestion_source_org ON ingestion_source(organization_id);
CREATE TABLE IF NOT EXISTS ingestion_mapping (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source_id       TEXT NOT NULL REFERENCES ingestion_source(id) ON DELETE CASCADE,
  mapping         JSONB NOT NULL DEFAULT '{}',
  confirmed       BOOLEAN DEFAULT false,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source_id)
);
CREATE TABLE IF NOT EXISTS ingestion_exception (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source_id       TEXT NOT NULL REFERENCES ingestion_source(id) ON DELETE CASCADE,
  raw_row         JSONB,
  reason          TEXT,
  status          TEXT DEFAULT 'open',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ingestion_exception_src ON ingestion_exception(source_id);

CREATE TABLE IF NOT EXISTS assessment_result (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  framework_id    TEXT NOT NULL,
  requirement_id  TEXT NOT NULL,
  status          TEXT,
  score           NUMERIC,
  confidence      TEXT,
  gap             TEXT,
  recommendation  TEXT,
  review_status   TEXT DEFAULT 'pending',
  evidence_refs   JSONB DEFAULT '[]',
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, framework_id, requirement_id)
);
CREATE INDEX IF NOT EXISTS assessment_result_org ON assessment_result(organization_id, framework_id);

-- Additive columns on existing tables.
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS business_function_id TEXT;
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS rto TEXT;
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS capability_id TEXT;
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS criticality_profile_id TEXT;
ALTER TABLE framework_requirements ADD COLUMN IF NOT EXISTS assessment_type TEXT;
