# IMPLEMENTATION_MAP — Four-Lens Posture & Executive Reporting

PART 1 deliverable (read-only review). Date: 2026-06-12 · Branch: `feature/exec-reporting`
(based on `main` @ `c23a9bf` + the NIST CSF control-library commit `e861d71`).

Goal: NIST CSF 2.0 + SP 800-53 rev 5(.2.0) + CIS v8.1 + MITRE ATT&CK posture, reported
to the **CRO** (business language) and the **CISO** (operational language). No SOC 2 /
PCI / HIPAA audit features; Type-2/sampling/workpapers phases dropped.

---

## 1. The actual repo (existing conventions win)

The spec assumes `server/` + SQLite + URL routes (`/`, `/board`, `/frameworks`) + WebSockets.
**None of that matches.** Reality:

### Backend — `cyberrx-api/` (Node 20 + Express + PostgreSQL)
- Entry: `cyberrx-api/src/index.js` — mounts ~30 routers (`/api/csf`, `/api/ciso`,
  `/api/controls`, `/api/tools`, `/api/metrics`, `/api/attack-path`, `/api/narratives`, …).
- Schema: `cyberrx-api/src/utils/db.js` — **idempotent `CREATE TABLE IF NOT EXISTS` in
  `db.init()`**; this is the migration mechanism (additive-only). PostgreSQL via `pg`,
  `DATABASE_URL` (Render-managed in prod; local dev Postgres on :5599).
- Tables (grouped): orgs/users/executive_owners · business_processes/assets/data_objects/
  threat_scenarios/legal_obligations/risks/findings/financial_impacts ·
  **controls**/remediation_tasks/evidence/remediation_tickets ·
  csf_evidence/**csf_scorecards**/ciso_posture_snapshots/metric_inputs ·
  vendor_* · executive_briefs · `sim_*` (10 simulated tool sources) · metrics/route_actions/tool_connections.
- Seeds: `cyberrx-api/seeds/*.sql` (19 files) + `scripts/seedDemo.js`. Controls rows are
  seeded in `2026_06_17_executive_brief_demo.sql` and `2026_06_19_multi_org_demo.sql`.
- **No WebSockets anywhere** (server or client). Everything is HTTP fetch.
- Connectors: `src/routes/tools.js` — 8 live tool syncs (Okta, CrowdStrike, Splunk,
  KnowBe4, Tenable, ServiceNow, CyberArk, Workday) writing `metric_inputs`, each with a
  `sim_*` table fallback (the "mock fixtures" pattern already exists).
  `src/connectors/BaseConnector.js` + 14 vendor-risk connectors (normalizeSignal,
  collectSignals, testConnection).
- Scoring: **computed live, not seeded** — `NistCsfService.getAssessment()` (22 CSF
  categories, maturity 1–4, snapshots upserted to `csf_scorecards`),
  `FrameworkScoreService` (9 frameworks via a 23-signal registry),
  `CisoPostureService` (8 CISO domains + `ciso_posture_snapshots` history),
  `MetricsEngine.loadInputs()` (flat `metric_inputs` + setup_json).
- Evidence agent: `NistCsfService.reviewDocuments()` ("Zadkiel") reviews `csf_evidence`
  answers/docs → findings & recommendations. `evidence` table stores doc artifacts.
- Control library (commit `e861d71`): `src/data/nistCsfControlLibrary.js` — all 106 CSF
  2.0 subcategories with test mode (auto/partial/manual), evidencing tools, setup
  evidence; `src/data/securityToolCatalog.js` — 36 tools / 56 API check specs;
  `GET /api/csf/control-library`.
- Exports: `pdfkit` + `chartjs-node-canvas` already in package.json;
  `PDFReportService`; `GET /api/narratives/:id/export/{pdf,word,powerpoint,summary}`.
  **No pptx library** — PowerPoint endpoint is a stub pattern.

### Frontend — `frontend/` (React 19 + Vite 8, single `src/App.jsx` ~25k lines)
- **No react-router.** Navigation is state-based: `page` state →
  `cro` (CRODash) · `dashboard` (CISODash) · `cio` · `cfo` · `boarddash` (BoardDash) ·
  `controls` · `crownjewels` · `attackpaths` · `home`.
- Spec-route mapping: `/` Risk Graph → `attackpaths`/`crownjewels` + AttackPathDiagram;
  `/board` → `boarddash` (BoardDash, single overview tab + ExecutiveAgentBrief);
  `/frameworks` → CRODash framework tabs (`CRO_FW_TABS`: hipaa, nistcsf, nist_800_53,
  cis, naic, iso27001, soc2, cms, pci, gdpr + csf_rankings/vendor_assurance/remediation);
  `/ciso` → CISODash (agent-first: posture domains, attack path, AI controls);
  `/controls` → Controls page over `/api/controls`.
- Dashboards are **agent-first**: `ExecutiveAgentBrief` (entry mode) routes matched
  questions to views via `applyAgentAnswer`.
- Deployment topology: **Vercel** builds `frontend/` (root `vercel.json`,
  `outputDirectory: frontend/dist`); API base = `VITE_API_URL` if set, else host-aware
  default → `https://cyberrx-api.onrender.com` (non-localhost) — fixed in PR #54.
  **Render** runs the API (`cyberrx-api/render.yaml`, health `/health`, CORS allowlist).
  No static data in the build; everything fetched at runtime.

### Risk graph / business processes (the CRO tie-in for D2)
- `business_processes` (tier, criticality) + `assets.business_process_ids` +
  `risks.business_process_ids`/`financial_exposure` + `threat_scenarios.mitre_technique`.
- `AttackPathService.buildGraph(orgId)` — 5-layer graph (process → app → device →
  network → threat) with per-process financial exposure; findings already carry
  MITRE technique/tactic + CIS control via `deriveAttack()`.

---

## 2. Phases 1–8: implemented vs missing (the gap = STEP A scope)

Spec files are absent; phase content is inferred from the task brief (Step A names the
pieces). Status against the brief:

| Piece (Phases 1–8) | Status | Where / Gap |
|---|---|---|
| Schema + seeds | **Partial** | controls/evidence/metric_inputs/sim_* exist. Missing: checks, check_results, validation_runs, score_history (general), framework tables (below). |
| Connector framework + mock fixtures | **Exists** | routes/tools.js live-with-sim-fallback; BaseConnector family. Reuse as-is; wrap as "checks" producers. |
| Validation runner + score rollup | **Missing** | Scores are computed on request (NistCsf/FrameworkScore services) but there is **no per-check run record** (no validation_run id to trace a number to). Build: `validation_runs`, `check_results`, runner that executes checks (live or sim), persists results, then rolls up. |
| Evidence agent wiring | **Partial** | Zadkiel (`reviewDocuments`) + `evidence`/`csf_evidence` tables exist; missing: `evidence_reviews` persisted with ids referencable from reports. |
| Parameterized checks | **Missing** | No parameter registry (e.g. dormancy=45d, retention=90d). Build `check_parameters` keyed per org with defaults. |
| Generalized frameworks schema (Phase 7) | **Missing** | FrameworkScoreService uses hardcoded JS maps. Build: `frameworks`, `framework_requirements`, `requirement_mappings` (requirement↔check, coverage+params+justification), `requirement_crosswalks` (framework↔framework, relationship + provenance). |
| Phase 8 (multi-framework rollup) | **Partial** | 9-framework scoring exists but not requirement-grained and not traceable. Re-point onto the generalized schema. |

### Collisions (handle, don't break)
1. **Existing `controls` table** (org CRUD, demo rows seeded) — keep untouched; new
   `framework_requirements` is a separate catalog layer; optional link
   `controls.control_id ↔ framework_requirements.requirement_id` later.
2. **`csf_scorecards`** — already *computed* then upserted (not seeded) ✓ no change
   needed to honor "computed, not seeded"; just add run-traceability.
3. **Existing /board (BoardDash)** — D2 extends it (new computed sections), never
   replaces; existing SEC-materiality view stays.
4. **`FrameworkScoreService` hardcoded maps vs new schema** — migrate gradually: keep
   the service API, back it by tables for the four-lens frameworks; other frameworks
   (HIPAA/PCI/...) stay on the legacy path (out of scope).
5. **My `securityToolCatalog.js` (56 checks) vs spec's `evidence_tool_api_catalog.json`
   (89 checks)** — the JSON is missing; STEP A seeds checks from the in-repo catalog
   and the 8 live connectors; remaining checks become FOLLOW_UPS.

---

## 3. Assumptions (defaults chosen; flag to change)

| # | Assumption | Default chosen |
|---|---|---|
| A1 | `content/` directory | → `resources/` (repo convention). CIS expected at `resources/cis/`. |
| A2 | "Back up the SQLite file" | App is PostgreSQL. Equivalent discipline: **additive-only** idempotent DDL in `db.init()`; no DROP/ALTER-destructive; demo data preserved automatically. Local dev DB only; prod Render DB migrates itself on boot. |
| A3 | Single-tenant org_id=1 | App is **multi-org** (BCBS-MA / Cigna / Meridian demo orgs). All new tables carry `org_id TEXT` like existing tables; catalog/content tables (frameworks, requirements, techniques, mappings) are **global** (no org_id). |
| A4 | URL routes /board, /frameworks, /ciso | State pages: `boarddash`, CRODash framework tabs, CISODash. D1 extends CISODash; D2 extends BoardDash (+ CRO view). |
| A5 | Spec phase definitions (files missing) | Inferred from the task brief; recorded in §2. Corrections welcome when specs are pushed. |
| A6 | `sample_content_pack.json` schema (missing) | Reconstructed: `{framework, version, requirements:[{id, title, text_verbatim?, ig1/2/3?, mappings:[{check_id, coverage(full|partial), parameters{}, justification}]}]}` |
| A7 | Live tool credentials | None present → validation runner executes against `sim_*` fixtures (existing pattern); real creds drop in via `tool_connections`. |
| A8 | ATT&CK version skew (bundle v19.1, CTID v16.1) | Ingest both; provenance pinned; deprecated/revoked honored; unmatched IDs → `resources/RECONCILIATION.md`. |
| A9 | CIS verbatim text licensing | `VERBATIM_CIS` env flag (default `false`): when false, store/show paraphrase + native safeguard ID only. |
| A10 | Exports | PDF via existing `pdfkit` stack. PPTX: add `pptxgenjs` (server-side) — the one new dependency; if undesired, CRO pack ships PDF-only first. |
| A11 | "WebSocket usage" in spec review | N/A — repo has none; runner runs synchronously on demand + on tool sync. |
| A12 | Baseline profiles fetch | Allowed by spec rules (public domain, missing locally) → `resources/nist/` + SOURCES.md entry during B1. |

---

## 4. Placement map (what gets built where)

```
cyberrx-api/src/
  data/                      ← (exists) CSF library, tool catalog
  ingest/                    ← NEW  B1–B4 parsers (oscal_80053.js, cprt_80053a.js,
                                    attack_stix.js, ctid_mapping.js, cis_workbook.js*)
  services/
    ValidationRunService.js  ← NEW  STEP A: run checks → check_results → validation_runs
                                    → score rollup (+ ATT&CK coverage recompute, STEP C)
    AttackCoverageService.js ← NEW  STEP C: technique_coverage {prevent,detect,none}
    ExecReportService.js     ← NEW  STEP D: CISO monthly + CRO quarterly pack data
  routes/
    frameworks.js            ← NEW  generalized catalog/requirements/mappings/coverage
    execreport.js            ← NEW  D3 exports (PDF/pptx)
  utils/db.js                ← EXTEND (additive): frameworks, framework_requirements,
                                    requirement_mappings, requirement_crosswalks, checks,
                                    check_parameters, check_results, validation_runs,
                                    evidence_reviews, attack_techniques, attack_tactics,
                                    attack_mitigations, technique_coverage, score_history
frontend/src/components/
  CisoExecReport.jsx         ← NEW  D1 (CSF functions · 800-53 family vs baseline ·
                                    CIS IG progress · ATT&CK heat map · failing queue · trends)
  CroBoardReport.jsx         ← NEW  D2 (process exposure · risk trend · "what changed" ·
                                    maturity tier · profile coverage — business language)
  (wired into CISODash and BoardDash/CRODash via existing agent-view pattern)
resources/                   ← content (INVENTORY.md ✓, SOURCES.md, RECONCILIATION.md,
                                    spot-check/, cis/* when supplied)
```

Commit cadence: one commit per step (A, B1, B2, B4, C, D1, D2, D3 — B3 blocked);
`db.init()` keeps the app booting clean after every commit; existing screens untouched
until D wires new views in.
