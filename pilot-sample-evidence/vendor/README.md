# Vendor Assurance — Sample Evidence

Eight sample assurance documents from a fictional vendor **Northwind Cloud Services, Inc.** — the kind you upload
per vendor to establish their security posture (SOC 2 Type II, HITRUST, ISO 27001, pen test,
BAA, cyber insurance, PCI AoC, vuln scan).

**How to test:** for each vendor, upload the PDF and select the listed document type. Saraqael
reads the file, extracts the expected elements, and returns a per-document **completeness %**,
**accuracy %**, and **overall score**, plus findings. Each document deliberately omits a required
element — the "Intentionally omitted" line is what the agent should flag, and a clean full score
should NOT appear. (With an ANTHROPIC_API_KEY set, extraction is AI-driven and more precise; without
one, a deterministic text reader is used.)

---
### 1. SOC 2 Type II Report (Independent Service Auditor’s Report)
- **File:** `vendor/soc2_type2.pdf`
- **Upload as document type:** `soc2`
- **Elements included:** Type II; Audit firm; Audit period; Security + Availability TSC; One exception noted
- **Intentionally omitted (gap the agent should flag):** Confidentiality/Privacy criteria not in scope; Audit period ends >9 months ago (bridge letter needed)

### 2. HITRUST CSF Validated Assessment — Certification Letter
- **File:** `vendor/hitrust_r2.pdf`
- **Upload as document type:** `hitrust`
- **Elements included:** r2 validated; Expiry date; Scope statement
- **Intentionally omitted (gap the agent should flag):** Issue date not stated; Two open corrective action plans (CAPs) disclosed; Interim review status absent

### 3. ISO/IEC 27001:2022 Certificate of Registration
- **File:** `vendor/iso27001_cert.pdf`
- **Upload as document type:** `iso27001`
- **Elements included:** Certificate number; Accredited body (UKAS); Expiry date; Scope statement
- **Intentionally omitted (gap the agent should flag):** Issue date not printed; Surveillance-audit status not shown

### 4. External Penetration Test — Executive Summary
- **File:** `vendor/pentest_report.pdf`
- **Upload as document type:** `pentest`
- **Elements included:** Test firm; OWASP methodology; Findings by severity; Remediation status
- **Intentionally omitted (gap the agent should flag):** Test date is 14 months old (annual requirement); In-scope IP ranges not listed

### 5. HIPAA Business Associate Agreement
- **File:** `vendor/baa.pdf`
- **Upload as document type:** `baa`
- **Elements included:** Permitted uses; Safeguards; Breach notification; Return/destruction
- **Intentionally omitted (gap the agent should flag):** Subcontractor flow-down clause (§164.308(b)) missing; Execution/signature date absent

### 6. Certificate of Cyber Liability Insurance
- **File:** `vendor/cyber_insurance.pdf`
- **Upload as document type:** `cyberinsurance`
- **Elements included:** Named insured; Cyber liability policy; Policy expiry
- **Intentionally omitted (gap the agent should flag):** Coverage limit below $1M (low for data exposure)

### 7. PCI DSS Attestation of Compliance (AoC)
- **File:** `vendor/pci_aoc.pdf`
- **Upload as document type:** `pci_aoc`
- **Elements included:** AoC type (SAQ); Compliance status; Assessment date
- **Intentionally omitted (gap the agent should flag):** Self-assessed (SAQ) without a QSA; Assessment >12 months old (annual requirement)

### 8. Quarterly Vulnerability Scan Summary
- **File:** `vendor/vuln_scan.pdf`
- **Upload as document type:** `vulnscan`
- **Elements included:** Scan date; Critical/high counts; Oldest open finding age
- **Intentionally omitted (gap the agent should flag):** SLA-compliance percentage not reported; 2 open critical CVEs exceed policy

