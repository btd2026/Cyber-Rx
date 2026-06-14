# Linkage & Multi-Tenant Reference Model

Implements the CyberRX linkage chain and the configuration-driven, multi-tenant
reference model. No per-tenant code forks — all differences are data/config.

```
Business Function → Process → Application → Asset → Risk → Control
        (criticality: Tier + RTO propagates DOWN; business impact rolls UP)
```

## Phase 1 — data model (this change)

### Shared canonical reference (NO `organization_id`, versioned)
- `capability_library_version` — versioned library (`payerlib_v1`).
- `capability` — plan-agnostic payer taxonomy: `function → capability`, with
  `content_tier` (`A_universal` | `B_blue` | `C_extension`), `default_tier`
  (criticality 1–3) and `default_rto`. Source of truth: `src/data/payerCapabilityTaxonomy.js`.
- `capability_pack` / `capability_pack_item` — packs (`universal_payer`, `blue`);
  business type → packs in `BUSINESS_TYPE_PACKS` (BCBS adds the Blue pack).

Seeded idempotently at boot by `src/ingest/seedReferenceModel.js` (wired into
`ingest/bootstrap.js`). **No plan-identifying data lives here.**

### Tenant business model (per `orgs.id`)
- `business_functions` (new top of chain); `business_processes` gains
  `business_function_id`, `rto`, `capability_id`, `criticality_profile_id`.
- `applications` (new, first-class) — replaces apps-as-`assets.type='app'`.
- `criticality_profile` — auditable Tier + RTO with `derivation` (explicit/inherited).
- Crosswalks (confidence-scored, idempotent): `process_capability_map`,
  `app_process_map`.
- `third_party_dependency` — dependency-graph node (e.g. NASCO), **distinct from**
  a monitoring `connector`.

### Ingestion & connectors
- `connector` — vendor-neutral data source (`kind`: cmdb/easm/ratings/vuln/evidence).
- `ingestion_source` + `ingestion_mapping` (persisted field map) + `ingestion_exception`
  (review queue — never silently drop rows).

### Assessment
- `framework_requirements.assessment_type` (`automated|manual|hybrid`), backfilled
  from the catalog `meta.test` flag (`auto→automated`, `partial→hybrid`,
  `manual→manual`, default `hybrid`).
- `assessment_result` — unified per-control result merging automated
  (`check_results`) + document (`control_assessment`) evidence, with `confidence`,
  `review_status`, and `evidence_refs` trace.

## Extending the taxonomy
Add nodes/packs in `src/data/payerCapabilityTaxonomy.js` (Tier C = per-plan
extensions). Re-running `seedReferenceModel.seed()` upserts changes. Crosswalks
map a tenant's local processes/apps onto these canonical ids — a plan with
different processes is configuration, never a fork.

## Migration
`migrations/2026_06_14_linkage_reference_model.sql` mirrors the idempotent
additions in `src/utils/db.js`.

## Roadmap
P2 generic ingestion · P3 wizard (process inventory, CMDB, crosswalk, dual
evidence) · P4 unified assessment engine · P5 risk outputs · P6 sample-doc
generator · P7 cross-tenant benchmarking.
