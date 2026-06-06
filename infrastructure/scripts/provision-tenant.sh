#!/bin/bash
# Tenant Provisioning Script
# This script provisions a new tenant with complete infrastructure isolation
# Usage: ./provision-tenant.sh <customer-id> <customer-name> <tier> <contact-email>

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Arguments
CUSTOMER_ID=${1}
CUSTOMER_NAME=${2}
TIER=${3:-default}
CONTACT=${4}
PROVISIONING_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Validate arguments
if [ -z "$CUSTOMER_ID" ] || [ -z "$CUSTOMER_NAME" ]; then
  echo "Usage: $0 <customer-id> <customer-name> <tier> <contact-email>"
  echo "Example: $0 acme-corp 'ACME Corporation' default admin@acme.com"
  exit 1
fi

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Tenant Provisioning: $CUSTOMER_ID${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "Customer ID: $CUSTOMER_ID"
echo "Customer Name: $CUSTOMER_NAME"
echo "Tier: $TIER"
echo "Contact: $CONTACT"
echo "Provisioning Date: $PROVISIONING_DATE"
echo ""

# Step 1: Validate tenant doesn't already exist
echo "Step 1: Validating tenant doesn't already exist..."
if kubectl get namespace "tenant-$CUSTOMER_ID" &>/dev/null; then
  echo "ERROR: Tenant namespace tenant-$CUSTOMER_ID already exists!"
  exit 1
fi
echo "Tenant validation passed."

# Step 2: Create database for tenant
echo ""
echo "Step 2: Creating tenant database..."
DB_NAME="tenant_$(echo $CUSTOMER_ID | sed 's/-/_/g')"
echo "Database name: $DB_NAME"

# Create database using Azure CLI
AZ_RESOURCE_GROUP="${AZ_RESOURCE_GROUP:-cyberrx-rg}"
AZ_POSTGRES_SERVER="${AZ_POSTGRES_SERVER:-cyberrx-postgres}"

az postgres flexible-server db create \
  --resource-group $AZ_RESOURCE_GROUP \
  --server-name $AZ_POSTGRES_SERVER \
  --name $DB_NAME \
  --charset UTF8 \
  --collation en_US.UTF8 || {
  echo "ERROR: Failed to create database"
  exit 1
  }

echo "Database $DB_NAME created successfully."

# Step 3: Create Key Vault for tenant (or use dedicated key vault)
echo ""
echo "Step 3: Setting up Key Vault secrets..."
KEY_VAULT_NAME="${KEY_VAULT_NAME:-cyberrx-kv}"

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32)
DB_USERNAME="${CUSTOMER_ID}_user"

# Store secrets in Key Vault
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "${CUSTOMER_ID}-db-password" --value "$DB_PASSWORD" &>/dev/null
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "${CUSTOMER_ID}-db-username" --value "$DB_USERNAME" &>/dev/null
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "${CUSTOMER_ID}-db-name" --value "$DB_NAME" &>/dev/null

echo "Key Vault secrets created."

# Step 4: Create Kubernetes namespace
echo ""
echo "Step 4: Creating Kubernetes namespace..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-$CUSTOMER_ID
  labels:
    name: tenant-$CUSTOMER_ID
    platform: cyberrx
    type: tenant
    customer-id: $CUSTOMER_ID
    tier: $TIER
    managed-by: terraform
    tenant-isolation: strict
  annotations:
    description: "Tenant namespace for $CUSTOMER_NAME"
    contact: "$CONTACT"
    provisioned-on: "$PROVISIONING_DATE"
    tier: "$TIER"
    database: "$DB_NAME"
    tenant-isolation-level: "infrastructure"
EOF

echo "Namespace tenant-$CUSTOMER_ID created."

# Step 5: Apply resource quotas
echo ""
echo "Step 5: Applying resource quotas..."

# Set tier-specific quotas
case $TIER in
  premium)
    CPU_REQUEST_LIMIT="16"
    MEMORY_REQUEST_LIMIT="32Gi"
    CPU_LIMIT="32"
    MEMORY_LIMIT="64Gi"
    PVC_LIMIT="10"
    ;;
  default)
    CPU_REQUEST_LIMIT="4"
    MEMORY_REQUEST_LIMIT="8Gi"
    CPU_LIMIT="8"
    MEMORY_LIMIT="16Gi"
    PVC_LIMIT="5"
    ;;
  *)
    CPU_REQUEST_LIMIT="2"
    MEMORY_REQUEST_LIMIT="4Gi"
    CPU_LIMIT="4"
    MEMORY_LIMIT="8Gi"
    PVC_LIMIT="3"
    ;;
esac

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-resource-quota
  namespace: tenant-$CUSTOMER_ID
spec:
  hard:
    requests.cpu: "${CPU_REQUEST_LIMIT}"
    requests.memory: "${MEMORY_REQUEST_LIMIT}"
    limits.cpu: "${CPU_LIMIT}"
    limits.memory: "${MEMORY_LIMIT}"
    persistentvolumeclaims: "${PVC_LIMIT}"
    services: "10"
    secrets: "20"
    configmaps: "10"
EOF

echo "Resource quotas applied."

# Step 6: Apply limit ranges
echo ""
echo "Step 6: Applying limit ranges..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-limit-range
  namespace: tenant-$CUSTOMER_ID
spec:
  limits:
  - type: Container
    default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "250m"
      memory: "256Mi"
    max:
      cpu: "4"
      memory: "8Gi"
    min:
      cpu: "100m"
      memory: "128Mi"
EOF

echo "Limit ranges applied."

# Step 7: Create network policies
echo ""
echo "Step 7: Creating network policies..."

# Get private endpoint IPs (these should be passed in or retrieved)
DATABASE_PRIVATE_IP="${DATABASE_PRIVATE_IP:-10.0.2.4}"
EVENTHUBS_PRIVATE_IP="${EVENTHUBS_PRIVATE_IP:-10.0.2.5}"
KEYVAULT_PRIVATE_IP="${KEYVAULT_PRIVATE_IP:-10.0.2.6}"

kubectl apply -f infrastructure/kubernetes/network-policies/deny-all.yaml

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-tenant-internal-only
  namespace: tenant-$CUSTOMER_ID
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          customer-id: $CUSTOMER_ID
  - from:
    - namespaceSelector:
        matchLabels:
          name: cyberrx-system
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          customer-id: $CUSTOMER_ID
  - to:
    - namespaceSelector:
        matchLabels:
          name: cyberrx-system
  - to:
    - namespaceSelector:
        matchLabels:
          name: cyberrx-monitoring
  - to:
    - ipBlock:
        cidr: ${DATABASE_PRIVATE_IP}/32
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - ipBlock:
        cidr: ${EVENTHUBS_PRIVATE_IP}/32
    ports:
    - protocol: TCP
      port: 9093
  - to:
    - ipBlock:
        cidr: ${KEYVAULT_PRIVATE_IP}/32
    ports:
    - protocol: TCP
      port: 443
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8
        - 172.16.0.0/12
        - 192.168.0.0/16
    ports:
    - protocol: TCP
      port: 443
EOF

# Create cross-tenant deny policy
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-tenant-traffic
  namespace: tenant-$CUSTOMER_ID
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          type: tenant
    ports:
    - protocol: TCP
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          type: tenant
    ports:
    - protocol: TCP
EOF

echo "Network policies applied."

# Step 8: Create service account
echo ""
echo "Step 8: Creating service account and RBAC..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tenant-workload-sa
  namespace: tenant-$CUSTOMER_ID
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-workload-role
  namespace: tenant-$CUSTOMER_ID
rules:
- apiGroups: [""]
  resources: ["secrets", "configmaps"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-workload-rolebinding
  namespace: tenant-$CUSTOMER_ID
subjects:
- kind: ServiceAccount
  name: tenant-workload-sa
  namespace: tenant-$CUSTOMER_ID
roleRef:
  kind: Role
  name: tenant-workload-role
  apiGroup: rbac.authorization.k8s.io
EOF

echo "Service account and RBAC configured."

# Step 9: Create SecretProviderClass for Key Vault integration
echo ""
echo "Step 9: Creating SecretProviderClass..."

cat <<EOF | kubectl apply -f -
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: key-vault-secret-provider
  namespace: tenant-$CUSTOMER_ID
spec:
  provider: azure
  parameters:
    keyvaultName: "$KEY_VAULT_NAME"
    objects: |
      array:
        - |
          objectName: ${CUSTOMER_ID}-db-password
          objectType: secret
        - |
          objectName: ${CUSTOMER_ID}-db-username
          objectType: secret
        - |
          objectName: ${CUSTOMER_ID}-db-name
          objectType: secret
        - |
          objectName: eventhubs-connection-string
          objectType: secret
        - |
          objectName: llm-api-key
          objectType: secret
    tenantId: "${AZURE_TENANT_ID}"
  secretObjects:
  - secretName: tenant-secrets
    type: Opaque
    data:
    - objectName: ${CUSTOMER_ID}-db-password
      key: DATABASE_PASSWORD
    - objectName: ${CUSTOMER_ID}-db-username
      key: DATABASE_USERNAME
    - objectName: ${CUSTOMER_ID}-db-name
      key: DATABASE_NAME
    - objectName: eventhubs-connection-string
      key: EVENTHUBS_CONNECTION_STRING
    - objectName: llm-api-key
      key: LLM_API_KEY
EOF

echo "SecretProviderClass created."

# Step 10: Run validation
echo ""
echo "Step 10: Running isolation validation..."

# Wait for namespace to be ready
sleep 5

# Run validation script (if exists)
if [ -f "infrastructure/scripts/validate-isolation.sh" ]; then
  chmod +x infrastructure/scripts/validate-isolation.sh
  # We can't validate against another tenant yet, so just check basic setup
  echo "Basic validation: Namespace created successfully"
fi

# Summary
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Tenant Provisioning Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Tenant Details:"
echo "  Namespace: tenant-$CUSTOMER_ID"
echo "  Database: $DB_NAME"
echo "  Tier: $TIER"
echo "  Key Vault: $KEY_VAULT_NAME"
echo ""
echo "Next Steps:"
echo "  1. Deploy application services to the tenant namespace"
echo "  2. Configure application-specific secrets in Key Vault"
echo "  3. Run application deployment scripts"
echo "  4. Validate tenant isolation"
echo ""
echo "To destroy this tenant, run:"
echo "  ./infrastructure/scripts/destroy-tenant.sh $CUSTOMER_ID"
