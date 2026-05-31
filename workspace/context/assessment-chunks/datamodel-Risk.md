## Risk entity
```
// Risk (expand current model)
Risk { id, title, severity, status (open/mitigating/accepted/closed); findingId, assetId, applicationId, vendorId; businessProcessId[], dataObjectIds[], threatScenarioId; frameworkMappings[] (NIST PR.PS-1, HIPAA 164.308(a)(5), CIS Control 7); financialExposure, costToRemediate; legalObligationId[], regulatoryCitation; executiveOwner, remediationOwner, evidenceOwner; auditEvidenceRequired, auditTestIds[] }
```
