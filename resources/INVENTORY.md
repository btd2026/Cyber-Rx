# Content Inventory — PART 0

Date: 2026-06-12 · Branch: `feature/exec-reporting` · Source: `resources/` (pulled from
`task/T-PILOT-005-mvp-validation` @ `5b741ea`).

> Repo convention note: the spec calls this directory `content/`; the repo already uses
> `resources/`. Existing conventions win — all spec references to `content/…` map to
> `resources/…` here.

Every file was identified by **inspecting its content** (parsed as JSON, structure
verified), never by extension.

## Files present — verified

| File | Identified as | Counts (parsed) | Ingestion step |
|---|---|---|---|
| `Mitre.txt` (53.3 MB) | **STIX 2.1 bundle — MITRE Enterprise ATT&CK v19.1** (`x-mitre-collection` = "Enterprise ATT&CK", version 19.1). Verified `type: bundle` with `attack-pattern` objects. | 25,843 objects · 858 attack-patterns (697 active / 161 deprecated-or-revoked; 475 sub-techniques) · 15 tactics · 268 mitigations (`course-of-action`) · 21,025 relationships · 289 objects flagged `x_mitre_deprecated` · 157 `revoked` | **B4** |
| `NIST_SP-800-53_rev5_catalog.txt` (10.4 MB) | **OSCAL JSON catalog — SP 800-53 rev 5.2.0** ("Electronic (OSCAL) Version of NIST SP 800-53 Rev 5.2.0 Controls **and SP 800-53A Rev 5.2.0 Assessment Procedures**", last-modified 2026-05-11). Note: 5.2.0, not plain rev 5 — and it already embeds 800-53A assessment-objective parts. | 20 families · 1,196 controls total (324 base + 872 enhancements) · 182 withdrawn · 3,715 assessment-objective parts | **B1** |
| `cprt_SP_800_53_A_5_2_0_06-11-2026.json` (11.0 MB) | **NIST CPRT export — SP 800-53A rev 5.2.0 assessment procedures** (`doc_identifier: SP_800_53_A_5_2_0`). CPRT element schema (`response.elements`), not OSCAL. | 13,591 elements: 20 family · 324 control · 872 control_enhancement · 2,318 control_statement · 2,977 determination · 1,465 odp (+1,465 odp_statement) · 1,013 examine · 1,012 interview · 906 test | **B1** |
| `nist_800_53-rev5_attack-16.1-enterprise.json` (2.0 MB) | **CTID mapping — ATT&CK v16.1 enterprise ↔ SP 800-53 rev 5** (`metadata.attack_version: "16.1"`, `mapping_framework: nist_800_53 rev5`). | 5,410 mapping_objects · 566 distinct techniques · 110 distinct 800-53 controls · mapping_type: 5,314 `mitigates`, 96 null (non-mappable annotations) | **B4** |

## Reconciliation notes (feed `RECONCILIATION.md` during STEP B)

1. **Catalog ↔ CPRT agree exactly**: 20 families / 324 controls / 872 enhancements on
   both sides — the catalog is 5.2.0 and the assessment procedures are 5.2.0, so the
   feared rev 5 ↔ 5.2.0 ID drift does not exist in this pairing. B1 still logs any
   per-ID misses (expected ≈ 0; withdrawn controls excluded).
2. **ATT&CK version skew**: STIX bundle is **v19.1**; CTID mapping targets **v16.1**.
   B4 must (a) store `attack_version='16.1'` provenance on every CTID row, (b) flag
   mapping rows whose technique is deprecated/revoked in v19.1, and (c) note v19.1
   techniques with no CTID coverage (expected: techniques added after 16.1).
3. The OSCAL catalog already embeds 800-53A objectives; the CPRT file additionally
   carries `examine`/`interview`/`test` methods and ODPs. B1 ingests objectives from
   the catalog and methods/ODPs from CPRT, keyed by control ID.

## Files MISSING — required by the spec, not in the repo

| Expected | Required by | Status |
|---|---|---|
| CIS Controls v8.1 licensed workbook (`content/cis/`) | **B3 — HARD STOP** | ❌ Not on any branch. B3 cannot start. Never fetched from internet (licensed). |
| CIS↔CSF 2.0 mapping workbook | B3 crosswalks | ❌ Missing |
| CIS↔ATT&CK mapping workbook | B4 (optional input) | ❌ Missing |
| CPRT CSF 2.0 informative-references export | B2 OFFICIAL mappings | ❌ Missing → **B2 proceeds with provisional mappings** (`provisional=true`, listed in FOLLOW_UPS.md) per spec rule |
| `MULTI_FRAMEWORK_SPEC.md`, `CLAUDE_CODE_IMPLEMENTATION_SPEC.md`, `sample_content_pack.json` | Phase definitions / pack schema | ❌ Missing → phases inferred from the task brief itself (see IMPLEMENTATION_MAP.md §3); content-pack schema reconstructed from the brief's description (coverage + parameters + justification) |
| `server/seed/nist_csf_control_library.json` (106 controls) | Reference asset | ⚠️ Absent as JSON, but an in-repo equivalent exists: `cyberrx-api/src/data/nistCsfControlLibrary.js` (106 CSF 2.0 subcategories, test methods, tools) — used as source of truth |
| `server/seed/evidence_tool_api_catalog.json` (16 tools / 89 checks) | Reference asset | ⚠️ Absent; nearest equivalent `cyberrx-api/src/data/securityToolCatalog.js` (36 tools, 56 API checks). The 89-check catalog with validation logic must be supplied or the checks authored in STEP A |
| `server/seed/control_assessment_rubrics.json` (46 rubrics) | B3 rubric reuse | ❌ Missing → rubric-based classification in B3 will reference rubric IDs as TODO until supplied |
| `server/lib/evidence_review_agent.js` | Evidence agent wiring | ⚠️ Absent; nearest equivalent: `NistCsfService.reviewDocuments()` (Zadkiel document-review agent) |
| 800-53 Low/Moderate/High baseline profiles | B1 | ⏳ Permitted fetch from `github.com/usnistgov/oscal-content` during B1; will be saved to `resources/nist/` and recorded in `resources/SOURCES.md` |

## Verdict

- **B1, B4**: fully unblocked (content verified).
- **B2**: unblocked in provisional mode.
- **B3**: ⛔ **STOPPED** until the CIS v8.1 workbook lands in `resources/cis/`.
- STEP A, C, D: unblocked (engine/UI work, not content-dependent).
