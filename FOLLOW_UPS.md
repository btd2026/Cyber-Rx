# FOLLOW-UPS

## B2 — CSF 2.0 ⇄ 800-53 mappings are PROVISIONAL

Derived via check-level joins (no CPRT CSF 2.0 informative-references export present).
- 800-53 derived requirement→check mappings: **444**
- CSF⇄800-53 derived crosswalks: **662** (all provisional=true, provenance='derived')

To upgrade to OFFICIAL: supply the CPRT CSF 2.0 informative-references export to
`resources/nist/` and re-run B2; mappings become provenance='NIST CPRT', provisional=false.

## B4 — ATT&CK version skew (bundle v19.1 vs CTID mapping v16.1)

- ATT&CK techniques loaded (v19.1): **858** (161 deprecated/revoked)
- CTID crosswalks written: **5314** (provenance 'CTID', attack_version 16.1)
- CTID rows whose technique is deprecated/revoked in v19.1: **176** (flagged meta.version_skew=true)
- CTID rows referencing a technique not in the v19.1 bundle: **1**
- CTID rows referencing an unknown 800-53 control (skipped): **0**

These are expected from the v16.1→v19.1 gap. Supplying a v19.x CTID mapping would clear the skew.
