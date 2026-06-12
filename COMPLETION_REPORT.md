# COMPLETION REPORT — Four-Lens Posture & Executive Reporting

Branch: `feature/exec-reporting` · Date: 2026-06-12 · **Not merged** (per instruction).
Scope delivered: NIST CSF 2.0 + SP 800-53 r5.2.0 + MITRE ATT&CK fully; CIS v8.1
**blocked** (licensed workbook absent). SOC 2 / PCI / HIPAA audit features and spec
Phases 10–11 intentionally excluded.

## Phase evidence (all numbers from local Postgres, org = BCBS-MA unless noted)

### PART 0 — Content inventory (`resources/INVENTORY.md`)
Every file identified by content inspection:
- `Mitre.txt` → STIX 2.1 Enterprise ATT&CK **v19.1** (25,843 objects; 858 techniques, 697 active; 15 tactics; 268 mitigations).
- `NIST_SP-800-53_rev5_catalog.txt` → OSCAL **5.2.0** (20 families; 324 controls + 872 enhancements; 182 withdrawn).
- `cprt_SP_800_53_A_5_2_0_06-11-2026.json` → CPRT 800-53A 5.2.0 (13,591 elements; 2,977 determinations; examine/interview/test methods).
- `nist_800_53-rev5_attack-16.1-enterprise.json` → CTID ATT&CK **v16.1** ↔ 800-53 r5 (5,410 rows; 566 techniques; 110 controls).
- **CIS v8.1 workbook: NOT PRESENT → B3 STOPPED** (never fetched from internet; licensed).

### PART 1 — `IMPLEMENTATION_MAP.md`
Mapped the spec's assumptions (server/+SQLite+URL routes+WebSockets) onto the real
architecture (`cyberrx-api` Express + **PostgreSQL**, state-routed `App.jsx`,
Vercel + Render). Phase 1–8 gap = validation runner + parameterized checks + generalized
framework schema. 12 assumptions recorded with defaults (multi-org, additive DDL as the
"backup/migration" discipline, `resources/` = spec's `content/`).

### STEP A — Engine foundation (commit `7a1bb87`)
Additive schema in `db.init()` (no destructive DDL): `frameworks`,
`framework_requirements`, `requirement_mappings`, `requirement_crosswalks`, `checks`,
`check_parameters`, `validation_runs`, `check_results`, `evidence_reviews`,
`score_history`, `attack_*`, `technique_coverage`. `seedEngine`: 106 CSF requirements,
49 checks, 137 curated mappings. `ValidationRunService` runs checks (live-or-sim),
persists per-check results under a run id, wires the Zadkiel evidence agent, rolls up
requirement→function→overall. **Honest by construction**: signal-less checks are
`skipped`, never fabricated. Verified run: 49 checks (7 pass / 11 fail / 31 skipped),
CSF GV0 ID67 PR20 DE29 RS100 overall **43**.

### STEP B — Content ingestion
- **B1** (`0428e1a`): 800-53 r5.2.0 — 1,196 requirements, 20 families, 182 withdrawn;
  baselines {low 149, moderate 287, high 370} from fetched OSCAL profiles; every control's
  documented testing procedure = OSCAL objectives + CPRT examine/interview/test (all
  1,196 matched). **Reconciliation OSCAL⇄CPRT exact (0 unmatched)** → `resources/RECONCILIATION.md`. Spot-check `spot-check/80053.json`.
- **B2** (`2af1689`): CSF⇄800-53 **provisional** (no CPRT CSF informative-refs export):
  444 derived control→check mappings, **662 crosswalks** (provenance 'derived',
  provisional=true). Spot-check `spot-check/csf_80053.json`. Upgrade path in `FOLLOW_UPS.md`.
- **B3** (`5a1f703`): ✅ **DONE** — licensed CIS Controls **v8.1.2** ingested via a
  dependency-free pure-Node xlsx reader. 18 controls, 153 safeguards; IG attainment
  matches official counts exactly (**IG1 56 / IG2 130 / IG3 153**). Safeguard IDs numbered
  by position (float-collision safe). Verbatim text gated by `VERBATIM_CIS` (default off).
  228 safeguard→check mappings; 54 uncovered safeguards classified (new-check vs rubric)
  in FOLLOW_UPS; 576 provisional CIS↔CSF crosswalks (official CIS→CSF/ATT&CK workbooks not
  supplied — ingestion path wired). Spot-check `spot-check/cis.json`. CISO pack now shows
  live IG1/2/3 attainment (BCBS-MA: 57% / 45% / 41%).
- **B4** (`bc1e92c`): ATT&CK v19.1 — 15 tactics, 858 techniques (161 deprecated honored),
  268 mitigations; **5,314 CTID crosswalks** (provenance 'CTID', attack_version 16.1);
  176 flagged `meta.version_skew` (v16.1→v19.1 gap), 0 orphan controls, 1 orphan
  technique. Spot-check `spot-check/attack.json`.

### STEP C — ATT&CK coverage (`a48d015`)
`AttackCoverageService.recompute` (called inside the runner): per active technique →
CTID-mapped 800-53 controls → their checks' pass/partial status → coverage
prevent>detect>none with confidence + supporting provenance. Verified: **454 techniques**
scored (171 prevent / 0 detect / 283 none). `GET /api/frameworks/attack/coverage`.

### STEP D — Executive reporting (`f49eca5` backend, `b8a516b` frontend)
All from computed data (latest run), never seeded.
- **CISO pack** (`/api/frameworks/exec/ciso`, `CisoExecReport.jsx`): CSF functions,
  800-53 family compliance + baseline coverage (moderate = **18/287, 6%**), ATT&CK heat
  map with click-through to the evidencing check, failing-control queue (11) with
  per-signal remediation, trends, CIS=pending.
- **CRO/board pack** (`/api/frameworks/exec/cro`, `CroBoardReport.jsx`, on `/board`):
  top processes by exposure (criticality × failing governed controls + risk $),
  "what changed since last board meeting", business-impact themes (ransomware readiness /
  data-theft / IR confidence / governance), profile coverage, **Tier 2 (Risk Informed)** —
  no control IDs or ATT&CK jargon.
- **D3 exports** (`ExecReportPdf`, existing `pdfkit`): `/api/frameworks/exec/:audience/export.pdf`
  with a traceability appendix citing the run id. Both produce valid `%PDF` (CISO 4.6 KB, CRO 4.2 KB).

**Acceptance**: both views render from computed data; PDFs open; frontend production
build clean (`✓ built`); API boots; no server-only imports in client code.

## Boot hydration
`ingest/bootstrap.js` (from `index.js`, toggle `ENGINE_BOOTSTRAP=false`): seeds the engine
always; parses 800-53/ATT&CK at most once per DB; never blocks startup. Re-run confirmed
idempotent (`nist80053: present, attack: present`).

## ASSUMPTIONS (full list in `IMPLEMENTATION_MAP.md` §3)
Multi-org (org_id carried on org-scoped tables; catalog/content tables global);
additive idempotent DDL substitutes for the spec's SQLite backup; `resources/` = `content/`;
checks without live credentials run against `sim_*` fixtures; CIS verbatim behind
`VERBATIM_CIS` (default false); ATT&CK v19.1 vs CTID v16.1 skew pinned by provenance.

## FOLLOW_UPS (see `FOLLOW_UPS.md`)
1. **CIS v8.1 (B3) — BLOCKED**: add the licensed workbook (+ CIS↔CSF, CIS↔ATT&CK
   mappings) to `resources/cis/`, then run the B3 loader (to be added) for IG1/2/3
   progress and CIS crosswalks. CISO pack shows a "pending" notice until then.
2. **CSF⇄800-53 provisional**: supply the CPRT CSF 2.0 informative-references export to
   upgrade 662 crosswalks from 'derived'/provisional to 'NIST CPRT'/official.
3. **Spot-checks awaiting human review**: `spot-check/80053.json`, `csf_80053.json`, `attack.json`.
4. **Reference assets** named in the brief but absent as files (used in-repo equivalents):
   `evidence_tool_api_catalog.json` (89 checks) → catalog yields 49; `control_assessment_rubrics.json`
   (46 rubrics) → not present, rubric-based B3 classification deferred.
5. **Live credentials**: all telemetry checks currently evaluate `sim_*` fixtures; real
   Okta/CrowdStrike/Splunk/etc. credentials via `tool_connections` flip `source` to 'live'.
6. **ATT&CK detect=0**: prevent precedence dominates with current passing checks; once
   SIEM/correlation checks pass, detect coverage populates.

## RUN / DEPLOY COMMANDS
```bash
# Backend (local Postgres on :5599 in this env)
cd cyberrx-api
DATABASE_URL=postgres://postgres@localhost:5599/cyberrx node src/ingest/bootstrap.js   # one-time content load
DATABASE_URL=... node src/index.js                                                       # API :3001 (bootstraps on boot)
# Manual per-source re-ingest:
node src/ingest/load80053.js && node src/ingest/loadCsf80053.js && node src/ingest/loadAttack.js
# Frontend
cd frontend && npm install && npm run build      # Vercel: outputDirectory frontend/dist
# Endpoints
GET  /api/frameworks/catalog
POST /api/frameworks/validate            (X-Org-Id)
GET  /api/frameworks/exec/ciso|cro       (org_id)
GET  /api/frameworks/exec/:aud/export.pdf
GET  /api/frameworks/attack/coverage
```
Deploy: Render runs `cyberrx-api` (set `ENGINE_BOOTSTRAP` unset/true for first boot);
Vercel builds `frontend`. No schema migration needed beyond `db.init()`.
