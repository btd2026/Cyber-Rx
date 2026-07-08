# Data Protection & Classification Policy

## 1. Purpose and Scope

Hewlett Packard Enterprise (HPE) processes a broad spectrum of information assets, including customer personally identifiable information (PII), payment card industry (PCI) cardholder data generated through HPE GreenLake billing operations, and proprietary intellectual property (IP). This Data Protection & Classification Policy establishes how such information is categorized, labeled, and safeguarded across its entire lifecycle. It applies to all employees, contractors, third parties, and systems that create, access, process, or store HPE data, regardless of format or location.

## 2. Data Classification and Categorization

All HPE information must be assigned a classification level so that appropriate protections can be applied consistently. HPE uses a four-tier categorization scheme:

- **Public** — Information approved for unrestricted release, such as published marketing material, press releases, and product datasheets. Disclosure poses no harm to HPE or its customers.
- **Sensitive** — Internal-use information whose unauthorized disclosure could cause limited harm, such as internal procedures, org charts, and non-public operational data.
- **Confidential** — Information requiring strong protection, including customer PII, contracts, and internal financial records. Unauthorized exposure could cause significant business, legal, or reputational harm.
- **Restricted** — The most tightly controlled category, covering PCI cardholder data from GreenLake billing, authentication secrets, source code, and trade-secret IP. Compromise could result in regulatory penalties, financial loss, or material competitive damage.

Each asset must carry a visible classification **label** at the point of creation. Labeling may be applied through document headers, metadata tags, email markings, or automated data-classification tooling. When data of differing sensitivities is combined, the resulting set inherits the highest applicable classification.

## 3. Roles and Responsibilities

Effective data protection depends on clearly assigned accountability:

- **Data Owners** are senior business leaders accountable for specific information domains (for example, the GreenLake billing owner for cardholder data). Owners approve classifications, authorize access, and are ultimately responsible for the protection of their data.
- **Data Stewards** translate owner intent into practice, maintaining data quality, defining retention rules, and ensuring the correct categorization and labeling of records within their domain.
- **Data Custodians** — typically IT and infrastructure teams — are responsible for the technical safeguarding, storage, backup, and secure operation of the systems that hold the data.
- **All Users** are responsible for handling information in accordance with its classification and for reporting suspected loss or misuse.

## 4. Data Handling, Storage, and Transmission

Handling requirements scale with classification. Confidential and Restricted data must be encrypted both at rest (AES-256) and in transit (TLS 1.2 or higher). Storage of Restricted data, including PCI cardholder data, is limited to approved, access-controlled, and segmented environments consistent with PCI DSS; primary account numbers must be rendered unreadable through tokenization or truncation wherever stored. Transmission of Confidential or Restricted information over untrusted networks requires approved encrypted channels, and such data must never be sent through unmanaged personal email or consumer file-sharing services. Access to all classified data follows least-privilege and need-to-know principles, with periodic access reviews performed by Data Owners and stewards.

## 5. Data Loss Prevention and Exfiltration Monitoring

HPE deploys enterprise **Data Loss Prevention (DLP)** controls across endpoints, email, cloud services, and network egress points to detect and prevent unauthorized movement of Confidential and Restricted data. DLP policies are tuned to identify PII patterns, PCI cardholder data, and source-code fingerprints, blocking or quarantining prohibited transfers. Continuous **exfiltration monitoring** and alerting feed the Security Operations Center, where anomalous transfers, mass downloads, and policy violations are investigated. Attempts to circumvent DLP or data-protection controls are treated as serious security incidents.

## 6. Data Retention, Archival, and Lifecycle

Information is managed across its full **lifecycle** — from creation through active use, **archival**, and eventual disposal. Data Owners, supported by Legal and Compliance, define **retention** schedules that satisfy contractual, regulatory, and business requirements. PCI cardholder data is retained only as long as necessary for billing and legal obligations and is not stored beyond authorized limits. Records that reach the end of their retention period are moved to secure archival storage where continued preservation is required, or scheduled for **purging** when no longer needed. Automated purging routines enforce these schedules to prevent unnecessary accumulation of sensitive data.

## 7. Data Disposal, Destruction, and Shredding

When data or the media holding it reaches end of life, it must be securely disposed of in a manner that renders recovery infeasible. Electronic media containing Confidential or Restricted data must be sanitized through cryptographic erasure or wiping to NIST SP 800-88 standards, and failed or decommissioned drives must undergo physical **destruction**. Paper records containing PII or cardholder data must be cross-cut **shredding** or placed in secure destruction bins. All destruction of Restricted data must be documented with a certificate of destruction retained by the responsible custodian.

## 8. Enforcement and Review

Violations of this policy may result in disciplinary action up to termination and potential legal consequences. This policy is reviewed at least annually, and after significant regulatory or operational change, by the HPE Information Security and Privacy organizations.
