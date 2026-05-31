## 5. Recommended Data Model

### Core Entities

```
// 1. Organization (exists, expand)
Organization { id, name, type, hasFEP, bcbsAffiliated, setupJson; revenue, surplus, ibnr, itBudget; phiRecords, memberCount, providerCount; insLimit, insDeductible, insExclusions[]; rbcRatioCurrent, rbcRatioTarget; processes[], frameworks[], controls[] }

// 2. BusinessProcess (NEW - align with Crown Jewels)
BusinessProcess { id, name, tier (Primary/Strategic), criticality, owner (exec role); supportedBySystems[], createsDataObjects[], governedByControls[] }
// Tier 1 Primary: Claims Adjudication, Membership & Enrollment, Provider Network & Contracting, Care Management, Payment Integrity, Member Services, Actuarial
// Tier 2 Strategic: Government Programs, Pharmacy/PBM, Compliance & Regulatory, Identity & Access, Data & Analytics

// 3. Application (expand current model)
Application { id, name, type (claims/enrollment/care_mgmt/etc), crownJewel (boolean); businessProcessesSupported[], hostsDataObjects[], hasControls[]; supported (boolean), endOfSupportDate, vulnCount, patchStatus; owner (IT team), contactEmail }

// 4. Vendor (expand current model)
Vendor { id, name, tier (Critical/High/Medium/Low), category (clearinghouse/PBM/cloud/etc); services[], businessProcessesSupported[], handlesDataTypes[]; externalScore, breachRisk, complianceScore, criticality, dataSensitivity; soc2Report, hitrustReport, pentestReport, insuranceCert, sdlAttestation; contractId, securityClauses[], auditRights, liabilityCap, indemnification; dependsOnVendors[], fourthPartyRiskScore }

// 5. Asset (NEW - critical gap)
Asset { id, name, type (server/endpoint/database/cloud/API/app), hostname/ip; businessProcessId[], applicationId[], dataClassification[], owner }

// 6. DataObject (NEW - for PHI/PII/PCI classification)
DataObject { id, name, type (PHI/PII/PCI/Financial/Legal/Confidential); sensitivity (Critical/High/Medium/Low), recordCount; residesInSystems[], accessedByApps[], protectedByControls[] }

// 7. Control (expand current model)
Control { id, name, frameworkId (NIST/HIPAA/CIS/etc), ref (PR.PS-1, etc.); description, type (preventive/detective/corrective); designEffectiveness, operatingEffectiveness, lastTestDate, lastTestResult; evidence[], driftDetected (boolean), managementAssertion; processOwner, controlOwner, evidenceOwner }

// 8. Framework (exists)
Framework { id, name, version, controls[] }  // NIST CSF 2.0, HIPAA Security Rule, CIS v8, etc.

// 9. Evidence (NEW - critical gap)
Evidence { id, controlId, type (SOC2/HITRUST/penetrationTest/screenshot/log/policy); documentUrl, uploadDate, validUntil, collectedBy (tool/manual); extractedControls[], validated (boolean), notes }

// 10. Risk (expand current model)
Risk { id, title, severity, status (open/mitigating/accepted/closed); findingId, assetId, applicationId, vendorId; businessProcessId[], dataObjectIds[], threatScenarioId; frameworkMappings[] (NIST PR.PS-1, HIPAA 164.308(a)(5), CIS Control 7); financialExposure, costToRemediate; legalObligationId[], regulatoryCitation; executiveOwner, remediationOwner, evidenceOwner; auditEvidenceRequired, auditTestIds[] }

// 11. ThreatScenario (NEW - critical gap)
ThreatScenario { id, name, type (ransomware/phishing/insider/supply_chain/misconfig); probability, impactLevel, description, mitreTechnique[]; exploitedRisks[] }

// 12. FinancialImpact (NEW - CFO model)
FinancialImpact { id, riskId, scenarioId; breachResponseCost, regulatoryFine, businessInterruption, fraudLoss; reputationalLoss, legalCost, recoveryCost; totalGross, insuranceCoverage, netExposure }

// 13. LegalObligation (NEW - CLO model)
LegalObligation { id, name, source (HIPAA/CMS/State/NAIC/Contract); citation, notificationTimeline (hours/days), applicability[], penalties[] }

// 14. AuditTest (NEW - Audit model)
AuditTest { id, controlId, name, testPlan, testProcedure, frequency (quarterly/annual); lastTestDate, lastTester, result (pass/fail/n/a), findings[]; evidenceIds[], managementAssertion }

// 15. Finding (exists, expand)
Finding { id, title, description, severity, status, discoveredDate; riskId, assetId, applicationId, businessProcessId; isRepeat (boolean), originalFindingId, repeatCount; remediationPlan, targetDate, owner, status }

// 16. RemediationTask (exists)
RemediationTask { id, findingId, actionId, status, assignedTo, assignedDate, dueDate; itsmSystem, ticketRef, ticketUrl, completedDate }

// 17. Exception (NEW - risk acceptance workflow)
Exception { id, controlId, riskId, requestedBy, justification; approvalChain[], status (pending/approved/denied/expired), expiryDate; conditions[] }

// 18. ExecutiveOwner (NEW - governance)
ExecutiveOwner { id, roleId (CIO/CISO/CFO/CRO/CLO/Audit), userId, organizationId; scope (processes[], controls[], risks[]) }
```

### Key Relationships

- BusinessProcess -> Application -> Asset (process-to-system-to-infrastructure)
- Asset -> DataObject (what data lives where)
- Control -> Evidence -> AuditTest (control validation)
- Finding -> Risk -> BusinessProcess -> FinancialImpact (correlation engine)
- Vendor -> BusinessProcess -> DataObject (third-party risk)
- ThreatScenario -> Risk -> LegalObligation (threat-to-regulatory mapping)

---
