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

## B3 — CIS v8.1.2 ingested

Safeguards with no automated-check coverage: **54** (35 new-check candidates, 19 rubric-based).

### New-check candidates (no existing telemetry signal)
- 1.2 Address Unauthorized Assets
- 1.3 Utilize an Active Discovery Tool
- 2.4 Utilize Automated Software Inventory Tools
- 2.5 Allowlist Authorized Software
- 2.6 Allowlist Authorized Libraries
- 2.7 Allowlist Authorized Scripts
- 4.2 Establish and Maintain a Secure Configuration Process for Network Infrastructure
- 4.5 Implement and Manage a Firewall on End-User Devices
- 4.10 Enforce Automatic Device Lockout on Portable End-User Devices
- 5.3 Disable Dormant Accounts
- 5.6 Centralize Account Management
- 7.2 Establish and Maintain a Remediation Process
- 9.2 Use DNS Filtering Services
- 9.4 Restrict Unnecessary or Unauthorized Browser and Email Client Extensions
- 9.5 Implement DMARC
- 9.6 Block Unnecessary File Types
- 10.3 Disable Autorun and Autoplay for Removable Media
- 12.1 Ensure Network Infrastructure is Up-to-Date
- 12.2 Establish and Maintain a Secure Network Architecture
- 12.3 Securely Manage Network Infrastructure
- 12.4 Establish and Maintain Architecture Diagram(s)
- 12.5 Centralize Network Authentication, Authorization, and Auditing (AAA)
- 12.6 Use of Secure Network Management and Communication Protocols
- 12.7 Ensure Remote Devices Utilize a VPN and are Connecting to an Enterprise’s AAA Infrastructure
- 12.8 Establish and Maintain Dedicated Computing Resources for All Administrative Work
- 13.4 Perform Traffic Filtering Between Network Segments
- 13.8 Deploy a Network Intrusion Prevention Solution
- 13.9 Deploy Port-Level Access Control
- 13.10 Perform Application Layer Filtering
- 13.11 Tune Security Event Alerting Thresholds
- 14.2 Train Workforce Members to Recognize Social Engineering Attacks
- 16.8 Separate Production and Non-Production Systems
- 16.12 Implement Code-Level Security Checks
- 16.14 Conduct Threat Modeling
- 17.8 Conduct Post-Incident Reviews

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
