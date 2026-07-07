# Build Brief — Discovery: System Map + Gap List

Response to §2 of `BUILD_BRIEF.md`. **No feature code has been written for this brief yet** —
this is the map + gap list to review before Milestone 1.

---

## 0. Answers to the `<<FILL IN>>` items

| # | Item | Answer (discovered / assumed) |
|---|------|-------------------------------|
| 1 | Repo / access | `btd2026/cyber-rx` (this repo). Frontend `CyberRXNew/` (Vite build → `dist/`, deployed on Vercel). Backend `cyberrx-api/` (Node/Express + Postgres, deployed on Render). |
| 1 | Stack | **Frontend:** vanilla JS multi-page app (`public/index.html` shell + `onboarding.html` + `cockpit.html` + `ciso5.js`), Vite-built. **Backend:** Node/Express, `pg` (Postgres), lazy `CREATE TABLE IF NOT EXISTS`, `optionalJWT`/`demoOrg` middleware. |
| 2 | Secrets store | **Exists** — `src/utils/vault.js`, used by `IntegrationService.connect()` as `vault.set(orgId, 'integration:<key>', creds)`. Reuse this; never hardcode. |
| 3 | Per-connector auth | Existing connectors take an API key/token via `POST /api/integrations/:key/connect` (body = creds), validated then vaulted then synced. OAuth is not yet implemented — **assumption: API-key/token per connector for now**, OAuth added per-connector later behind the same connect action. |
| 4 | Scoring | **Use defaults** from §6, centralized in one config file (see §6 below). Exec escalation threshold: **residual ≥ 15** (assumption; flag to confirm). |
| 5 | CISO first | **Confirmed** — Milestone 1 = CISO. |

---

## 1. System map

### 1a. Onboarding — `CyberRXNew/public/onboarding.html`
- **Shape:** one long page split into tab-sections (`org`, `gov`, `fin`, `inv`, `risk`, `tools`), driven by `OB_TABS` + `obShow()`. Progressive completion bar already added.
- **Connectors today:** step 7 "Connect your tools" — a catalog (`SELTOOLS`, ~16 keys: `okta, defender, qualys, splunk, cyberark, knowbe4, wiz, sap, servicenow, salesforce, whistic, securityscorecard, onetrust, recordedfuture, rubrik, github`). Each has a **demo mode** + an API-key field; on go-live it calls `POST /api/integrations/:key/connect`. This is the **Connect machinery to reuse.**
- **Documents/registers today:** three mechanisms — (a) **file drop + CSV/TSV parse** for processes, apps, risk register, vendors, initiatives; (b) **guided repeatable-row entry** for strategic initiatives, objectives, and the **Business Capability Map** (added this session); (c) **policy document upload** → `POST /api/documents/analyze` (multer, 25 MB) for framework CMMI. So both "upload a file" and "guided entry" patterns exist and are reusable.
- **Storage:** the go-live payload (`POST /api/crown-jewels/ingest`) is JSONB-merged into `orgs.setup_json`; inventory rows go to `assets`/`business_processes`/`risks`; connector creds go to the **vault** via the integrations connect calls. Resume state is server-side (`org_ui_state`).
- **Status tracking today:** connectors show connected/demo per key; document sections flip a `.badge` to `✓`. **There is no single machine-readable "input → status" map the calc layer can query — this is the main new artifact Milestone 1 introduces.**

### 1b. Cockpit — `CyberRXNew/public/cockpit.html` + `ciso5.js`
- **Widget model:** the CISO seat is the `c5` provenance engine. Each tile = `c5tile('<metric_id>', …)`, backed by a metric in the `c5get(id)` registry returning `{connected, displayValue, color, formula, inputs[], sources[], connectTool}`. Tiles already **degrade gracefully**: when `connected=false` they render "Not connected" and name the source. This is exactly the gating substrate the brief asks for — it just needs to be driven by the input→widget map instead of ad-hoc per-metric `connected` checks.
- **Data source:** `LIVE` object from `GET /api/crown-jewels/summary` (+ live signals from `GET /api/integrations/signals`). Everything the tiles read is already funnelled through these two reads.

### 1c. Data / integration layer (the seam between them)
- `IntegrationService` (`connect`/`sync`/`signals`) — vaulted creds, `signal_sync` freshness, writes signal values the cockpit reads. **This is the connector adapter that already exists.**
- `CrownJewelEngine.run(orgId)` — reads `setup_json` + inventory, computes the `/summary` payload (crown jewels, economics, stress, capabilities, …). **This is the compute layer.**
- **Gap vs. the brief's "source-agnostic adapter":** connectors flow through `IntegrationService.signals`; uploaded registers flow through `setup_json`/inventory tables. They are **two different shapes** to the compute code today. The brief wants one adapter interface so "a connected API and an uploaded register look the same" — that adapter does not exist yet and is the core new seam for Milestone 1.

---

## 2. Gap list — the 55 inputs (Sheet 2)

Legend: ✅ collected · 🟡 partial (present but not in the required shape / not joinable) · ❌ missing.

### Connectors (30)
| Input | CISO? | Status | Where / note |
|---|---|---|---|
| CMDB | ✅ | 🟡 | Onboarding CMDB *import* of processes/apps exists; no *live* CMDB CI API with `ci_id` join key. |
| EDR | ✅ | ✅ | `defender`/CrowdStrike connector + `open_incidents`/detection signals. |
| GRC (risk register, control/framework assessments) | ✅ | 🟡 | SAP GRC connector + internal framework scoring; no generic GRC remediation/control-score API bound to `business_area`. |
| Incident Mgmt / ITSM | ✅ | ✅ | `servicenow` connector + ITSM push/status. |
| Service Mapping | ✅ | ❌ | No service-map connector (affected_ci → service). |
| SIEM | ✅ | ✅ | `splunk` connector + signals. |
| SOAR | ✅ | ❌ | No SOAR connector (SIEM partially covers incident status). |
| Third-party Security Ratings | ✅ | ✅ | `securityscorecard`/BitSight monitoring. |
| Threat Intelligence | ✅ | ✅ | `recordedfuture` (+ OTX/CISA KEV free). |
| Vendor Risk / TPRM | ✅ | ✅ | Vendor step + TPRM pull. |
| Vulnerability Management | ✅ | ✅ | `qualys`/Tenable + vuln signals. |
| AppSec Scanners (SAST/DAST/SCA) | | 🟡 | `github` DevSecOps gives SAST/SCA; DAST missing. |
| Backup Platform | | ✅ | `rubrik`. |
| Cloud (AWS/Azure/GCP) | | 🟡 | `wiz` (CSPM over cloud); no raw cloud-provider API. |
| CSPM / CWPP | | ✅ | `wiz`. |
| CRM | | ✅ | `salesforce`. |
| DevSecOps Metrics | | ✅ | `github`. |
| PMO / Portfolio Mgmt | | 🟡 | Jira/ticketing initiative import; no live PMO portfolio API with `initiative_id`. |
| APM · Availability Monitoring · Collaboration · Customer Support · Endpoint Mgmt · Enterprise Architecture Repo · FAIR/Risk Quant · MES/SCADA · Monitoring/Observability · OT Monitoring · Productivity Suite · Web Monitoring | | ❌ | No connector (mostly CIO/COO/CTO/CFO scope — later milestones). |

**CISO connector coverage: 8/11 ✅, CMDB & GRC 🟡, Service Mapping & SOAR ❌.**

### Documents / Registers (23)
| Input | CISO? | Status | Where / note |
|---|---|---|---|
| Business Capability Map | ✅ | ✅ | Added this session (guided rows → `LIVE.capabilities`). |
| BIA (Business Impact Analysis) | ✅ | 🟡 | Process revenue/RTO/criticality collected = BIA-equivalent; not labelled/validated as a BIA doc with a defined schema. |
| Crown Jewel Register | ✅ | 🟡 | Crown jewels are *derived* from processes/apps; no explicit register upload with `asset_id, criticality`. |
| SBOM | ✅ | ❌ | Named in tile sources; no upload/parse. |
| Business Process Inventory | | ✅ | Processes. |
| Cyber Insurance Policy | | ✅ | limit/premium/renewal. |
| Corporate Strategy / Strategy Mapping | | 🟡 | strategicInitiatives + objectives. |
| Business Service Catalog | | 🟡 | apps/systems (not a labelled service catalog). |
| Budget Planning | | 🟡 | `finBudget` single value. |
| AI Governance Registry | | 🟡 | aiGovernance fields (not a per-model registry). |
| EOL / EOS Register | | 🟡 | per-app `eol` flag. |
| DR Test Results | | 🟡 | `rubrik` `dr_test_days`. |
| Initiative-to-Application Mapping | | 🟡 | initiatives + app map exist but **not joined by `initiative_id ↔ app_id`.** |
| Asset Valuation · Architecture Review · BCP Roadmap · Broker Assessments · DR Plans · DR Roadmap · Engineering Roadmap · Incident History · IoT/OT Inventory · Security Roadmap | | ❌ | Not collected (mostly non-CISO — later milestones). |

**CISO document coverage: Business Capability Map ✅; BIA & Crown Jewel Register 🟡 (need explicit schema+validation); SBOM ❌.**

### Reference / derived (2)
| Input | Status | Note |
|---|---|---|
| MITRE ATT&CK (built-in) | ✅ | Shipped (`TACTIC_CAPS`, threat map). |
| Aggregated Cyber Risk Model (derived) | ✅ | `CrownJewelEngine` economics. |

---

## 3. CISO Milestone-1 scope (input → widget map)

CISO has **4 widgets** (Sheet 1):

| Widget | Required inputs | Buildable now? |
|---|---|---|
| **Enterprise Risk** — crown jewels at greatest risk | Crown Jewel Register, CMDB, VM, EDR | Compute path clear; needs Crown Jewel Register schema + VM/EDR per-asset join on `asset_id`. **Milestone 2 live target.** |
| **Protection Effectiveness** — business areas well protected | GRC framework/control assessments | Needs GRC control-score API (or upload) keyed by `business_area`. |
| **Cyber Operations** — active business-impacting incidents | SIEM, SOAR, Incident Mgmt | SIEM + ITSM present; SOAR missing (degrade). Join `affected_ci → service` needs Service Mapping (❌) → mock. |
| **Executive Actions** — highest-value remediation | GRC (remediation items) | Needs GRC remediation list (risk_reduction, effort). |

**Join-key feasibility (§5) — flags:**
- `asset_id` (Crown Jewel ↔ CMDB ↔ VM ↔ EDR): **needs an explicit `asset_id` key** on the Crown Jewel Register + a stable id from VM/EDR. Today assets join by *name*. ⚠️ Must define `asset_id` in the register schema and map connector fields to it.
- `affected_ci → service` (Cyber Operations): needs Service Mapping connector (❌) → **mock behind adapter** for M1.
- `business_area` (Protection Effectiveness): needs GRC assessment keyed by area; **Business Capability Map can supply the area list**, GRC supplies scores → partial mock.
- `initiative_id ↔ app_id`, `capability_id ↔ ci_id`, `vendor_id ↔ service`, `process_id ↔ systems/DR`: **not yet satisfiable end-to-end** — flagged for the roles that need them (mostly CEO/COO/CTO, later milestones).

---

## 4. Proposed Milestone-1 build (for approval — not yet written)

1. **Input registry** (`InputCatalogService` + `input_status` per org): the 55 inputs with `{type, roles, widgets[], status: connected|provided|missing|invalid}`. Onboarding writes it; cockpit + a new `GET /api/readiness?role=ciso` read it.
2. **Adapter seam** (`sources/` adapters): one interface `getDataset(inputKey, orgId)` that resolves from **either** a connector (via `IntegrationService`) **or** an uploaded/validated register (via `setup_json`/tables) — compute code never knows which.
3. **CISO document collection**: explicit **Crown Jewel Register**, **BIA**, and **SBOM** onboarding steps (upload + guided entry) with a **defined schema + column validation** and `asset_id` join key; version each.
4. **Cockpit gating from the map**: each CISO tile declares its required inputs; renders only when all satisfied, else a **"needs: <input>"** state that deep-links to the onboarding step. (The `c5` tiles already have the not-connected state — swap the ad-hoc check for the input-map check.)
5. **Scoring config** (`config/scoring.js`): `norm`, criticality weights, exploitability (EPSS→cvss/10), exposure (EDR, active_threat floor 0.7), composite `norm(crit)×exploit×exposure×100`, confidence bands, escalation threshold 15. Nothing hardcoded elsewhere.
6. **Milestone 2**: wire **Crown jewels at greatest risk** fully live (Register → CMDB → VM → EDR) through the adapter to prove the path.
7. **README** of what's collected, live vs. mocked, and every assumption.

---

## 5. Guardrail compliance
- Reuse: extends `IntegrationService` (connect/vault/signals), the document-upload pipeline, the `c5` tile/not-connected substrate, and `setup_json` storage — no duplicate machinery.
- No secrets hardcoded (vault), no magic numbers (one scoring config).
- No silently-dropped widgets (gate + "needs: X").
- Adapter seam isolates mock↔real and file↔API from widget logic.
