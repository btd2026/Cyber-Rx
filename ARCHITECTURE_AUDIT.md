# Nerion — Architecture Audit vs. Target ("Decision OS")

**Scope:** read-only audit. No code changed. All claims cite files under
`cyberrx-api/src` (backend) and `frontend/src` (frontend).

**Target architecture (paraphrased):** a single *prediction → event → decision
contract → role lenses* spine. One predicted event (attack path + timing + loss)
becomes one shared `DecisionCard`, which is *rendered* into six role lenses and
governed by cross-cutting services (translation, decision/evidence ledger,
coaching, blind-spot, confidence everywhere). "Decisions, not dashboards."

---

## STEP 1 — What actually exists

### Layering (as built)
Nerion is a **Node/Express + Postgres backend** and a **React/Vite frontend**.
There is no formal data/prediction/presentation separation; the de-facto layers
are:

- **Data / substrate** — raw `pg` via `utils/db.js` (one big `init()` schema,
  `db.js:12–1178`). A genuinely relational correlation model exists:
  `business_functions → business_processes → applications → assets → risks →
  controls → findings`, plus `data_objects`, `legal_obligations`,
  `threat_scenarios`, `financial_impacts`, and confidence-scored crosswalks
  (`app_process_map` `db.js:738`, `process_capability_map` `db.js:727`).
- **"Prediction" / analysis** — a set of services that compute over the
  substrate: `CorrelationEngine.js` (553 lines), `RiskOutputsService.js`
  (crown-jewels / blast-radius / control-gaps / attack-coverage via
  `routes/risk-outputs.js`), `AttackPathService.js` (layered graph),
  `AiControlAssessmentService.js`, `ProjectPortfolioService.js`. **Most are
  deterministic scorers, not predictive models.**
- **Presentation** — per-role dashboards built in
  `services/CisoDashboardService.js` + `services/ExecDashboardService.js`,
  rendered by `components/CisoSecurityPostureDashboard.jsx` +
  `components/RoleSections.jsx`. The frontend is dominated by one ~26k-line
  `frontend/src/App.jsx`.

### How views are built (the critical finding)
The executive views are **computed independently per role**, not derived from a
shared event:

- `ExecDashboardService.roleScore(role,c)`, `roleDomains(role,c)`,
  `roleQuestions(role,c)`, `decisionsFor(role,c)` (`ExecDashboardService.js:552`)
  and `aiDecisions(role,inv)` (`:634`) are **big `switch (role)` builders** — each
  role's numbers, questions, and "decisions" are authored separately in code.
- `CisoDashboardService.applyRoleLens()` (`CisoDashboardService.js:258`) takes the
  CISO payload and **overwrites** hero/pillars/questions per role. It is a
  per-role re-computation, not a translation of one canonical object.
- **The headline exec dashboards are mock-first.** `ExecDashboardService.loadCtx`
  falls back to `demoContext()` when the substrate is empty; `CisoDashboardService`
  reads `ciso_entities` (a polymorphic mock store, `db.js:1153`) else the
  `data/cisoDashboard.js` mock module; figures are backed by `metric_inputs`,
  explicitly commented as the *"database of mock numbers that drives every
  dashboard figure"* (`db.js:912–916`). So the rich correlation substrate exists
  but the marquee views largely **bypass it**.

### Coupling
- Substrate ↔ analysis: **clean-ish** (services query tables directly; no ORM,
  but consistent `organization_id` scoping and GIN-indexed JSON link arrays).
- Analysis ↔ presentation: **tight.** Business logic for the exec views lives
  inside the dashboard services and is shaped exactly to what the React
  components render (e.g., `roleLayout()` emits tab descriptors the frontend
  switch-renders). There is no intermediate domain object between "analysis" and
  "a role's tab."
- There is **no event or decision entity** anywhere in the schema (`grep` for an
  `event`/`decision_card` table in `db.js` → none).

---

## STEP 2 — Coverage vs. target (A–E)

Legend: **Present** / **Partial** / **Absent**.

### A. Shared substrate
| Capability | Status | Evidence |
|---|---|---|
| Asset inventory + identity graph | **Partial** | `assets` (`db.js:88`) is a real inventory; identity is only simulated (`sim_okta_users/_factors` `db.js:932`). No identity-graph entity. |
| Vuln / EDR / SIEM telemetry ingestion | **Partial** | Generic ingestion (`ingestion_source/_mapping/_exception` `db.js:778`), parameterized `checks`/`check_results` (`db.js:1045–1089`), and **simulated** tool tables (`sim_tenable_*`, `sim_crowdstrike_*`, `sim_splunk_*`). Connector framework in `cae/`. Not live telemetry. |
| Cloud config + third-party/vendor exposure | **Partial→Present (vendor)** | Vendor: `vendor_risk_signals` (`db.js:415`), `third_party_dependency` (`db.js:751`), `vendor_monitoring_connections`. Cloud config only via `assets.cloud_provider` + CAE checks. |
| Business context (criticality, revenue, regulated data) | **Present** | `business_processes.crit_tier/rto`, `criticality_profile` (`db.js:717`), `data_objects` (`db.js:122`), `metric_inputs` (revenue/financials). Strongest part of the substrate. |
| External signals (EPSS/exploit, campaigns, peer, dark-web) | **Partial** | Peer benchmark scaffold (`BenchmarkService.js`, `benchmark_consent` `db.js:837`); dark-web as a vendor signal category (`db.js:422`). **EPSS / exploit-availability / active-campaign feeds: Absent.** |
| Per-asset visibility confidence (our data completeness) | **Absent** | Confidence exists on *checks/assessments* (`check_results.confidence`, `assessment_result.confidence`, `technique_coverage.confidence`) but there is no per-asset data-completeness/coverage score. |

### B. Prediction engine (produce ONE event: what / when / options)
| Capability | Status | Evidence |
|---|---|---|
| Attack-path modeling (entry → crown jewels) | **Partial** | `AttackPathService.buildGraph()` builds a 5-layer graph (process→app→device→network→threat) linked by **shared business process**, enriched with MITRE/CIS (`AttackPathService.js:74–205`). It is an *association/highlight* graph, **not a directional kill-chain with reachability or probabilities**. |
| Loss simulation (Monte Carlo / FAIR distribution) | **Partial** | `financial_impacts` decomposes loss components (`db.js:291`); CFO "Loss Scenarios (Quantified)" and `ProjectPortfolioService` compute **FAIR-style point estimates** (likelihood × magnitude). **No distribution / Monte Carlo / confidence interval.** |
| Timing estimation w/ confidence bands (7/30/90-day p(exploit)) | **Absent** | Nothing computes time-to-exploit or dated probabilities. No EPSS input to derive it. |

### C. Decision contract (the shared unit)
| Capability | Status | Evidence |
|---|---|---|
| Single `DecisionCard` object (event + path + timing + 2–4 options w/ cost, time-to-effect, residual-risk Δ, friction) | **Absent** | "Decisions" are per-role string objects built in `decisionsFor()`/`aiDecisions()` with `{condition, projection, options:[{label,effect,tradeoff}], recommended}`. **No event link, no timing, no structured cost/time-to-effect/residual-risk/friction, not persisted, not shared across roles.** |
| "Accept & monitor" with logged rationale | **Partial** | `risk_acceptances` (`db.js:622`, justification + review_date) and `RiskDecision.jsx`/`TicketControl.jsx` exist for **CISO actions only**, not bound to a decision-card contract or available to all roles. |

### D. Six role lenses (SAME event rendered per role)
**Status overall: Absent as "lenses on one event"; Present as six separate
per-role datasets.** Each role view is independently computed (`roleLayout(role,c)`,
`decisionsFor(role,c)`), so the six are *different worlds over a shared context*,
not one event translated. Per-role detail:

| Lens | Status | Evidence |
|---|---|---|
| CISO: attack path, controls, decision queue | **Partial** | `CisoDashboardService` + `AttackPathService` + Action-Now queue; not driven by a shared event. |
| CFO: loss distribution + insurance-gap delta | **Partial** | Insurance gap present (`financial.coverageRatio`, CFO tabs in `ExecDashboardService`); loss is a point estimate, no distribution. |
| CIO: resilience-vs-velocity / friction map | **Partial** | CIO tabs (vuln/patch, resilience) exist; **no friction / velocity-vs-resilience model.** |
| CRO: portfolio, appetite, aggregation/correlation | **Partial** | KRIs/appetite tabs + `CorrelationEngine`; no true portfolio aggregation/correlation of loss. |
| CLO: disclosure triggers, notification clocks, materiality | **Partial** | `legal_obligations.notification_timeline` + EU AI Act classifier; **no live notification clocks or materiality determination.** |
| Board: pending decisions, peer benchmarks, questions-to-ask | **Partial** | Board tabs + `SUGGESTED_QUESTIONS` (`ExecutiveAgentService`); benchmark is a scaffold; "pending decisions" isn't a real queue. |

### E. Cross-cutting layer
| Capability | Status | Evidence |
|---|---|---|
| Translation engine (one event → any lens) | **Absent** | The opposite pattern is implemented: each lens **recomputes** from context (`applyRoleLens`, `roleLayout`). No single event projected on demand. |
| Decision & evidence ledger (who saw what/when, decision, rationale, engine state) | **Partial** | `routes/audit-trail.js` + `models/ProvenanceTrail` (who/what/when/rationale — but scoped to **mapping-confirmation** events); `validation_runs`/`check_results` (`db.js:1064`) give evidence provenance; `risk_acceptances`. **No unified decision ledger capturing engine-state-at-decision-time.** |
| Coaching (questions-to-ask / materiality / tabletop) | **Partial** | Per-role "5 key questions" (`SUGGESTED_QUESTIONS`); Board questions; tabletop only referenced in copy. No materiality checklist engine. |
| Blind-spot detection (per-leader neglect) | **Absent** | Nothing tracks what a leader ignores over time. |
| Confidence/uncertainty everywhere; "decisions not dashboards" | **Partial** | Confidence on CSF/checks/answers; the product is still fundamentally **dashboards**, not a decision queue. |

---

## STEP 3 — Per-subsystem verdict (Extend / Refactor / Rewrite)

**Make-or-break question (criterion 1): Can the current data model express a
shared substrate + per-lens rendering of one event?**
**Answer: the SUBSTRATE — yes. The EVENT/DECISION spine — no, and the per-role
*compute* pattern is the wrong shape.** The relational correlation model
(`db.js`) is a legitimate single source of truth and can be extended to feed a
prediction engine. But there is no event/decision entity, and the lenses are six
independently-authored datasets (`switch(role)` builders) rather than projections
of one object. So this is **not a green-field rewrite**, but the **middle of the
target spine (predict → event → decide → translate) must be built largely new**,
and the lenses must be **repointed** from per-role compute to shared-event render.

| Subsystem | Verdict | Reasoning (files) | Main risk | Effort |
|---|---|---|---|---|
| **Substrate** | **EXTEND** | The relational chain + crosswalks + confidence columns already exist (`db.js:73–760`, `CorrelationEngine.js`, `RiskOutputsService.js`). Add: an `event`/`signal` table, per-asset `visibility_confidence`, and external-signal tables (EPSS/exploit/campaign). | Headline views read **mock** (`demoContext`, `ciso_entities`, `metric_inputs`); "extend" must include **wiring lenses to the real substrate**, which is its own effort. | **M** |
| **Prediction engine** | **REFACTOR** | Keep `AttackPathService` as the graph base, but it must become directional + reachability-aware and emit a **persisted predicted event**; add real loss **distribution** (the FAIR point-estimate in `ExecDashboardService`/`ProjectPortfolioService` is a starting formula, not a model) and timing/p(exploit) (needs EPSS ingestion — absent). | This is where the genuinely new modeling lives; risk of under-building (staying deterministic) and calling it "prediction." | **L** |
| **Decision contract** | **REWRITE** | There is no `DecisionCard`; `decisionsFor()`/`aiDecisions()` produce per-role prose with unstructured `options`. A real contract needs a persisted entity (event ref, attack path, timing, options with cost/time-to-effect/residual-risk-Δ/friction, accept-&-monitor rationale). The current code is throwaway for this purpose. | Throwaway is small (good — little sunk cost). Risk is designing the contract well enough that all six lenses + the ledger can share it. | **M** |
| **Role lenses** | **REFACTOR** | The presentation layer is reusable and good: `CisoSecurityPostureDashboard.jsx`, `RoleSections.jsx`, the tab/section renderer, voice, ticketing. But data-sourcing must flip from "compute per role" (`roleLayout`/`applyRoleLens`) to "render the shared event/decision via a translation layer." Keep components, replace their feed. | Large surface area in `App.jsx`/dashboard services; regression risk while re-pointing six roles. | **L** |
| **Cross-cutting** | **EXTEND (ledger) + REWRITE/BUILD (rest)** | Ledger: extend `ProvenanceTrail`/`audit-trail` + `validation_runs` into a decision ledger (good primitives exist). Translation engine, blind-spot detection, materiality/coaching engine: **new build** (translation is conceptually absent today). | Translation engine is the architectural keystone; if it isn't built, the whole "one event → lenses" premise fails and you're back to six datasets. | **L** |

**What a rewrite would throw away (criterion 4):** a lot of genuine value —
the relational substrate + ingestion + crosswalks (`db.js`, ingestion, CAE
connector framework), `CorrelationEngine`/`RiskOutputsService`,
`AttackPathService`'s graph assembly, the entire polished per-role
presentation/voice/ticketing layer, the AI-governance modules, and the
document/control assessment pipeline. **A global rewrite is not justified.** The
justified rewrites are local: the **decision contract** and the **translation
engine** (because they don't exist or are the wrong shape), plus heavy new build
in the **prediction** layer.

---

## Top 5 gaps (ranked by how much they block the target)

1. **No shared event / `DecisionCard` object, and lenses are computed per role.**
   This is the architectural core of the target and it is inverted today
   (`ExecDashboardService.decisionsFor`/`roleLayout`, `CisoDashboardService.applyRoleLens`).
   Blocks D and C entirely. *Must build the contract + translation first.*
2. **No translation engine** (one event → any lens). Without it, "six lenses on
   one event" cannot exist; you keep six datasets. (Cross-cutting E.)
3. **Prediction is deterministic scoring, not prediction** — no timing/p(exploit),
   no loss distribution, attack graph is associative not directional
   (`AttackPathService`, FAIR point-estimates). Blocks B (the "what/when").
4. **Marquee views run on mock data**, bypassing the real substrate
   (`demoContext`, `ciso_entities`, `metric_inputs` "database of mock numbers"
   `db.js:912`). Even with a great substrate, the lenses don't read it. Blocks A
   in practice.
5. **No external threat signals (EPSS/exploit/campaign) and no per-asset
   visibility confidence.** Without these, timing/prioritization and "how much we
   actually see" cannot be computed honestly. Blocks A and B.

---

## Sequenced plan (what to do first, and why)

1. **Define the `DecisionCard` + `Event` contract and persist it** (schema +
   types). Everything else hangs off this; cheap to do, unblocks parallel work.
   *(REWRITE, M)*
2. **Build the translation engine**: one event → role projection functions, and
   **repoint one lens (CISO)** to render from it end-to-end as the reference
   implementation. *(Cross-cutting build + lens REFACTOR, M for the first lens)*
3. **Wire the substrate to reality**: make `loadCtx`/dashboard services prefer
   real `risks/assets/findings/financial_impacts` and treat `demoContext` as
   last resort; add per-asset `visibility_confidence`. *(Substrate EXTEND, M)*
4. **Upgrade the prediction engine** on the existing graph: directional attack
   paths, EPSS/exploit ingestion, timing bands, and a loss **distribution**
   (Monte Carlo over `financial_impacts` components). Emit `Event`s. *(REFACTOR, L)*
5. **Roll the remaining five lenses** onto the translation engine; delete the
   per-role compute in `decisionsFor`/`roleLayout` as each is migrated. *(Lens
   REFACTOR, L)*
6. **Extend the ledger** (`ProvenanceTrail`/`audit-trail` → decision ledger with
   engine-state snapshot) and add **coaching + blind-spot** as services over the
   ledger. *(EXTEND + build, M)*

**Why this order:** the contract and translation engine are the keystone — build
them and prove them on one lens before touching prediction depth or migrating the
other five, so you validate the "one event → lenses" premise early and cheaply,
on top of the substrate and presentation you already have.

---

## Verdict (one paragraph)

**Mixed, not a global rewrite.** Keep and EXTEND the substrate (it's a real
correlation model) and KEEP/REFACTOR the polished presentation layer — those are
the expensive parts and they're sound. But the target's spine — *one predicted
event → one shared decision contract → translated into six lenses* — is **not
present**: there is no event/decision object, the "prediction" is deterministic
scoring (no timing, no loss distribution, associative attack graph), the lenses
are six independently-computed datasets, and the marquee views largely run on
mock data. So **REWRITE the decision contract and build the translation engine,
REFACTOR the prediction engine and the lenses, EXTEND the substrate and the
ledger.** The biggest risk is mistaking the existing per-role dashboards for the
target's lenses — they share UI, but the data architecture underneath is the
inverse of what the target requires.
