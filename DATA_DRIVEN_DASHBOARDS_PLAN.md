# Data-Driven Dashboards — Implementation Plan & Progress Tracker

**Goal:** Every number displayed on every dashboard originates from a formula
that pulls from an editable database of mock numbers. Changing a value in the
database updates the dashboards. Setup-quiz responses (org profile) feed the
calculations.

**Org used by the running app:** `blue-cross-blue-shield-of-massachusetts`

---

## Architecture

```
  ┌─────────────────────────────────────────────┐
  │  DB: editable mock numbers                    │
  │  • metric_inputs (org-specific + _defaults)   │  ← edit these to change dashboards
  │  • orgs.setup_json (setup-quiz responses)     │
  │  • entity tables (risks, financial_impacts,   │
  │    controls, assets, …)                       │
  └───────────────────────┬───────────────────────┘
                          │ loadInputs(org)  (merge metric_inputs ← setup_json)
                          ▼
  ┌─────────────────────────────────────────────┐
  │  MetricsEngine (backend)                      │
  │  documented formulas → derived numbers        │
  └───────────────────────┬───────────────────────┘
                          │ /api/metrics/:role , /api/metrics/inputs
                          ▼
  ┌─────────────────────────────────────────────┐
  │  Dashboards fetch computed numbers            │
  │  CFO · CISO · CRO · Board · CIO · CLO · Audit │
  └─────────────────────────────────────────────┘
```

**Single source of truth:** `metric_inputs` table = the "database of mock
numbers." Two scopes:
- `org_id = '<org>'` — per-org inputs (setup responses as numbers).
- `org_id = '_defaults'` — shared coefficients/assumptions (e.g. $/record,
  probabilities, % factors) used by every org's formulas.

`loadInputs(org)` returns a flat `{key: value}` map: `_defaults` overlaid by
org-specific rows overlaid by mapped `orgs.setup_json` values (so the actual
setup-quiz answers win). Every formula reads from this map — no magic numbers
in code.

---

## Phases & Checklist

### Phase 0 — Architecture & plan
- [x] Inspect current number sources (metrics table, setup_json, CFO formulas)
- [x] Write this plan/tracker

### Phase 1 — Database of mock numbers
- [x] `metric_inputs` table (org_id, key, value, category, label, unit) in db.init (+ idempotent)
- [x] Seed `_defaults` coefficients (the constants currently hardcoded in dashboards)
- [x] Seed BCBS-MA org inputs (setup-quiz responses as numbers)
- [x] `GET /api/metrics/inputs` (list, editable view) and `PUT /api/metrics/inputs/:key` (edit a number)

### Phase 2 — Calculation engine
- [x] `MetricsEngine.loadInputs(org)` — merge _defaults ← org rows ← setup_json mapping
- [x] Formula library (documented), no hardcoded numbers
- [x] Unit tests proving formulas + editability

### Phase 3 — Per-role computed endpoints
- [x] `GET /api/metrics/cfo` (gross/net exposure, RBC, ROSI, scenarios, insurance, peers, exposure model)
- [x] `GET /api/metrics/ciso` (posture score, CMMI, control grids, KPIs)
- [x] `GET /api/metrics/cro` (risk appetite, KRIs, heatmap)
- [x] `GET /api/metrics/board` (exposure, posture trend, ROI)
- [x] CIO already served by `/api/cio/overview` (fold inputs in) 

### Phase 4 — Wire dashboards to computed numbers
- [x] CFO dashboard (App.jsx) — `/api/metrics/cfo` drives exposure/RBC/ROSI/scenarios
- [x] CISO dashboard (App.jsx) — `/api/metrics/ciso` posture inputs drive score/process/exposure
- [x] Board dashboard (App.jsx) — `/api/metrics/board` drives exposure breakdown + posture + crit risks
- [~] CRO dashboard (App.jsx) — setup inputs (phiRecs, surplus) wired; compliance-grid scores are control-library data, not setup mock numbers
- [ ] CLO dashboard (page)
- [ ] Audit dashboard (page)
- [x] CIO dashboard already data-driven (`/api/cio/overview`)

### Phase 5 — Editability proof & docs
- [x] Demonstrate: edit a `metric_inputs` value → endpoint output changes
- [ ] Document the input keys and formulas for editors

---

## Progress log
- 2026-06-10: **Phases 0–3 complete; Phase 4 CFO + Phase 5 proof complete.**
  - `metric_inputs` table + seed (26 `_defaults` coefficients + 21 BCBS-MA inputs).
  - `GET/PUT /api/metrics/inputs` (editable), `GET /api/metrics/{cfo,ciso,cro,board}` (computed).
  - `MetricsEngine` formula library + 6 passing unit tests.
  - CFO dashboard (App.jsx) now renders engine figures (gross/net exposure, RBC, ROSI, capital/claims/IT risk, scenarios) from the DB.
  - Proven editable: PUT revenue 10B→20B raised CFO gross exposure $1,711M→$2,548M.
- 2026-06-10 (cont.): **CISO + Board fully wired; CRO setup inputs wired.**
  - CISO: posture inputs (MFA/EDR/patch/phishing/training/PAM/vuln + revenue/members/PHI) now come from the DB and drive the dashboard's own score/process/exposure formulas.
  - Board: exposure breakdown, posture score, critical-risk count, insurance limit all from `/api/metrics/board`.
  - Proven editable across roles: mfa_pct 78→98 raised CISO posture 74→78; revenue edit flows to CFO + Board.
  - 4 of 6 exec dashboards now DB-driven (CFO, CISO, Board, CIO); CRO partial.
- **Next:** CLO + Audit pages; move CFO insurance/peer tables into `metric_inputs`; publish input-key reference for editors.
