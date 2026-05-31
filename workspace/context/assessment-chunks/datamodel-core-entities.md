## Core Correlation Engine Entities
```
// BusinessProcess (NEW - align with Crown Jewels)
BusinessProcess { id, name, tier (Primary/Strategic), criticality, owner (exec role); supportedBySystems[], createsDataObjects[], governedByControls[] }
// Tier 1 Primary: Claims Adjudication, Membership & Enrollment, Provider Network & Contracting, Care Management, Payment Integrity, Member Services, Actuarial
// Tier 2 Strategic: Government Programs, Pharmacy/PBM, Compliance & Regulatory, Identity & Access, Data & Analytics

// Asset (NEW - critical gap)
Asset { id, name, type (server/endpoint/database/cloud/API/app), hostname/ip; businessProcessId[], applicationId[], dataClassification[], owner }

// DataObject (NEW - for PHI/PII/PCI classification)
DataObject { id, name, type (PHI/PII/PCI/Financial/Legal/Confidential); sensitivity (Critical/High/Medium/Low), recordCount; residesInSystems[], accessedByApps[], protectedByControls[] }

// ThreatScenario (NEW - critical gap)
ThreatScenario { id, name, type (ransomware/phishing/insider/supply_chain/misconfig); probability, impactLevel, description, mitreTechnique[]; exploitedRisks[] }

// LegalObligation (NEW - CLO model)
LegalObligation { id, name, source (HIPAA/CMS/State/NAIC/Contract); citation, notificationTimeline (hours/days), applicability[], penalties[] }

// ExecutiveOwner (NEW - governance)
ExecutiveOwner { id, roleId (CIO/CISO/CFO/CRO/CLO/Audit), userId, organizationId; scope (processes[], controls[], risks[]) }

```

## Key Relationships
### Key Relationships

- BusinessProcess -> Application -> Asset (process-to-system-to-infrastructure)
- Asset -> DataObject (what data lives where)
- Control -> Evidence -> AuditTest (control validation)
- Finding -> Risk -> BusinessProcess -> FinancialImpact (correlation engine)
- Vendor -> BusinessProcess -> DataObject (third-party risk)
- ThreatScenario -> Risk -> LegalObligation (threat-to-regulatory mapping)

---
