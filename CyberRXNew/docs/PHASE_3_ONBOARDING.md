# Nerion — Phase 3: Onboarding / intake

**Status:** Complete, pending approval. The full intake wizard is live at
`/app/onboarding` (⚙ Onboarding in the top bar).

## The flow (8 steps, from the intake mock)
1. **Organization profile** — name, industry, ownership, employees, regions,
   regulated data types, **primary currency (ISO code)**, and materiality
   threshold. Money fields show the chosen currency symbol; numbers are
   digit-filtered.
2. **Connect your systems** — the 10 connector categories with a live
   **evidence-credibility meter** (weighted by signal volume) that fills as you
   connect.
3. **Business processes** — add processes in business terms (name + value/day).
4. **Applications** — add the systems that run them.
5. **Auto-map & crown jewels** — mark the processes/apps whose loss hurts most
   (the engine auto-deduces this for real in Phase 4).
6. **Documents** — list policy/report evidence files.
7. **Executive data needs** — insurance coverage, risk appetite, and the **CISO
   incident command plan + 24/7 call tree** (role · name · phone) that powers
   Incident Commander mode.
8. **Review & go live** — a full summary, then **Go live** → returns to the seats.

## Persistence
State is shaped to the Phase 1 data model (`tenants` / `connectors` /
`assumptions` / `incident_plan` / `contacts`) and saved to `localStorage` in demo
(clearly flagged "● Demo · saved locally"). With Supabase wired, "go live" writes
these rows behind RLS. The chosen **currency** is stored as an ISO code and used
in the onboarding money fields; full propagation across seat figures lands with
the engine (Phase 4).

## Verification
- `npm run build` + `npm run typecheck` pass; `/app/onboarding` serves HTTP 200.

## Routing
- `/` → static prototype · `/app` → seats · `/app/onboarding` → this wizard.

## Next
Phase 4 — framework catalogs + the deterministic CMMI scoring engine + signed
exports, which begins turning the seat figures from seed data into computed,
evidence-backed numbers.
