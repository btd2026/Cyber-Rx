# DELTA — Board / CLO / CRO views (additive)

Implements `DELTA_Board_CLO_CRO.md`. **Additive only** — the six existing views
(CEO, CFO, COO, CIO, CISO, CTO) and their wiring are untouched. Board/CLO/CRO get new
tabs on their existing seats.

## New inputs (10) — all now collectable in onboarding

**Connectors (6)** — added to the step-7 catalog (Connect → vault, same machinery),
with real backend connector modules:
`erm` (ERM Platform), `legal_matter`, `contract_lifecycle`, `data_classification`,
`internal_audit`, and **Privacy Platform reuses the existing `onetrust`** (aliased, not
duplicated).

**Registers (4)** — guided-entry with schema validation + status (`document_validation`):
Risk Appetite Statements, Regulatory Register, Materiality Criteria, Benchmark Data.
Stored in `setup_json`; each rides the go-live payload.

**Reused (not re-added):** GRC, FAIR (our economics engine), Incident Mgmt/ITSM, Cyber
Insurance, Vendor Risk/TPRM, BIA, Budget Planning — surfaced via `DERIVED` predicates or
existing connector keys in `InputCatalogService`.

## New tiles (23) — gated + adapter-backed

`InputCatalogService.WIDGETS` gains `board` (9), `clo` (7), `cro` (7). Each tile lists
its required inputs; `GET /api/readiness?role={board|clo|cro}` reports gating.
`DeltaDashboardService` computes each tile's headline through the existing data seam —
**real** where our platform holds it (appetite vs modeled exposure, FAIR-style ALE,
insurance gap, budget), a **labelled `illustrative`** value where a new oversight
connector (ERM/Legal/Contract/Privacy/Audit/Data-Classification) isn't connected yet.
`GET /api/dashboards/:role` serves them.

Cockpit: `csuite-delta.js` (new, additive) renders into `delta-board` / `delta-clo` /
`delta-cro` containers — one new tab per existing seat (Board "Risk oversight", CLO
"Legal & regulatory exposure", CRO "Enterprise risk posture"). Unmet tiles show
**"Needs: &lt;input&gt; · Set it up →"** deep-linking to onboarding. **Board is
aggregate-only** — posture/exposure/assurance, no live-incident/workload tiles.

## Assumptions
- New connectors authenticate by base URL + API token (existing pattern); the modules
  bind to a generic per-vendor REST contract and degrade cleanly — validate against a
  real tenant before relying on live values.
- ERM is the primary new source for Board/CRO; until it's connected, the enterprise-scale
  roll-up is computed from our internal economics/register and labelled a proxy.
- "Remediation tracking" / "Compliance mapping" → existing GRC; "Loss event data" →
  existing Incident History — no new inputs created, per the spec note.

## Tests
`tests/unit/DeltaDashboards.test.js` (13) — role widget counts, new input classification,
derived-input resolution, board/cro/clo gating, and the compute headlines. Full new-code
suite: 32/32. Cockpit smoke + production build clean; changes present in `dist/`.
