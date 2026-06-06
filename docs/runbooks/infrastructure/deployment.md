# Infrastructure Deployment Runbook

This runbook provides step-by-step instructions for deploying the CyberRX infrastructure using Terraform.

## Prerequisites

- Azure subscription with Owner/Contributor access
- Terraform 1.5+ installed
- `az` CLI installed and authenticated
- `kubectl` installed
- Service principal with appropriate permissions

## Step 1: Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform modules
terraform init

# Select or create workspace
terraform workspace new production
terraform workspace select production
```

## Step 2: Configure Provider

Create `provider.tf`:

```hcl
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy       = false
      recover_soft_deleted_key_vaults    = true
    }
  }
}

provider "azurerm" {
  alias                      = "identity"
  skip_provider_registration = true
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatecyberrx"
    container_name       = "tfstate"
    key                  = "production.tfstate"
  }
}
```

## Step 3: Configure Variables

Create `terraform.tfvars`:

```hcl
# Resource Group
resource_group_name = "cyberrx-rg"
location            = "eastus2"

# AKS Cluster
cluster_name        = "cyberrx-aks"
kubernetes_version  = "1.28"
enable_private_cluster = true

# Event Hubs
namespace_name      = "cyberrx-events"
sku                 = "Standard"
capacity            = 4

# Database
server_name         = "cyberrx-postgres"
administrator_login = "cyberrxadmin"
version             = "16"
high_availability   = true

# Key Vault
key_vault_name      = "cyberrx-kv"
sku_name            = "premium"
```

## Step 4: Plan Deployment

```bash
# Review planned changes
terraform plan -out=tfplan

# Show plan output
terraform show tfplan
```

Review the output carefully:
- ✅ Resources to be created
- ✅ Resource naming
- ✅ Networking configuration
- ✅ Security settings

## Step 5: Deploy Infrastructure

```bash
# Apply the plan
terraform apply tfplan

# Wait for deployment (15-30 minutes)
```

Expected output:
- Resource group created
- VNet and subnets created
- AKS cluster provisioned
- PostgreSQL server deployed
- Event Hubs namespace created
- Key Vault provisioned

## Step 6: Verify Deployment

```bash
# Check resource group
az group show --name cyberrx-rg

# Check AKS cluster
az aks show --resource-group cyberrx-rg --name cyberrx-aks

# Check database
az postgres flexible-server show --resource-group cyberrx-rg --name cyberrx-postgres

# Check Event Hubs
az eventhubs namespace show --resource-group cyberrx-rg --name cyberrx-events

# Check Key Vault
az keyvault show --name cyberrx-kv
```

## Step 7: Configure kubectl

```bash
# Get AKS credentials
az aks get-credentials --resource-group cyberrx-rg --name cyberrx-aks

# Verify cluster access
kubectl get nodes

# Check cluster version
kubectl version --short
```

## Step 8: Deploy Base Kubernetes Resources

```bash
# Apply base namespaces
kubectl apply -f infrastructure/kubernetes/namespaces/base.yaml

# Apply network policies
kubectl apply -f infrastructure/kubernetes/network-policies/deny-all.yaml
kubectl apply -f infrastructure/kubernetes/network-policies/allow-internal.yaml
kubectl apply -f infrastructure/kubernetes/network-policies/allow-external.yaml

# Verify
kubectl get namespaces
kubectl get networkpolicy -A
```

## Step 9: Install Azure Key Vault CSI Driver

```bash
# Add Helm repo
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts

# Install driver
helm install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set secrets-store-csi-driver.enableSecretRotation=true \
  --set syncSecret.enabled=true

# Install Azure Key Vault provider
kubectl apply -f https://raw.githubusercontent.com/Azure/secrets-store-csi-driver-provider-azure/main/deployment/provider-azure-installer.yaml

# Verify
kubectl get pods -n kube-system | grep secrets-store
```

## Step 10: Install Monitoring Stack

```bash
# Add Helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace cyberrx-monitoring \
  --create-namespace \
  --values monitoring/prometheus-values.yaml

# Install Grafana
helm install grafana grafana/grafana \
  --namespace cyberrx-monitoring \
  --values monitoring/grafana-values.yaml

# Verify
kubectl get pods -n cyberrx-monitoring
kubectl get svc -n cyberrx-monitoring
```

## Step 11: Configure DNS and Private Endpoints

```bash
# Create private DNS zones
az network private-dns zone create -g cyberrx-rg -n privatelink.postgres.database.azure.com
az network private-dns zone create -g cyberrx-rg -n privatelink.eventhubs.windows.net
az network private-dns zone create -g cyberrx-rg -n privatelink.vaultcore.azure.net

# Link DNS zones to VNet
az network private-dns link vnet create \
  -g cyberrx-rg \
  -n cyberrx-dns-link \
  -z privatelink.postgres.database.azure.com \
  -v cyberrx-vnet \
  -e true

# Verify
az network private-dns zone list -g cyberrx-rg
```

## Step 12: Test Infrastructure

```bash
# Test network policies
./infrastructure/scripts/validate-isolation.sh

# Test performance
./infrastructure/scripts/validate-performance.sh

# Test database connectivity
kubectl run test-db -it --rm --image=postgres:16 --restart=Never -- psql -h <postgres-host> -U cyberrxadmin

# Test Event Hubs connectivity
kubectl run test-eh -it --rm --image=busybox --restart=Never -- nc -zv <eventhubs-host> 9093
```

## Step 13: Create Service Principals

```bash
# Create service principal for AKS
az ad sp create-for-rbac --name "cyberrx-aks-sp" --role "Contributor" --scopes /subscriptions/<subscription-id>/resourceGroups/cyberrx-rg

# Create service principal for database
az ad sp create-for-rbac --name "cyberrx-db-sp" --role "Contributor" --scopes /subscriptions/<subscription-id>/resourceGroups/cyberrx-rg

# Store credentials in Key Vault
az keyvault secret set --vault-name cyberrx-kv --name "aks-sp-client-id" --value <client-id>
az keyvault secret set --vault-name cyberrx-kv --name "aks-sp-client-secret" --value <client-secret>
```

## Step 14: Enable Diagnostic Settings

```bash
# Enable diagnostics for AKS
az monitor diagnostic-settings create \
  --name cyberrx-aks-diagnostics \
  --resource /subscriptions/<sub-id>/resourceGroups/cyberrx-rg/providers/Microsoft.ContainerService/managedClusters/cyberrx-aks \
  --workspace /subscriptions/<sub-id>/resourceGroups/cyberrx-rg/providers/Microsoft.OperationalInsights/workspaces/cyberrx-logs \
  --logs '["cluster-autoscaler", "guard"]' \
  --metrics '["AllMetrics"]'

# Enable diagnostics for PostgreSQL
az monitor diagnostic-settings create \
  --name cyberrx-postgres-diagnostics \
  --resource /subscriptions/<sub-id>/resourceGroups/cyberrx-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/cyberrx-postgres \
  --workspace /subscriptions/<sub-id>/resourceGroups/cyberrx-rg/providers/Microsoft.OperationalInsights/workspaces/cyberrx-logs

# Enable diagnostics for Key Vault
az monitor diagnostic-settings create \
  --name cyberrx-kv-diagnostics \
  --resource /subscriptions/<sub-id>/resourceGroups/cyberrx-rg/providers/Microsoft.KeyVault/vaults/cyberrx-kv \
  --workspace /subscriptions/<sub-id>/resourceGroups/cyberrx-rg/providers/Microsoft.OperationalInsights/workspaces/cyberrx-logs
```

## Rollback Procedures

### If AKS Cluster Fails to Provision

```bash
# Delete cluster
terraform destroy -target=azurerm_kubernetes_cluster.main

# Retry deployment
terraform apply tfplan
```

### If Database Fails to Provision

```bash
# Delete database
terraform destroy -target=azurerm_postgresql_flexible_server.main

# Check Azure quotas
az postgres flexible-server list --resource-group cyberrx-rg

# Retry
terraform apply tfplan
```

### If Event Hubs Fails to Provision

```bash
# Check Event Hubs namespace limits
az eventhubs namespace show --resource-group cyberrx-rg --name cyberrx-events --query sku

# Retry
terraform apply tfplan
```

## Monitoring and Maintenance

### Daily Checks

```bash
# Check cluster health
kubectl get nodes
kubectl get pods -A

# Check resource utilization
kubectl top nodes
kubectl top pods -A

# Check network policies
kubectl get networkpolicy -A
```

### Weekly Checks

```bash
# Review logs
az monitor activity-log list --resource-group cyberrx-rg --max-events 100

# Check costs
az consumption usage list --resource-group cyberrx-rg

# Review security
az security va sql scan list --resource-group cyberrx-rg
```

### Monthly Maintenance

- Review and apply AKS updates
- Review database backups
- Rotate secrets in Key Vault
- Review network policies
- Cost optimization review

## Troubleshooting

### Issue: Terraform State Lock

**Solution**:
```bash
# Force unlock (use with caution)
terraform force-unlock <lock-id>

# Or use Azure backend
az storage account show-connection-string --resource-group terraform-state-rg --name tfstatecyberrx
```

### Issue: AKS Node Pool Fails to Scale

**Solution**:
```bash
# Check node pool status
az aks nodepool list --resource-group cyberrx-rg --cluster-name cyberrx-aks

# Check VM quotas
az quota list --scope /subscriptions/<subscription-id>

# Manually scale
az aks nodepool scale --resource-group cyberrx-rg --cluster-name cyberrx-aks --name system --node-count 3
```

### Issue: Database Connection Failures

**Solution**:
```bash
# Check private endpoint
az network private-endpoint show --resource-group cyberrx-rg --name cyberrx-postgres-pe

# Check DNS resolution
kubectl run test-dns --rm -it --image=busybox -- nslookup cyberrx-postgres.privatelink.postgres.database.azure.com

# Check firewall rules
az postgres flexible-server firewall-rule list --resource-group cyberrx-rg --server-name cyberrx-postgres
```

## Cost Estimates

Based on default configuration:

| Resource | SKU | Cost/month |
|----------|-----|------------|
| AKS Cluster | Standard_D4s_v3 (3 nodes) | ~$600 |
| PostgreSQL | Standard_D4s_v3 (HA) | ~$800 |
| Event Hubs | Standard (4 capacity) | ~$400 |
| Key Vault | Premium | ~$40 |
| Network | VNet, Private Endpoints | ~$100 |
| Monitoring | Log Analytics | ~$200 |

**Total**: ~$2,140/month

## References

- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [AKS Documentation](https://docs.microsoft.com/azure/aks/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/azure/postgresql/)
- [Azure Event Hubs](https://docs.microsoft.com/azure/event-hubs/)
- [Azure Key Vault](https://docs.microsoft.com/azure/key-vault/)
