# Change Management Policy

## 1. Purpose and Scope

This Change Management Policy establishes the governance, controls, and lifecycle requirements for all changes introduced into the production environments of Hewlett Packard Enterprise (HPE). The policy defines a consistent change control process that reduces the risk of service disruption, protects the integrity of information systems, and ensures that every change is authorized, tested, documented, and traceable. It applies to all HPE employees, contractors, and third-party suppliers who request, review, approve, implement, or support changes to infrastructure, applications, networks, cloud services, and supporting configuration items.

All change management activity is governed and recorded within **ServiceNow**, which serves as the authoritative system of record for the end-to-end change lifecycle.

## 2. Policy Statement

No change may be deployed to a production system without an approved change record in ServiceNow. Every change must progress through the defined lifecycle stages: request, categorization, risk assessment, approval, pre-deployment testing, implementation, verification, and closure. Bypassing the change process is a policy violation subject to disciplinary action.

## 3. Change Categorization

Each change must be classified so that the appropriate level of review and approval is applied. HPE recognizes the following categories:

- **Standard changes** are pre-authorized, low-risk, repeatable changes that follow a documented and previously approved procedure (for example, routine patch application or user provisioning). Standard changes are governed by an established ServiceNow template and do not require case-by-case review board approval.
- **Normal changes** are non-emergency changes that carry meaningful risk or complexity. They require full risk assessment and formal approval by the Change Advisory Board before implementation.
- **Emergency changes** address urgent situations such as active incidents, security breaches, or imminent service outages. They follow an accelerated approval path via the Emergency Change Advisory Board (ECAB) and must be fully documented, with retrospective review completed after implementation.
- **Expedited changes** are time-sensitive normal changes that cannot wait for the standard CAB cycle but do not meet the emergency threshold. They require expedited approval from designated approvers and the change owner's management.

## 4. Change Advisory Board and Approval

The **Change Advisory Board (CAB)** is responsible for reviewing, assessing, and authorizing normal and expedited changes. The CAB evaluates business justification, risk, impact, scheduling conflicts, and readiness of rollback plans. Membership includes representatives from operations, engineering, security, and affected business units. For urgent matters, the Emergency Change Advisory Board (ECAB) provides rapid review and approval outside the regular CAB schedule.

Approval decisions, including any conditions or rejections, are captured directly in the ServiceNow change record. A change may not proceed to implementation until all required approvals are recorded.

## 5. Pre-Deployment Testing and Validation

All changes must undergo appropriate pre-deployment testing and validation before promotion to production. Change owners are required to perform testing in a non-production staging environment that mirrors production as closely as practical. QA activities must include functional verification, integration testing where applicable, and validation that the change meets its stated objective. Evidence of successful testing and validation must be attached to the change record. Changes lacking documented test and verification results will not receive CAB approval.

## 6. Rollback and Back-Out Procedures

Every change record must include a documented rollback plan describing how to revert or back out the change if implementation fails or produces unintended results. The back-out procedure must be tested where feasible and must define the steps, resources, and time required to restore the affected systems to their prior known-good state. If a deployment cannot be verified as successful, the implementer must execute the rollback and undo the change, then update the record accordingly.

## 7. Change Audit Trail, Logging, and Documentation

ServiceNow maintains a complete change audit trail for every change throughout its lifecycle. Records must document the requester, categorization, risk assessment, approvals, testing evidence, implementation and verification results, and rollback outcomes. All logging, approvals, and status transitions are retained to support compliance, internal audit, and post-implementation review. Change documentation and audit records are retained in accordance with HPE records retention requirements and must be available for inspection by auditors and regulators.

## 8. Roles, Compliance, and Enforcement

Change owners, implementers, approvers, and CAB members are accountable for adhering to this policy. Compliance is monitored through periodic audits of ServiceNow change records. Deviations, unauthorized changes, or failures to maintain the required audit trail are reported to management and may result in corrective action. This policy is reviewed at least annually and updated to reflect changes in HPE's environment, regulatory obligations, and operational practices.
