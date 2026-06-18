# CISO Tab Redesign — Implementation Plan

Enterprise context: $300K+/year, large regulated multi-division clients. Optimize
for depth, configurability, defensibility. No SMB tier.

This plan covers Steps 1–2 (read + plan). **No feature code until approved.**

---

## 0. Principles preserved

The CISO tab is a **consumer** of the shared substrate, not a data silo:
- **Substrate:** `cyberrx-api/src/utils/db.js` (risks, findings, assets, applications,
  business_processes, financial_impacts, controls, data_objects, app_process_map…)
  + `services/CorrelationEngine.js`, `services/RiskOutputsService.js`.
- **Single event / DecisionCard:** `services/DecisionEngineService.js`
  (`generate` → `DecisionCard` → `lensFor(role)` → `list`/`record`/`ledger`,
  plus the compound/chained-risk engine). Ledger: `decision_ledger`.
- **Per-role rendering:** `CisoDashboardService.applyRoleLens` +
  `ExecDashboardService` + `CisoSecurityPostureDashboard.jsx`.

The redesign re-points the CISO sub-tabs onto these; it does **not** create a new
CISO-only dataset. Where the CISO tab still reads `data/cisoDashboard.js` (mock)
that is called out as REFACTOR-to-substrate work.

---

## 1. Enterprise constraints — where the codebase stands

| Constraint | Today | Action |
|---|---|---|
| Overridable defaults (taxonomy, appetite, weights, frameworks) | Partial — `metric_inputs` editable, `reportingFrameworks` saved, `ciso_entities` overridable; **no single tenant-config surface** | **NEW** `tenant_config` (per-org JSON: appetite thresholds, scoring weights, frameworks, risk taxonomy) with defaults; read by the engine. Slice 0. |
| Visibility confidence per asset class | Confidence exists on checks/assessments only; **none per asset class** | **NEW** `VisibilityService`: per-class (assets/identity/vuln/cloud/vendor/data) completeness from substrate counts + connector status. Slice 0. |
| Multi-entity / BU / region rollup | **None** — `orgs` is flat | **NEW (large)** parent/child org + rollup. Designed-for now (all reads stay org-scoped), **built as a separate epic** — flagged, not in the 5 slices. |
| Industry overlays (not forks) | `data/industryProfiles.js` (regs, processes, crown jewels) | **EXTEND** overlays to inject regulatory mappings, sector threat actors, peer benchmarks into Key Risks / Control Efficacy / Coaching. |
| SSO/SAML, RBAC, audit, isolation, SOC 2 | `config/passport.js` (@node-saml + Azure OIDC), `middleware/auth.js`, `middleware/org_isolation.js`, `routes/audit-trail.js` + `models/ProvenanceTrail` | **EXTEND** audit to cover decision-ledger events (mostly done) + RBAC checks on config writes. Verify, don't rebuild. |

---

## 2. Cross-cutting (lives across all sub-tabs)

### 2a. Persistent decision queue — REFACTOR
- Today it's a *tab* (`DecisionQueue.jsx`, `routes/decisions.js`). Spec: **always
  visible**, fed by risks + degrading controls + stalled projects + blind spots.
- Plan: keep the full Decision Queue view, but add a **persistent rail/badge**
  (header count + slide-over panel) rendered by `CisoSecurityPostureDashboard`
  across every sub-tab, fed by `DecisionEngineService.list(orgId,'CISO')`.
- Extend `DecisionEngineService.generate` inputs to also emit DecisionCards from
  **degrading controls** (Control Efficacy), **stalled projects**
  (`ProjectPortfolioService`), and **blind spots** (`BlindSpotService`) — today it
  emits from risks + AI only.

### 2b. Decision & evidence ledger — EXTEND
- Exists: `decision_ledger` + `DecisionEngineService.record` (who/when/rationale/
  engine-state; accept-&-monitor forces rationale).
- Add: a **ledger view + export** (CSV/PDF) as a defensibility artifact, and wire
  ledger writes into `audit-trail`/`ProvenanceTrail`.

---

## 3. Sub-tab plan

### Sub-tab 1 — CURRENT STATE — **REFACTOR**
Spec: auto-derived; **remove questionnaire gating**; generated exec summary + voice;
time-aware ("what changed since last brief"); show visibility confidence.
- Current: `qa` renders `CisoAgentPanel` (5 self-assessment questions). 
- Changes:
  - Remove `CisoAgentPanel` from the CISO Current State; render the hero +
    `ExecutiveSummaryEditor` (`services/ExecutiveSummaryService`) + **voice brief**
    (`components/agentVoice.jsx` `humanize` + existing TTS; `ExecReportService` for
    a board-ready audio/PDF).
  - **What changed:** read `ciso_dashboard_snapshots` / `score_history` to lead with
    deltas since the last brief.
  - **Visibility confidence:** surface `VisibilityService` output here.
  - Keep optional enrichment ONLY for non-inferable inputs (app criticality, risk
    appetite) — default to inference, allow correction (writes to substrate /
    `criticality_profile` / `tenant_config`).
- Files: `CisoSecurityPostureDashboard.jsx`, `CisoAgentPanel.jsx` (unmount for CISO),
  `services/ExecutiveSummaryService.js`, `services/ExecReportService.js`, new
  `services/VisibilityService.js`, `data`/snapshots.
- Lowest risk → **implement first.**

### Sub-tab 2 — KEY RISKS — **REWRITE (of the grouping) + EXTEND (substrate)**
Spec: hero = business risks **above appetite** (configurable, not fixed top-10);
exploitability-ranked vulns are the **evidence layer beneath**; each risk has owner/
status/scenario-type/explanation/own trajectory; click → impacted processes + apps +
**live attack-path graph**; Projections = portfolio "what's trending" + DecisionCards.
- Reuse: `risks` table + `RiskOutputsService.blastRadius`/`crownJewels`,
  `app_process_map`, `AttackPathService.buildGraph` (+ `computeReachability`),
  `ThreatSignalService` (EPSS/KEV) for the vuln evidence layer, `DecisionEngineService`
  compound engine for Projections.
- New/changed:
  - **Risks-above-appetite** selector (reads `tenant_config` appetite threshold).
  - **Per-risk drill** component: impacted processes/apps (RiskOutputs +
    app_process_map) + **risk-scoped attack-path** (extend `AttackPathService` to
    filter the graph to one risk's nodes — today it's whole-org).
  - **Exploitability evidence**: findings ranked by EPSS percentile + KEV under the
    business risk (new read joining `findings` + `ThreatSignalService`).
  - **Projections view** = `DecisionEngineService` compound scenarios as a
    portfolio-level "if a,b,c then y" list, each with its DecisionCard options.
- Files: `CisoSecurityPostureDashboard.jsx` (new Key Risks group + sub-nav),
  `routes/risk-outputs.js`/`RiskOutputsService.js`, `AttackPathService.js` (per-risk
  filter), `ThreatSignalService.js`, `DecisionEngineService.js`, `AttackPathGraph.jsx`.
- Largest slice; do **after** Current State + Control Efficacy.

### Sub-tab 3 — CONTROL EFFICACY — **REFACTOR**
Spec: tie each control to the **risk(s) it reduces** ("degrading AND holding back risk
#N"); SOC MTTD/MTTR + trends; framework overlay (NIST CSF or CIS base + industry
overlay); compliance posture surfaceable.
- Current: `controlRisk` (`data/cisoDashboard.js` CONTROL_AREAS) has `processAffected`
  but no explicit risk linkage; `controls` table HAS `related_risk_ids` (unused).
- Changes:
  - **Control→risk linkage:** join control areas to `risks` (via `related_risk_ids`
    or a curated map), and flag "degrading control gating risk #N" (cross-reference
    control trend + the risk it reduces).
  - **SOC performance:** MTTD/MTTR + trend panel from `MetricsEngine`
    (`mttd_hrs`/`mttr_hrs`) + `score_history`.
  - **Framework overlay:** base CSF/CIS (`framework_requirements`,
    `FrameworkScoreService`, `routes/csf.js`) + active **industry overlay**
    (`industryProfiles` → HIPAA/PCI/NERC/etc.); compliance posture summarised.
- Files: `CisoSecurityPostureDashboard.jsx` (Controls + Domains + new SOC panel),
  `services/CisoDashboardService.js`/`data/cisoDashboard.js`, `MetricsEngine.js`,
  `FrameworkScoreService.js`, `NistCsfService.js`, `industryProfiles.js`.
- Medium risk; do **second** (reuses existing data, adds linkage + one panel).

### Sub-tab 4 — KEY PROJECTS & ROI — **EXTEND**
Spec: tie each project to the risk(s) it reduces; **predicted vs realized** reduction
(engine calibration + CFO-translation source); ROI = expected-loss-avoided per $.
- Current: `ProjectPortfolioService` computes **predicted** posture lift + ROI +
  delay impact; no realized capture; `SecurityProjects.jsx`.
- Changes:
  - **Project→risk linkage** (which risks each project reduces).
  - **Realized reduction:** snapshot the engine's risk/exposure at project milestones
    (calibration store) and compare to predicted. **NEW** small `project_calibration`
    persistence.
  - **CFO translation:** expected-loss-avoided per $ from `DecisionEngineService`
    loss distribution (shared source, honest framing).
- Files: `ProjectPortfolioService.js`, `SecurityProjects.jsx`, `DecisionEngineService.js`.
- Low-medium risk; do **fourth**.

### Sub-tab 5 — BLIND SPOTS & COACHING — **EXTEND**
Spec: personalized to the CISO's neglect patterns AND benchmarked by org size +
industry ("peers in your sector invest in X; you have a gap").
- Current: `BlindSpotService` (neglect from `decision_ledger`), `CoachingService`,
  `Coaching.jsx`; `BenchmarkService` (consent-gated peer scaffold).
- Changes: add **size/industry benchmark** to coaching (BenchmarkService +
  `industryProfiles` peer data + sector threat actors), keep ledger-driven
  personalization.
- Files: `BlindSpotService.js`, `CoachingService.js`, `BenchmarkService.js`,
  `industryProfiles.js`, `Coaching.jsx`.
- Low risk; do **fifth**.

---

## 4. Implementation order (each a STOP-for-review point)

0. **Cross-cutting foundation** — `tenant_config` (overridable appetite/weights/
   frameworks), `VisibilityService`, persistent decision-queue rail, ledger
   view+export. *(Unblocks every sub-tab; lowest feature risk.)*
1. **Current State** (REFACTOR) — remove questions; summary + voice + what-changed +
   visibility confidence.
2. **Control Efficacy** (REFACTOR) — control→risk linkage + SOC MTTD/MTTR + framework
   overlay.
3. **Key Risks** (REWRITE+EXTEND) — risks-above-appetite hero + exploitability
   evidence layer + per-risk drill (processes/apps/attack-path) + projections.
4. **Key Projects & ROI** (EXTEND) — project→risk + predicted-vs-realized + CFO ROI.
5. **Blind Spots & Coaching** (EXTEND) — + size/industry benchmark.

Multi-entity rollup is a **separate epic** (flagged, not in these slices); all reads
stay org-scoped so it can be layered later.

---

## 5. Open decisions for review
1. **Decision-queue persistence UX:** header badge + slide-over rail (recommended) vs.
   a pinned column. 
2. **Risk register source:** drive Key Risks from the live `risks` table where
   populated, falling back to `data/cisoDashboard.js` demo — confirm we migrate CISO
   off the mock here (it's the substrate-alignment the architecture wants).
3. **tenant_config storage:** new table vs. extend `orgs.setup_json` — recommend a
   dedicated `tenant_config` for clarity + RBAC.
4. **Realized-reduction calibration:** snapshot cadence (per milestone vs. monthly).
5. **Scope confirm:** CISO tab only this pass; other roles unchanged.
