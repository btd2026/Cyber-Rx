# CyberRx — Financial Exposure (FAIR-lite engine, Phase 9)

Turns the engine's evidence-computed maturity into an annualized loss exposure in
dollars — deterministically, with **every leaf labeled by provenance**. This is
what makes the CFO/CRO/CEO figures real instead of seed, while honoring the
brief's non-negotiable: *every user-facing number traces to pulled evidence or an
owned assumption — never invented.*

`src/engine/fair.ts` · proven by `supabase/scripts/fair_proof.ts` (16 checks).

## Model

```
ALE (annual loss expectancy) = Σ scenarios  LEF × Loss Magnitude
LEF (loss event frequency)   = Threat Event Frequency × Vulnerability
Vulnerability                = clamp(1 − CMMI/5, 0.05, 1)   ← falls as maturity rises
Residual ALE                 = Σ  LEF × max(0, LM − insurance cover)
```

Two scenarios today:
| Scenario | Vulnerability driven by | Loss magnitude |
|---|---|---|
| Data breach (PHI/PII) | avg(Protect, Identify) CMMI | records × cost/record |
| Ransomware / outage | avg(Protect, Detect, Recover) CMMI | downtime $/hr × hours |

Higher maturity ⇒ strictly lower exposure (proven). Insurance offsets residual,
never below zero (proven).

## Provenance — the integrity guarantee

Every input is a **leaf** tagged `pulled` or `assumption`:

- **pulled** — control maturity (Protect/Identify/Detect/Recover CMMI), computed
  by the deterministic engine from your connectors' evidence. Not a guess.
- **assumption** — owned values with a stated basis:
  - `insurance_coverage` — from onboarding (the tenant's `assumptions` table).
  - `records_held` — org profile.
  - `breach_cost_per_record`, `downtime_cost_per_hour`, `downtime_hours`,
    `breach_tef`, `ransomware_tef` — industry-default baselines
    (`DEFAULT_FAIR_ASSUMPTIONS`), editable per tenant.

The UI (the live-posture strip's **Trace provenance** panel) lists every leaf
with its source + basis, so any dollar figure is one click from its derivation.
The proof asserts maturity leaves are always `pulled` and cost/records/insurance
leaves are always `assumption`.

## Wiring

- `src/app/useFairExposure.ts` — combines live maturity (`useLivePosture`) with
  the tenant's owned assumptions (`loadAssumptions`) → `computeFair`. Returns
  null in demo / before live data, so the UI self-hides (no fabricated $ in demo).
- `src/seats/LivePostureStrip.tsx` — shows residual + gross exposure on every
  seat's home view, with the expandable provenance trace.

## Remaining / future

- Capture the magnitude/frequency assumptions explicitly in onboarding (today
  only insurance is captured; the rest use industry defaults) and route edits
  through the signed assumptions change-log (Phase 5c pattern).
- More scenarios (insider, supply-chain, regulatory fines) and a Monte-Carlo
  range instead of point estimates.
- **Legal/finance review** of the model + default assumptions before any
  customer-facing use (per the brief's review gate).
