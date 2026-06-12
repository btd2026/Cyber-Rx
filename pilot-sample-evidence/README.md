# Pilot Sample Evidence — CyberRx

Nineteen sample evidence documents for the pilot org **Meridian Health Plan** (fictional — no real PHI),
one for every document the CyberRx setup asks you to upload (the NIST CSF evidence interview).

**How to test:** for each item below, on the CSF scorecard answer the question with the
listed answer and upload the matching PDF. Then open the post-intake document review
(Zadkiel) — it should report a partial/gap finding and a recommendation for every document,
because each one deliberately leaves out some required element. The "Intentionally omitted"
line tells you exactly what the reviewer should catch.

Each document covers MOST but NOT ALL of its requirement, so a fully-passing score should
NOT appear — if it does, the review/scoring is not working.

---
### 1. Organizational Context & Stakeholder Analysis
- **File:** `01_organizational_context.pdf`
- **Upload slot:** NIST CSF `GV.OC` (intake key `gv_oc_context`)
- **Pick this answer at setup:** `partial`
- **Elements included:** Mission statement; Internal & external stakeholder map; Critical services list
- **Intentionally omitted (the gap to verify):** No mapping of state breach-notification laws / multi-state regulatory landscape

### 2. Cyber Risk Appetite Statement (DRAFT)
- **File:** `02_risk_appetite_statement.pdf`
- **Upload slot:** NIST CSF `GV.RM` (intake key `gv_rm_appetite`)
- **Pick this answer at setup:** `draft`
- **Elements included:** Qualitative appetite by risk category; Escalation thresholds
- **Intentionally omitted (the gap to verify):** No board approval signature/date; No quantitative risk tolerances ($ exposure limits)

### 3. Information Security Leadership Charter
- **File:** `03_ciso_charter.pdf`
- **Upload slot:** NIST CSF `GV.RR` (intake key `gv_rr_roles`)
- **Pick this answer at setup:** `informal`
- **Elements included:** Named security leader; Responsibilities list
- **Intentionally omitted (the gap to verify):** Authorities/decision rights not documented; Reporting line & dedicated budget not specified

### 4. Information Security Policy
- **File:** `04_information_security_policy.pdf`
- **Upload slot:** NIST CSF `GV.PO` (intake key `gv_po_policy`)
- **Pick this answer at setup:** `outdated`
- **Elements included:** Acceptable use; Access control; Data protection; Incident reporting
- **Intentionally omitted (the gap to verify):** Last reviewed 18 months ago (exceeds 12-month review requirement); No cloud/SaaS or AI-tool usage section

### 5. Board Cybersecurity Briefing — H1 2025
- **File:** `05_board_briefing.pdf`
- **Upload slot:** NIST CSF `GV.OV` (intake key `gv_ov_board`)
- **Pick this answer at setup:** `semiannual`
- **Elements included:** Posture summary; Top risks; Program roadmap
- **Intentionally omitted (the gap to verify):** Cadence is semiannual (quarterly is the target); No KRIs/metrics trend pack

### 6. Third-Party Security Assessment Summary
- **File:** `06_vendor_assessment_reports.pdf`
- **Upload slot:** NIST CSF `GV.SC` (intake key `gv_sc_vendors`)
- **Pick this answer at setup:** `some`
- **Elements included:** Assessments for top vendors; Risk ratings; Remediation tracking
- **Intentionally omitted (the gap to verify):** Only 8 of 23 critical vendors assessed; No continuous monitoring of vendor ratings

### 7. Post-Incident Review Records
- **File:** `07_post_incident_reviews.pdf`
- **Upload slot:** NIST CSF `ID.IM` (intake key `id_im_pir`)
- **Pick this answer at setup:** `sometimes`
- **Elements included:** PIR template; Two completed reviews
- **Intentionally omitted (the gap to verify):** PIRs not performed for all incidents; Lessons-learned not tracked to closure

### 8. Encryption Standard & Data-Flow Overview
- **File:** `08_encryption_standard.pdf`
- **Upload slot:** NIST CSF `PR.DS` (intake key `pr_ds_encryption`)
- **Pick this answer at setup:** `partially`
- **Elements included:** At-rest standard (AES-256); In-transit standard (TLS 1.2+); Partial data-flow diagram
- **Intentionally omitted (the gap to verify):** Legacy claims database not yet encrypted at rest; Data-flow map incomplete for batch/EDI interfaces

### 9. Data Loss Prevention Deployment Summary
- **File:** `09_dlp_deployment.pdf`
- **Upload slot:** NIST CSF `PR.DS` (intake key `pr_ds_dlp`)
- **Pick this answer at setup:** `partial`
- **Elements included:** Email DLP; Endpoint DLP; PHI detection rules
- **Intentionally omitted (the gap to verify):** No DLP coverage for cloud/SaaS (e.g., file sharing, AI tools); No blocking on removable media

### 10. Backup Test Results & Resilience Architecture
- **File:** `10_backup_dr_architecture.pdf`
- **Upload slot:** NIST CSF `PR.IR` (intake key `pr_ir_resilience`)
- **Pick this answer at setup:** `backups-only`
- **Elements included:** Backup schedule; Quarterly restore tests; Immutable backup copies
- **Intentionally omitted (the gap to verify):** Critical systems lack full redundancy/HA; No multi-region failover for the member portal

### 11. Security Operations Monitoring Coverage
- **File:** `11_soc_coverage.pdf`
- **Upload slot:** NIST CSF `DE.AE` (intake key `de_ae_soc`)
- **Pick this answer at setup:** `business-hours`
- **Elements included:** SIEM in place; Use cases/alerts; Business-hours staffing
- **Intentionally omitted (the gap to verify):** No 24x7 coverage (nights/weekends unmonitored); No documented MSSP after-hours escalation

### 12. Incident Response Plan
- **File:** `12_incident_response_plan.pdf`
- **Upload slot:** NIST CSF `RS.MA` (intake key `rs_ma_irplan`)
- **Pick this answer at setup:** `plan-only`
- **Elements included:** IR phases; Roles & contacts; Severity matrix
- **Intentionally omitted (the gap to verify):** No tabletop exercise conducted in the last 12 months; Third-party/IR-firm coordination steps thin

### 13. Incident Analysis & Forensics Capability
- **File:** `13_forensics_capability.pdf`
- **Upload slot:** NIST CSF `RS.AN` (intake key `rs_an_forensics`)
- **Pick this answer at setup:** `retainer`
- **Elements included:** DFIR retainer with external firm; Evidence-handling note
- **Intentionally omitted (the gap to verify):** No in-house forensic capability/tooling; No documented chain-of-custody procedure

### 14. Breach Notification Procedures
- **File:** `14_breach_notification_procedures.pdf`
- **Upload slot:** NIST CSF `RS.CO` (intake key `rs_co_notify`)
- **Pick this answer at setup:** `partial`
- **Elements included:** HHS/OCR notification steps; State AG notification; Member notification template
- **Intentionally omitted (the gap to verify):** CMS notification timelines for Medicaid not documented; No media-notification threshold (500+ individuals)

### 15. Disaster Recovery Test Report & BCP-DR Plan
- **File:** `15_dr_test_report.pdf`
- **Upload slot:** NIST CSF `RC.RP` (intake key `rc_rp_drtest`)
- **Pick this answer at setup:** `over-12mo`
- **Elements included:** DR plan; RTO/RPO targets; Last full test results
- **Intentionally omitted (the gap to verify):** Last full DR test was 14 months ago (exceeds annual); RTO not met for the claims platform in last test

### 16. Recovery Communication Plan
- **File:** `16_recovery_communication_plan.pdf`
- **Upload slot:** NIST CSF `RC.CO` (intake key `rc_co_comms`)
- **Pick this answer at setup:** `yes`
- **Elements included:** Member comms; Regulator comms; Internal status cadence
- **Intentionally omitted (the gap to verify):** No media/press holding statements; No pre-approved spokesperson list

### 17. Asset Inventory (CMDB Export)
- **File:** `17_asset_inventory.pdf`
- **Upload slot:** NIST CSF `ID.AM` (intake key `id_am_inventory`)
- **Pick this answer at setup:** `partial`
- **Elements included:** Servers & endpoints; Software inventory; Owners for most assets
- **Intentionally omitted (the gap to verify):** Cloud and IoT/medical devices not fully inventoried; Data classification field missing for many records

### 18. Cyber Risk Assessment Report (NIST SP 800-30 style)
- **File:** `18_risk_assessment_report.pdf`
- **Upload slot:** NIST CSF `ID.RA` (intake key `id_ra_assessment`)
- **Pick this answer at setup:** `occasional`
- **Elements included:** Threat/vulnerability analysis; Risk register; Likelihood/impact ratings
- **Intentionally omitted (the gap to verify):** Performed occasionally, not on an annual cadence; No quantified financial impact

### 19. Vulnerability Remediation SLA Policy
- **File:** `19_remediation_sla_policy.pdf`
- **Upload slot:** NIST CSF `RS.MI` (intake key `rs_mi_process`)
- **Pick this answer at setup:** `ad-hoc`
- **Elements included:** Severity-based SLA targets; Scanning cadence
- **Intentionally omitted (the gap to verify):** Owners/due dates not tracked or enforced; No exception-approval workflow

