-- Onboarding Redesign — Step 2: Unified Control Library
-- Additive only. Mirrors the tables created in src/utils/db.js init().
-- See docs/plans/onboarding-redesign-blueprint.md (§3.4, §5, §3.5 step M3).

-- Framework-agnostic master control list.
CREATE TABLE IF NOT EXISTS control_library (
  id             TEXT PRIMARY KEY,
  domain         TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  dimension      TEXT NOT NULL DEFAULT 'system',
  weight         INTEGER DEFAULT 1,
  default_method TEXT,
  meta           JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS control_library_domain ON control_library(domain);

-- One library control satisfies many framework requirements.
CREATE TABLE IF NOT EXISTS control_library_crosswalk (
  library_control_id TEXT NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  framework          TEXT NOT NULL,
  requirement_id     TEXT NOT NULL,
  coverage           TEXT DEFAULT 'full',
  provenance         TEXT DEFAULT 'curated',
  PRIMARY KEY (library_control_id, framework, requirement_id)
);
CREATE INDEX IF NOT EXISTS control_library_xwalk_fw ON control_library_crosswalk(framework, requirement_id);
