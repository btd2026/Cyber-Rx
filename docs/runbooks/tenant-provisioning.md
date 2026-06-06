# Tenant Provisioning Runbook

This runbook provides step-by-step instructions for provisioning a new tenant in the CyberRX Multi-Agent AI Platform.

## Overview

Each tenant (health plan customer) receives completely isolated infrastructure at the Kubernetes namespace, database, and Key Vault levels. This ensures strict data isolation and HIPAA compliance.

## Prerequisites

- Access to Azure subscription with appropriate permissions
- `kubectl` configured to access the AKS cluster
- `az` CLI logged in with appropriate permissions
- Terraform infrastructure deployed
- Existing Key Vault for secrets management

## Quick Start

```bash
# Provision a new tenant
./infrastructure/scripts/provision-tenant.sh <customer-id> <customer-name> <tier> <contact-email>

# Example
./infrastructure/scripts/provision-tenant.sh acme-corp "ACME Corporation" default admin@acme.com
```

## Detailed Steps

### Step 1: Gather Customer Information

Collect the following information from the customer:

- **Customer ID**: Unique identifier (e.g., `acme-corp`, `bcbs-florida`)
- **Customer Name**: Legal name of the health plan
- **Tier**: `premium`, `default`, or `basic`
- **Contact Email**: Primary technical contact
- **Data Volume**: Expected daily event volume
- **Users**: Expected number of users

### Step 2: Validate Infrastructure

Before provisioning, verify infrastructure is ready:

```bash
# Check AKS cluster health
kubectl get nodes

# Check base namespaces
kubectl get namespaces | grep cyberrx

# Check Key Vault access
az keyvault show --name <key-vault-name>

# Check PostgreSQL server
az postgres flexible-server show --name <postgres-server-name>
```

### Step 3: Set Environment Variables

```bash
export AZ_RESOURCE_GROUP="cyberrx-rg"
export AZ_POSTGRES_SERVER="cyberrx-postgres"
export KEY_VAULT_NAME="cyberrx-kv"
export DATABASE_PRIVATE_IP="10.0.2.4"
export EVENTHUBS_PRIVATE_IP="10.0.2.5"
export KEYVAULT_PRIVATE_IP="10.0.2.6"
export AZURE_TENANT_ID="<your-tenant-id>"
```

### Step 4: Run Provisioning Script

```bash
./infrastructure/scripts/provision-tenant.sh \
  acme-corp \
  "ACME Corporation" \
  default \
  admin@acme.com
```

### Step 5: Verify Provisioning

After the script completes, verify:

```bash
# Check namespace exists
kubectl get namespace tenant-acme-corp

# Check network policies
kubectl get networkpolicy -n tenant-acme-corp

# Check resource quotas
kubectl get resourcequota -n tenant-acme-corp

# Check secrets (should be populated by CSI driver)
kubectl get secrets -n tenant-acme-corp
```

### Step 6: Deploy Application Services

Deploy services to the tenant namespace:

```bash
# Update service templates with tenant-specific values
export CUSTOMER_ID="acme-corp"
export NAMESPACE="tenant-acme-corp"
export DATABASE_NAME="tenant_acme_corp"
export KEY_VAULT_URI="https://cyberrx-kv.vault.azure.net/"

# Apply deployment templates
envsubst < infrastructure/kubernetes/deployments/service-template.yaml | kubectl apply -f -
envsubst < infrastructure/kubernetes/deployments/configmap-template.yaml | kubectl apply -f -
envsubst < infrastructure/kubernetes/deployments/secret-template.yaml | kubectl apply -f -
```

### Step 7: Configure Event Hubs Consumer Groups

Create tenant-specific consumer groups in Event Hubs:

```bash
# Security events consumer group
az eventhubs eventhub consumer-group create \
  --resource-group $AZ_RESOURCE_GROUP \
  --namespace-name cyberrx-events \
  --eventhub-name security-events \
  --name tenant-acme-corp

# Operational events consumer group
az eventhubs eventhub consumer-group create \
  --resource-group $AZ_RESOURCE_GROUP \
  --namespace-name cyberrx-events \
  --eventhub-name operational-events \
  --name tenant-acme-corp
```

### Step 8: Run Isolation Validation

Validate tenant isolation:

```bash
./infrastructure/scripts/validate-isolation.sh \
  tenant-acme-corp \
  tenant-existing-customer
```

### Step 9: Configure Application Secrets

Add application-specific secrets to Key Vault:

```bash
# API keys
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "acme-corp-api-key" --value "<api-key>"

# Third-party service credentials
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "acme-corp-nasco-key" --value "<nasco-key>"
```

### Step 10: Test Connectivity

Test tenant infrastructure:

```bash
# Deploy test pod
kubectl run test-pod -n tenant-acme-corp --image=busybox --rm -it --restart=Never -- sh

# From inside the pod, test connectivity:
# - Database: nc -zv <database-private-ip> 5432
# - Event Hubs: nc -zv <eventhubs-private-ip> 9093
# - Key Vault: nc -zv <keyvault-private-ip> 443

# Exit pod
exit
```

## Tier-Specific Configuration

### Premium Tier

For premium customers, assign additional resources:

```bash
# Premium tier node pool
kubectl taint nodes node-pool-1 workload=premium-tier:NoSchedule

# Deploy with premium tolerations
kubectl apply -f - <<EOF
spec:
  template:
    spec:
      tolerations:
      - key: workload
        operator: Equal
        value: premium-tier
        effect: NoSchedule
      nodeSelector:
        workload: premium-tier
EOF
```

### Default Tier

Standard configuration applies automatically.

### Basic Tier

For basic tier, reduce resource quotas:

```bash
kubectl patch resourcequota tenant-resource-quota -n tenant-acme-corp -p '
{
  "spec": {
    "hard": {
      "requests.cpu": "2",
      "requests.memory": "4Gi",
      "limits.cpu": "4",
      "limits.memory": "8Gi"
    }
  }
}
'
```

## Validation Checklist

After provisioning, validate:

- [ ] Namespace exists with correct labels
- [ ] Database created and accessible
- [ ] Key Vault secrets created
- [ ] Network policies applied (default deny all)
- [ ] Resource quotas configured
- [ ] Limit ranges configured
- [ ] Service account created
- [ ] RBAC roles configured
- [ ] SecretProviderClass created
- [ ] Cross-tenant traffic denied
- [ ] Services can access database via private endpoint
- [ ] Services can access Event Hubs via private endpoint
- [ ] Services can access Key Vault via private endpoint
- [ ] No shared secrets with other tenants
- [ ] No cross-namespace DNS leakage

## Troubleshooting

### Namespace Creation Fails

**Symptom**: `kubectl apply` fails to create namespace

**Solution**:
```bash
# Check if namespace already exists
kubectl get namespace tenant-<customer-id>

# Delete if exists (data loss!)
kubectl delete namespace tenant-<customer-id> --force --grace-period=0
```

### Database Creation Fails

**Symptom**: Azure CLI fails to create database

**Solution**:
```bash
# Check PostgreSQL server status
az postgres flexible-server show --name <server-name>

# Check server capacity
az postgres flexible-server show --name <server-name> --query sku

# Verify you have permissions
az role assignment list --assignee <your-user-id> --scope <server-id>
```

### Network Policies Not Applied

**Symptom**: Pods cannot communicate despite network policies

**Solution**:
```bash
# Check if network policy is enabled
kubectl get networkpolicy -n tenant-<customer-id>

# Verify CNI plugin supports network policies
kubectl get daemonset -n kube-system azure-network-policy

# Check pod labeling
kubectl get pods -n tenant-<customer-id> --show-labels
```

### Secrets Not Populated

**Symptom**: Secrets are empty in namespace

**Solution**:
```bash
# Check SecretProviderClass
kubectl get secretproviderclass -n tenant-<customer-id>

# Check CSI driver pods
kubectl get pods -n kube-system | grep secrets-store

# Check driver logs
kubectl logs -n kube-system <secrets-store-csi-driver-pod>

# Sync secrets manually
kubectl delete pod <pod-with-secret-volume> -n tenant-<customer-id>
```

### Cross-Tenant Traffic Allowed

**Symptom**: Pods from one tenant can access another tenant

**Solution**:
```bash
# Verify deny-cross-tenant-traffic policy exists
kubectl get networkpolicy deny-cross-tenant-traffic -n tenant-<customer-id> -o yaml

# Test cross-tenant access
kubectl run test-pod -n tenant-<customer-id-1> --image=busybox --rm -it --restart=Never -- sh
# From pod: nc -zv <tenant-2-service> 80

# Reapply network policies
kubectl apply -f infrastructure/kubernetes/network-policies/
```

## Rollback Procedures

### Complete Rollback

If provisioning fails and you need to clean up:

```bash
# Run destruction script
./infrastructure/scripts/destroy-tenant.sh acme-corp

# Verify cleanup
kubectl get namespace | grep acme-corp
az postgres flexible-server db list --server-name <server-name> --query "[?contains(name, 'acme')].name"
```

### Partial Rollback

If only certain resources failed:

```bash
# Delete namespace resources
kubectl delete all --all -n tenant-acme-corp
kubectl delete configmaps --all -n tenant-acme-corp
kubectl delete secrets --all -n tenant-acme-corp

# Keep database if it was created successfully
# Manually clean up failed resources
```

## Monitoring and Alerting

After provisioning, configure monitoring:

```bash
# Create Grafana dashboard for tenant
kubectl apply -f monitoring/dashboards/tenant-overview.yaml

# Create Prometheus alerts
kubectl apply -f monitoring/alerts/tenant-isolation.yaml

# Verify metrics are being collected
kubectl port-forward -n cyberrx-monitoring svc/prometheus 9090:9090
# Open http://localhost:9090
```

## Documentation

After provisioning:

1. Update customer registry
2. Document tenant ID and credentials
3. Store in secure location (not in git!)
4. Notify customer of completion
5. Schedule onboarding session

## Time Estimates

- **Quick provision**: 5-10 minutes (script automation)
- **Full validation**: 20-30 minutes
- **Application deployment**: 30-60 minutes
- **Testing and verification**: 30-60 minutes

**Total**: 1.5-2.5 hours for complete tenant setup

## Escalation

Escalate if:

1. Provisioning script fails repeatedly
2. Database cannot be created
3. Network policies don't apply
4. Secrets cannot be accessed
5. Cross-tenant communication detected
6. Resource limits cannot be enforced

## References

- [Network Isolation Documentation](../architecture/network-isolation.md)
- [Tenant Isolation Documentation](../architecture/tenant-isolation.md)
- [Encryption Strategy](../architecture/encryption-strategy.md)
- [Infrastructure Deployment Runbook](infrastructure/deployment.md)
