# FOLLOW-UPS

## B2 — CSF 2.0 ⇄ 800-53 mappings are PROVISIONAL

Derived via check-level joins (no CPRT CSF 2.0 informative-references export present).
- 800-53 derived requirement→check mappings: **444**
- CSF⇄800-53 derived crosswalks: **662** (all provisional=true, provenance='derived')

To upgrade to OFFICIAL: supply the CPRT CSF 2.0 informative-references export to
`resources/nist/` and re-run B2; mappings become provenance='NIST CPRT', provisional=false.
