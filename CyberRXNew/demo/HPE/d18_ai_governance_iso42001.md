# AI Management System (AIMS) — ISO/IEC 42001:2023
## Hewlett Packard Enterprise (HPE)

**Document ID:** HPE-AIMS-D18 · **Version:** 3.1 · **Owner:** Chief AI & Data Governance Office · **Classification:** Internal

---

## 1. Purpose and Scope

This document defines the **AI Management System (AIMS)** established by Hewlett Packard Enterprise to govern the responsible design, development, deployment, and operation of artificial intelligence across the enterprise, in conformance with **ISO/IEC 42001:2023**. The **scope** of the AIMS covers three flagship AI capabilities: **GreenLake AIOps** (autonomous infrastructure optimization and anomaly detection), **Aruba AI** (network assurance, client fingerprinting, and edge inference), and **HPEFS fraud models** (Hewlett Packard Enterprise Financial Services credit and transaction fraud scoring). The AIMS applies to all HPE personnel, contractors, and third-party model providers whose systems fall within these product boundaries, including the data pipelines, MLOps platforms, and cloud regions that support them.

Interested parties considered in defining scope include customers, regulators, data subjects, channel partners, and internal engineering and risk functions. External and internal issues affecting the AIMS — evolving AI regulation, model supply-chain dependencies, and customer trust expectations — are reviewed at least annually.

## 2. AI Policy and Objectives

HPE maintains an **AI Policy**, approved by top management, that commits the organization to trustworthy, lawful, transparent, and human-centric AI. The **policy** establishes principles of fairness, accountability, safety, security, privacy, and explainability, and requires that all in-scope AI systems undergo impact and risk evaluation before release.

Measurable **AI objectives** derived from the policy include: maintaining false-positive rates below defined thresholds for HPEFS fraud models; achieving documented **AI impact assessment** coverage of 100% for high-consequence systems; sustaining model-drift detection within agreed tolerances for GreenLake AIOps; and closing all critical **nonconformities** within 30 days. Objectives are tracked quarterly and reported to the AI Governance Board.

## 3. Leadership and Commitment

**Top management commitment** is demonstrated through the AI Governance Board, chaired by the Chief AI & Data Governance Officer and including representatives from Legal, Security, Privacy, and business-unit engineering leadership. **Leadership** ensures the AI Policy and objectives are established, compatible with HPE's strategic direction, and integrated into business processes. Management allocates the **resources** — funding, tooling, platform capacity, and qualified personnel — necessary to operate and continually improve the AIMS. Roles, responsibilities, and authorities for AI governance are formally assigned, including a designated AIMS owner and accountable system owners for each product.

## 4. Planning: Risk, Opportunities and Controls

The AIMS follows a risk-based **planning** approach. HPE identifies **risks and opportunities** that could affect the AIMS achieving its intended outcomes, addressing both organizational risk and risk to individuals and society. For each in-scope system, a formal **risk assessment** evaluates likelihood and severity of potential harms, and an **AI impact assessment (AIIA)** examines **consequences** to affected persons — for example, wrongful fraud declines by HPEFS models, network access errors from Aruba AI, or operational disruption from GreenLake AIOps automation.

Identified risks drive selection of **controls** from Annex A of ISO/IEC 42001, documented in a Statement of Applicability. Controls span AI system impact assessment, data quality management, human oversight, security, and lifecycle documentation. **Opportunities** — such as improved model efficiency or reduced bias — are captured and prioritized alongside risk treatment plans.

## 5. Support: Competence, Awareness, Communication, Documentation

HPE ensures the **competence** of personnel through role-based training in responsible AI, MLOps, and model risk, with competency records maintained for data scientists, ML engineers, and reviewers. **Awareness** programs communicate the AI Policy, individual responsibilities, and the implications of nonconformity to all staff interacting with AI systems. Internal and external **communication** protocols define what, when, and to whom AI-related information is disclosed, including customer-facing model documentation and incident notifications.

**Documented information** required by the AIMS — policies, procedures, risk registers, AIIAs, model cards, and audit records — is version-controlled, access-restricted, and retained under HPE's records-management standard.

## 6. AI System Lifecycle and Data Governance

HPE governs the full **AI system lifecycle**: **design**, **development**, verification, validation, **deployment**, **operation**, and retirement. Stage-gate reviews at each phase confirm that objectives, controls, and impact assessments are satisfied before progression. Human oversight requirements and rollback procedures are defined for automated decisions in GreenLake AIOps and Aruba AI.

**Data governance** is central to the AIMS. Standards for **training data** govern **quality**, representativeness, labeling accuracy, and **provenance**, ensuring data lineage is traceable from source to model. Datasets undergo bias and quality screening; provenance metadata records origin, consent basis, and transformation history. HPEFS fraud models apply additional controls for sensitive financial data, and data-retention and minimization rules apply across all three product lines.

## 7. Performance Evaluation

HPE conducts ongoing **performance evaluation** through continuous **monitoring**, **measurement**, and analysis of AI system behavior against defined objectives and thresholds. Production models are instrumented for drift, accuracy, fairness, and security metrics, with automated alerts feeding the operations and governance functions. Scheduled **internal audits** assess AIMS conformity to ISO/IEC 42001 and the effectiveness of implemented controls, with results reported to top management. **Management review** is performed at planned intervals to evaluate AIMS suitability, adequacy, and effectiveness, considering audit findings, performance data, and changing risk.

## 8. Improvement

When a **nonconformity** is identified — through monitoring, audit, incident, or customer feedback — HPE evaluates the need for action to control and correct it and to address its consequences. **Corrective action** eliminates root causes to prevent recurrence, and effectiveness is verified before closure. The AIMS drives **continual improvement** of its suitability, adequacy, and effectiveness, feeding lessons from GreenLake AIOps, Aruba AI, and HPEFS fraud model operations back into policy, objectives, controls, and lifecycle practices.

---

*Reviewed and approved by the HPE AI Governance Board. Next scheduled review: 2027-07.*
