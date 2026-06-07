# Pilot Customer Deployment Guide

**Task:** T-PILOT-001 - Pilot Customer Environment Setup
**Author:** Senior Backend Engineer
**Date:** 2025-06-06
**Version:** 1.0.0

---

## Overview

This guide provides step-by-step instructions for deploying the CyberRX platform to the pilot customer environment, including infrastructure provisioning, service deployment, connector configuration, and isolation validation.

---

## Prerequisites

### Azure Prerequisites

- Azure subscription with sufficient quota
- Azure AD tenant for identity
- Service Principal with Contributor role
- Key Vault for secrets management

### Customer Prerequisites

- Customer Azure subscription (for BYOK)
- Customer-provided encryption keys
- Network connectivity from CyberRX to customer systems
- DNS zone configured (pilot.cyberrx.com)
- SSL certificates provisioned

### Technical Prerequisites

- Terraform >= 1.5
- Azure CLI >= 2.40
- kubectl >= 1.27
- Node.js >= 18
- Docker >= 24
- PostgreSQL client (psql) >= 15

---

## Deployment Steps

### Phase 1: Pre-Deployment (1 hour)

#### 1.1 Environment Setup

```bash
# Set environment variables
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
export DATABASE_URL="postgresql://..."
export TENANT_ID="pilot-customer-001"
export CUSTOMER_ID="pilot-customer"
export TENANT_PREFIX="piloteastus"
export LOCATION="eastus"
export RESOURCE_GROUP_NAME="cyberrx-rg"
export AKS_CLUSTER_NAME="cyberrx-aks"
export LOG_ANALYTICS_WORKSPACE_NAME="cyberrx-logs"
```

#### 1.2 Validate Prerequisites

```bash
# Run validation script
cd /Users/briandibassinga/Github/Cyber-Rx/infrastructure/scripts
./validate-prereqs.sh
```

#### 1.3 Configure Connector Credentials

Store connector credentials in environment variables (never commit to git):

```bash
export SPLUNK_CLIENT_ID="..."
export SPLUNK_CLIENT_SECRET="..."
export CROWDSTRIKE_CLIENT_ID="..."
export CROWDSTRIKE_CLIENT_SECRET="..."
export AZURE_AD_CLIENT_ID="..."
export AZURE_AD_CLIENT_SECRET="..."
export NASCO_DB_HOST="..."
export NASCO_DB_USER="..."
export NASCO_DB_PASSWORD="..."
```

### Phase 2: Infrastructure Provisioning (2 hours)

#### 2.1 Initialize Terraform

```bash
cd /Users/briandibassinga/Github/Cyber-Rx/infrastructure/terraform/tenants/pilot-customer
terraform init
```

#### 2.2 Review Terraform Plan

```bash
terraform plan \
  -var="tenant_id=${TENANT_ID}" \
  -var="customer_id=${CUSTOMER_ID}" \
  -var="tenant_prefix=${TENANT_PREFIX}" \
  -out=pilot-plan.tfstate
```

#### 2.3 Apply Infrastructure

```bash
terraform apply pilot-plan.tfstate
```

This provisions:
- PostgreSQL database with TimescaleDB and RLS
- Key Vault with customer-managed encryption keys (BYOK)
- Event Hub namespace for event streaming
- Storage account for tenant files
- Application Insights for monitoring
- Kubernetes namespace with network policies

#### 2.4 Verify Infrastructure

```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check Key Vault access
az keyvault secret list --vault-name kv-piloteastus-eastus

# Check Event Hub namespace
az eventhubs namespace show --name eh-piloteastus-eastus
```

### Phase 3: Database Setup (1 hour)

#### 3.1 Apply Database Migrations

```bash
cd /Users/briandibassinga/Github/Cyber-Rx/infrastructure/database
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_add_authentication.sql
psql $DATABASE_URL -f migrations/003_add_tenant_rls_policies.sql
```

#### 3.2 Verify RLS Policies

```bash
psql $DATABASE_URL -c "
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('risk_objects', 'agent_state', 'business_process_graph', 'event_log');
"
```

#### 3.3 Test Tenant Context

```bash
psql $DATABASE_URL -c "
-- Set tenant context
SELECT set_tenant_context('${TENANT_ID}');

-- Query risk objects (should only see tenant's data)
SELECT COUNT(*) FROM risk_objects;

-- Reset tenant context
RESET app.current_tenant_id;
"
```

### Phase 4: Service Deployment (3 hours)

#### 4.1 Build Container Images

```bash
cd /Users/briandibassinga/Github/Cyber-Rx

# Build all service images
./scripts/build-all-images.sh ${IMAGE_TAG:-v1.0.0}

# Push to registry
docker push ${REGISTRY_URL}/cyberrx-api:${IMAGE_TAG}
docker push ${REGISTRY_URL}/normalization-engine:${IMAGE_TAG}
docker push ${REGISTRY_URL}/financial-modeling-engine:${IMAGE_TAG}
docker push ${REGISTRY_URL}/agent-runtime:${IMAGE_TAG}
docker push ${REGISTRY_URL}/splunk-connector:${IMAGE_TAG}
docker push ${REGISTRY_URL}/crowdstrike-connector:${IMAGE_TAG}
docker push ${REGISTRY_URL}/azure-ad-connector:${IMAGE_TAG}
docker push ${REGISTRY_URL}/nasco-connector:${IMAGE_TAG}
docker push ${REGISTRY_URL}/alerting-service:${IMAGE_TAG}
```

#### 4.2 Deploy to Kubernetes

```bash
# Get namespace from Terraform outputs
NAMESPACE=$(terraform output -raw kubernetes_namespace)

# Deploy all services
kubectl apply -f infrastructure/k8s/tenant/ --namespace=$NAMESPACE

# Wait for deployments to be ready
kubectl wait --for=condition=ready pod --namespace=$NAMESPACE --all --timeout=300s
```

#### 4.3 Verify Service Health

```bash
# Check all pods are running
kubectl get pods --namespace=$NAMESPACE

# Check service endpoints
kubectl get services --namespace=$NAMESPACE

# Run health checks
./scripts/health-check.sh $NAMESPACE
```

### Phase 5: Connector Configuration (2 hours)

#### 5.1 Configure Splunk Connector

```bash
# Store Splunk credentials in Key Vault
az keyvault secret set \
  --vault-name kv-piloteastus-eastus \
  --name splunk-credentials \
  --value "{\"client_id\":\"${SPLUNK_CLIENT_ID}\",\"client_secret\":\"${SPLUNK_CLIENT_SECRET}\"}"

# Test Splunk connection
node scripts/test-connector.js splunk
```

#### 5.2 Configure CrowdStrike Connector

```bash
# Store CrowdStrike credentials in Key Vault
az keyvault secret set \
  --vault-name kv-piloteastus-eastus \
  --name crowdstrike-credentials \
  --value "{\"client_id\":\"${CROWDSTRIKE_CLIENT_ID}\",\"client_secret\":\"${CROWDSTRIKE_CLIENT_SECRET}\"}"

# Test CrowdStrike connection
node scripts/test-connector.js crowdstrike
```

#### 5.3 Configure Azure AD Connector

```bash
# Store Azure AD credentials in Key Vault
az keyvault secret set \
  --vault-name kv-piloteastus-eastus \
  --name azure-ad-credentials \
  --value "{\"client_id\":\"${AZURE_AD_CLIENT_ID}\",\"client_secret\":\"${AZURE_AD_CLIENT_SECRET}\"}"

# Test Azure AD connection
node scripts/test-connector.js azure-ad
```

#### 5.4 Configure Nasco Connector

```bash
# Store Nasco credentials in Key Vault
az keyvault secret set \
  --vault-name kv-piloteastus-eastus \
  --name nasco-credentials \
  --value "{\"db_host\":\"${NASCO_DB_HOST}\",\"db_user\":\"${NASCO_DB_USER}\",\"db_password\":\"${NASCO_DB_PASSWORD}\"}"

# Test Nasco connection
node scripts/test-connector.js nasco
```

### Phase 6: Validation (2 hours)

#### 6.1 Run Health Checks

```bash
# Run comprehensive health checks
./scripts/health-check-all.sh $NAMESPACE

# Expected output: All services healthy ✅
```

#### 6.2 Run Isolation Tests

```bash
# Run isolation validation tests
cd /Users/briandibassinga/Github/Cyber-Rx/cyberrx-api
node infrastructure/tests/isolation-validation/run-isolation-tests.js

# Expected output: All tests passed (0 leakage vectors) ✅
```

#### 6.3 Test Data Flow

```bash
# Test end-to-end data flow
./scripts/test-data-flow.sh

# Verify:
# 1. Connectors pulling data from customer systems
# 2. Events normalized to RiskObject schema
# 3. Agents processing events
# 4. Alerts generated correctly
# 5. No PHI/PII in logs or LLM calls
```

#### 6.4 Verify Tenant Isolation

```bash
# Test cross-tenant data leakage
psql $DATABASE_URL << EOF
-- Set tenant A context
SELECT set_tenant_context('${TENANT_ID}');

-- Try to query tenant B data (should return 0 rows)
SELECT COUNT(*) FROM risk_objects WHERE customer_id = 'different-tenant';

-- Expected: 0 rows (RLS blocked) ✅

RESET app.current_tenant_id;
EOF
```

---

## Post-Deployment

### DNS Configuration

1. Add CNAME record for pilot.cyberrx.com
2. Configure SSL certificate
3. Verify DNS propagation

```bash
# Verify DNS
nslookup pilot.cyberrx.com

# Verify SSL
curl -I https://pilot.cyberrx.com
```

### User Onboarding

1. Create admin users for pilot team
2. Configure role-based access control
3. Set up notification channels
4. Apply branding to dashboards

### Monitoring Setup

1. Configure Application Insights alerts
2. Set up Log Analytics queries
3. Configure Azure Monitor dashboards
4. Enable diagnostic settings

---

## Troubleshooting

### Database Connection Issues

```bash
# Check database firewall rules
az postgres flexible-server firewall-rule list \
  --server-name cyberrx-pilot-customer-001 \
  --resource-group cyberrx-rg

# Check private endpoint connectivity
az network private-endpoint show \
  --name cyberrx-pilot-customer-001-db-pe \
  --resource-group cyberrx-rg
```

### Connector Issues

```bash
# Test connector connectivity
node scripts/test-connector.js <connector-type>

# Check connector logs
kubectl logs --namespace=$NAMESPACE deployment/splunk-connector

# Verify credentials in Key Vault
az keyvault secret show --vault-name kv-piloteastus-eastus --name splunk-credentials
```

### Isolation Test Failures

```bash
# Check RLS policies
psql $DATABASE_URL -c "SELECT * FROM pg_policies WHERE tablename = 'risk_objects';"

# Verify tenant context
psql $DATABASE_URL -c "SELECT current_setting('app.current_tenant_id');"

# Check for isolation violations
psql $DATABASE_URL -c "SELECT * FROM tenant_isolation_violations;"
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Rollback Terraform changes
cd /Users/briandibassinga/Github/Cyber-Rx/infrastructure/terraform/tenants/pilot-customer
terraform destroy -var="tenant_id=${TENANT_ID}" -auto-approve

# 2. Delete Kubernetes namespace
kubectl delete namespace tenant-${TENANT_ID}

# 3. Remove database records
psql $DATABASE_URL -c "DELETE FROM tenants WHERE customer_id = '${CUSTOMER_ID}';"
psql $DATABASE_URL -c "DELETE FROM infrastructure_components WHERE tenant_id = '${TENANT_ID}';"

# 4. Remove Key Vault (if needed)
az keyvault delete --name kv-piloteastus-eastus --resource-group cyberrx-rg
```

---

## Support

For deployment support, contact:

- **Platform Team:** platform-team@cyberrx.com
- **On-Call Engineer:** +1-555-CYBER-RX
- **Documentation:** https://docs.cyberrx.com

---

## Next Steps

After successful deployment:

1. **T-PILOT-002:** Business Process Graph Construction
2. **T-PILOT-003:** Financial Parameters & Threshold Configuration
3. **T-PILOT-004:** Agent Calibration & Executive Onboarding
4. **T-PILOT-005:** MVP Success Criterion Validation

---

**Document Version:** 1.0.0
**Last Updated:** 2025-06-06
**Maintained By:** Senior Backend Engineer
