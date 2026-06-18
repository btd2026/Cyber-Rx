# Intake Module Redesign — Implementation Plan

Status: **PLAN — awaiting approval. No feature code written yet.**

Enterprise constraints honored throughout: one shared substrate, **visibility
confidence** on inferred data, and an **evidence ledger** that logs every user
validation (who / when / what). Nothing inferred is auto-accepted — it persists
only after user validation. All LLM steps return **strict JSON** with per-item
`confidence` + short `rationale`.

---

## A. How intake works today (the surface we're changing)

| Area | Where | Today |
|---|---|---|
| Profile | `App.jsx` `Setup()` + `SetupBot` (~4486–4556, 4651–5800) | A conversational **bot/Q&A sequence** gathers org fields; persisted to `orgs.setup_json` via `PUT /api/orgs/:id`. |
| Business processes | `App.jsx` (~5814–5935); `routes/intake.js` (`/extract-processes`, `/save-processes`); `ProcessExtractionService.js` | File upload → LLM/heuristic extract → flat function/process/subprocess list with `include`/`tier`/`rto`. Saved to `business_processes` (id `${org}::proc::${slug}`). No confidence/source/level/parent, no per-node accept/delete/edit, no validation logging. |
| Applications | `App.jsx` (~5939–6200); `routes/ingestion.js`; `IngestionService.js`; `AppProcessMap.jsx`; `crosswalk/CrosswalkService.js` | Upload (CSV/CMDB/API/sample) → `applications`. "Intelligently map" → `POST /api/crosswalk/app-process/auto` (LLM + heuristic) → `app_process_map`. Bipartite graph view; criticality inheritance exists (`Prop.inheritAppCriticality`). |
| Vendors / Security systems | `App.jsx` (~4806–4887 infra, ~5168–5253 vendor) | Checkbox selection + credentials; presets per LOB. |
| Documents | `OrganizationIntakeDocuments.jsx`; `POST /api/intake/documents` | Policy upload → assessment pipeline. |
| Launch | `App.jsx` (~5325–5399) | Progress-bar "compile" animation; saves baseline metrics. |
| Shared primitives | `VisibilityService.assess()`, `DecisionEngineService.record()/ledger()`, `ingestion/parsers.js` (CSV/JSON/XML/XLSX), Jira connector pattern in `ProjectPortfolioService.importFromJira` | Reusable as-is. |

---

## B. Target flow (new order) and per-step disposition

1. **PROFILE** — single form. **REWRITE** the Q&A/bot sequence → one reviewable form.
2. **BUSINESS PROCESSES** — upload → LLM tree → validate. **REFACTOR** (extraction schema + tree UI) + **EXTEND** (data model, ledger).
3. **APPLICATIONS** — upload OR CMDB pull → 3-tier confidence cascade → process-centric validate → gaps + criticality propagation. **EXTEND/REFACTOR**.
4. **DOCUMENT INPUT** — **KEEP AS IS** (just sequence here).
5. **SECURITY SYSTEMS** — **KEEP AS IS** (just sequence here).
6. **SUMMARY** — **REWRITE** the launch animation into a real review + coverage stats + visibility indicator + **Confirm & Compile** that emits validated structures.

---

## C. Step-by-step plan

### STEP 0 — Foundation (data model + ledger + connector interface)
**Data model (`utils/db.js`, idempotent `ALTER`/`CREATE … IF NOT EXISTS`):**

- `business_processes` → **EXTEND** add: `parent_id TEXT`, `level TEXT CHECK (level IN ('function','process','subprocess'))`, `source TEXT`, `confidence NUMERIC`, `status TEXT DEFAULT 'proposed'`. (Keep existing `tier`/`criticality`/`owner`.)
- `applications` → **EXTEND** add: `vendor TEXT`, `hosting TEXT`, `data_classification JSONB DEFAULT '[]'`, `source TEXT`, `status TEXT DEFAULT 'proposed'`. (Keep `criticality`/`tier`/`rto`/`external_ref`.)
- `app_process_map` → **REFACTOR** into the canonical **`process_application_map`** join. Add: `id TEXT`, `relationship_type TEXT CHECK (relationship_type IN ('primary','supporting'))`, `rationale TEXT`, `status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed','validated','rejected'))`, `validated_by TEXT`, `validated_at TIMESTAMPTZ`. Migrate existing `confirmed`/`confirmed_by` → `status`/`validated_by`. **Open decision (D1):** extend `app_process_map` in place and treat it as `process_application_map` (lower risk; many services reference `app_process_map`) **vs** create a new table + view + migrate references. *Recommendation: extend in place, add a `process_application_map` VIEW alias.*
- **NEW `intake_validation_ledger`** (mirrors the `decision_ledger` who/when/what pattern): `id, org_id, step TEXT, object_type TEXT ('process'|'application'|'mapping'), object_id TEXT, action TEXT ('accept'|'edit'|'delete'|'add'), changes JSONB, decided_by TEXT, rationale TEXT, created_at TIMESTAMPTZ`. **Open decision (D2):** dedicated table (recommended — `decision_ledger` is tightly coupled to DecisionCard semantics: `card_id`, role enum, accept-requires-rationale) **vs** reuse `decision_ledger` with synthetic `card_id`. *Recommendation: dedicated `intake_validation_ledger`, same architectural pattern, exposed via an `IntakeLedgerService`.*

**Connector interface (NEW `cyberrx-api/src/connectors/`):** a small `CmdbConnector` interface `{ test(config), pullApplications(config) }` modeled on `ProjectPortfolioService.importFromJira`. First implementation **`ServiceNowConnector`** (CMDB `cmdb_ci_appl` / business-service + application-service relationships). Scaffold + interface now; ServiceNow read path is the first concrete connector.

**Compiler handoff scaffold (NEW `IntakeCompileService` — scaffold only):** on Confirm & Compile, emit the validated chain inputs `business risk → process → application → security system → control`. Stub `framework_assessment` storage with **independent per-framework columns** (NIST CSF 2.0, NIST SP 800-53 Rev 5, CIS Controls, ISO 27001, SOC 2) — **no crosswalk between frameworks**. Heavy compile logic is a separate follow-up.

### STEP 1 — Profile (single form) — **REWRITE**
- Replace `SetupBot`/Q&A with one `<ProfileForm>` containing every field currently captured (orgName, orgType, industry, revenue, employees, surplus, RBC, IBNR, insurance, IT budget, endpoints, priv accounts, …). One submit → `PUT /api/orgs/:id` (`setup_json`) — **unchanged API**. Keep the existing field set so downstream consumers don't break.
- Files: `App.jsx` `Setup()` (carve the bot out), small new `ProfileForm` section/component.

### STEP 2 — Business processes — **REFACTOR + EXTEND**
- Upload (CSV/XLSX/DOCX/PDF) with a clear **"file received"** state (filename + parse status). Reuse `ingestion/parsers.js`.
- **REFACTOR `ProcessExtractionService`** output to a **tree** (strict JSON): per node `{ name, level (function|process|subprocess), parent, confidence, source }`, depth adapting per org. Keep heuristic fallback.
- **REWRITE** the tree UI: editable FUNCTION→PROCESS→SUB-PROCESS tree; each node has **ACCEPT / DELETE / EDIT (rename or add child)**. Persist **only validated** nodes to `business_processes` (with `level`/`parent_id`/`source`/`confidence`/`status='validated'`). **Log every action** to `intake_validation_ledger`.
- New endpoints: `POST /api/intake/processes/infer` (returns tree), `POST /api/intake/processes/validate` (persists validated nodes + ledger).

### STEP 3 — Applications — **EXTEND + REFACTOR**
- Upload an app inventory **OR** enter a CMDB key → **ServiceNow pull** (connector). Clear "uploaded/pulled successfully" state. Reuse `IngestionService`; capture `vendor`/`hosting`/`owner`/`data_classification`.
- **Three-tier confidence cascade** in `CrosswalkService`:
  - (a) **inventory** linkage first (CMDB business-service/application-service relationships, "supported capability", owner, BU) → `source='inventory'`, high confidence.
  - (b) **LLM semantic** match for the rest → mapping + `rationale` + `confidence`.
  - (c) **corroborate** with data-classification/data-flow + owner-org alignment to adjust confidence.
- Many-to-many; strict JSON; **low-confidence sorted to top**. Persist to `process_application_map` with `relationship_type`/`confidence`/`rationale`/`status='proposed'`.
- **Process-centric** review UI (per process → its mapped apps), each row **ACCEPT / DELETE / EDIT (reassign/add)** → sets `status`/`validated_by`/`validated_at`; **log to ledger**.
- **Gap detection** (intake findings): processes with no apps (coverage holes / shadow IT) + apps with no process (orphans).
- **Criticality propagation**: app criticality = **max** of mapped-process criticalities (extend existing `inheritAppCriticality`).

### STEP 4 — Document input — **KEEP AS IS** (sequence only).
### STEP 5 — Security systems — **KEEP AS IS** (sequence only). **Open decision (D3):** the current flow has *both* a Vendor step and an Infra/Tool-connections step — confirm whether "Security Systems" = the infra/tool-connections step only, or vendor+infra combined. *Recommendation: keep both, grouped under "Security Systems," unchanged.*

### STEP 6 — Summary — **REWRITE**
- Review of: profile, validated process hierarchy, validated process→app mapping with **coverage stats** (# processes, # apps, % mapped, # orphan apps, # uncovered processes), documents, security systems, and an **overall visibility-confidence indicator** (`VisibilityService.assess`).
- **Confirm & Compile** → `IntakeCompileService.compile(orgId)` emits the validated structures for the compiling phase (scaffold) and marks intake complete.

---

## D. Implementation order (each is a separate PR; STOP for review after each)
0. **Foundation** — data model migrations, `intake_validation_ledger` + `IntakeLedgerService`, `CmdbConnector`/`ServiceNowConnector` interface, `IntakeCompileService` scaffold + per-framework assessment table scaffold.
1. **Step 1 Profile** — single form.
2. **Step 2 Business processes** — upload + LLM tree + validation + ledger.
3. **Step 3 Applications** — upload/CMDB + 3-tier cascade + process-centric validation + gaps + criticality propagation.
4. **Step 6 Summary** — review + coverage stats + visibility + Confirm & Compile handoff. (Steps 4 & 5 are sequencing-only.)

## E. Open decisions for you (D1–D3 above)
- **D1** `process_application_map`: extend `app_process_map` in place (+ view alias) vs new table + migrate refs. *Rec: extend in place.*
- **D2** Intake validation logging: dedicated `intake_validation_ledger` vs reuse `decision_ledger`. *Rec: dedicated.*
- **D3** "Security Systems" step scope: infra/tools only vs vendor+infra. *Rec: keep both, unchanged.*
