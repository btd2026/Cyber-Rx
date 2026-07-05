# Nerion — Phase 4 (4a + 4b): catalogs + deterministic engine

**Status:** Sub-steps 4a and 4b complete & proven, pending approval. 4c (full
catalog UI + benchmark) and 4d (signed exports) are the next sub-steps.

## 4a — Authoritative framework catalogs (loaded & proven)
- **Catalog loader:** `supabase/scripts/load_catalogs.mjs` parses authoritative
  **OSCAL** and emits SQL that upserts `frameworks` + `controls` (Phase 1 schema).
  Catalogs load **verbatim** — IDs and titles are never invented.
- **Proof** (`docs/PHASE_4_CATALOG_PROOF.txt`, run against local PostgreSQL 16):
  - 5 frameworks registered: CSF 2.0, NIST 800-53, CIS v8, ISO 27001:2022, SOC 2.
  - **1,196 NIST 800-53 Rev 5 controls** loaded: **324 base + 872 enhancements**,
    verbatim (e.g. `AC-2.1 — Automated System Account Management`).
- Source: `usnistgov/oscal-content` (canonical OSCAL). CIS/ISO/SOC 2 control
  **titles** are licensed and load from their licensed distributions; the loader
  registers those frameworks and ingests their rows the same way.
- 800-53 enhancements load with the base set here; on Supabase the catalog is
  queried server-side (not shipped in the browser bundle).

## 4b — Deterministic CMMI scorer (the engine owns the truth)
- `src/engine/scorer.ts` — a **pure, deterministic** function: evidence signals →
  **CMMI 0–5**, status, and **mechanical confidence** (coverage breadth ×
  freshness). No randomness, no network, no LLM. An LLM may later *propose* a
  maturity *with a citation*, but the engine does the math and an analyst reviews.
- **Proof** (`supabase/scripts/score_proof.ts`, run with
  `node --experimental-strip-types`): all checks pass —
  - no evidence ⇒ CMMI 0 / `no_data`
  - full fresh coverage ⇒ CMMI 5 / `pass`
  - stale coverage scores **below** fresh (freshness dampens)
  - partial / low coverage ⇒ `partial` / `fail`, lower confidence
  - **deterministic** (same input ⇒ identical output)
  - rollup averages children, ignoring `no_data`
- **Visible now:** the CISO **Framework Posture** tab computes CMMI live with this
  engine over a CSF 2.0 sample (per-control confidence shown), instead of
  hardcoded numbers.

## Reproduce
```bash
# catalog load proof (needs local postgres + Phase 1 schema)
node CyberRXNew/supabase/scripts/load_catalogs.mjs r53-oscal.json | psql "$DB" -f -
# scorer proof
node --experimental-strip-types CyberRXNew/supabase/scripts/score_proof.ts
```

## 4c — Framework Posture UI + benchmark (complete)
- **Drill** function → category → control, with the complete **CSF 2.0** (all 22
  categories) scored live by the engine. Click any control to see its evidence:
  status, coverage, freshness, confidence, and the note that CMMI is re-derivable,
  not generated.
- **Per-framework benchmark** on the CMMI scale, enforcing both brief rules:
  - **Reciprocal** — you must contribute your anonymized maturity (CMMI only,
    never findings/identifiers) before you can view peers.
  - **k-anonymity ≥ 8** — frameworks with fewer contributing peers (the ISO
    cohort, n=5) **fall back to overall maturity only**, no distribution.

## 4d — Signed exports (complete)
- `src/engine/exports.ts` generates **real downloadable files**:
  - **Auditor report** (Markdown) — per function/category/control CMMI, status,
    confidence, coverage, evidence age.
  - **Evidence manifest** (JSON) — machine-readable control scores.
- Each is **SHA-256 signed** (hash embedded; tamper-evident), mirroring the
  signed ledger. Production generates & signs these server-side over the signed
  evidence chain.

**Phase 4 complete.** Next: Phase 5 — the Executive Twin (anti-hallucination
Surface A/B + the leaf rule + voice), the most important phase.
