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


## Optional mappings — status

- **CIS↔ATT&CK / CSF↔ATT&CK (derived)**: 15,937 + 3,591 provisional crosswalks
  derived via shared checks (technique→CTID 800-53 controls→checks ∩ safeguard/
  subcategory→checks), provenance='derived', shared_checks in meta. Queryable at
  `GET /api/frameworks/crosswalks?to=attack_enterprise`. Supplying the licensed
  CIS↔ATT&CK mapping workbook (resources/cis/) upgrades CIS rows to OFFICIAL.
- **CPRT CSF 2.0 informative references (official CSF↔800-53)**: loader is built
  (`src/ingest/loadCsfRefs.js`, wired into bootstrap) but the export could not be
  fetched from this environment — `csrc.nist.gov` is NOT in the network egress
  allowlist (only raw.githubusercontent.com was open), and NIST publishes no
  GitHub mirror of the CPRT CSF export. Two ways to unblock:
    1. Add `csrc.nist.gov` to the Claude Code environment's network allowlist and
       ask the cloud session to re-fetch; or
    2. Download from https://csrc.nist.gov/projects/cprt (CSF 2.0 → export JSON)
       on a workstation and push/upload it to `resources/nist/` (any filename
       containing 'csf', .json). Bootstrap ingests it automatically and flips the
       662 derived CSF↔800-53 rows to provenance='NIST CPRT', provisional=false.

## B3 — CIS v8.1.2 ingested

Safeguards with no automated-check coverage: **19** (0 new-check candidates, 19 rubric-based).

### New-check candidates (no existing telemetry signal)
_(none)_

### Rubric-based (evidence document; reuse the 46 assessment rubrics when supplied)
- 3.1 Establish and Maintain a Data Management Process
- 3.2 Establish and Maintain a Data Inventory
- 3.3 Configure Data Access Control Lists
- 3.4 Enforce Data Retention
- 3.5 Securely Dispose of Data
- 3.6 Encrypt Data on End-User Devices
- 3.7 Establish and Maintain a Data Classification Scheme
- 3.9 Encrypt Data on Removable Media
- 3.10 Encrypt Sensitive Data in Transit
- 3.11 Encrypt Sensitive Data at Rest
- 3.14 Log Sensitive Data Access
- 4.11 Enforce Remote Wipe Capability on Portable End-User Devices
- 4.12 Separate Enterprise Workspaces on Mobile End-User Devices
- 11.1 Establish and Maintain a Data Recovery Process
- 11.3 Protect Recovery Data
- 11.4 Establish and Maintain an Isolated Instance of Recovery Data
- 14.5 Train Workforce Members on Causes of Unintentional Data Exposure
- 16.7 Use Standard Hardening Configuration Templates for Application Infrastructure
- 16.10 Apply Secure Design Principles in Application Architectures

No CIS→NIST CSF or CIS→ATT&CK mapping workbook supplied — CIS↔CSF crosswalks are derived/provisional. Add those workbooks to resources/cis/ to ingest official crosswalks.
