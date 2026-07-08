# Access Control Policy

## 1. Purpose and Scope

This Access Control Policy establishes the requirements Hewlett Packard Enterprise (HPE) applies to govern logical access to its information systems, applications, cloud services, and data. It applies to all HPE employees, contractors, service partners, and third parties who are granted access to HPE resources. The policy covers the full identity lifecycle and the technical and administrative controls that enforce appropriate, authorized, and auditable access across the enterprise.

## 2. Guiding Principles

HPE governs access according to the principles of **least privilege**, **minimum necessary**, and **need-to-know**. Individuals are granted only the access required to perform their assigned duties, and no more. Access is denied by default and explicitly granted through approved processes. HPE adopts a **zero trust** posture in which no user, device, or network location is inherently trusted; every access request is authenticated, authorized, and continuously evaluated before and during a session.

## 3. Identity Lifecycle Management

### 3.1 Provisioning and Onboarding

Identities are managed centrally through Microsoft Entra ID (integrated with on-premises Active Directory) and federated to applications via Okta as the enterprise single sign-on and identity provider. During **onboarding**, Human Resources initiates the joiner event, which triggers automated **provisioning** of a user account and baseline entitlements based on the individual's role, department, and location. All access beyond the baseline requires a formal **request** submitted through the access management **workflow**, with **approval** and **authorization** from the appropriate resource owner and the requester's manager before entitlements are granted.

### 3.2 Changes and Movers

When a worker changes roles, entitlements are recalculated and prior access that is no longer needed is removed to prevent privilege accumulation. Managers and resource owners are responsible for validating that mover access aligns with the new role.

### 3.3 Deprovisioning, Offboarding, and Termination

Upon **termination**, resignation, or contract completion, HR triggers the leaver event, and accounts are automatically **disabled** in Entra ID and Okta, revoking single sign-on and downstream application access. **Deprovisioning** during **offboarding** includes prompt **account disablement**, revocation of tokens and sessions, and **suspension** of federated access. Accounts that are **inactive** beyond 45 days are automatically flagged for **locking** and review. Dormant, orphaned, and unused accounts are periodically identified and disabled.

## 4. Role-Based Access Control

HPE uses **role-based access control (RBAC)** to standardize entitlements. Access is assigned to Entra ID and Active Directory security **groups** and Okta application roles rather than to individuals, and **privileges** are bundled into roles that map to job functions. **Segregation of duties (SoD)** controls are enforced to ensure that no single individual can execute conflicting or high-risk transactions—such as requesting and approving the same access, or developing and deploying to production—without independent oversight. Toxic-combination rules are evaluated at request time and during recertification.

## 5. Privileged Access Management

**Privileged access**—including **admin**, **root**, and other **elevated** entitlements—is tightly restricted, granted only under least privilege, and managed through a **Privileged Access Management (PAM)** solution. Privileged credentials are vaulted, rotated, and issued **just-in-time** with time-bound elevation and session recording. Administrators use dedicated privileged accounts separate from their standard identities, and multi-factor authentication is mandatory for all elevated actions. **Service accounts** are inventoried, assigned to an accountable owner, restricted to their intended purpose, and reviewed regularly; interactive logon and unnecessary privileges are prohibited, and secrets are stored in an approved vault.

## 6. Remote and Network Access

**Remote access** to HPE systems is permitted only through approved, encrypted channels. **VPN** connectivity and **zero trust network access** enforce device posture checks, identity verification, and conditional access before granting **network access**. Conditional access policies in Entra ID evaluate risk signals—user, device, location, and behavior—and may require step-up authentication or block access. All remote sessions are subject to logging and monitoring.

## 7. Access Reviews and Recertification

HPE conducts **periodic reviews** of access to confirm that entitlements remain appropriate. **Access reviews** and **recertification** campaigns require managers and resource owners to perform **attestation** of each user's entitlements at least quarterly for privileged and high-risk access and at least annually for standard access. Entitlements that are not affirmatively recertified are revoked. Review results are documented and retained as audit evidence.

## 8. Monitoring, Logging, and Auditing

Authentication and authorization events across Entra ID, Active Directory, Okta, and the PAM platform are captured through centralized **logging** and forwarded to HPE's SIEM for **monitoring**, correlation, and retention. **Audit** trails support investigations and compliance reporting. Automated **alerting** and **anomaly** detection identify suspicious behavior—such as impossible-travel logins, brute-force attempts, privilege escalation, and anomalous service-account activity—and trigger response actions, including account **locking** or **suspension** pending investigation.

## 9. Enforcement and Review

Violations of this policy may result in revocation of access and disciplinary action up to and including termination. This policy is reviewed at least annually and updated to reflect changes in technology, regulation, and business requirements.
