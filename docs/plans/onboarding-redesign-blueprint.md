# Cyber-Rx Onboarding & Scoring Redesign — Architecture Blueprint

> **Status:** Design proposal · **Branch:** `claude/jolly-johnson-wpmis3` · **Author:** AI architecture pass · **Date:** 2026-06-22
>
> **Scope:** Redesign the customer onboarding/intake experience and the onboarding-completeness + control-scoring engine so the platform can answer the eight executive questions across seven compliance frameworks. This is a **redesign on top of the existing PostgreSQL schema**, not a rewrite. New tables and columns are additive; existing `cae_*`, `ciso_entities`, intake, and framework tables are reused wherever they already do the job.

---

## 0. Executive summary

Cyber-Rx already has a deep backend: a Control Assessment Engine (`cae_*`), a framework/crosswalk catalog (`frameworks`, `framework_requirements`, `requirement_crosswalks`), a correlation engine (`business_processes`, `assets`, `applications`, `risks`, `findings`), a document-evidence pipeline (`document_upload` → `control_assessment`), and executive reporting (`ciso_entities`, `executive_briefs`, `exec_summaries`).

What it **lacks** for a clean onboarding-to-answers story:

1. **A single, ordered onboarding journey** with explicit phase gates and a completeness measure. Today intake is a set of capable-but-disconnected endpoints (`/intake/*`) with no canonical "where am I / what's left" state.
2. **A unified Control Library** that spans all seven target frameworks (NIST CSF 2.0, NIST 800-53, **CIS v8**, plus the missing **ISO 27001, SOC 2, HIPAA, HITRUST**) with a crosswalk so one piece of evidence scores many frameworks at once.
3. **A first-class onboarding-completeness score** distinct from the control-effectiveness score — the platform measures how good your controls are, but not how complete your *picture* is.
4. **Business-context and governance capture** rich enough to answer CFO/CLO/Board questions (financial exposure, legal obligations, ownership), which exist as tables but are not populated by onboarding.
5. **Structured AI document ingestion** that extracts *facts into the schema* rather than storing normalized text and a per-control verdict.

This blueprint defines a **7-phase onboarding workflow**, the additive **data model + migrations**, an **AI ingestion pipeline** that writes structured extractions, a **unified Control Library + framework crosswalk** (adding the four missing frameworks and a System-50 / Documentation-30 / Human-20 evidence model), an **onboarding-completeness score** across six coverage dimensions, **UI screen specs** for every phase, and the **backend services / API contracts** that wire it together.

---

## 1. Gap analysis

### 1.1 The eight executive questions and what they require

| # | Executive question | Owner | Data required | Today's gap |
|---|---|---|---|---|
| 1 | *Are we secure?* (control effectiveness) | CISO | Control assessments + evidence freshness | ✅ `cae_result` covers this; missing cross-framework rollup |
| 2 | *Are we compliant?* (framework posture) | CISO/CLO | Per-framework requirement status | ⚠️ Only 4 frameworks; **no ISO 27001 / SOC 2 / HIPAA / HITRUST** |
| 3 | *What's our financial exposure?* | CFO | Risk monetization, breach cost models | ⚠️ `financial_impacts` table exists but onboarding never populates inputs (record counts, revenue, downtime cost) |
| 4 | *What are our legal/regulatory obligations?* | CLO | Applicable regulations, citations, timelines | ⚠️ `legal_obligations` table exists; not captured at onboarding |
| 5 | *Who owns what risk?* | CRO/Board | Executive ownership, scoping | ⚠️ `executive_owners` table exists; not captured at onboarding |
| 6 | *What's our third-party/vendor risk?* | CISO/CRO | Vendor inventory + assurance docs | ✅ Vendor subsystem strong; ⚠️ not linked from onboarding |
| 7 | *How does business value map to risk?* | CRO/Board | Process → app → data → control chain | ⚠️ Chain modeled but onboarding stops at app→process |
| 8 | *Are we improving?* (trend) | Board | Score history over time | ✅ `score_history`, `ciso_dashboard_snapshots`; needs onboarding baseline |

### 1.2 Missing data (must be captured during onboarding)

- **Business context / financials:** annual revenue, employee count, regulated record counts (PHI/PII/PCI), per-process downtime cost (RTO is captured; cost-per-hour is not), cyber-insurance coverage. → feeds Q3.
- **Legal/regulatory applicability:** which of HIPAA/CMS/State/NAIC/PCI/GLBA/SOX apply, jurisdictions, contractual security obligations. → feeds Q4 (`legal_obligations`).
- **Ownership:** executive owners per role (CIO/CISO/CFO/CRO/CLO) with scope. → feeds Q5 (`executive_owners`).
- **Governance documentation:** which policies/standards/plans exist, their status and review dates — captured today only as uploads against control checks, not as a governance inventory.
- **Human/program controls:** training cadence, tabletop exercises, staffing, third-party assessments — the "Human 20" dimension (see §5.4). No home today.
- **Framework selection / applicability:** which of the seven frameworks the customer must report against (drives scoping and completeness denominator).
- **Onboarding state:** there is no record of *which phase the org is in* or *what % complete* — every screen recomputes ad hoc.

### 1.3 Redundant / friction steps to remove or merge

- **Two parallel CSF intakes:** `csf_evidence` (Q&A intake in `routes/csf.js`) and the document-pipeline intake (`document_upload` → `control_assessment`) both capture control evidence with no shared model. **Merge** into one evidence ledger.
- **Disconnected process/app/document phases:** `extract-processes`, `apps/ingest`, `documents` are independent endpoints with no shared "intake session" or progress. **Unify** under an onboarding session with phase gates.
- **Per-document, per-control LLM re-review** with no fact extraction: the pipeline stores `normalized_text` and a verdict but throws away the structured facts (dates, owners, scopes) the LLM saw. **Replace** the verdict-only output with structured extraction (§4).
- **Manual tool declaration vs. connector setup** (`cae_selected_tool` vs `cae_connection`): the org declares tools in intake, then re-enters them when connecting. **Link** declaration → connector template offer.
- **Three "connector" concepts** (`tool_connections`, `connector`, `cae_connection`, `vendor_monitoring_connections`): keep them (different domains) but present **one unified "Connections" surface** in onboarding so the user sees one list.

---

## 2. Redesigned onboarding workflow (7 phases)

The journey is a **stateful, resumable, gated** flow. Each phase writes to the schema, contributes to the **onboarding-completeness score** (§6), and unlocks the next. Phases are navigable out of order, but the **Completeness Dashboard** (Phase 7) shows what each unanswered phase costs.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ONBOARDING SESSION  (onboarding_session: phase, status, completeness%)     │
└──────────────────────────────────────────────────────────────────────────┘
   1. Business Context  ─►  2. Applications & Tech  ─►  3. Security Connectors
            │                                                     │
            ▼                                                     ▼
   4. Governance & Docs  ◄─  5. Third-Party Risk    ◄──────────────┘
            │
            ▼
   6. Scoring Engine (compile)  ─►  7. Completeness Dashboard (gate to "live")
```

### Phase 1 — Business Context & Profile
**Goal:** capture who the org is, what it must comply with, who owns risk, and the financial inputs that monetize it.
- Org profile (existing `orgs` + `setup_json`): industry, size, FEP/BCBS affiliation.
- **NEW:** financial inputs → `org_business_context` (revenue, employees, record counts by data class, insurance coverage, baseline downtime cost).
- **NEW:** framework selection → `org_framework_scope` (which of the 7 frameworks + baseline, e.g. 800-53 moderate, CIS IG2).
- **NEW:** legal/regulatory applicability → populate `legal_obligations` from a seeded obligation library filtered by industry/jurisdiction.
- **NEW:** executive ownership → populate `executive_owners` (role → user/name/email + scope).
- Business process tree: reuse `business_processes` (extract/infer/validate flow already exists). **Add** cost-per-hour-down to each process for Q3.

### Phase 2 — Applications & Technology
**Goal:** build the asset/app inventory and the process→app→data chain.
- App discovery: reuse `applications`, `app_process_map` (CMDB pull + cascade + validate).
- Asset inventory: reuse `assets`.
- **Data catalog:** reuse `data_objects` (PHI/PII/PCI), link to systems/apps/processes → completes the value-to-risk chain for Q7.
- **Technology stack declaration:** reuse `cae_selected_tool` — the org declares which security tools it runs (EDR, IAM, SIEM, …). This drives which connectors are offered in Phase 3 and which controls are *automatable*.

### Phase 3 — Security Connectors
**Goal:** connect live evidence sources so control scoring is automated, not attested.
- One unified "Connections" surface over `cae_connection` (templated CAE connectors), `connector` (CMDB/EASM/vuln), and `tool_connections`.
- For each tool declared in Phase 2 that has a `cae_connector_template`, offer one-click connect. Secrets → vault; only `cae_connector_field` (non-secret) shown.
- Connection health feeds completeness (an automatable control with no connection is a coverage gap).

### Phase 4 — Governance & Documentation
**Goal:** capture the documented program and extract structured facts.
- Governance inventory: **NEW** `governance_document` rows for each requested policy/standard/procedure/plan/record (seeded from `document_type`), each with status + review date.
- Upload → **AI structured ingestion** (§4): extract owner, effective/review dates, scope, named controls, and per-control verdicts → write to `document_extraction` + the unified evidence ledger.
- Merge the two CSF intakes: the Q&A flow (`csf_evidence`) becomes optional manual attestation that writes into the same evidence ledger as documents.

### Phase 5 — Third-Party / Vendor Risk
**Goal:** inventory vendors and attach assurance.
- Vendor inventory: reuse `third_party_dependency` + `vendor_risk_assessment`.
- Upload vendor assurance docs (SOC 2, ISO cert, BAA, pentest) → existing Saraqael pipeline (`vendor_document_review`).
- Critical vendors (supporting Critical processes) that lack assurance are completeness gaps.

### Phase 6 — Scoring Engine (Compile)
**Goal:** turn everything captured into per-framework posture + completeness.
- Run the **compile** (existing `compile_run` → `control_framework_assessment`) and the **CAE run** (`cae_run` → `cae_evidence` → `cae_result`).
- **NEW:** project results across all seven frameworks via the unified Control Library crosswalk (§5).
- Write baseline `score_history` + `onboarding_completeness` rows.

### Phase 7 — Completeness Dashboard (go-live gate)
**Goal:** show the org exactly how complete their picture is and what each gap costs in answer-confidence.
- Six-dimension completeness score (§6) with drill-down to the specific missing item and the phase that fills it.
- "Answer readiness" per executive question (Q1–Q8): green/amber/red based on the data each question depends on.
- Gate: org can mark onboarding "live" at any completeness, but the dashboard is honest about confidence.

---

## 3. Data model (additive)

All new tables follow existing conventions: `id TEXT PRIMARY KEY` (UUID) unless noted, `organization_id` for tenant scope, JSONB for flexible sub-structures, created in `db.init()` alongside the current tables. **No existing table is dropped or altered destructively;** new columns are added with safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

### 3.1 Onboarding state & completeness

```sql
-- One active onboarding journey per org
CREATE TABLE IF NOT EXISTS onboarding_session (
  id            TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id),
  phase         TEXT NOT NULL DEFAULT 'business_context',  -- enum of 7 phases
  status        TEXT NOT NULL DEFAULT 'in_progress',       -- in_progress|live|paused
  completeness  NUMERIC DEFAULT 0,                          -- 0-100 cached
  phase_state   JSONB DEFAULT '{}',                         -- per-phase started/completed flags
  started_at    TIMESTAMPTZ DEFAULT now(),
  went_live_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_session_org ON onboarding_session(organization_id);

-- Completeness score broken down by the six dimensions (§6), one row per compute
CREATE TABLE IF NOT EXISTS onboarding_completeness (
  id            TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id),
  overall       NUMERIC NOT NULL,            -- 0-100 weighted
  dimensions    JSONB NOT NULL,              -- {business_context, asset_coverage, connector_coverage,
                                             --  governance_coverage, third_party_coverage, framework_coverage}
  answer_readiness JSONB,                    -- {q1..q8: green|amber|red}
  computed_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_completeness_org ON onboarding_completeness(organization_id, computed_at DESC);
```

### 3.2 Business context & framework scope (Phase 1)

```sql
CREATE TABLE IF NOT EXISTS org_business_context (
  organization_id TEXT PRIMARY KEY REFERENCES orgs(id),
  annual_revenue        NUMERIC,
  employee_count        INTEGER,
  record_counts         JSONB,    -- {PHI: n, PII: n, PCI: n, ...} -> feeds financial_impacts
  insurance_coverage    NUMERIC,  -- cyber policy limit
  downtime_cost_per_hour NUMERIC, -- org default; per-process override on business_processes
  jurisdictions         JSONB,    -- ['US-CA','US-NY','EU',...]
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Which frameworks this org must report against + baseline
CREATE TABLE IF NOT EXISTS org_framework_scope (
  organization_id TEXT NOT NULL REFERENCES orgs(id),
  framework       TEXT NOT NULL,    -- nist_csf_2 | nist_800_53_r5 | cis_v8 | iso_27001 | soc_2 | hipaa | hitrust
  in_scope        BOOLEAN DEFAULT true,
  baseline        TEXT,             -- moderate | ig2 | etc.
  reason          TEXT,             -- why in scope (regulatory|contractual|voluntary)
  PRIMARY KEY (organization_id, framework)
);
```
`legal_obligations` and `executive_owners` already exist — Phase 1 populates them. Add to `business_processes`:
```sql
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS downtime_cost_per_hour NUMERIC;
```

### 3.3 Governance inventory & structured extraction (Phase 4)

```sql
-- The org's documented program: one row per expected governance artifact
CREATE TABLE IF NOT EXISTS governance_document (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id),
  document_type_id TEXT REFERENCES document_type(id),
  document_upload_id TEXT REFERENCES document_upload(id), -- null until uploaded
  name            TEXT NOT NULL,
  category        TEXT,            -- Policy|Standard|Procedure|Plan|Record
  status          TEXT DEFAULT 'requested', -- requested|uploaded|extracted|reviewed|expired
  owner           TEXT,
  effective_date  DATE,
  review_date     DATE,
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_governance_document_org ON governance_document(organization_id, status);

-- Structured facts extracted from a document (replaces verdict-only output)
CREATE TABLE IF NOT EXISTS document_extraction (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id),
  document_upload_id TEXT NOT NULL REFERENCES document_upload(id),
  extracted       JSONB NOT NULL,  -- {owner, effective_date, review_cadence, scope, named_controls[], ...}
  confidence      NUMERIC,
  engine          TEXT,            -- llm | heuristic
  model           TEXT,
  extracted_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_extraction_upload ON document_extraction(document_upload_id);
```

### 3.4 Unified evidence ledger & control library (§5)

```sql
-- ONE evidence ledger: documents, attestations, connector pulls all land here
CREATE TABLE IF NOT EXISTS control_evidence_ledger (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id),
  library_control_id TEXT NOT NULL REFERENCES control_library(id),
  evidence_kind   TEXT NOT NULL,   -- document | attestation | connector | scan
  dimension       TEXT NOT NULL,   -- system | documentation | human  (§5.4)
  source_ref      TEXT,            -- document_upload_id | cae_result.id | csf_evidence.id
  status          TEXT,            -- met | partial | not_met
  confidence      NUMERIC,
  excerpt         TEXT,
  freshness_date  DATE,            -- when the evidence was last valid
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_ledger_org_ctl ON control_evidence_ledger(organization_id, library_control_id);

-- Framework-agnostic master control list (the "unified Control Library")
CREATE TABLE IF NOT EXISTS control_library (
  id              TEXT PRIMARY KEY,          -- stable internal key, e.g. CL-IAM-001
  domain          TEXT NOT NULL,             -- IAM | Data Protection | Vuln Mgmt | Governance | ...
  title           TEXT NOT NULL,
  description     TEXT,
  dimension       TEXT NOT NULL,             -- system | documentation | human
  weight          INTEGER DEFAULT 1,         -- contribution within domain
  default_method  TEXT,                      -- automated | document | attestation
  meta            JSONB
);

-- Crosswalk: one library control satisfies many framework requirements
CREATE TABLE IF NOT EXISTS control_library_crosswalk (
  library_control_id TEXT NOT NULL REFERENCES control_library(id),
  framework       TEXT NOT NULL,             -- 7 frameworks
  requirement_id  TEXT NOT NULL,             -- e.g. PR.AA-01, AC-2, A.5.15, CC6.1, 164.312(a)(1), 01.a
  coverage        TEXT DEFAULT 'full',       -- full | partial
  PRIMARY KEY (library_control_id, framework, requirement_id)
);
CREATE INDEX IF NOT EXISTS idx_cl_crosswalk_fw ON control_library_crosswalk(framework, requirement_id);
```
> **Reuse note:** `control_library` + `control_library_crosswalk` generalize the existing `requirement_crosswalks` / `cae_control_tool_map`. The CAE's internal `cae_control` rows map **into** `control_library` via a seed join, so the deterministic scoring engine keeps working unchanged and simply gains cross-framework projection.

### 3.5 Migration plan

| Step | Action | Risk | Reversible |
|---|---|---|---|
| M1 | Add new tables in `db.init()` (idempotent `CREATE TABLE IF NOT EXISTS`) | None — additive | Drop tables |
| M2 | `ALTER TABLE business_processes ADD COLUMN downtime_cost_per_hour` | None — nullable | Drop column |
| M3 | Seed `control_library` + `control_library_crosswalk` from a new CSV under `src/data/control-library/` (same loader pattern as `cae/onboardingService.js`) | Low — read-only seed | Truncate + reseed |
| M4 | Backfill `control_evidence_ledger` from existing `control_assessment` + `cae_result` + `csf_evidence` (one-time script) | Low — read existing, write new | Truncate ledger |
| M5 | Seed ISO 27001 / SOC 2 / HIPAA / HITRUST requirements into `framework_requirements` (new CSVs) | Low — additive rows | Delete by framework_id |
| M6 | Create `onboarding_session` rows for existing orgs (default phase = `live` for already-onboarded orgs) | Low | Delete rows |

Migrations live as numbered SQL files in the existing `cyberrx-api/migrations/` directory **and** are reflected in `db.init()` (the repo's dual convention). No ORM tool; raw SQL + the existing manual runner.

---

## 4. AI document ingestion workflow (structured extraction)

**Principle:** the platform does **not** store PDFs as the system of record — it extracts structured facts into the schema and keeps only normalized text + an excerpt for audit. This replaces today's verdict-only pipeline.

```
Upload ─► DocumentNormalizer (PDF/DOCX/XLSX/TXT → text, EXISTING)
        ─► Classify (document_type via LLM/heuristic)
        ─► EXTRACT structured facts  ──────────────┐
        ─► MAP to control_library via crosswalk     │
        ─► SCORE each mapped control (met/partial/not_met)
        ─► WRITE: document_extraction (facts)        │
                  governance_document (status/dates)  │
                  control_evidence_ledger (per control, dimension=documentation)
        ─► PROJECT to all in-scope frameworks (crosswalk)
```

### 4.1 Extraction contract (LLM, with heuristic fallback)
Reuse the existing pattern: `claude-haiku-4-5-20251001` for extraction (cheap, structured), `claude-opus-4-8` for ambiguous/critical docs. Graceful degradation to keyword heuristics when `ANTHROPIC_API_KEY` is absent (existing behavior). Untrusted-input fencing via existing `llmSafety.js`.

Extraction output (written to `document_extraction.extracted`):
```json
{
  "document_class": "Information Security Policy",
  "owner": "VP, Information Security",
  "effective_date": "2025-01-01",
  "review_cadence_months": 12,
  "next_review_date": "2026-01-01",
  "scope": "All production systems and workforce",
  "named_controls": [
    {"library_control_id": "CL-IAM-001", "status": "met",
     "excerpt": "MFA is required for all remote access...", "confidence": 0.9}
  ],
  "gaps": ["No mention of privileged access review cadence"]
}
```

### 4.2 Why structured beats verdict-only
- **Freshness:** `effective_date` / `next_review_date` feed the Timeliness component of scoring and the "expired policy" completeness gap — impossible with verdict-only.
- **Ownership:** extracted owner reconciles against `executive_owners` (Q5).
- **Multi-framework:** one extraction → ledger rows → crosswalk → all 7 frameworks scored from a single upload.
- **Auditability:** `document_extraction` + excerpt give a defensible trail without retaining the source PDF.

---

## 5. Unified Control Library & framework evidence mapping

### 5.1 Frameworks: current vs. target

| Framework | Present today | Action |
|---|---|---|
| NIST CSF 2.0 | ✅ `nist_csf_2` | Reuse |
| NIST 800-53 r5 | ✅ `nist_800_53_r5` | Reuse |
| CIS v8.1 | ✅ `cis_v8_1` | Reuse |
| MITRE ATT&CK | ✅ `attack_enterprise` | Keep (threat coverage, not compliance) |
| **ISO 27001:2022** | ❌ | **Add** — Annex A 93 controls → `framework_requirements` |
| **SOC 2 (TSC 2017)** | ❌ | **Add** — Common Criteria CC1–CC9 + categories |
| **HIPAA Security Rule** | ❌ (only as obligation) | **Add** — §164.308/310/312/314/316 |
| **HITRUST CSF** | ❌ | **Add** — control reference (maps heavily to the others) |

### 5.2 The crosswalk is the multiplier
A single library control (e.g. `CL-IAM-001` "MFA on remote/privileged access") maps to:
`CSF PR.AA-02/03` · `800-53 IA-2(1)` · `CIS 6.3/6.5` · `ISO A.8.5` · `SOC 2 CC6.1` · `HIPAA 164.312(d)` · `HITRUST 01.q`.
So **one connected EDR/IAM source or one uploaded access-control policy scores seven frameworks at once.** This is the core efficiency win and the reason for the `control_library` → `control_library_crosswalk` design rather than per-framework silos.

### 5.3 Reusing the CAE
`cae_control` (105 internal controls) and its scoring stay authoritative for automated evidence. We add a seed mapping `cae_control.control_id → control_library.id` so CAE results post into `control_evidence_ledger` (dimension = `system`) and get crosswalked. The deterministic `scoringEngine.js` is untouched.

### 5.4 The System-50 / Documentation-30 / Human-20 evidence model
Control maturity for a domain is scored across three **dimensions**, weighted:

| Dimension | Weight | Evidence kind | Source |
|---|---|---|---|
| **System** | 50 | Live technical control state | `cae_result` via connectors (Phase 3) |
| **Documentation** | 30 | Policies/standards/plans exist & current | `document_extraction` (Phase 4) |
| **Human** | 20 | Training, tabletops, staffing, reviews | attestation + records (Phase 1/4) |

A domain that is technically strong but undocumented and untrained caps out at 50 — surfacing the real-world truth that tooling alone is not a program. Stored as `dimension` on both `control_library` and `control_evidence_ledger`; rolled up per domain in scoring.

---

## 6. Onboarding completeness scoring

Distinct from control-effectiveness. Answers: *"How complete and trustworthy is the picture we've built?"* Six dimensions, weighted to 100:

| Dimension | Weight | Measure | Source |
|---|---|---|---|
| **Business Context** | 15 | Profile + financials + framework scope + ownership + obligations filled | `org_business_context`, `org_framework_scope`, `executive_owners`, `legal_obligations` |
| **Asset Coverage** | 20 | % of business processes with mapped apps + data objects | `business_processes`, `app_process_map`, `data_objects` |
| **Connector Coverage** | 20 | % of automatable controls with a healthy live connection | `cae_control` (automated) vs `cae_connection` status |
| **Governance Coverage** | 20 | % of requested governance docs uploaded & current (not expired) | `governance_document` |
| **Third-Party Coverage** | 15 | % of critical vendors with current assurance | `third_party_dependency`, `vendor_risk_assessment` |
| **Framework Coverage** | 10 | % of in-scope framework requirements with ≥1 evidence ledger row | `org_framework_scope`, `control_evidence_ledger`, crosswalk |

```
completeness = Σ (dimension_score × weight) / 100      # each dimension_score is 0-100
```

Each dimension drills down to **specific missing items** linked to the phase that fills them ("3 critical vendors missing SOC 2 → Phase 5"). The dashboard also computes **answer readiness** per executive question by checking the dimensions each question depends on (the Q→data map in §1.1), shown green/amber/red.

Persisted to `onboarding_completeness` on every compile (Phase 6) and on demand; the cached value lives on `onboarding_session.completeness` for cheap reads.

---

## 7. UI screen specifications

Frontend is React 19 + Vite + Tailwind + TanStack Query (existing). New screens live under `frontend/src/components/onboarding/`. A persistent **Onboarding Stepper** (7 phases, completeness ring) frames the journey; existing intake components (`IntakeAppMapping.jsx`, `OrganizationIntakeDocuments.jsx`, `IntakeSummary.jsx`) are absorbed into Phases 2 and 4.

| Phase | Screen | Key elements |
|---|---|---|
| Stepper (global) | `OnboardingShell` | 7-phase rail, completeness ring (from `onboarding_session.completeness`), "resume where you left off" |
| 1 | `BusinessContextForm` | Profile, financials, **framework selector** (7 toggles + baseline), obligation picker (industry-seeded), exec-owner table, process tree editor with cost-per-hour |
| 2 | `AppTechInventory` | CMDB connect/pull, app→process mapping (reuse `IntakeAppMapping`), data-object catalog, **tech-stack tool picker** (writes `cae_selected_tool`) |
| 3 | `ConnectorsHub` | Unified connections grid; for each declared tool offer "Connect" (template fields, secrets masked), health badges, "X of Y automatable controls connected" |
| 4 | `GovernanceDocs` | Governance checklist (requested vs uploaded), drag-drop upload → **live extraction preview** (owner/dates/named controls), expired-doc flags, optional CSF Q&A |
| 5 | `ThirdPartyRisk` | Vendor inventory, criticality from supported processes, assurance upload (Saraqael review), gap list (critical vendors w/o assurance) |
| 6 | `CompileReview` | "Run scoring" CTA → progress; per-framework posture cards (all 7), System/Doc/Human breakdown per domain |
| 7 | `CompletenessDashboard` | Six-dimension radar, drill-down to missing items (linked to phase), **answer-readiness panel (Q1–Q8 R/A/G)**, "Go live" gate |

Design language: reuse existing CISO dashboard components (Chart.js, Lucide icons, Tailwind cards) for visual consistency.

---

## 8. Backend services & API contracts

New routes under `cyberrx-api/src/routes/onboarding.js`; new services under `src/services/`. All routes enforce existing org-isolation middleware (`req.orgId` + `X-Org-Id`).

### 8.1 New services
- **`OnboardingService`** — session lifecycle, phase gating, completeness compute, answer-readiness.
- **`ControlLibraryService`** — load/seed library + crosswalk; resolve `framework requirement ↔ library control`; project ledger → per-framework posture.
- **`DocumentExtractionService`** — extends `DocumentPipelineService` to emit structured `document_extraction` + ledger rows (replaces verdict-only path).
- **`CompletenessService`** — the six-dimension calculator (pure function over current schema state; deterministic, testable).

### 8.2 API contract (selected)

```
# Session & completeness
GET    /api/onboarding/session                 -> { phase, status, completeness, phase_state }
POST   /api/onboarding/session/advance         { to_phase }            -> session
GET    /api/onboarding/completeness            -> { overall, dimensions{...}, answer_readiness{q1..q8} }

# Phase 1
PUT    /api/onboarding/business-context        { revenue, employees, record_counts, ... }
PUT    /api/onboarding/framework-scope         { frameworks:[{framework, in_scope, baseline}] }
GET    /api/onboarding/obligations/suggested   -> seeded obligations for industry/jurisdiction
POST   /api/onboarding/owners                  { role, name, email, scope }

# Phase 2 (reuses existing /api/intake/* for apps/processes)
PUT    /api/onboarding/tech-stack              { tools:[{name, category}] }   # -> cae_selected_tool

# Phase 3
GET    /api/onboarding/connectors/available    -> templates matching declared tools
POST   /api/onboarding/connectors/:tool/connect { fields }                    # secrets -> vault

# Phase 4
POST   /api/onboarding/documents               (multipart) -> { upload_id, extraction, ledger_rows }
GET    /api/onboarding/governance              -> checklist with status/expiry

# Phase 5 (reuses vendor subsystem)
GET    /api/onboarding/vendors/gaps            -> critical vendors lacking assurance

# Phase 6
POST   /api/onboarding/compile                 -> { compile_run_id, cae_run_id, per_framework[] }
```

### 8.3 User flow (happy path)
```
Login ─► GET /session (phase=business_context)
      ─► fill Phase 1 ─► advance ─► Phase 2 inventory ─► Phase 3 connect tools
      ─► Phase 4 upload docs (auto-extract) ─► Phase 5 vendors
      ─► POST /compile ─► Phase 7 dashboard shows completeness 82%, Q3 amber (no record counts)
      ─► user fills record counts ─► recompute ─► Q3 green ─► "Go live"
```

### 8.4 What stays exactly as-is
`cae/scoringEngine.js`, `cae_*` private tables, the connector framework, the vendor (Saraqael) subsystem, framework crosswalk tables, executive reporting (`ciso_entities`, `exec_summaries`, `llm_reports`), org-isolation/auth. The redesign is **orchestration + capture + cross-framework projection** layered on the existing engine.

---

## 9. Build sequence (suggested)

1. **Foundations** — M1/M2 migrations, `onboarding_session`, `OnboardingService`, stepper shell. (No behavior change to existing app.)
2. **Control Library** — M3/M5 seeds (4 new frameworks + library + crosswalk), `ControlLibraryService`, projection.
3. **Evidence ledger** — M4 backfill, `control_evidence_ledger`, switch document pipeline to structured extraction (`DocumentExtractionService`).
4. **Phases 1–2 capture** — business context, framework scope, owners, obligations, data catalog, tech-stack.
5. **Phase 3 connectors hub** — unified connections surface over existing connector tables.
6. **Phases 4–5** — governance extraction UI, vendor gaps.
7. **Completeness + Phase 6/7** — `CompletenessService`, compile orchestration, dashboard + answer-readiness.
8. **Cutover** — M6 backfill existing orgs; ship.

Each step is independently shippable and leaves the current app working.

---

## 10. Risks & decisions

- **Crosswalk accuracy** for the four new frameworks is the single biggest quality lever. Seed from authoritative public mappings (NIST OLIR, CIS mappings, HITRUST's own crosswalk) and mark `coverage=partial` where uncertain; never silently claim `full`.
- **Backfill correctness** (M4): existing `control_assessment`/`cae_result` semantics must be preserved; run the backfill in shadow and diff before flipping reads to the ledger.
- **Completeness must not be gameable:** weight connector + governance + framework coverage so that uploading one doc doesn't spike the score; freshness (expired docs) actively decays it.
- **Open question for product:** should "Go live" be gated at a minimum completeness (e.g. 60%), or always allowed with honest amber/red? This blueprint assumes *always allowed, honestly scored*.
```
