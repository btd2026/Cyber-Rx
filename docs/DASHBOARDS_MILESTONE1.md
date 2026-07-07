# C-Suite Dashboards — Milestone 1 (CISO slice)

Implements Build Brief Milestone 1 + the Milestone-2 live crown-jewels path. Discovery
map + full gap list live in `BUILD_BRIEF_DISCOVERY.md`.

## What onboarding now collects (CISO-required inputs)

| Input | Type | How it's collected | Status source |
|---|---|---|---|
| Business Capability Map | document | guided rows (name · exposure · GRC status) | `setup_json.capabilities` |
| **Crown Jewel Register** | document | guided rows (asset · asset_id · criticality) | `setup_json.crownJewelRegister` |
| **BIA** | document | guided rows (process · RTO · outage impact) | `setup_json.bia` |
| **SBOM** | document | guided rows (component · version · critical vulns) | `setup_json.sbom` |
| CMDB, EDR, SIEM, VM, Threat Intel, ITSM, TPRM, Ratings, GRC | connector | existing step-7 Connect (API key → vault) | `integrations` table |

Bolded rows are new this milestone. Each register is **normalized to a defined schema and
validated** on ingest (`document_validation` marks `provided`/`invalid`; an invalid upload
gates like missing). Connectors reuse the existing `IntegrationService` connect/vault/sync —
nothing duplicated.

## Traceability & gating (input → widget → cockpit)

- `InputCatalogService` holds the input→widget map and resolves per-org status
  (`connected | provided | missing | invalid`).
- `GET /api/readiness?role=ciso` → `{ widgets[], inputs[], readinessPct }`.
- The CISO **Program Health** tiles fetch readiness (`window.CISO_READY`) and **gate**:
  an unmet tile shows **"Needs: &lt;input&gt; · Set it up →"** and deep-links back to
  onboarding (posts `cyberrx-goto-onboarding` → shell switches to the intake view).
  No widget is silently dropped.

## Live vs mocked

| CISO widget | Status | Notes |
|---|---|---|
| **Crown jewels at greatest risk** (`er_crown`) | **live path** | Register → CMDB (asset_id) → VM → EDR, scored by `config/scoring.js`; exposed as `LIVE.crown_jewel_risk`. **VM/EDR per-asset pull is not wired yet** → those two factors use a *deterministic, labelled* mock (`mocked:true`); register + criticality are real. Swapping in a real VM/EDR feed touches only `DataAdapter`. |
| Business capabilities (`er_capability`) | live from `capabilities` | GRC optional. |
| Disruption scenarios (`er_scenarios`) | live from `stress` + threat-intel | MITRE built-in. |
| Third-party / supply-chain (`er_thirdparty`) | live from vendor monitoring | SBOM optional, now collectable. |
| Protection Effectiveness / Cyber Operations / Executive Actions | in the readiness map; **tiles not yet built** | tracked for the next slice. |

## The adapter seam (§5)

`services/sources/DataAdapter.js` — `getDataset(inputKey, orgId)` resolves a normalized
dataset from **either** a connector (`IntegrationService`) **or** a register (`setup_json`)
**or** a labelled deterministic mock, all behind one interface. `CrownJewelRiskService`
compute never knows which — file↔API↔mock swaps stay inside the adapter.

## Scoring config (§6) — single source of truth

`config/scoring.js`: `norm` (min-max, equal→0.5), criticality weights (Critical 1.0 … Low
0.25), exploitability (EPSS else max_cvss/10), exposure (EDR norm, active-threat floor 0.7),
composite `norm(crit)×exploit×exposure×100`, confidence bands, `HIGH_CRIT_VULN_CVSS = 7.0`,
**`ESCALATION_RESIDUAL = 25`** (customer-set). Nothing that scores a widget hardcodes a number.

## Assumptions / flags
- **Join key `asset_id`**: the Crown Jewel Register now carries an explicit `asset_id`; the
  CMDB join is identity on that id. Dependency-graph expansion (CMDB → dependent CIs) slots
  into `DataAdapter` when a live CMDB is wired.
- Connector auth is **API-key/token** (existing pattern); OAuth per connector is future work.
- `Service Mapping` and `SOAR` connectors are in the readiness catalog but not yet in the
  step-7 connect list — `cyber_operations` degrades on their absence (SOAR is optional).
- Milestones 3+ (CEO/CFO/COO/CIO/CTO) reuse this exact pattern; their inputs are already in
  the catalog structure.

## Tests
`tests/unit/DashboardScoring.test.js` (14) — scoring math, catalog gating (er_crown gates
until Register+CMDB+VM+EDR satisfied), and crown-jewel composite ranking + mock-flagging.
Plus the cockpit smoke harness and a clean production build.
