# TASK: T-PILOT-001
# TITLE: Pilot Customer Environment Setup
# PHASE: Phase 2 - Pilot Deployment & Customer Onboarding
# OWNER: Senior Backend Engineer

## OBJECTIVE

Provision and configure the CyberRX MVP platform for the pilot customer, establishing isolated tenant infrastructure, deploying all services, validating data connectors, and ensuring secure operation in the customer's cloud environment.

## DELIVERABLES

1. **Provisioned Tenant Infrastructure**
   - Isolated tenant namespace in Kubernetes cluster
   - Customer-specific database schema and instances
   - Dedicated event bus topics/partitions
   - Tenant-specific secrets and encryption keys
   - Network isolation policies applied
   - Resource quotas configured

2. **Deployed Services to Customer Cloud**
   - All Phase 1 services deployed and operational:
     - SIEM Connector (Splunk)
     - EDR Connector (CrowdStrike)
     - IAM Connector (Azure AD)
     - Claims Connector (Nasco)
     - Risk Normalization Engine
     - Financial Modeling Engine
     - Agent Runtime Foundation
     - CFO Agent
     - CISO Agent
     - Board Agent
     - Alerting & Notification System
   - Health check endpoints accessible
   - Service mesh configured
   - Ingress/egress rules applied
   - Logging and monitoring integrated

3. **Validated Connectors in Customer Environment**
   - SIEM connector pulling from customer's Splunk instance
   - EDR connector streaming from customer's CrowdStrike
   - IAM connector connected to customer's Azure AD
   - Claims connector reading from customer's Nasco system
   - All connectors normalizing to RiskObject schema
   - Rate limiting configured per customer's API limits
   - Error handling validated
   - Retry logic tested

4. **Customer-Specific Configuration**
   - Customer organization profile configured
   - User accounts for pilot team created
   - Role-based access control applied
   - Executive role assignments (CFO, CISO, Board)
   - Customer branding applied to dashboards
   - Email/Slack notification channels configured
   - Timezone and locale settings

5. **Isolation Validation Report**
   - Tenant isolation testing results
   - Data leakage verification
   - Encryption validation
   - Access control audit
   - Performance baseline measurements
   - Security compliance checklist

## SUCCESS CRITERIA

- All services running in customer tenant with no cross-tenant data leakage
- All four connectors pulling data successfully from customer's systems
- Data isolation validated (no tenant A can see tenant B data)
- Customer parameters configured and tested
- Health checks passing for all services
- No PHI/PII in logs or LLM calls
- Customer access working (users can log in, see dashboards)
- Performance meets SLA (events processed within 5 minutes)
- Security validation passed (audit logging, encryption, isolation)

## DEPENDENCIES

- T-MVP-015: HIPAA Compliance & SOC 2 (COMPLETE) ✅
- All Phase 1 tasks complete and validated

## CONTEXT

### Architecture Decisions
- **Multi-tenant architecture:** Each customer gets isolated namespace in Kubernetes
- **Data isolation:** Tenant ID in all database queries, event bus topics, and service calls
- **Encryption:** Customer-managed encryption keys (BYOK) via Key Vault
- **Authentication:** Standalone credentials with MFA (from T-FOUND-004)
- **PHI handling:** PHI stripped before LLM calls (validated in T-MVP-015)

### Technical Constraints
- Must deploy to customer's Azure subscription
- Must use customer's Key Vault for encryption keys
- Must comply with customer's security requirements
- Must maintain HIPAA compliance throughout
- Must support customer's existing identity provider (Azure AD)

### Related Tasks
- This task unblocks: T-PILOT-002 (Business Process Graph Construction)
- Depends on: All Phase 1 infrastructure and services

### Customer Environment
- **Cloud Provider:** Microsoft Azure
- **Region:** East US (customer-specified)
- **Identity Provider:** Azure AD (customer's tenant)
- **Data Sources:**
  - Splunk (customer's instance)
  - CrowdStrike Falcon (customer's subscription)
  - Azure AD (customer's tenant)
  - Nasco (customer's environment)

## OUTPUT REQUIREMENTS

### Code Locations
- Infrastructure: `/infrastructure/terraform/tenants/pilot-customer/`
- Configuration: `/cyberrx-api/config/pilot-customer/`
- Deployment scripts: `/infrastructure/scripts/deploy-pilot.sh`
- Validation tests: `/infrastructure/tests/isolation-validation/`

### Documentation
- Deployment runbook: `/docs/deployment/pilot-customer-deployment.md`
- Configuration guide: `/docs/configuration/pilot-customer-config.md`
- Isolation validation report: `/workspace/artifacts/T-PILOT-001-ISOLATION-REPORT.md`
- Customer onboarding guide: `/docs/onboarding/pilot-customer-onboarding.md`

### Testing
- Unit tests for tenant provisioning logic
- Integration tests for all connectors in customer environment
- Isolation validation tests (data leakage, access control)
- Performance tests (event processing latency)
- Security tests (encryption, audit logging)

### Validation Readiness
- All tests passing
- Documentation complete
- Customer access verified
- Ready for 4-validator review (Acceptance, Security, No-Regression, Integration)

## IMPLEMENTATION GUIDANCE

### Phase 1: Infrastructure Provisioning (20 hours)
1. Create tenant-specific Terraform configuration
2. Provision isolated Kubernetes namespace
3. Deploy database instances with tenant schema
4. Create event bus topics with tenant partitions
5. Configure Key Vault integration for customer keys
6. Apply network isolation policies
7. Set resource quotas

### Phase 2: Service Deployment (30 hours)
1. Build and push container images to customer registry
2. Deploy all Phase 1 services to tenant namespace
3. Configure service mesh and ingress
4. Set up health check endpoints
5. Integrate with customer's monitoring
6. Configure logging aggregation

### Phase 3: Connector Configuration (20 hours)
1. Configure SIEM connector for customer's Splunk
2. Configure EDR connector for customer's CrowdStrike
3. Configure IAM connector for customer's Azure AD
4. Configure Claims connector for customer's Nasco
5. Test all connectors with real data
6. Validate normalization to RiskObject schema

### Phase 4: Customer Setup (10 hours)
1. Create customer organization profile
2. Provision user accounts for pilot team
3. Configure RBAC and executive roles
4. Set up notification channels
5. Apply branding to dashboards
6. Test customer access

### Phase 5: Validation & Documentation (10 hours)
1. Run isolation validation tests
2. Verify data encryption
3. Test audit logging
4. Measure performance baseline
5. Create deployment runbook
6. Write customer onboarding guide
7. Generate isolation validation report

## SECURITY CONSIDERATIONS

- **Tenant Isolation:** Must validate no cross-tenant data access
- **PHI Protection:** Must ensure no PHI in logs, metrics, or LLM calls
- **Encryption:** All data encrypted at rest and in transit with customer keys
- **Access Control:** Validate RBAC for all user roles
- **Audit Logging:** All access attempts logged and auditable
- **Network Security:** Network policies preventing cross-tenant communication
- **Secrets Management:** All secrets in customer's Key Vault, never in code

## BLOCKER ESCALATION

If any of the following occur, escalate immediately:
- Cannot provision tenant infrastructure due to cloud limits
- Customer's data sources are incompatible with connectors
- Security requirements conflict with architecture
- Performance cannot meet SLA
- Isolation cannot be guaranteed

## NEXT STEPS

After this task is complete and validated:
- T-PILOT-002: Business Process Graph Construction (can begin in parallel with connector validation)
- Product Manager will engage customer to map business processes

## VALIDATION REQUESTED

After completion, this task requires validation from:
- [x] Acceptance Validator (all deliverables present, success criteria met)
- [x] Security Validator (tenant isolation, PHI protection, access control)
- [x] No-Regression Validator (existing functionality not broken)
- [x] Integration Validator (all connectors working, end-to-end flows)

---

**Task Prompt Version:** 1.0
**Created:** 2025-06-06
**Phase:** Phase 2 - Pilot Deployment & Customer Onboarding
**Dependencies:** All Phase 1 tasks complete
**Estimated Duration:** 80 hours
**Priority:** CRITICAL
