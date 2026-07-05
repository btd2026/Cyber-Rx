# Month 1 Plan — Risk Correlation Engine

**Status:** DRAFT, docs-only. Do not start code until reviewed and the open questions in §11 are answered.
**Owner:** Senior staff engineer (per `PRODUCTION_PROMPT.md`)
**Source of truth:** `COVERAGE_ASSESSMENT.md` §5, §7, §9, and the "Final Recommendation" screenshot
**Companion:** `PRODUCTION_PROMPT.md`
**Date:** 2026-05-29
**Time horizon:** 4 weeks (Weeks 1–4 of Month 1). Month 2 finishes the correlation work; Month 1 lays the floor.

---

## 0. TL;DR

Month 1 stands up the data substrate and the first end-to-end vertical slice of the Risk Correlation Engine. It does **not** finish the engine — Month 2 does. By end of Week 4 we should be able to take a single hand-authored finding against the BCBS demo tenant and render the executive narrative screenshot from the assessment's Final Recommendation. Everything else — multi-finding correlation, CIO/CLO dashboards, exception workflow — comes later.

The work splits into four lanes that run in parallel from Week 2 onward:

1. **Schema** — six new tables + the join tables that wire `Risk` and `Finding` to them.
2. **Seed data** — the BCBS demo tenant's twelve crown-jewel processes (the assessment says "10" but enumerates 12 — see §3), their supporting assets/applications, a starter set of `DataObject`, `ThreatScenario`, `LegalObligation`, and `ExecutiveOwner` rows.
3. **Engine** — read-only `GET /api/risk-engine/correlate/:findingId` that returns the executive-narrative JSON shape.
4. **UI** — new route `/risk-narrative/:findingId` with a `RiskNarrative.jsx` component, extracted from `App.jsx` as the first slice of the App.jsx split.

Hard rules from `PRODUCTION_PROMPT.md` applied throughout: small PRs, conventional commits, migrations forward-only with `up`+`down`, docs ship in the same PR, demo data behind a `DEMO_MODE` flag, BCBS demo regression green at every commit, JWT enforcement is **not** in scope this month (it's the Month 4 cluster — see §11 open question on whether we short-cut a minimal auth shim now).

---

## 1. Current-state diagnosis

What's actually in the repo today, grounded in a code read (not the assessment's prose summary):

### 1.1 Backend (`cyberrx-api/`)

- Express 4.19, Node ≥20, single `src/index.js` mounting four routers: `/api/itsm`, `/api/tools`, `/api/credentials`, `/api/orgs`.
- CORS is permissive — `callback(null, true)` in the fall-through branch with the comment "For now, allow all - tighten in production". This is the CORS gap the assessment calls out. **Not fixed this month** — flagged for Month 4.
- JWT is **not** enforced. There is a `JWT_SECRET` env var in `.env.example` and a `users` table in `db.js`, but no `/api/auth/*` routes and no middleware. Endpoints read `req.headers['x-org-id']` and trust it. Same posture continues for Month 1.
- DB layer (`src/utils/db.js`) creates five tables inline in `init()` on boot: `orgs`, `users`, `metrics`, `route_actions`, `tool_connections`. There is **no migrations directory** and no migration runner. `init()` uses `CREATE TABLE IF NOT EXISTS` which is the closest thing to a migration today.
- `scheduler.js` exists but is not wired into `render.yaml` as a worker. The assessment flags this; out of scope this month.
- Vault (`src/utils/vault.js`) supports `local` (env vars) and `aws` (Secrets Manager). Local mode is what runs in `render.yaml` today.
- No tests. Zero test files anywhere in `cyberrx-api/`. No test runner in `package.json`. **This is the first thing we have to fix in PR-1** — we need a test harness before we can claim "tests gate every PR."

### 1.2 Frontend (`frontend/`)

- React 19 + Vite 8. Single `src/App.jsx`, **24,559 lines** (matches the assessment's "24,539" within rounding — the file has grown since).
- Routing is a switch on `page` state inside `NerionApp()` (line ~23987). Pages: `home`, `setup`, `hub`, `bizlines`, `appmap`, `dashboard` (CISO), `cro`, `cfo`, `boarddash`, `controls`, `assets`, `vendormap`, `scoring`, `evidence`, `board`, `bizmap`, `apiadapter`, `processflow`, `docdash`, `crown`, `execution`, `crownjewels`, `attackpaths`. 18 entries in `NAV` + a few unlisted ones.
- The four existing executive dashboards correspond to: `CISODash` (L7326), `CRODash` (L8408), `CFODash` (L9321), `BoardDash` (L9977). All four live in `App.jsx`.
- The BCBS template (L185–L202) already enumerates the twelve crown-jewel processes the assessment names. The IDs match what we want to use for seed data (`claims`, `enroll`, `provider_net`, `care_mgmt`, `fwa`, `member_svc`, `actuarial`, `govt_ma`, `govt_fep`, `govt_mcaid`, `pharmacy_pbm`, `compliance`, `identity`, `data_platform`). That's actually **fourteen leaves** if you count the three Government Programs sub-entries (MA, FEP, Medicaid) separately; thirteen if Identity and Data Platform are split; twelve if Government Programs collapses to one row. The "10 vs 12" reconciliation in §3 is even messier than the assessment indicates.
- `loadBCBSDemoPreset()` at L22656 is the BCBS demo data entrypoint. Smoke-testing the demo flow means hitting this function and then walking the dashboards.
- No `react-router`. Page navigation is `setPage("foo")`. Any "new route" in this plan is really "new `page` value plus a switch arm" — we are **not** introducing react-router this month.
- No frontend tests, no `vitest`/`jest` config, no `__tests__/` directory.

### 1.3 Repo-level

- No `docs/` directory. We create `docs/plans/` for this document.
- No `migrations/` directory anywhere. We create `cyberrx-api/migrations/` as part of PR-2.
- `git log` shows recent activity (commits in the last 24 hours) on the vendor risk engine and crown-jewels framework — the foundation the assessment is building from.
- No CI. PRs are reviewed by humans only. Test-gating is on-the-honor-system for now; **we will add a GitHub Actions workflow in PR-1** that at minimum runs `npm test` for the API and `npm run build` + `npm run lint` for the frontend, so "tests gate every PR" actually means something.

### 1.4 Tensions between assessment and code (flag for review)

| # | Assessment says | Code reality | How we reconcile |
|---|-----------------|--------------|------------------|
| T1 | "10 crown jewel processes" | BCBS template has 12–14 depending on how Government Programs is counted | §3 — pick a canonical 12, document the deviation |
| T2 | "Existing dashboards: CISO, CFO, CRO, Board" — 4 of 6 | Confirmed. CRO and Internal Audit are merged into `CRODash`. Board ID is `boarddash` (the `board` page is a different "Board Risk Report" export) | Note in plan; not a Month 1 concern |
| T3 | "JWT configured but not enforced" | Confirmed. No `/api/auth/*` routes exist; the `users` table is empty in init script | Month 4 work. Month 1 stays single-tenant + `X-Org-Id` header |
| T4 | "Background scheduler exists, unclear if running" | Confirmed not wired into `render.yaml` | Out of scope Month 1; flag in plan §11 |
| T5 | "No migrations directory" | Confirmed. `db.js` does inline `CREATE TABLE IF NOT EXISTS` | PR-2 introduces `migrations/` and a runner. We do **not** retroactively migrate the existing five tables; we keep `init()` as the legacy boot path and append new tables via the runner |

---

## 2. Six new entities — schemas and migrations

The data model in `COVERAGE_ASSESSMENT.md` §5 names 18 entities; six are explicitly Month 1 scope per `PRODUCTION_PROMPT.md`:

1. `BusinessProcess`
2. `Asset`
3. `DataObject`
4. `ThreatScenario`
5. `LegalObligation`
6. `ExecutiveOwner`

The other twelve are deliberately deferred. We also need **join tables** so the correlation engine can walk the graph; those are listed in §2.7.

### 2.0 Conventions

- Postgres-native. We are on Render PG.
- Surrogate primary keys: `id TEXT PRIMARY KEY` (slug-style, like the existing `orgs.id`). We do **not** use `UUID` so we can keep IDs human-readable for the BCBS seed (e.g. `bp_bcbs_claims_adjudication`).
- All tables have `org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE` — forward-compatible with multi-tenant.
- All tables have `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- JSONB columns wherever the field is "evolving" or "list of opaque mappings" (framework citations, MITRE techniques). Indexed entities (process tier, owner role) get real columns.
- Every migration is a numbered pair: `NNN_name.up.sql` + `NNN_name.down.sql`. Runner is `cyberrx-api/scripts/migrate.js`, invoked as `node scripts/migrate.js up` / `down` / `status`. Idempotent (a `migrations` ledger table tracks what's applied).
- Demo seed data is tagged `is_demo BOOLEAN NOT NULL DEFAULT FALSE` on every entity. The seeder writes `TRUE`; real customer-onboarded data writes `FALSE`. This is the `DEMO_MODE` hygiene rule from `PRODUCTION_PROMPT.md` enforced at the row level.

### 2.1 `business_processes`

```sql
-- 002_business_processes.up.sql
CREATE TABLE business_processes (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('primary','strategic')),
  business_line   TEXT,                          -- 'operations'|'hmm'|'govt'|'corp'|'service'|'data'|...
  criticality     INT  NOT NULL CHECK (criticality BETWEEN 1 AND 5),
  description     TEXT,
  exec_owner_role TEXT,                          -- 'CIO'|'CISO'|'CFO'|'CRO'|'CLO'|'Audit' (denormalized convenience; truth in executive_owners)
  attributes      JSONB NOT NULL DEFAULT '{}',   -- escape hatch (KRI thresholds, regulator-specific flags)
  is_demo         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX business_processes_org_tier  ON business_processes(org_id, tier);
CREATE INDEX business_processes_org_owner ON business_processes(org_id, exec_owner_role);

-- 002_business_processes.down.sql
DROP TABLE IF EXISTS business_processes;
```

### 2.2 `assets`

```sql
-- 003_assets.up.sql
CREATE TABLE assets (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,                 -- 'application'|'server'|'database'|'cloud'|'endpoint'|'api'
  vendor          TEXT,                          -- e.g. 'NASCO','HealthEdge','Epic'
  hostname        TEXT,
  environment     TEXT,                          -- 'prod'|'dr'|'staging'
  supported       BOOLEAN NOT NULL DEFAULT TRUE,
  end_of_support  DATE,
  owner_team      TEXT,
  owner_email     TEXT,
  attributes      JSONB NOT NULL DEFAULT '{}',
  is_demo         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX assets_org_type ON assets(org_id, type);

-- 003_assets.down.sql
DROP TABLE IF EXISTS assets;
```

### 2.3 `data_objects`

```sql
-- 004_data_objects.up.sql
CREATE TABLE data_objects (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                   -- 'Member PHI','Provider Tax IDs','Claims History'
  classification TEXT NOT NULL,                   -- 'PHI'|'PII'|'PCI'|'Financial'|'Legal'|'Confidential'|'Public'
  sensitivity   TEXT NOT NULL CHECK (sensitivity IN ('critical','high','medium','low')),
  record_count  BIGINT,                          -- e.g. 3_000_000 for "3M PHI records"
  description   TEXT,
  attributes    JSONB NOT NULL DEFAULT '{}',
  is_demo       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX data_objects_org_class ON data_objects(org_id, classification);

-- 004_data_objects.down.sql
DROP TABLE IF EXISTS data_objects;
```

### 2.4 `threat_scenarios`

```sql
-- 005_threat_scenarios.up.sql
CREATE TABLE threat_scenarios (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                  -- 'Ransomware (LockBit)','Insider data exfil','Vendor supply chain'
  category        TEXT NOT NULL,                  -- 'ransomware'|'phishing'|'insider'|'supply_chain'|'misconfig'|'ddos'|'fraud'
  probability     NUMERIC(4,3) CHECK (probability >= 0 AND probability <= 1),  -- 0.23 = 23%
  impact_level    TEXT CHECK (impact_level IN ('catastrophic','severe','moderate','minor')),
  description     TEXT,
  mitre_techniques TEXT[] NOT NULL DEFAULT '{}', -- ['T1486','T1490'] — see §11 open question on taxonomy
  attributes      JSONB NOT NULL DEFAULT '{}',
  is_demo         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX threat_scenarios_org_cat ON threat_scenarios(org_id, category);

-- 005_threat_scenarios.down.sql
DROP TABLE IF EXISTS threat_scenarios;
```

### 2.5 `legal_obligations`

```sql
-- 006_legal_obligations.up.sql
CREATE TABLE legal_obligations (
  id                   TEXT PRIMARY KEY,
  org_id               TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,             -- 'HIPAA Breach Notification Rule'
  source               TEXT NOT NULL,             -- 'HIPAA'|'CMS'|'State'|'NAIC'|'Contract'|'OPM'
  citation             TEXT NOT NULL,             -- '45 CFR §164.404' / 'CMS 42 CFR §422.306(c)(1)'
  notification_hours   INT,                       -- 1440 = 60 days, 120 = 5 days
  jurisdiction         TEXT,                      -- 'federal'|'CA'|'NY'|... ; null for federal-default
  applicability        JSONB NOT NULL DEFAULT '{}', -- which data classes / org types this binds
  penalties            JSONB NOT NULL DEFAULT '{}',
  is_demo              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX legal_obligations_org_source ON legal_obligations(org_id, source);

-- 006_legal_obligations.down.sql
DROP TABLE IF EXISTS legal_obligations;
```

### 2.6 `executive_owners`

```sql
-- 007_executive_owners.up.sql
CREATE TABLE executive_owners (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('CIO','CISO','CFO','CRO','CLO','Audit')),
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  display_name TEXT,
  email       TEXT,
  scope       JSONB NOT NULL DEFAULT '{}',       -- {process_ids:[...], control_ids:[...]} — empty = org-wide
  is_demo     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, role, COALESCE(user_id,''))
);
CREATE INDEX executive_owners_org_role ON executive_owners(org_id, role);

-- 007_executive_owners.down.sql
DROP TABLE IF EXISTS executive_owners;
```

### 2.7 Join tables (graph wiring)

These are what makes the correlation walkable. They are small, simple, and they're what we'll be joining in the engine.

```sql
-- 008_process_links.up.sql
CREATE TABLE process_assets (
  process_id TEXT NOT NULL REFERENCES business_processes(id) ON DELETE CASCADE,
  asset_id   TEXT NOT NULL REFERENCES assets(id)             ON DELETE CASCADE,
  role       TEXT,                              -- 'primary'|'supporting'|'dependency'
  PRIMARY KEY (process_id, asset_id)
);
CREATE TABLE process_data_objects (
  process_id    TEXT NOT NULL REFERENCES business_processes(id) ON DELETE CASCADE,
  data_object_id TEXT NOT NULL REFERENCES data_objects(id)       ON DELETE CASCADE,
  PRIMARY KEY (process_id, data_object_id)
);
CREATE TABLE asset_data_objects (
  asset_id       TEXT NOT NULL REFERENCES assets(id)        ON DELETE CASCADE,
  data_object_id TEXT NOT NULL REFERENCES data_objects(id)  ON DELETE CASCADE,
  PRIMARY KEY (asset_id, data_object_id)
);
CREATE TABLE process_legal_obligations (
  process_id     TEXT NOT NULL REFERENCES business_processes(id) ON DELETE CASCADE,
  obligation_id  TEXT NOT NULL REFERENCES legal_obligations(id)  ON DELETE CASCADE,
  PRIMARY KEY (process_id, obligation_id)
);
CREATE TABLE process_threat_scenarios (
  process_id   TEXT NOT NULL REFERENCES business_processes(id) ON DELETE CASCADE,
  scenario_id  TEXT NOT NULL REFERENCES threat_scenarios(id)   ON DELETE CASCADE,
  relevance    NUMERIC(3,2),                     -- 0.00..1.00; how relevant this scenario is to this process
  PRIMARY KEY (process_id, scenario_id)
);

-- down: DROP TABLE IF EXISTS each, in reverse order
```

### 2.8 Extending existing tables

We add columns to enable correlation without breaking existing reads. We do **not** drop or rename existing columns.

```sql
-- 009_extend_risks_findings.up.sql
-- (a) findings: there's no findings table yet — see §11 open question Q3.
--     If we choose to add one this month, schema is:
CREATE TABLE IF NOT EXISTS findings (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  severity      TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  source        TEXT,                            -- 'tenable'|'crowdstrike'|'manual'|...
  source_ref    TEXT,                            -- CVE ID, ticket ref, etc.
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','triaged','mitigating','accepted','closed')),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- correlation pointers (nullable; populated by correlation pipeline or manual mapping)
  primary_asset_id    TEXT REFERENCES assets(id)             ON DELETE SET NULL,
  primary_process_id  TEXT REFERENCES business_processes(id) ON DELETE SET NULL,
  primary_scenario_id TEXT REFERENCES threat_scenarios(id)   ON DELETE SET NULL,
  attributes    JSONB NOT NULL DEFAULT '{}',
  is_demo       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX findings_org_status ON findings(org_id, status);
CREATE INDEX findings_org_sev    ON findings(org_id, severity);

-- (b) Many-to-many join for findings → processes (a finding can hit > 1 process)
CREATE TABLE finding_processes (
  finding_id TEXT NOT NULL REFERENCES findings(id)            ON DELETE CASCADE,
  process_id TEXT NOT NULL REFERENCES business_processes(id)  ON DELETE CASCADE,
  PRIMARY KEY (finding_id, process_id)
);
```

`Risk`, `FinancialImpact`, `AuditTest`, `Exception` from the assessment's §5 are **not** added this month — they're Month 3+ entities. We carry their data in `finding.attributes` JSONB temporarily if any seed row needs it.

### 2.9 Migration tooling (PR-1)

We need to ship a runner before any of §2.1–§2.8 lands. Spec:

- `cyberrx-api/migrations/NNN_name.up.sql` / `NNN_name.down.sql` pairs.
- `cyberrx-api/scripts/migrate.js`:
  - `node scripts/migrate.js up` — apply all pending, in order.
  - `node scripts/migrate.js down` — revert the most-recently-applied migration only.
  - `node scripts/migrate.js status` — print applied/pending list.
- Ledger table: `schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`.
- Wraps each `up`/`down` in a single transaction; on failure, rolls back and exits non-zero.
- `001_init_legacy.up.sql` is a no-op that records the five existing tables (`orgs`, `users`, `metrics`, `route_actions`, `tool_connections`) as "already-applied" so we don't try to recreate them. The legacy `db.init()` `CREATE TABLE IF NOT EXISTS` stays as the boot-time safety net for the existing five tables only.
- `npm run migrate` invokes the runner. Render's `startCommand` becomes `npm run migrate && npm start`.

### 2.10 Forward/reverse safety

Every migration is reversible. Specifically:

- Schema-add migrations (`CREATE TABLE`) `down` to `DROP TABLE IF EXISTS`.
- Column-add migrations `down` to `ALTER TABLE ... DROP COLUMN IF EXISTS`.
- Data-only seed migrations are idempotent (`INSERT ... ON CONFLICT DO NOTHING` or `ON CONFLICT (id) DO UPDATE`) — and the `down` is a `DELETE FROM ... WHERE id = ... AND is_demo = TRUE` so we never wipe customer data.
- The seed migration for BCBS demo is **gated** on `org_id = 'bcbs-demo'` being present; if not, the seed is a no-op. This means production tenants don't accidentally get BCBS demo rows.

---

## 3. Seeding strategy — reconciling the "10 vs 12" question

The assessment's §1 promises "10 crown jewel processes." Its §5 (`BusinessProcess` comment block) enumerates **twelve**:

> Tier 1 Primary (7): Claims Adjudication, Membership & Enrollment, Provider Network & Contracting, Care Management, Payment Integrity, Member Services, Actuarial.
> Tier 2 Strategic (5): Government Programs, Pharmacy/PBM, Compliance & Regulatory, Identity & Access, Data & Analytics.

The code's BCBS template (`App.jsx` L185–L202) enumerates **thirteen or fourteen** depending on whether "Government Programs" is one row or three (MA, FEP, Medicaid as separate rows under a `govt_admin` section).

### 3.1 Recommendation: canonical twelve, BCBS-specific extras as `attributes`

For Month 1 seed:

- Seed **exactly twelve** `business_processes` rows for the BCBS demo tenant, matching the assessment's §5 enumeration.
- For "Government Programs" (Tier 2), store the BCBS-specific MA/FEP/Medicaid breakdown inside `attributes.sub_programs` as a JSON array. The UI can drill in; the engine treats Government Programs as a single process for correlation purposes.
- The assessment's "10" wording in §1 is treated as a copy-edit error and noted in §11 as a fix to roll into the assessment doc in the same PR that ships the seed (PR-4).

### 3.2 The twelve canonical processes (BCBS demo seed values)

Each row gets the same shape; here is the seed table for the BCBS demo tenant (`org_id = 'bcbs-demo'`, `is_demo = TRUE`):

| id (slug) | name | tier | exec_owner_role | criticality | business_line |
|---|---|---|---|---|---|
| `bp_bcbs_claims_adjudication` | Claims Adjudication | primary | CIO | 5 | operations |
| `bp_bcbs_membership_enrollment` | Membership & Enrollment | primary | CIO | 5 | operations |
| `bp_bcbs_provider_network` | Provider Network & Contracting | primary | CIO | 4 | hmm |
| `bp_bcbs_care_management` | Care Management | primary | CIO | 4 | hmm |
| `bp_bcbs_payment_integrity` | Payment Integrity (FWA) | primary | CFO | 4 | govt |
| `bp_bcbs_member_services` | Member Services | primary | CIO | 4 | service |
| `bp_bcbs_actuarial` | Actuarial / Underwriting | primary | CFO | 4 | data |
| `bp_bcbs_government_programs` | Government Programs (MA/FEP/Medicaid) | strategic | CLO | 5 | govt |
| `bp_bcbs_pharmacy_pbm` | Pharmacy / PBM | strategic | CIO | 3 | hmm |
| `bp_bcbs_compliance_regulatory` | Compliance & Regulatory Reporting | strategic | CLO | 4 | corp |
| `bp_bcbs_identity_access` | Identity & Access | strategic | CISO | 5 | corp |
| `bp_bcbs_data_analytics` | Data & Analytics Platforms | strategic | CIO | 4 | data |

Notes:

- `exec_owner_role` is the *primary* remediation owner. The correlation engine output names oversight (CISO/CRO) and legal (CLO) owners too — those come from rules in the engine, not the row.
- Criticality is a starting cut. Real customers will tune. We pin this so the demo narrative dollars and severities are reproducible across runs.
- The IDs are stable slugs so other seeds (assets, data objects, scenarios) can foreign-key them by string.

### 3.3 Companion seed sets

To make the BCBS demo narrative render, we also need:

- **Assets (~15)** — at minimum: NASCO Claims Platform, HealthEdge HealthRules, Facets, Epic (provider portal), QNXT (MA), MMIS-Inovalon (Medicaid), Conduent (mailing), Okta (IAM), Splunk (SIEM), CrowdStrike Falcon (EDR), Tenable.io (vuln mgmt), CyberArk (PAM), Snowflake (data warehouse), HealthEdge GuidingCare (care mgmt), Salesforce Service Cloud (member services). All `is_demo = TRUE`.
- **Data objects (~7)** — Member PHI (3M records), Provider Tax IDs (250K), Claims History (45M), Medicare Advantage PHI (450K), FEP PHI (340K), Medicaid PHI (200K), Payment card data (1M). Sensitivities and classifications per HIPAA/PCI definitions.
- **Threat scenarios (~6)** — Ransomware (LockBit), Ransomware (BlackCat), Phishing-led credential theft, Insider data exfil, Vendor supply-chain (Change Healthcare-style), Misconfig of cloud storage. `probability` and `impact_level` pulled from the CFO dashboard's hard-coded scenario assumptions (23%/8% from CFOdash) for narrative consistency.
- **Legal obligations (~8)** — HIPAA Breach Notification (60d), HIPAA Security Rule §164.308(a)(5), HIPAA §164.404, CMS 42 CFR §422.306(c)(1) (5d), OPM FEP Data Security Standard, NAIC Model Law (state-adopted), CA AB 1950, NY DFS 23 NYCRR 500. The full state-by-state matrix is Month 5 (Phase 2 Item 11) — we ship only what the demo narrative cites.
- **Executive owners (6)** — one per role for the BCBS demo. Display names like "Demo CIO" / "Demo CISO" with `is_demo = TRUE`. No real `user_id` linkage until JWT lands in Month 4.
- **Join tables** — explicit mappings so the engine doesn't have to guess. E.g. `process_assets(bp_bcbs_claims_adjudication, asset_nasco_claims, 'primary')`, `process_data_objects(bp_bcbs_claims_adjudication, do_member_phi)`, `process_legal_obligations(bp_bcbs_claims_adjudication, lo_hipaa_breach_notif)`, etc.
- **One sample finding** (`f_001_demo_nasco_cve`) — the assessment's hero example: "Critical CVE-2024-1234 on NASCO server". Links via `primary_asset_id = asset_nasco_claims`, `primary_process_id = bp_bcbs_claims_adjudication`, `primary_scenario_id = ts_ransomware_lockbit`. This is the finding the engine renders for the screenshot.

### 3.4 Seed delivery mechanism

- Seeds are SQL migrations, not application code. They live as `010_seed_bcbs_*.up.sql` files and are only applied when an env flag `SEED_BCBS_DEMO=1` is set (default off in production, on in Render's BCBS demo deployment).
- The runner accepts a `--seed` flag that applies the seed migrations after the schema migrations. Schema-only deploys (real customers) skip them.
- Each seed migration is idempotent (`INSERT ... ON CONFLICT (id) DO UPDATE SET ...`) so re-runs against an already-seeded demo tenant are safe.
- Down migration for seeds: `DELETE FROM <table> WHERE id IN (...) AND is_demo = TRUE`. Never touches non-demo rows.

---

## 4. Risk Correlation Engine — API shape and algorithm

### 4.1 Endpoints

| Method | Path | Purpose | Auth (Month 1) |
|---|---|---|---|
| `GET` | `/api/risk-engine/correlate/:findingId` | Return full executive narrative for one finding | `X-Org-Id` header (same posture as existing routes) |
| `GET` | `/api/risk-engine/processes` | List business processes for the current org | `X-Org-Id` |
| `GET` | `/api/risk-engine/processes/:id` | Get one process with its join-table neighbors | `X-Org-Id` |
| `GET` | `/api/risk-engine/findings` | List findings (paginated; `?status=open&severity=critical`) | `X-Org-Id` |
| `POST` | `/api/risk-engine/findings` | Create a finding manually (for the demo "I have a finding, narrate it" flow) | `X-Org-Id` |
| `POST` | `/api/risk-engine/findings/:id/correlate` | Re-run correlation (writes pointers back to the finding row) | `X-Org-Id` |

`PUT`/`DELETE` and mutation endpoints for processes/assets/data-objects are **deferred** to Month 2 — we don't need them to ship the demo narrative.

### 4.2 Response shape for `GET /api/risk-engine/correlate/:findingId`

```json
{
  "finding": {
    "id": "f_001_demo_nasco_cve",
    "title": "Critical CVE-2024-1234 on NASCO server",
    "severity": "critical",
    "discoveredAt": "2026-05-20T14:00:00Z",
    "source": "tenable",
    "sourceRef": "CVE-2024-1234"
  },
  "businessImpact": {
    "processes": [
      { "id": "bp_bcbs_claims_adjudication", "name": "Claims Adjudication", "tier": "primary", "criticality": 5 }
    ],
    "assets": [
      { "id": "asset_nasco_claims", "name": "NASCO Claims Platform", "type": "application", "vendor": "NASCO" }
    ],
    "dataObjects": [
      { "id": "do_member_phi", "name": "Member PHI", "classification": "PHI", "recordCount": 3000000 }
    ],
    "threatScenario": {
      "id": "ts_ransomware_lockbit",
      "name": "Ransomware (LockBit)",
      "category": "ransomware",
      "probability": 0.23,
      "impactLevel": "catastrophic",
      "mitreTechniques": ["T1486","T1490"]
    },
    "financialExposureUsd": 217000000,
    "financialExposureBasis": "ransomware_default_model_v1"
  },
  "frameworks": [
    { "framework": "NIST CSF", "ref": "PR.PS-1" },
    { "framework": "HIPAA Security Rule", "ref": "§164.308(a)(5)" },
    { "framework": "CIS Controls v8", "ref": "Control 7" }
  ],
  "legalObligations": [
    { "id": "lo_hipaa_breach_notif", "name": "HIPAA Breach Notification", "citation": "45 CFR §164.404", "notificationHours": 1440, "source": "HIPAA" },
    { "id": "lo_cms_422_306", "name": "CMS MA Breach Notification", "citation": "42 CFR §422.306(c)(1)", "notificationHours": 120, "source": "CMS" }
  ],
  "ownership": {
    "remediation":  { "role": "CIO",  "displayName": "Demo CIO",  "email": "cio-demo@bcbs.example" },
    "riskOversight":[
      { "role": "CISO", "displayName": "Demo CISO", "email": "ciso-demo@bcbs.example" },
      { "role": "CRO",  "displayName": "Demo CRO",  "email": "cro-demo@bcbs.example"  }
    ],
    "legalReview":  { "role": "CLO",  "displayName": "Demo CLO",  "email": "clo-demo@bcbs.example" },
    "auditEvidence":{ "role": "Audit","displayName": "Demo Auditor","email": "audit-demo@bcbs.example" }
  },
  "auditEvidence": {
    "type": "penetration_test",
    "rationale": "External pen test required to demonstrate exploit infeasibility post-remediation."
  },
  "demo": true,
  "generatedAt": "2026-05-29T18:30:00Z"
}
```

Notes:

- Top-level `demo` mirrors the finding's `is_demo`; the frontend uses it to badge demo narratives.
- `financialExposureUsd` is a single computed number this month. Month 5 introduces the full `FinancialImpact` entity and breaks this into line items.
- `frameworks` is a flat list this month — no control-effectiveness scoring. That's Month 3/4 work.

### 4.3 Algorithm (pseudocode)

```text
correlate(findingId, orgId):
  f = SELECT * FROM findings WHERE id = findingId AND org_id = orgId
  if not f: 404

  # 1. Asset hop — find the directly-affected asset
  asset = SELECT * FROM assets WHERE id = f.primary_asset_id
  if not asset and f.source_ref:
      asset = resolveAssetByExternalRef(f.source_ref, orgId)   # source-specific best-effort

  # 2. Process hop — which crown-jewel processes does this asset support?
  processes = SELECT bp.*
              FROM business_processes bp
              JOIN process_assets pa ON pa.process_id = bp.id
              WHERE pa.asset_id = asset.id AND bp.org_id = orgId
  if explicit finding_processes rows exist, prefer those (override).

  # 3. Data hop — what's on this asset / inside these processes?
  dataObjects = UNION
      (SELECT do.* FROM data_objects do JOIN asset_data_objects   ON do.id=ado.data_object_id WHERE ado.asset_id=asset.id)
      (SELECT do.* FROM data_objects do JOIN process_data_objects ON do.id=pdo.data_object_id WHERE pdo.process_id IN processes)
  dedupe by id.

  # 4. Threat hop — pick the scenario
  if f.primary_scenario_id: scenario = lookup
  else:
      scenario = highest_relevance(
        SELECT ts.*, pts.relevance
        FROM process_threat_scenarios pts JOIN threat_scenarios ts ON ts.id = pts.scenario_id
        WHERE pts.process_id IN processes
        ORDER BY pts.relevance DESC LIMIT 1)

  # 5. Financial exposure — Month 1 uses a closed-form model
  exposure = financialModelV1(scenario, dataObjects, processes, org)
  #   = base_loss[scenario.category] * sum(do.record_count) * criticality_multiplier
  #   = (e.g. ransomware_base_per_record * total_records * max_process_criticality_factor)
  # Calibrated to produce ~$217M for the BCBS hero example so the demo screenshot matches.

  # 6. Framework hop — pull citations from the scenario × data classification matrix
  frameworks = frameworkCitations(scenario, dataObjects, processes)
  #   ransomware × PHI -> [NIST PR.PS-1, HIPAA §164.308(a)(5), CIS Control 7]
  # Month 1: hardcoded lookup table seeded with the demo-needed combinations.

  # 7. Legal hop — obligations triggered by this scenario × data class × process
  obligations = SELECT lo.*
                FROM process_legal_obligations plo JOIN legal_obligations lo ON lo.id = plo.obligation_id
                WHERE plo.process_id IN processes
                  AND lo.applicability ?| array['default', dataObjects[*].classification]

  # 8. Owner hop — primary remediation = first process's exec_owner_role; oversight/legal/audit by rule
  owners = resolveOwners(processes, orgId)
  #   remediation: executive_owners WHERE role = processes[0].exec_owner_role
  #   riskOversight: roles in ('CISO','CRO')
  #   legalReview: role 'CLO'
  #   auditEvidence: role 'Audit'

  # 9. Audit-evidence-type rule (Month 1 hardcoded):
  auditEvidence = scenario.category == 'ransomware' ? 'penetration_test'
                : scenario.category == 'phishing'   ? 'control_attestation'
                : 'control_attestation'

  return assembleNarrative(...)
```

### 4.4 What's deliberately *not* in the engine this month

- No "correlate all findings nightly" job. The engine is request-time only.
- No write-side correlation pipeline that ingests Tenable/CrowdStrike findings automatically. The one demo finding is seeded by SQL. Real ingestion is a Month 2/3 problem.
- No AI/LLM narration. The narrative is rules + lookups. AI summarization is Phase 3 per the assessment.
- No multi-finding rollup. One finding in, one narrative out.

---

## 5. UI route + component plan

### 5.1 The new route

- Page id: `risknarrative`. New entry in `NAV` (after `boarddash`, before `controls`). Visible only when `props.demo === true` OR a feature-flag query `?risk_narrative=1` is set, until reviewed (per `PRODUCTION_PROMPT.md` stop condition #3: no new dashboard route to production without a feature flag).
- Two URL shapes:
  - `page=risknarrative` (no finding selected) → renders a finding picker (list view of `GET /api/risk-engine/findings`).
  - `page=risknarrative&findingId=f_001_demo_nasco_cve` → renders the narrative card. (Since the codebase uses `setPage("foo")` state and not the URL, "URL shape" really means `page` plus a `findingId` value held alongside in `NerionApp` state. The plan uses query-string style for clarity in PR descriptions.)

### 5.2 Component tree

```
RiskNarrative.jsx                                # NEW FILE in src/components/risk/
├── <RiskNarrativeShell>                         # page chrome (breadcrumb, refresh)
│    ├── <FindingPicker findings={...} onSelect={...}/>     # when no findingId
│    └── <NarrativeCard finding={...} narrative={...}/>     # when findingId present
│         ├── <NarrativeHeader/>                            # title, severity badge, demo badge
│         ├── <BusinessImpactPanel/>                        # processes / assets / data / threat / $exposure
│         ├── <FrameworksPanel/>                            # NIST/HIPAA/CIS chips
│         ├── <LegalPanel/>                                 # obligations with timelines
│         ├── <OwnershipPanel/>                             # remediation / oversight / legal / audit
│         └── <NarrativeActions/>                           # [Route to ServiceNow] [View in CIO Dashboard (M3)]
```

### 5.3 Files created

```
frontend/src/
├── components/
│   └── risk/
│       ├── RiskNarrative.jsx          # the page component (default export)
│       ├── NarrativeCard.jsx
│       ├── BusinessImpactPanel.jsx
│       ├── FrameworksPanel.jsx
│       ├── LegalPanel.jsx
│       ├── OwnershipPanel.jsx
│       ├── FindingPicker.jsx
│       └── useRiskNarrative.js        # data hook: GET /api/risk-engine/correlate/:id with loading/error
└── lib/
    └── api.js                         # NEW thin API client wrapper; today every fetch is inline in App.jsx
```

### 5.4 Props / state contract

- `RiskNarrative` accepts `sharedProps` (same shape as the rest of `App.jsx` page components). Critical props it actually uses: `orgId` (from header `X-Org-Id` / `setupJson.orgId`), `brianaOn`, `setBrianaOn`, `go(page)` for navigation, `demo` flag.
- Local state in `RiskNarrative`: `findingId` (controlled by query / parent), `narrative` (response from `useRiskNarrative`), `loading`, `error`.
- No global state changes. We do **not** wire this into the existing dashboard reducers or finding store.

### 5.5 Integration into the existing `App.jsx` switch

```jsx
// in renderPage(), add:
if (page === "risknarrative") {
  return React.createElement(RiskNarrative, sharedProps);
}
```

Import lands at the top of `App.jsx`:

```jsx
import RiskNarrative from "./components/risk/RiskNarrative.jsx";
```

This is the **first extraction** in the App.jsx split. By the end of Month 1, `App.jsx` is 24,559 lines minus exactly zero (we don't extract any existing page yet — that's Month 2+). The new page lives outside App.jsx from day one.

### 5.6 BrianaBar and styling

- `RiskNarrative` includes `<BrianaBar pageKey="risknarrative" .../>` like every other page, so we don't regress the accessibility/narration story.
- Styling reuses the global `C` palette object. We extract `C` into `frontend/src/lib/theme.js` in PR-13 (the split-prep PR), but **not** before — the engine work doesn't depend on it.

### 5.7 Feature flag

- Frontend reads `import.meta.env.VITE_FEATURE_RISK_NARRATIVE`. When `1`, the `NAV` entry renders and the `page === "risknarrative"` switch arm activates. When unset, the route is unreachable.
- Vercel prod default: `0`. Vercel preview default: `1`. BCBS demo deploy: `1`.

---

## 6. PR sequencing — eleven PRs for Month 1

Each PR is small, ships one acceptance criterion, has its own tests, and updates docs in the same commit. Each PR keeps the BCBS demo green. Order is strict — later PRs depend on earlier ones.

### PR-1 · `chore(api): add test harness, migration runner, CI` (Week 1, ~2d)

- Adds `jest` + `supertest` to `cyberrx-api/`. Adds `vitest` to `frontend/`.
- Adds `cyberrx-api/scripts/migrate.js` and the `migrations/` directory.
- Adds `001_init_legacy.up.sql` (no-op marker for existing tables).
- Adds `.github/workflows/ci.yml` running `npm test`, `npm run lint`, `npm run build` on PR.
- Wires `npm run migrate` and updates `render.yaml` `startCommand` to `npm run migrate && npm start`.
- Docs: new `docs/runbooks/migrations.md`.
- **Tests:** one `migrate.js` unit test (apply + rollback against ephemeral PG in CI), one supertest hitting `/health`, one `vitest` smoke that imports `App.jsx` without crashing.
- **Acceptance:** `npm test` passes locally and in CI. `npm run migrate status` reports `001_init_legacy` as applied on a fresh DB.

### PR-2 · `feat(risk-engine): add six new tables + join tables` (Week 1, ~1d)

- Migrations `002`–`009` per §2.1–§2.8.
- Adds `docs/data-model.md` (new file) with the entity diagram and FK summary.
- **Tests:** integration test that runs all migrations up then down on an ephemeral DB and asserts the resulting schema matches.
- **Acceptance:** `npm run migrate up` on a fresh DB creates all tables; `npm run migrate down` walks them back without errors.

### PR-3 · `feat(risk-engine): seed reference data — scenarios, obligations, frameworks` (Week 1, ~1d)

- Migration `010_seed_reference.up.sql` — org-agnostic reference rows (the six demo threat scenarios, eight legal obligations, three framework citations) keyed by `org_id = 'bcbs-demo'` for now. We'll generalize to per-org reference data when a second tenant lands.
- **Tests:** integration test that runs `010` and confirms row counts.
- **Acceptance:** seed migration is idempotent across two consecutive applies.

### PR-4 · `feat(risk-engine): seed BCBS twelve crown-jewel processes` (Week 2, ~1d)

- Migration `011_seed_bcbs_processes.up.sql` — twelve rows per §3.2.
- Updates `COVERAGE_ASSESSMENT.md` §1 "10" → "12" in the same PR, with a footnote explaining the reconciliation.
- Updates `docs/data-model.md` with the canonical twelve.
- **Tests:** integration test asserting 12 rows with the expected IDs.
- **Acceptance:** seed runs on demo, no-op on a tenant without `org_id = 'bcbs-demo'`.

### PR-5 · `feat(risk-engine): seed BCBS assets + data objects + join tables` (Week 2, ~1.5d)

- Migrations `012`/`013`/`014` per §3.3.
- **Tests:** integration test walking `process → asset → data_object` for `bp_bcbs_claims_adjudication` and asserting Member PHI is reachable.
- **Acceptance:** every crown-jewel process has ≥1 asset and ≥1 data object joined.

### PR-6 · `feat(risk-engine): seed executive owners + one demo finding` (Week 2, ~0.5d)

- Migration `015` seeds 6 `executive_owners` rows for `bcbs-demo`.
- Migration `016` seeds the hero finding (`f_001_demo_nasco_cve`).
- **Tests:** integration test confirming a `findings` row joined to its primary process resolves to a non-null owner.
- **Acceptance:** demo finding is queryable and joins to the right asset / process / scenario.

### PR-7 · `feat(risk-engine): GET /api/risk-engine/processes + /findings (read-only)` (Week 2–3, ~1.5d)

- New router `cyberrx-api/src/routes/risk-engine.js` mounted at `/api/risk-engine`.
- Implements `GET /processes`, `GET /processes/:id`, `GET /findings`, `GET /findings/:id`.
- Validates `X-Org-Id` header is present (404 if missing) — same posture as existing routes.
- **Tests:** supertest for each endpoint: missing org → 404; happy path returns expected counts; unknown ID → 404.
- **Acceptance:** `curl -H 'X-Org-Id: bcbs-demo' .../api/risk-engine/processes` returns 12 rows.

### PR-8 · `feat(risk-engine): correlation algorithm + GET /api/risk-engine/correlate/:id` (Week 3, ~3d) — THE CORE PR

- Implements §4.3 algorithm in `cyberrx-api/src/engine/correlate.js` as a pure function `correlate(findingId, orgId, dbClient)`.
- The router endpoint is a thin wrapper around it.
- Includes the `financialModelV1` closed-form function (§4.3 step 5) calibrated to the BCBS hero example.
- Includes the `frameworkCitations` lookup table.
- **Tests:**
  - Unit: `financialModelV1` is a pure function — table-driven tests for each scenario category × data class.
  - Unit: `frameworkCitations` is a pure lookup — table-driven tests.
  - Unit: `resolveOwners` returns the right roles given a process row.
  - Integration: `GET /api/risk-engine/correlate/f_001_demo_nasco_cve` returns a response matching the §4.2 fixture exactly (snapshot test). This is the regression gate — if anything reshapes the response, the snapshot diff catches it.
- **Acceptance:** snapshot test green. Returns the §4.2 JSON byte-for-byte modulo `generatedAt`.

### PR-9 · `feat(risk-engine): POST /findings + POST /findings/:id/correlate` (Week 3, ~1d)

- Adds write endpoints. `POST /findings` creates a finding row; `POST /findings/:id/correlate` re-resolves primary pointers and writes them back.
- Validates request body (Joi or hand-rolled — keep deps minimal, hand-rolled is fine).
- **Tests:** supertest happy path; missing required fields → 400; nonexistent org/asset references → 404.
- **Acceptance:** demo flow: create a finding via POST, immediately GET its narrative, narrative renders.

### PR-10 · `feat(ui): RiskNarrative component + feature flag` (Week 4, ~3d)

- All files in §5.3 created.
- `App.jsx` switch arm added + NAV entry added (gated on `VITE_FEATURE_RISK_NARRATIVE`).
- `lib/api.js` thin wrapper introduced.
- **Tests:**
  - vitest unit: `<RiskNarrative>` renders with `narrative` fixture without crashing; renders loading state; renders error state.
  - vitest unit: `<FindingPicker>` renders empty state, single finding, sorted list.
  - vitest snapshot of `<NarrativeCard>` against the §4.2 fixture.
- **Acceptance:** with flag on, navigating to "Risk Narrative" and selecting `f_001_demo_nasco_cve` renders a panel that matches the assessment's Final Recommendation screenshot text content (titles, $ exposure, framework refs, owner names).

### PR-11 · `chore(demo): BCBS smoke regression suite + docs` (Week 4, ~1.5d)

- Adds `frontend/tests/smoke/bcbs-demo.spec.js` — vitest + jsdom run that simulates: landing → login → MFA → welcome → setup (via `loadBCBSDemoPreset`) → walk through each of the four existing dashboards (`dashboard`, `cro`, `cfo`, `boarddash`), assert each renders without throwing.
- Extends the suite to include navigating to `risknarrative` and asserting the hero finding renders.
- Adds `docs/demo/bcbs-regression.md` describing what's covered and how to run.
- Adds `docs/runbooks/risk-engine.md` — operator runbook for the new endpoints.
- **Acceptance:** `npm run test:smoke` passes locally and in CI. The regression suite is the gate that protects the BCBS demo through Month 2's churn.

### Optional PR-12 / PR-13 / PR-14 (only if time permits Week 4)

- PR-12 · `chore(ui): extract theme + utility helpers from App.jsx` — pulls `C`, `CMMI_LEVELS`, `cmmi`, `hc`, `fmtD`, `fmtNum`, `fmtExp` into `frontend/src/lib/theme.js` and `frontend/src/lib/format.js`. Sets up the App.jsx split mechanics so Month 2 PRs can extract whole pages cleanly. **Risk:** touches every page; smoke test must stay green.
- PR-13 · `docs(api): OpenAPI spec for /api/risk-engine` — first OpenAPI doc in the repo.
- PR-14 · `feat(ui): "Generate narrative for any finding" demo button on CISO dashboard` — wires CISO dashboard to the engine without extracting it; proves the end-to-end story for demo conversations.

PR-12 is the only one with cross-page surface area; it's deliberately last so that if it slips, the engine ships without it.

---

## 7. Test plan

### 7.1 Unit (run on every PR, fast)

- `financialModelV1` — pure function, table-driven per (scenario, dataObjects, criticality) combo.
- `frameworkCitations` — pure lookup, table-driven per (scenario × classification) combo.
- `resolveOwners` — pure function over process + executive_owners list.
- `validateFindingBody` — pure validator for POST payloads.
- `RiskNarrative` React tree against fixture JSON (vitest + react-testing-library).
- Migration runner tested via in-memory ledger + a temp-PG harness in CI.

### 7.2 Integration (run on every PR, slower)

- Ephemeral Postgres in CI (services: postgres:15 in `ci.yml`).
- Migration up → down → up round-trip yields a stable schema.
- `GET /api/risk-engine/processes` returns 12 rows for BCBS demo.
- `GET /api/risk-engine/correlate/f_001_demo_nasco_cve` matches the §4.2 fixture snapshot.
- `POST /api/risk-engine/findings` then `GET /api/risk-engine/correlate/:newId` round-trips.

### 7.3 Smoke (run nightly + on PR before merge)

- `bcbs-demo.spec.js`: end-to-end through the React app via vitest + jsdom (no real browser). Walks the dashboards, asserts no crashes, asserts the new `risknarrative` page renders the hero narrative.
- Captures a textual diff of the narrative HTML against a golden file. If anyone changes a $ amount, a framework citation, or an owner string, the diff fails loudly.

### 7.4 BCBS demo regression — what counts as "still green"

The PRODUCTION_PROMPT mandates "BCBS Demo flow stays green at every commit." Concretely:

1. `loadBCBSDemoPreset()` runs without throwing.
2. `Setup` → `hub` → `dashboard` (CISO) → `cro` → `cfo` → `boarddash` renders for each page without throwing.
3. `dashboard.financialExposure` widget shows the same number as before this month's work (no regressions in CFO math).
4. `risknarrative` (with flag on) → finding picker → hero narrative renders with the §4.2 content.
5. ITSM ticket creation flow (`POST /api/itsm/snow/ticket`) still returns the demo ticket envelope.

The smoke suite in PR-11 implements 1–4. ITSM flow (5) is covered by a supertest in `cyberrx-api/tests/itsm.spec.js` added incidentally in PR-1.

---

## 8. Documentation each PR ships

| PR | Doc updates |
|----|-------------|
| PR-1 | `docs/runbooks/migrations.md` (new), `README.md` (test commands), `cyberrx-api/.env.example` (no new vars yet) |
| PR-2 | `docs/data-model.md` (new) |
| PR-3 | `docs/data-model.md` (reference data section) |
| PR-4 | `docs/data-model.md` (crown-jewel seed table), `COVERAGE_ASSESSMENT.md` (10→12 reconciliation footnote) |
| PR-5 | `docs/data-model.md` (assets, data objects, joins) |
| PR-6 | `docs/data-model.md` (executive_owners, findings extension) |
| PR-7 | `docs/api/risk-engine.md` (new) — read endpoints |
| PR-8 | `docs/api/risk-engine.md` (correlate endpoint + algorithm description), `docs/architecture/correlation-engine.md` (new) |
| PR-9 | `docs/api/risk-engine.md` (write endpoints) |
| PR-10 | `docs/ui/risk-narrative.md` (new — component map, props contract, feature flag), `frontend/.env.example` (`VITE_FEATURE_RISK_NARRATIVE`) |
| PR-11 | `docs/demo/bcbs-regression.md` (new), `docs/runbooks/risk-engine.md` (new) |

Every PR must also update `README.md` if its commands/env vars change.

---

## 9. Acceptance criteria for Month 1 (the "done" gate)

By end of Week 4 all of these are true. Anything not true blocks Month 2.

1. `cyberrx-api/migrations/` exists with a working runner. CI green.
2. All six entities + needed join tables exist in the schema. `down` migrations reverse cleanly.
3. BCBS demo seed produces 12 crown-jewel processes, ≥15 assets, 7 data objects, 6 threat scenarios, 8 legal obligations, 6 executive owners, 1 hero finding.
4. `GET /api/risk-engine/correlate/f_001_demo_nasco_cve` returns the §4.2 JSON (snapshot test gates this).
5. `RiskNarrative` page renders that JSON as the assessment's Final Recommendation screenshot, behind the `VITE_FEATURE_RISK_NARRATIVE` flag.
6. Four existing dashboards (CISO, CRO, CFO, Board) still render with no diffs in rendered KPI numbers.
7. Smoke regression suite passes in CI.
8. All new endpoints validate `X-Org-Id` presence (single-tenant posture preserved; JWT is Month 4).
9. No production-mode tenant has any `is_demo = TRUE` rows.
10. No new permissive CORS, no new `// TODO tighten` comments, no new `console.log` of secrets.

---

## 10. Stop-condition checks (from `PRODUCTION_PROMPT.md`)

These are decision gates the user must clear before code starts on the indicated PRs.

| Stop condition | Affected PR | Status |
|---|---|---|
| "Changing pricing or positioning copy in the product" | None — no copy changes | Cleared |
| "Adding any user-facing claim about regulatory compliance status (HIPAA, SOC2, etc.)" | PR-10 (UI) — the narrative cites HIPAA §164.308(a)(5) and CMS 42 CFR §422.306(c)(1). These are **citations of the customer's obligations**, not claims about Nerion's own SOC2/HIPAA status. Confirm this distinction is acceptable before PR-10 ships, and add a disclaimer footer to `RiskNarrative` if not. | **Needs confirmation** |
| "Shipping a new dashboard route to production without a feature flag" | PR-10 — `risknarrative` is behind `VITE_FEATURE_RISK_NARRATIVE`, default off in production. Confirm flag mechanism is acceptable. | **Needs confirmation** |
| "Migrating data that affects the BCBS demo tenant" | PR-3 through PR-6 all write seed rows to `org_id = 'bcbs-demo'`. This **is** migrating data that affects the BCBS demo tenant. Confirm before PR-3 runs against the demo deployment. | **Needs confirmation** |

---

## 11. Risks, open questions, decisions before code starts

These need answers (or explicit "decide later") before PR-1 lands. Numbered for review.

**Q1. "10 vs 12" canonical reconciliation.** §3.1 proposes twelve. Confirm or override.

**Q2. Threat-scenario taxonomy: MITRE ATT&CK vs custom labels vs both.** Proposed: keep MITRE technique IDs as an array (`mitre_techniques TEXT[]`) for technical drill-down, but use plain-English `category` (`ransomware`, `phishing`, etc.) as the engine's join key. Confirm.

**Q3. Findings table — add now or defer.** The codebase has no `findings` table today. The engine needs one to do anything. Proposed: add it in PR-6 (§2.8). Alternative: keep findings purely in-memory as JSON in App.jsx until Month 2. **Recommendation: add it now**; the assessment's §5 names `Finding` as a first-class entity, and we'd otherwise have to re-architect in Month 2.

**Q4. LegalObligation seed source.** Proposed: hand-author the eight obligations the BCBS hero narrative cites, based on public-record citations (HIPAA, CMS 42 CFR, state AGs). Do **not** scrape or import third-party data. Phase 2 (Month 5+) builds the full obligation library. Confirm hand-authoring is acceptable for the demo.

**Q5. Financial-exposure model calibration.** The $217M number in the assessment is a target for the demo. Proposed: a deliberately simple model — `base_loss_per_record[scenario.category][data_class] * record_count * criticality_multiplier` — calibrated so the BCBS hero gives ~$217M. The model is documented as a v1 demo placeholder; Month 5's `FinancialImpact` entity replaces it with the real CFO scenario builder. Confirm the demo target.

**Q6. Auth posture for the new endpoints.** Proposed: match existing routes — trust `X-Org-Id` header, no JWT. Defer JWT to Month 4 as the prompt sequences. Risk: the new endpoints expose seed data, which is demo-only and tagged `is_demo`. Confirm we're not shipping the new endpoints to a domain where unauthenticated `X-Org-Id` reads are unacceptable.

**Q7. Scheduler.** Out of scope but: do we want PR-11 to also delete the scheduler code (per the assessment's "either run it or remove it"), or is that a Month 4 decision? **Recommendation: defer.**

**Q8. Should PR-12 (theme extraction) happen this month or wait for Month 6?** The prompt says the App.jsx split is incremental and starts now. Proposed: ship PR-12 only if Week 4 has slack. The risk-engine work is the higher priority.

**Q9. CI infra.** We propose GitHub Actions in PR-1. The repo has no `.github/workflows/`. Confirm we can add it (no Actions billing or org-policy blockers).

**Q10. PG version + ephemeral test DB.** Proposed: PG 15 in CI via the `services:` block. Confirm Render is on PG 15 too (if not, pin CI to whatever Render uses).

**Q11. Where do we put the BCBS demo deployment.** The seed only applies when `SEED_BCBS_DEMO=1`. Is there a separate Render service for the demo, or do we re-use the existing single service with the env flag toggled? **Recommendation: separate service.** If we're sharing one Render service between "BCBS demo for sales" and "real customer onboarding", the `is_demo` row-level tagging is sufficient but operationally risky. Confirm.

**Q12. The assessment's "Final Recommendation" screenshot.** It's ASCII-art in `COVERAGE_ASSESSMENT.md` §9. The plan's UI in §5 reproduces every line item. Confirm there's not a separate higher-fidelity mock (Figma, PNG) that we should match instead.

---

## 12. Out of scope (explicitly deferred)

For absolute clarity — these are **not** Month 1:

- CIO Dashboard (Month 3).
- CLO Dashboard (Month 3).
- Internal Audit dashboard separation (Month 4).
- JWT enforcement, CORS hardening, multi-tenant credential isolation (Month 4).
- Exception/risk-acceptance workflow (Month 5).
- Evidence collection + AI control extraction (Month 5).
- Control drift detection (Month 5).
- Splitting CISO/CRO/CFO/Board dashboards out of App.jsx (Month 6 + opportunistic in Month 2).
- Exportable board reports (Month 6).
- AI executive summaries / BrianaBar upgrade (Phase 3).
- Background scheduler deployment decision.

---

## 13. Review checklist — sign off before code starts

- [ ] Q1–Q12 in §11 all answered.
- [ ] Three stop conditions in §10 confirmed.
- [ ] Acceptance criteria in §9 confirmed as the right "done" gate.
- [ ] PR sequence in §6 confirmed (eleven required, three optional).
- [ ] No production code has been written; this is docs-only.

**On sign-off:** start with PR-1. Do not start PR-2 until PR-1 is merged. Each PR's acceptance criterion is the gate for the next.

— end of plan —

---

## Tracking — discoverability

This plan is operationalized via the in-repo tracking system at [`tracking/`](../../tracking/). Specifically:

- [`tracking/BACKLOG.md`](../../tracking/BACKLOG.md) — kanban-style queue. Every PR in §6 has a row with current status, branch, dependencies, and a link to its issue file. The Open Questions table at the bottom mirrors §11 of this plan.
- [`tracking/STATUS.md`](../../tracking/STATUS.md) — manager-facing status report. What's delivered, what's in progress, what's blocked, what's planned next, risk register. Updated every work session.
- [`tracking/issues/`](../../tracking/issues/) — one file per PR (PR-01 through PR-14), each with YAML frontmatter compatible with `gh issue create -F <file>` for future GitHub mirroring.
- [`tracking/standups/`](../../tracking/standups/) — one file per work session.
- [`tracking/CHANGELOG.md`](../../tracking/CHANGELOG.md) — Keep-a-Changelog format; appended each time a PR merges.
- [`tracking/README.md`](../../tracking/README.md) — how the system works, issue lifecycle, branch convention, done-criteria checklist.

When a PR's acceptance criteria in this plan change, update both the plan section AND the corresponding `tracking/issues/PR-XX-*.md` file's `## Acceptance Criteria` list. Plan and tracker must stay in sync.
