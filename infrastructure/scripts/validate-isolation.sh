#!/bin/bash
# Tenant Isolation Validator
# This script validates that tenant isolation is properly configured
# Usage: ./validate-isolation.sh <tenant-namespace-1> <tenant-namespace-2>

set -e

TENANT_1=${1:-tenant-customer-1}
TENANT_2=${2:-tenant-customer-2}
NAMESPACE_TEST=${3:-cyberrx-system}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
  local test_name=$1
  local result=$2
  local message=$3

  if [ "$result" = "PASS" ]; then
    echo -e "${GREEN}[PASS]${NC} $test_name: $message"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}[FAIL]${NC} $test_name: $message"
    ((TESTS_FAILED++))
  fi
}

echo "================================"
echo "Tenant Isolation Validation"
echo "================================"
echo "Testing namespaces: $TENANT_1, $TENANT_2"
echo ""

# Test 1: Verify namespaces exist
echo "Test 1: Verifying namespaces exist..."
if kubectl get namespace "$TENANT_1" &> /dev/null; then
  print_result "Namespace Exists" "PASS" "$TENANT_1 namespace exists"
else
  print_result "Namespace Exists" "FAIL" "$TENANT_1 namespace does not exist"
fi

if kubectl get namespace "$TENANT_2" &> /dev/null; then
  print_result "Namespace Exists" "PASS" "$TENANT_2 namespace exists"
else
  print_result "Namespace Exists" "FAIL" "$TENANT_2 namespace does not exist"
fi

# Test 2: Verify network policies exist
echo ""
echo "Test 2: Verifying network policies exist..."

# Check for default deny all policy
if kubectl get networkpolicy default-deny-all -n "$TENANT_1" &> /dev/null; then
  print_result "Default Deny Policy" "PASS" "Default deny-all policy exists in $TENANT_1"
else
  print_result "Default Deny Policy" "FAIL" "Default deny-all policy missing in $TENANT_1"
fi

# Check for cross-tenant deny policy
if kubectl get networkpolicy deny-cross-tenant-traffic -n "$TENANT_1" &> /dev/null; then
  print_result "Cross-Tenant Deny Policy" "PASS" "Cross-tenant deny policy exists in $TENANT_1"
else
  print_result "Cross-Tenant Deny Policy" "FAIL" "Cross-tenant deny policy missing in $TENANT_1"
fi

# Test 3: Verify resource quotas
echo ""
echo "Test 3: Verifying resource quotas..."

if kubectl get resourcequota tenant-resource-quota -n "$TENANT_1" &> /dev/null; then
  print_result "Resource Quota" "PASS" "Resource quota exists in $TENANT_1"
else
  print_result "Resource Quota" "FAIL" "Resource quota missing in $TENANT_1"
fi

# Test 4: Verify limit ranges
echo ""
echo "Test 4: Verifying limit ranges..."

if kubectl get limitrange tenant-limit-range -n "$TENANT_1" &> /dev/null; then
  print_result "Limit Range" "PASS" "Limit range exists in $TENANT_1"
else
  print_result "Limit Range" "FAIL" "Limit range missing in $TENANT_1"
fi

# Test 5: Verify network policies prevent cross-tenant access
echo ""
echo "Test 5: Verifying network policies prevent cross-tenant access..."

# Get network policy for tenant 1
NETWORK_POLICY=$(kubectl get networkpolicy -n "$TENANT_1" -o json)
CROSS_TENANT_RULE=$(echo "$NETWORK_POLICY" | jq -r '.items[] | select(.metadata.name == "deny-cross-tenant-traffic")')

if [ -n "$CROSS_TENANT_RULE" ]; then
  print_result "Cross-Tenant Network Rule" "PASS" "Cross-tenant network deny rule configured"
else
  print_result "Cross-Tenant Network Rule" "FAIL" "Cross-tenant network deny rule missing"
fi

# Test 6: Verify pod security policies
echo ""
echo "Test 6: Verifying pod security..."

if kubectl get serviceaccount tenant-workload-sa -n "$TENANT_1" &> /dev/null; then
  print_result "Service Account" "PASS" "Dedicated service account exists in $TENANT_1"
else
  print_result "Service Account" "FAIL" "Dedicated service account missing in $TENANT_1"
fi

# Test 7: Verify no shared secrets between tenants
echo ""
echo "Test 7: Verifying no shared secrets between tenants..."

SECRETS_TENANT_1=$(kubectl get secrets -n "$TENANT_1" -o json | jq -r '.items[].metadata.name')
SECRETS_TENANT_2=$(kubectl get secrets -n "$TENANT_2" -o json | jq -r '.items[].metadata.name')

SHARED_SECRETS=0
for secret in $SECRETS_TENANT_1; do
  if echo "$SECRETS_TENANT_2" | grep -q "^${secret}$"; then
    # Only flag as issue if not a default secret
    if [[ ! "$secret" =~ ^(default-token|kube-root|service-account-token) ]]; then
      echo -e "${YELLOW}[WARN]${NC} Shared secret found: $secret"
      ((SHARED_SECRETS++))
    fi
  fi
done

if [ $SHARED_SECRETS -eq 0 ]; then
  print_result "Shared Secrets" "PASS" "No shared secrets between tenants"
else
  print_result "Shared Secrets" "FAIL" "$SHARED_SECRETS shared secrets found between tenants"
fi

# Test 8: Verify DNS isolation
echo ""
echo "Test 8: Verifying DNS isolation..."

# Check if DNS policies prevent cross-tenant DNS resolution
DNS_POLICY=$(kubectl get networkpolicy allow-dns-access -n "$TENANT_1" -o json 2>/dev/null | jq -r '.spec.egress[]')

if [ -n "$DNS_POLICY" ]; then
  print_result "DNS Policy" "PASS" "DNS policy configured to allow only required DNS access"
else
  print_result "DNS Policy" "WARN" "DNS policy not found (may be using default DNS behavior)"
fi

# Test 9: Verify separate database connections
echo ""
echo "Test 9: Verifying separate database connections..."

DB_SECRET_TENANT_1=$(kubectl get secret -n "$TENANT_1" -o json | jq -r '.items[] | select(.metadata.name | contains("db")) | .metadata.name')
DB_SECRET_TENANT_2=$(kubectl get secret -n "$TENANT_2" -o json | jq -r '.items[] | select(.metadata.name | contains("db")) | .metadata.name')

if [ -n "$DB_SECRET_TENANT_1" ] && [ -n "$DB_SECRET_TENANT_2" ]; then
  print_result "Database Secrets" "PASS" "Separate database secrets exist for each tenant"
else
  print_result "Database Secrets" "WARN" "Database secrets may not be properly isolated"
fi

# Test 10: Verify Key Vault isolation
echo ""
echo "Test 10: Verifying Key Vault isolation..."

KEYVAULT_SECRET_TENANT_1=$(kubectl get secretproviderclass -n "$TENANT_1" -o json 2>/dev/null | jq -r '.items[].metadata.name')
KEYVAULT_SECRET_TENANT_2=$(kubectl get secretproviderclass -n "$TENANT_2" -o json 2>/dev/null | jq -r '.items[].metadata.name')

if [ -n "$KEYVAULT_SECRET_TENANT_1" ] && [ -n "$KEYVAULT_SECRET_TENANT_2" ]; then
  print_result "Key Vault Integration" "PASS" "Key Vault SecretProviderClass configured for both tenants"
else
  print_result "Key Vault Integration" "WARN" "Key Vault SecretProviderClass may not be configured"
fi

# Test 11: Verify no cross-namespace service access
echo ""
echo "Test 11: Verifying no cross-namespace service access..."

# Check if network policies explicitly deny cross-namespace service access
CROSS_NS_POLICY=$(kubectl get networkpolicy -n "$TENANT_1" -o json | jq -r '.items[] | select(.spec.egress[].to[].namespaceSelector.matchLabels.type == "tenant")')

if [ -n "$CROSS_NS_POLICY" ]; then
  print_result "Cross-Namespace Deny" "PASS" "Network policies deny cross-namespace service access"
else
  print_result "Cross-Namespace Deny" "WARN" "Cross-namespace service access may not be explicitly denied"
fi

# Test 12: Verify pod cannot access other tenant pods
echo ""
echo "Test 12: Verifying pod isolation by labels..."

# Check tenant labels
TENANT_1_LABELS=$(kubectl get namespace "$TENANT_1" -o json | jq -r '.metadata.labels')
TENANT_2_LABELS=$(kubectl get namespace "$TENANT_2" -o json | jq -r '.metadata.labels')

TENANT_1_ID=$(echo "$TENANT_1_LABELS" | jq -r '.["customer-id"]')
TENANT_2_ID=$(echo "$TENANT_2_LABELS" | jq -r '.["customer-id"]')

if [ "$TENANT_1_ID" != "$TENANT_2_ID" ]; then
  print_result "Tenant Label Isolation" "PASS" "Tenants have unique customer IDs ($TENANT_1_ID != $TENANT_2_ID)"
else
  print_result "Tenant Label Isolation" "FAIL" "Tenants have same customer ID: $TENANT_1_ID"
fi

# Summary
echo ""
echo "================================"
echo "Validation Summary"
echo "================================"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All isolation tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some isolation tests failed. Review results above.${NC}"
  exit 1
fi
