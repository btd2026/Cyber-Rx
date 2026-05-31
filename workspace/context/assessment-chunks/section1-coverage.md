## 1. Coverage Assessment

### Already Covered

**Executive Dashboards (4 of 6)**
- CISO Dashboard: Security posture, threat landscape, compliance grids (SOC2, NIST CSF, HIPAA, CMS, CIS, GDPR), control effectiveness scoring, KPI tracking
- CFO Dashboard: Financial exposure modeling ($285M gross exposure calculation), RBC capital impact simulation, insurance adequacy analysis, ROSI (security ROI = 311%), scenario analysis (Expected Annual Loss, PHI Breach, Catastrophic Event), peer benchmarking
- CRO/Audit Dashboard: Risk scoring, control validation, compliance drill-downs, risk heatmaps, KRIs tracking
- Board Dashboard: Executive summaries, strategic risk overviews

**Core Platform Components**
- Healthcare payer org templates (BCBS, Medicare Advantage, Commercial, Multi-line, Medicaid)
- Crown Jewels framework (Tier 1 Primary, Tier 2 Strategic)
- CMMI 5-level scoring rubric (0/20/40/60/80 bands)
- Control library mapped to CIS v8, NIST 800-53 Rev 5, HIPAA Security Rule, CMS 42 CFR, SOC2
- Vendor ecosystem mapping with tier classification
- Evidence repository structure (document catalog)
- ITSM ticket routing to 5 systems: ServiceNow, Jira, Freshservice, BMC Remedy, Cherwell
- Risk scoring engine with weighted multi-signal model (20% posture + 25% breach + 20% compliance + 15% criticality + 10% data sensitivity)

**Integrations**
- Real API integrations for 7 security tools: Okta, CrowdStrike, Splunk, KnowBe4, Tenable, ServiceNow, CyberArk
- ITSM integrations create real tickets/change requests (not mocked)
- OCR Breach Portal monitoring capability
- Background scheduler architecture (code exists, unclear if running in production)

**New Capabilities (Just Added in Commit 32e4381)**
- Continuous multi-signal vendor risk engine (7-layer architecture: External Attack Surface, Breach Detection, Compliance Evidence, Continuous Questionnaires, Fourth-Party Risk, Regulatory Mapping, Dynamic Risk Scoring)
- Crown Jewels process selection framework (Tier 1: 7 Primary Crown Jewels, Tier 2: 5 Strategic Crown Jewels)

### Partially Covered

**Missing Executive Dashboards (2 of 6)**
- No standalone CLO / General Counsel dashboard — Legal/regulatory exposure exists in compliance grids but no dedicated legal view
- Internal Audit combined with CRO — No dedicated audit assurance dashboard with control testing UI, evidence repository, findings management, or repeat finding identification

**Data Collection**
- Security tools: 7 working integrations, but 5 are demo-only (Qualys, CyberArk, BeyondTrust, Workday, Microsoft Sentinel)
- No automated asset inventory or discovery
- No data classification engine (PHI/PII/PCI tagging is manual)
- No evidence collection engine (document ingestion, control testing, continuous auditing)

**Risk Correlation**
- Technical findings are NOT fully correlated to business processes as described in the vision
- The example use case — "Critical CVE on server" -> business impact narrative — does not exist
- Findings lack: business process linkage, data type tagging, threat scenario mapping, legal exposure quantification, audit evidence requirements

**Workflow & Remediation**
- ITSM routing exists
- No end-to-end remediation workflow tracking beyond ticket creation
- No exception/risk acceptance workflow
- No escalation workflow beyond ITSM ticket creation
- No approval gates for risk acceptance

**AI Assistant**
- "BrianaBar" narration exists but is accessibility/demo-focused, not functional AI
- No AI-generated executive summaries
- No AI that correlates technical issues to executive meaning

### Missing

**Executive Support Gaps**
- CIO Dashboard: No dedicated technology risk dashboard, asset inventory view, crown jewel system identification, patch status tracking, unsupported technology detection, configuration weakness assessment, backup/recovery readiness scoring, change risk analysis
- CLO Dashboard: Entire dashboard is missing (legal cyber exposure, regulatory obligations, breach notification workflow, contract risk, policy exceptions)
- Internal Audit: No independent assurance view, audit universe mapping, control testing UI, repeat finding identification, committee reporting

**Core Platform Gaps**
- No guided onboarding AI workflow
- No process-to-system-to-data-to-control mapping visualization
- No asset inventory module
- No vendor inventory beyond ecosystem mapping
- No crown jewel identification workflow
- No data classification engine
- No framework crosswalks (NIST<->HIPAA<->CIS mapping)
- No continuous audit evidence repository
- No scenario modeling UI
- No financial exposure modeling calculator (CFO has hard-coded formulas only)
- No legal/regulatory obligation mapping database
- No executive ownership assignment system
- No historical trend tracking
- No exportable reports (Board, Audit Committee)
- No role-based permissions enforcement

**Data Model Gaps**
- No LegalObligation entity
- No ThreatScenario entity
- No DataObject entity for PHI/PII/PCI classification
- No AuditTest entity
- No Exception entity with approval workflow
- No ExecutiveOwner assignment entity

### Unclear / Needs Investigation

1. Background Scheduler Status — Code exists (scheduler.js) but no Render Background Worker entry in render.yaml. Is it running in production?
2. AI Strategy — BrianaBar exists but is it demo-only or the product wedge? What's the AI positioning?
3. Single-Tenant vs Multi-Tenant — Vault is in "local" mode, org isolation via header only. Is the platform intended to be single-tenant per deployment?
4. CLO Dashboard Placement — No component exists. Was this planned for a later phase?
5. Finding-to-Process Correlation — Code doesn't show linkage. Is this manual or planned?
6. JWT Authentication — users table exists but no login/signup endpoints. Is auth truly "ready"?
7. Production Customers — No revenue, customer count, or pipeline mentioned. Are there real users or just demos?

---
