# ASSUMPTIONS

PART 3 deliverable. Every decision we'd otherwise have stopped to ask about, with
the default we chose. Change any of these and tell us — none are load-bearing in a
way that can't be reversed. (Mirrors `IMPLEMENTATION_MAP.md` §3; this is the
standalone copy the spec asks for.)

| # | Assumption / ambiguity | Default chosen |
|---|---|---|
| A1 | `content/` directory | → `resources/` (repo convention). CIS workbook at `resources/cis/`. |
| A2 | "Back up the SQLite file" | App is PostgreSQL, not SQLite. Equivalent discipline: **additive-only**, idempotent DDL in `db.init()` — no destructive DROP/ALTER, demo data preserved automatically. Prod (Render) DB migrates itself on boot. |
| A3 | Single-tenant `org_id=1` | App is **multi-org** (BCBS-MA / Cigna / Meridian demo orgs). New per-org tables carry `org_id TEXT`; catalog/content tables (frameworks, requirements, techniques, mappings, checks) are **global** (no `org_id`). |
| A4 | URL routes `/board`, `/frameworks`, `/ciso` | App uses state-based pages, not React Router. D1 extends the CISO dashboard; D2 extends the Board/CRO dashboard. |
| A5 | Spec phase definitions (source spec files not in repo) | Inferred from the task brief; recorded in `IMPLEMENTATION_MAP.md` §2. Corrections welcome if the specs are pushed. |
| A6 | `sample_content_pack.json` schema (not in repo) | Reconstructed: `{framework, version, requirements:[{id, title, text_verbatim?, ig1/2/3?, mappings:[{check_id, coverage(full|partial), parameters{}, justification}]}]}`. |
| A7 | Live tool credentials | None present → the validation runner executes against **mock fixtures** (`metric_inputs` `_defaults`, incl. the 35 CIS candidate-check fixtures). Real credentials drop in via `tool_connections` and flip a result's `source` from `simulated` to `live` with no code change. |
| A8 | ATT&CK version skew (bundle v19.1, CTID mapping v16.1) | Ingest both; provenance pinned; deprecated/revoked techniques honored; version-skew rows flagged `meta.version_skew=true`; unmatched IDs → `resources/RECONCILIATION.md`. |
| A9 | CIS verbatim text licensing | `VERBATIM_CIS` env flag (default `false`): when false, store/show paraphrase + native safeguard ID only — never the licensed verbatim text. |
| A10 | Exports | PDF via the existing `pdfkit` stack; PPTX via `pptxgenjs` (the one added dependency). |
| A11 | "WebSocket usage" in the spec | N/A — repo has none. The runner executes synchronously on demand and on tool sync. |
| A12 | Baseline-profile fetch | Allowed by the spec's content rules (public domain, missing locally) → saved to `resources/nist/` with a `SOURCES.md` entry (B1). |

## CIS new-check candidates (B3 follow-through) — assumption

The 35 CIS v8.1.2 safeguards that matched no existing telemetry signal are now
covered by purpose-built automated checks (`cyberrx-api/src/data/cisCheckCandidates.js`),
each tied to a representative tool in the catalog with a mock-fixture default
(per A7). **Assumption:** the chosen tool-per-safeguard and pass thresholds are
sensible industry defaults, not customer-confirmed — they are easy to retune
(`threshold`/`direction` per entry) or repoint to a different tool. The 19
remaining uncovered safeguards are **rubric-based** (evidence-document driven) and
stay uncovered until the 46 assessment rubrics (`control_assessment_rubrics.json`)
are supplied — see `FOLLOW_UPS.md`.
