# Crown-jewel pipeline + assisted revenue confirmation — design record

**Branch:** `feature/crownjewel-pipeline` · **Restore point:** `git reset --hard nerion-stable-20260711`
**Status:** Phase A (this doc) complete. Phases B–D tracked below.

This is the design record for evolving Nerion's crown-jewel pipeline so that **revenue-criticality
is a human-confirmed onboarding/CFO input**, not an automatic inference, and so the existing
executive tabs read the shared model as **lenses**. It extends what already exists — it does not
rebuild it.

---

## 1. What already exists (verified) — the canonical model & pipeline

The backend (`cyberrx-api`, Express + raw PostgreSQL) already implements most of the canonical
model and the 6-stage pipeline. Phases B–D **extend and surface** these; they do not duplicate them.

### Canonical entities (all org-scoped, all carry provenance/confidence/owner/review lifecycle)
| Spec entity | Table (`src/utils/db.js`) | Provenance columns |
|---|---|---|
| BusinessFunction | `business_functions` (`capability_id` crosswalk) | `source` |
| BusinessProcess | `business_processes` | `source` (upload\|cmdb\|manual\|llm), `confidence`, `status` (proposed\|validated\|rejected), `parent_id`, `level` |
| Application | `applications` (promoted from `assets.type='app'`) | `source`, `status`, `vendor`, `hosting` |
| Infrastructure / DataAsset | `assets`, `data_objects` | `sources[]`, `provenance{}`, `aliases[]` |
| CrownJewel (derived) | `crown_jewel_snapshot` + CJ columns on `assets` | `criticality_breakdown{}`, `rationale`, `crown_jewel_tier` |

### Typed edges (relationships as tables, not embedded) — process↔application is **many-to-many**
`dependency_edge` (process↔asset), `app_process_map` / view `process_application_map`
(process↔application, M:N, with `relationship_type`, `confidence`, `rationale`, `status`,
`validated_by`, `validated_at`), `process_capability_map`, `control_application`, `risk_mapping`.

### Pipeline stages (`src/services/crownjewels/`)
1. **Sources** — CMDB connectors + large CSV/Excel upload with column mapping (`IngestMapper`, intake routes).
2. **Resolve** — `EntityResolutionService` (deterministic → embedding → LLM) with a **human review queue**
   (`GET /api/crown-jewels/review`, `POST /api/crown-jewels/review/:id/resolve`).
3. **Map lineage** — `DependencyMappingService` (process↔asset graph, gap findings).
4. **Crown jewels** — `CriticalityService.scoreAsset(asset, ctx)`: deterministic, explainable,
   per-factor `breakdown` summing to `score`, `rationale`. **Tunable in one place:**
   `src/config/criticality.js` (env-overridable weights/threshold/tiers).
5. **Threats** — `technique_coverage` table with **two axes: `prevent | detect | none`**;
   `AttackCoverageService`, `AttackPathService`.
6. **Frameworks (projection/view)** — Nerion's **own** catalog `control_library` (`CL-IAM-001` style)
   mapped to external frameworks **by ID** via `control_library_crosswalk` / `requirement_crosswalks`.
   Verbatim requirement prose is only ever stored for public-domain frameworks (NIST CSF / 800-53 /
   HIPAA); ISO / SOC 2 / CIS / PCI are referenced by ID + Nerion's own description only.

### Frontend surfaces (static cockpit — `CyberRXNew/public/`, the live product)
- Onboarding (`onboarding.html`) captures processes (incl. a free-form `revenue`), apps, the
  process→app map, risks and financials → POSTs one payload to `/api/crown-jewels/ingest`.
- Cockpit (`cockpit.html`) reads `/api/crown-jewels/summary` (+`/graph`); `demoLive()` +
  `localStorage` drive the **demo/offline path** used in presentations.
- 8 seats in `SEATS` (`cockpit-seats.js`): board, ceo, cfo, clo, cro, cio, coo, ciso. Renderers in
  `ciso5.js`. Value tree `crownjewel-tree.html` (function→process→jewel→risk→control) + `fair-engine.js`.

---

## 2. The gap this work closes — assisted, human-confirmed revenue criticality (Phase B)

Today a process's `criticality` propagates **down** to crown jewels (`CriticalityService`:
`max_process_crit` factor) regardless of whether a human has confirmed the process actually
brings money. The spec requires revenue-criticality to be an **assisted, confirmed** step, sequenced
**after** processes are identified, and to **gate** crown-jewel derivation.

### 2.1 Advisory score (SUGGESTION only)
`RevenueCriticalityService` (pure, deterministic, explainable) computes a 0..1
`revenue_criticality_score` per process from whatever signals are present:
- **financial_impact / entered revenue** (strongest signal, log-scaled vs the org's largest),
- **revenue-function membership** (function/level heuristics: billing, sales, order-to-cash, claims,
  payments, underwriting…),
- **name heuristics** (revenue verbs/nouns in the process name),
- with a per-signal `basis{}` breakdown so the suggestion is auditable.

### 2.2 Confirmation is the gate
A ranked list of candidate processes is presented (surfaced in **onboarding** and naturally in the
**CFO** persona). The user confirms/flags **brings_money** and may enter an annual
`confirmed_financial_impact`. Only then is `criticality_confirmed = true` set (with
`confirmed_by`, `confirmed_at`). Overrides are captured (`criticality_override`) so weighting can
improve later.

### 2.3 Propagation rule (provisional vs confirmed)
- Crown jewels are derived **only** from **confirmed** revenue processes propagated **down** the
  dependency graph (business criticality + data sensitivity + dependency centrality/SPOF + exposure).
- A jewel that would be derived from an **unconfirmed** process is marked **`provisional: true`** and
  is **not** propagated into production/report views as a confirmed crown jewel.
- Every crown jewel stores its lineage rationale: *"crown jewel BECAUSE it supports
  [process → function], holds [data], is a SPOF."*

### 2.4 Schema additions (additive only — `business_processes`)
```
revenue_criticality_score   NUMERIC        -- advisory 0..1 (suggestion)
revenue_criticality_basis   JSONB          -- per-signal contributions (explainable)
brings_money                BOOLEAN        -- user's confirm/deny flag
criticality_confirmed       BOOLEAN DEFAULT false
confirmed_financial_impact  NUMERIC        -- annual $, optional, user-entered
criticality_override        JSONB          -- captured overrides for future tuning
confirmed_by                TEXT
confirmed_at                TIMESTAMPTZ
```
Mirrors the existing `app_process_map` confirm lifecycle (`status/validated_by/validated_at`).
Delivered as `migrations/2026_07_11_revenue_criticality.sql` + idempotent `ALTER … IF NOT EXISTS`
in `db.js`. No table renamed or dropped.

### 2.5 API (additive)
- `GET  /api/business-processes/revenue-candidates` — ranked advisory candidates (score + basis + confirmed state).
- `POST /api/business-processes/:id/confirm-revenue` — `{ brings_money, financial_impact?, by }` → sets confirmed lifecycle.

---

## 3. Phases C–D (surface, don't rebuild)

- **Phase C — Threats / residual / framework.** Per crown jewel: scoped ATT&CK set (by asset class +
  exposure); two axes **PREVENT** (mapped N-capability: mitigated/partial/gap) and **DETECT**
  (telemetry: observed/blind); a single **tunable residual-risk formula in one place**
  (impact × unmitigated-prevention × detection-gap). Framework view is a rollup by ID crosswalk.
- **Phase D — Exec tabs as lenses (preserve all).** Keep every seat + route; each reads its projection:
  CFO → revenue-linked crown jewels + the confirm step; CRO → residual ranking; CISO → prevent/detect;
  CIO → lineage + ingest/coverage health; CLO → framework/regulatory data exposure; COO → SPOF/resilience.
  Reuse existing seat shells/components; change only the data they read.

---

## 4. Copyright-clean guarantee
The app's control catalog is Nerion's own (`control_library`, `CL-*` ids) in our own words. External
frameworks are referenced **by control ID only** (e.g. "ISO A.8.8", "800-53 AC-6") plus our own
description. Verbatim requirement prose is stored/rendered **only** for public-domain frameworks
(NIST CSF, NIST 800-53, HIPAA). No ISO / SOC 2 / CIS / PCI requirement prose is stored or rendered.

## 5. Verification posture (this environment)
- Backend **unit** tests run here (no DB). New pure logic (`RevenueCriticalityService`, the gate) is
  unit-tested. Integration/route tests and a live DB are **not** runnable here; migration + service +
  route are written to the existing pattern for you to run/deploy.
- The static cockpit **demo path** is fully runnable/verifiable here (headless Chromium), so the
  onboarding revenue-confirmation step and the CFO lens are demo-visible and verified.
