-- Control corpus for the grounded assessment engine (Stage 2, §4).
-- Built once from authoritative sources (800-53 OSCAL + 800-53A CPRT + CSF 2.0
-- library), version-pinned, reused for every scan. Mirrors the idempotent
-- definition in src/utils/db.js init(). Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS control_corpus (
  framework             TEXT NOT NULL,            -- 'NIST_SP_800-53' | 'NIST_CSF_2.0'
  framework_version     TEXT NOT NULL,
  control_id            TEXT NOT NULL,            -- 'AC-2' | 'PR.AA-01'
  title                 TEXT,
  requirement_text      TEXT,
  family                TEXT,
  control_nature        TEXT,                     -- automated_capable | non_automated_procedural | hybrid
  assessment_objectives JSONB DEFAULT '[]',       -- [{objective_id, determination_statement}]
  crosswalk             JSONB DEFAULT '{}',       -- {"NIST_CSF_2.0":[{control_id,mapping}]}
  is_spine              BOOLEAN DEFAULT false,
  source_provenance     TEXT,
  meta                  JSONB DEFAULT '{}',
  loaded_at             TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (framework, control_id)
);
CREATE INDEX IF NOT EXISTS control_corpus_fw ON control_corpus(framework);
CREATE INDEX IF NOT EXISTS control_corpus_nature ON control_corpus(control_nature);
