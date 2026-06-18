# Compiler Epic — Implementation Plan

Status: **Pre-approved — building straight through, one slice per PR, no pause.**

The compiler assembles the traceable chain and assesses controls per framework:

```
business risk → process → application → security system → control
                                                            └─ assessed against EACH framework INDEPENDENTLY
                                                               (NIST CSF 2.0, NIST 800-53 r5, CIS v8, ISO 27001, SOC 2 — NO crosswalk)
```

## A. What exists (reuse) vs. missing (build)

| Chain link | Source | Status |
|---|---|---|
| risk | `risks` (business_process_ids JSONB) + DecisionEngine events + `financial_impacts` | EXISTS |
| risk → process | `risks.business_process_ids` | EXISTS (JSONB) |
| process | `business_processes` (intake-validated, level/criticality) | EXISTS |
| process → application | `process_application_map` (validated) | EXISTS (intake) |
| application → security system | org-level `cae_selected_tool` / `tool_connections` (no per-app link yet) | PARTIAL (org-level) |
| security system → control | `cae_control_tool_map` (CSF/800-53/CIS only) | PARTIAL |
| control | `controls` (single `effectiveness_score`, legacy framework enum) | EXISTS |
| control → framework assessment | `control_framework_assessment` | **EMPTY scaffold — compiler populates** |
| framework requirements | `framework_requirements` — CSF/800-53/CIS seeded; **ISO 27001 & SOC 2 NOT seeded** | PARTIAL |
| assessment engines (reuse) | `AssessmentEngine` (csf/800-53/cis), `FrameworkScoreService` (signal-based, 9 fw), `NistCsfService`, `ControlEfficacyService`, CAE `assessmentService`/`coverageService`, `RiskOutputsService` (blastRadius/crownJewels) | REUSE |

## B. Slices (each its own PR; build straight through)

### Slice 0 — Foundation: chain assembly + compile run + per-framework write (NEW)
- **`CompilerService`** (NEW): `assembleChain(orgId)` reads the validated substrate into the nested traceable structure (risks → processes → applications → security systems → controls), DB-graceful. `run(orgId)` assembles + **populates `control_framework_assessment`** with one row per (control × framework) — independent, no crosswalk — first-pass status from `controls.implementation_status` (Implemented→met, Partial→partial, Planned/None→gap, else not_assessed); records a **`compile_run`** row and returns a per-framework summary.
- **`compile_run`** table (NEW): id, org_id, status, summary JSONB, created_at.
- Routes: `GET /api/compiler/chain`, `POST /api/compiler/run`, `GET /api/compiler/run/latest`.

### Slice 1 — Per-framework independent assessment (REFACTOR/REUSE)
Replace the first-pass status with real per-framework assessment by **reusing `AssessmentEngine` (csf/800-53/cis) + document `control_assessment` + automated checks**, writing each framework's result independently into `control_framework_assessment`. No framework reads another's result.

### Slice 2 — ISO 27001 + SOC 2 requirement loaders (NEW)
Seed `framework_requirements` for `iso_27001` (Annex A, 93 controls) and `soc_2` (Trust Services Criteria), with `assessment_type` (document/manual). Document-based assessment via the existing document pipeline; no tool evidence required.

### Slice 3 — Chain traceability API + UI (NEW)
`GET /api/compiler/chain` drill-downs surfaced in the app: pick a risk → see its processes → applications → security systems → controls → the 5 independent framework verdicts. Gap rollups per link.

### Slice 4 — Per-framework posture + remediation (NEW)
Per-framework posture score, gap list, and a remediation plan (which control closes which framework gap), with predicted exposure-reduction tie-back to the decision spine.

## C. Data-model additions
- `compile_run` (Slice 0).
- `control_framework_assessment` already exists (Slice-0 intake) — compiler is its writer.
- ISO/SOC2 rows in `framework_requirements` (Slice 2).
- (Later) optional `app_security_system_map` for per-app protection granularity — flagged, not in Slice 0.

## D. Invariants
- **Each framework assessed independently** — `control_framework_assessment` is one row per (control, framework); `requirement_crosswalks` is reference-only and never feeds scoring.
- Everything DB-graceful (modeled/empty fallback) so it runs in any environment.
