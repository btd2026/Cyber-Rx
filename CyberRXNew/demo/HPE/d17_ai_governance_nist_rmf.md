# HPE AI Governance Framework — Aligned to the NIST AI Risk Management Framework (AI RMF 1.0)

**Owner:** HPE Office of Responsible AI
**Version:** 1.0 · **Effective Date:** 2026-07-08 · **Review Cycle:** Annual
**Scope:** GreenLake AIOps, Aruba AI network insights, HPEFS fraud detection, and Ezmeral ML

## Purpose and Scope

This framework establishes how Hewlett Packard Enterprise (HPE) governs, maps, measures, and manages risk across the lifecycle of its AI systems. It operationalizes the four core functions of the **NIST AI Risk Management Framework (AI RMF 1.0)** — GOVERN, MAP, MEASURE, and MANAGE — to ensure our AI is trustworthy, safe, fair, and accountable. It applies to all HPE-built, HPE-operated, and third-party AI capabilities embedded in our products and internal operations, including GreenLake AIOps, Aruba AI network insights, HPEFS fraud detection, and Ezmeral ML.

Our objective is a repeatable, evidence-based governance program that balances innovation with the protection of customers, end users, affected communities, and HPE itself.

---

## GOVERN — Policy, Accountability, and Oversight

Governance is the foundation on which all other functions rest. HPE maintains an enterprise **Responsible AI Policy** that codifies principles of fairness, transparency, safety, privacy, security, and human accountability. The policy is approved by executive leadership and is binding on every business unit that builds or deploys AI.

**Roles and responsibilities** are defined through a formal RACI model and administered by the **AI Governance Committee**, chaired by the Chief AI Officer and including Legal, Privacy, Security, Product, and business-unit representation. Key accountable roles include:

- **AI System Owners** — accountable for each system's risk posture and compliance (e.g., the GreenLake AIOps owner, the HPEFS fraud-detection owner).
- **Model Stewards / Data Stewards** — responsible for data quality, model documentation, and lifecycle records.
- **Responsible AI Office** — sets policy, maintains this framework, and provides independent oversight and assurance.
- **AI Risk & Compliance** — validates that risk assessments, controls, and audit evidence are complete.

The Committee sets the enterprise **AI risk appetite and risk tolerance**, approves high-risk deployments, and reviews the risk register quarterly. All governance decisions, approvals, and exceptions are logged as auditable evidence.

An enterprise **AI inventory** — the AI-BOM and **model registry** — catalogs every model, its version, training data lineage, intended use, owner, and risk tier. No AI system may enter production unless it is registered in this catalog and has a named accountable owner.

---

## MAP — Context, Use Case, and Risk Categorization

The MAP function establishes the context in which each AI system operates so that risks can be understood before they are measured or managed.

For every system, stewards document the **intended use, purpose, deployment context, and out-of-scope uses**. For example, Aruba AI network insights is scoped to anomaly detection and optimization recommendations for network operators, not autonomous enforcement; HPEFS fraud detection is scoped to decision support with mandatory human review of adverse actions.

Each system is then subject to **risk categorization** using a tiered model:

| Risk Tier | Description | Examples |
|-----------|-------------|----------|
| **High-risk** | Decisions materially affecting individuals, finances, or safety | HPEFS fraud detection |
| **Moderate** | Operational decisions with human oversight | GreenLake AIOps, Aruba AI insights |
| **Limited** | Low-impact assistive or internal tooling | Ezmeral ML internal pipelines |

Tiering considers **impact and harm potential, bias and fairness exposure, discrimination risk, safety implications, and affected-stakeholder scope**. As part of MAP, teams conduct a stakeholder analysis identifying **end users, data subjects, customers, and affected communities**, and perform an initial **impact and bias assessment** to surface potential harms early. Higher tiers trigger deeper scrutiny, mandatory human oversight, and Committee-level approval.

---

## MEASURE — Metrics, Testing, and Assurance

The MEASURE function quantifies trustworthiness through analytic, empirical, and adversarial evaluation.

Each system is evaluated against defined **metrics and benchmarks** appropriate to its purpose: accuracy, precision/recall, false-positive rates (critical for HPEFS fraud detection), latency, and **fairness metrics** disaggregated across relevant population groups to detect **bias and discrimination**. Results are compared against pre-registered acceptance thresholds before deployment.

HPE applies structured **testing, validation, and verification**, including:

- **Red-teaming and adversarial testing** for robustness, mapped to the **OWASP LLM Top 10** and **MITRE ATLAS** threat frameworks, especially for generative and LLM-backed features in GreenLake AIOps.
- **Robustness and stress testing** against edge cases, distribution shift, and adversarial inputs.
- **Independent validation** by AI Risk & Compliance, producing assurance evidence and an audit trail for each release.

All measurement results, test reports, and validation sign-offs are retained as **audit evidence** in the model registry, enabling internal and external audit on demand.

---

## MANAGE — Risk Response, Monitoring, and Incident Handling

The MANAGE function prioritizes and treats identified risks and sustains trustworthiness in production.

**Risk response** follows a treatment hierarchy — mitigate, transfer, avoid, or accept — with residual-risk acceptance requiring sign-off proportional to the risk tier. Controls and **remediation** actions are tracked to closure in the risk register.

**Continuous monitoring** is mandatory in production. HPE monitors model **performance, accuracy, and drift** (data drift and concept drift), fairness stability, and operational health. Threshold breaches — for example, degradation in Aruba AI insights or rising false negatives in HPEFS fraud detection — trigger automated alerts and defined escalation.

**Human-in-the-loop oversight** is required for all moderate- and high-risk systems. Human reviewers approve adverse or high-impact decisions, and every deployed system provides an **override and kill switch** capability allowing operators to suspend or roll back the model.

**AI incident response** is governed by dedicated playbooks integrated with HPE's Security Operations. Incidents — model failures, harmful outputs, bias events, or adversarial compromise — are classified, escalated, contained, and reported per severity, with regulator and customer notification where required.

The AI lifecycle explicitly includes **retirement and decommissioning**: models are formally retired, their registry entries closed, artifacts archived, and downstream dependencies remediated.

---

## Continuous Improvement

Governance is iterative. HPE incorporates **feedback** from monitoring, incidents, audits, red-team findings, and stakeholder input into **retraining, model updates, and lessons-learned** reviews. The AI Governance Committee reviews program effectiveness annually, updates risk tiers and this framework, and re-benchmarks controls against evolving regulation and the NIST AI RMF. This closed loop ensures HPE's AI systems remain trustworthy, accountable, and aligned to our responsible AI commitments over time.
