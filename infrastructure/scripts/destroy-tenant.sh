#!/bin/bash
# Tenant Destruction Script
# This script destroys a tenant and all its resources
# Usage: ./destroy-tenant.sh <customer-id>

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Arguments
CUSTOMER_ID=${1}

# Validate arguments
if [ -z "$CUSTOMER_ID" ]; then
  echo "Usage: $0 <customer-id>"
  echo "Example: $0 acme-corp"
  exit 1
fi

echo -e "${RED}================================${NC}"
echo -e "${RED}WARNING: Tenant Destruction${NC}"
echo -e "${RED}================================${NC}"
echo ""
echo "This will permanently destroy all resources for tenant: $CUSTOMER_ID"
echo ""
read -p "Type 'yes' to continue: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Destruction cancelled."
  exit 0
fi

echo ""
echo "Step 1: Verifying tenant exists..."

if ! kubectl get namespace "tenant-$CUSTOMER_ID" &>/dev/null; then
  echo "ERROR: Tenant namespace tenant-$CUSTOMER_ID does not exist!"
  exit 1
fi

echo "Tenant found."

# Step 2: Get tenant information
echo ""
echo "Step 2: Gathering tenant information..."

NAMESPACE="tenant-$CUSTOMER_ID"
DB_NAME=$(kubectl get namespace "$NAMESPACE" -o json | jq -r '.metadata.annotations.database' // echo "")
TIER=$(kubectl get namespace "$NAMESPACE" -o json | jq -r '.metadata.labels.tier' // echo "unknown")

echo "Database: $DB_NAME"
echo "Tier: $TIER"

# Step 3: Delete all resources in namespace
echo ""
echo "Step 3: Deleting all resources in namespace..."

# Delete all resources (kubectl delete all doesn't catch everything)
kubectl delete all --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete configmaps --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete secrets --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete pvc --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete pdb --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete networkpolicy --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete rolebinding --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete role --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete serviceaccount --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete resourcequota --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete limitrange --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true
kubectl delete secretproviderclass --all -n "$NAMESPACE" --grace-period=60 --timeout=300s &>/dev/null || true

echo "Resources deleted."

# Step 4: Delete namespace
echo ""
echo "Step 4: Deleting namespace..."

kubectl delete namespace "$NAMESPACE" --grace-period=60 --timeout=300s

# Wait for namespace to be fully deleted
echo "Waiting for namespace to be deleted..."
for i in {1..60}; do
  if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    echo "Namespace deleted successfully."
    break
  fi
  echo "Waiting... ($i/60)"
  sleep 5
done

# Step 5: Delete database (optional, requires confirmation)
echo ""
echo -e "${YELLOW}Step 5: Delete database?${NC}"
echo "This will permanently delete the database: $DB_NAME"
read -p "Delete database? (yes/no): " DELETE_DB

if [ "$DELETE_DB" = "yes" ]; then
  echo "Deleting database..."

  AZ_RESOURCE_GROUP="${AZ_RESOURCE_GROUP:-cyberrx-rg}"
  AZ_POSTGRES_SERVER="${AZ_POSTGRES_SERVER:-cyberrx-postgres}"

  az postgres flexible-server db delete \
    --resource-group $AZ_RESOURCE_GROUP \
    --server-name $AZ_POSTGRES_SERVER \
    --name $DB_NAME \
    --yes || {
    echo "ERROR: Failed to delete database"
    exit 1
    }

  echo "Database deleted."
else
  echo "Database preserved: $DB_NAME"
fi

# Step 6: Delete Key Vault secrets (optional, requires confirmation)
echo ""
echo -e "${YELLOW}Step 6: Delete Key Vault secrets?${NC}"
echo "This will delete all secrets associated with tenant: $CUSTOMER_ID"
read -p "Delete Key Vault secrets? (yes/no): " DELETE_SECRETS

if [ "$DELETE_SECRETS" = "yes" ]; then
  echo "Deleting Key Vault secrets..."

  KEY_VAULT_NAME="${KEY_VAULT_NAME:-cyberrx-kv}"

  # List and delete tenant-specific secrets
  SECRETS=$(az keyvault secret list --vault-name $KEY_VAULT_NAME --query "[?contains(name, '$CUSTOMER_ID')].name" -o tsv)

  for secret in $SECRETS; do
    echo "Deleting secret: $secret"
    az keyvault secret delete --vault-name $KEY_VAULT_NAME --name "$secret" &>/dev/null || true
  done

  echo "Secrets deleted."
else
  echo "Key Vault secrets preserved."
fi

# Step 7: Verification
echo ""
echo "Step 7: Verifying destruction..."

# Check if namespace is gone
if kubectl get namespace "tenant-$CUSTOMER_ID" &>/dev/null; then
  echo -e "${RED}[ERROR]${NC} Namespace still exists!"
else
  echo -e "${GREEN}[OK]${NC} Namespace deleted"
fi

# Check if database is gone (if deletion was requested)
if [ "$DELETE_DB" = "yes" ]; then
  DB_EXISTS=$(az postgres flexible-server db show \
    --resource-group $AZ_RESOURCE_GROUP \
    --server-name $AZ_POSTGRES_SERVER \
    --name $DB_NAME \
    --query name -o tsv 2>/dev/null || echo "")

  if [ -n "$DB_EXISTS" ]; then
    echo -e "${RED}[ERROR]${NC} Database still exists: $DB_NAME"
  else
    echo -e "${GREEN}[OK]${NC} Database deleted"
  fi
fi

# Summary
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Tenant Destruction Complete${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Destroyed resources for tenant: $CUSTOMER_ID"
echo ""
echo "Preserved resources (if not deleted):"
if [ "$DELETE_DB" != "yes" ]; then
  echo "  - Database: $DB_NAME"
fi
if [ "$DELETE_SECRETS" != "yes" ]; then
  echo "  - Key Vault secrets (prefixed with $CUSTOMER_ID)"
fi
echo ""
echo "Note: Event Hubs consumer groups were not deleted."
echo "      These can be cleaned up manually if needed."
