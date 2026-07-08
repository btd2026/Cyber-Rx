# Hewlett Packard Enterprise (HPE) — Incident Response Plan

## 1. Purpose and Scope

This Incident Response Plan (IRP) governs how Hewlett Packard Enterprise detects, triages, contains, and recovers from cybersecurity incidents across its global infrastructure, cloud platforms, product lines, and corporate networks. It applies to all HPE employees, contractors, and third parties operating within the HPE environment. The plan is owned by the HPE Global Security Operations Center (SOC) and is reviewed at least annually or after any material change to the threat landscape.

## 2. Roles and Responsibilities

HPE operates a follow-the-sun **SOC** staffed 24x7x365 across three regional hubs, providing continuous monitoring, detection, and first-line **triage**. The SOC feeds confirmed incidents to the **Computer Security Incident Response Team (CSIRT)**, HPE's designated **incident response team**, also referred to internally as the Security Incident Response Team (**SIRT**).

Key roles include:

- **Incident Commander (IC)** — owns the incident lifecycle end to end, coordinates the response team, and authorizes containment actions.
- **SOC Analysts (Tier 1/2/3)** — perform monitoring, alert validation, triage, and escalation.
- **Forensics & Threat Intelligence Lead** — directs evidence handling, imaging, and analysis.
- **Communications & Legal Liaison** — manages regulatory notification, customer disclosure, and privacy obligations.
- **Executive Sponsor (CISO delegate)** — engaged for Sev-1 events.

## 3. Incident Classification, Severity, and Priority

Every event is assigned a **classification** and **severity/priority** rating during **triage** to drive the appropriate response tempo:

| Severity | Description | Example | Target Response |
|----------|-------------|---------|-----------------|
| **Sev-1 (Critical)** | Confirmed breach, active data exfiltration, ransomware, or outage of a customer-facing service | Domain compromise, encryption of production systems | Immediate, IC + executives engaged |
| **Sev-2 (High)** | Significant threat with contained blast radius | Targeted phishing with credential theft | < 30 min |
| **Sev-3 (Medium)** | Isolated malware or policy violation | Endpoint infection, single-host anomaly | < 4 hours |
| **Sev-4 (Low)** | Minor or informational | Reconnaissance, blocked intrusion attempt | < 24 hours |

Priority combines severity with business impact and asset criticality. A **Sev-1 / critical** incident triggers the full call tree and continuous incident bridge until resolution.

## 4. Detection and Triage

Detection relies on HPE's SIEM, EDR/XDR telemetry, cloud-native detections, threat intelligence feeds, and user reports to the security mailbox. On alert, the SOC performs initial triage: validating the alert, scoping affected assets, and assigning severity. Confirmed incidents are logged in the case management system with a unique incident ID that anchors all subsequent evidence and actions.

## 5. Escalation, Notification, and Call Tree

Upon confirmation, the SOC initiates the **escalation** and **notification** chain defined in the incident **call tree**. Each severity maps to a defined set of **contacts** and an escalation **chain**:

1. SOC lead notifies the on-call CSIRT Incident Commander.
2. The IC engages required responders (forensics, IT, application owners).
3. For Sev-1/Sev-2, the IC notifies the CISO, Legal, and Communications within 30 minutes.
4. Regulatory and customer notification obligations (e.g., GDPR 72-hour reporting) are managed by the Legal/Communications liaison.

The call tree, including primary and backup contacts and their 24x7 details, is maintained in the CSIRT contact directory and validated quarterly.

## 6. Containment, Eradication, and Recovery

Response follows a structured lifecycle:

- **Containment** — Short-term actions to limit spread: network **isolation** of affected hosts, VLAN **quarantine**, **blocking** malicious IPs/domains/hashes at the firewall and proxy, disabling compromised accounts, and revoking tokens. HPE prioritizes containment that preserves forensic value where feasible.
- **Eradication** — Removal of the threat: deleting malware, closing exploited vulnerabilities, rotating credentials, and rebuilding compromised systems from trusted images.
- **Recovery** — Restoring systems to production from validated backups, monitoring for reinfection, and confirming normal operations before closing the incident.

## 7. Forensics, Evidence, and Chain of Custody

The Forensics Lead directs **evidence** collection and **preservation** according to strict standards. Volatile data is captured first, followed by disk and memory **imaging** using write-blockers and forensically sound tooling. All artifacts are hashed, logged, and stored in secured evidence lockers. A documented **chain of custody** records every transfer and handler to ensure admissibility should the incident lead to litigation or law enforcement referral. **Forensics** analysis supports root cause determination and attribution.

## 8. Playbooks, Runbooks, and Procedures

Responders execute standardized **playbooks** and **runbooks** mapped to common scenarios — ransomware, business email compromise, insider threat, DDoS, cloud account compromise, and data exfiltration. Each **response plan** documents step-by-step **procedures**, decision points, required tooling, and rollback criteria. Playbooks are version-controlled and updated as new tactics emerge, ensuring consistent, repeatable response regardless of which analyst is on shift.

## 9. Response Metrics, SLAs, and KPIs

HPE measures response effectiveness using defined **metrics** and **KPIs** reported monthly to leadership:

- **MTTD** (Mean Time to Detect)
- **MTTR** (Mean Time to Respond/Recover)
- **Time-to** containment and time-to-eradication
- Percentage of incidents meeting **SLA** targets by severity
- False-positive rate and escalation accuracy

Sev-1 incidents carry the most aggressive **SLA** thresholds. Trend analysis of these KPIs drives tuning of detections and resourcing.

## 10. Lessons Learned and Continuous Improvement

Within ten business days of resolving a Sev-1 or Sev-2 incident, the CSIRT conducts a **post-mortem** / **after-action** review. This blameless **retrospective** captures the **root cause**, timeline, what went well, and gaps. **Lessons learned** are converted into tracked remediation actions, playbook updates, and new detection rules to prevent recurrence.

## 11. Exercises, Drills, and Testing

The IRP is validated through regular **exercises**: quarterly **tabletop** sessions with executives, semi-annual technical **drills**, and red-team **simulations** against production-like environments. This **testing** confirms the call tree, playbooks, and tooling perform under pressure and that the response team maintains readiness.

## 12. Plan Maintenance

This plan is reviewed annually, after major incidents, and following significant exercises. The HPE CISO office approves all revisions.
