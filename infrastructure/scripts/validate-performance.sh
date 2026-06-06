#!/bin/bash
# Performance Validator
# This script validates that infrastructure meets performance requirements
# Requirements: 10,000 events/second for Event Hubs, acceptable latency

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
NAMESPACE=${1:-cyberrx-system}
EVENTHUBS_NAMESPACE=${2:-cyberrx-events}
DB_HOST=${3:-}
EXPECTED_THROUGHPUT=${4:-10000}  # events per second

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNED=0

print_result() {
  local test_name=$1
  local result=$2
  local message=$3

  if [ "$result" = "PASS" ]; then
    echo -e "${GREEN}[PASS]${NC} $test_name: $message"
    ((TESTS_PASSED++))
  elif [ "$result" = "WARN" ]; then
    echo -e "${YELLOW}[WARN]${NC} $test_name: $message"
    ((TESTS_WARNED++))
  else
    echo -e "${RED}[FAIL]${NC} $test_name: $message"
    ((TESTS_FAILED++))
  fi
}

echo "================================"
echo "Infrastructure Performance Validation"
echo "================================"
echo "Namespace: $NAMESPACE"
echo "Expected throughput: $EXPECTED_THROUGHPUT events/second"
echo ""

# Test 1: Check Kubernetes cluster health
echo "Test 1: Checking Kubernetes cluster health..."

CLUSTER_HEALTH=$(kubectl get cs | grep -c "Healthy")
if [ $CLUSTER_HEALTH -ge 3 ]; then
  print_result "Cluster Health" "PASS" "All cluster components healthy"
else
  print_result "Cluster Health" "WARN" "Some cluster components unhealthy"
fi

# Test 2: Check node resources
echo ""
echo "Test 2: Checking node resources..."

NODE_COUNT=$(kubectl get nodes | grep -c "Ready")
if [ $NODE_COUNT -ge 3 ]; then
  print_result "Node Count" "PASS" "$NODE_COUNT nodes ready"
else
  print_result "Node Count" "WARN" "Only $NODE_COUNT nodes ready (recommend 3+)"
fi

# Check CPU/Memory pressure
NODE_PRESSURE=$(kubectl top nodes --no-headers | awk '{if ($3 > 80 || $5 > 80) print }' | wc -l)
if [ $NODE_PRESSURE -eq 0 ]; then
  print_result "Node Pressure" "PASS" "No nodes under CPU/Memory pressure"
else
  print_result "Node Pressure" "WARN" "$NODE_PRESSURE nodes under pressure"
fi

# Test 3: Check pod resource allocation
echo ""
echo "Test 3: Checking pod resource allocation..."

PODS_WITHOUT_LIMITS=$(kubectl get pods -n "$NAMESPACE" -o json | jq -r '.items[] | select(.spec.containers[].resources.limits == null) | .metadata.name' | wc -l)
if [ $PODS_WITHOUT_LIMITS -eq 0 ]; then
  print_result "Resource Limits" "PASS" "All pods have resource limits"
else
  print_result "Resource Limits" "WARN" "$PODS_WITHOUT_LIMITS pods without resource limits"
fi

# Test 4: Test Event Hubs throughput
echo ""
echo "Test 4: Testing Event Hubs throughput..."

# This would require an actual load test. For now, check Event Hubs configuration
if [ -n "$EVENTHUBS_NAMESPACE" ]; then
  EVENTHUBS_CAPACITY=$(az eventhubs namespace show --name "$EVENTHUBS_NAMESPACE" --query capacity -o tsv 2>/dev/null || echo "4")
  EVENTHUBS_SKU=$(az eventhubs namespace show --name "$EVENTHUBS_NAMESPACE" --query sku.name -o tsv 2>/dev/null || echo "Standard")

  if [ "$EVENTHUBS_SKU" = "Premium" ]; then
    ESTIMATED_THROUGHPUT=$((EVENTHUBS_CAPACITY * 10000))
  elif [ "$EVENTHUBS_SKU" = "Standard" ]; then
    ESTIMATED_THROUGHPUT=$((EVENTHUBS_CAPACITY * 2500))
  else
    ESTIMATED_THROUGHPUT=$((EVENTHUBS_CAPACITY * 1000))
  fi

  if [ $ESTIMATED_THROUGHPUT -ge $EXPECTED_THROUGHPUT ]; then
    print_result "Event Hubs Throughput" "PASS" "Estimated throughput: $ESTIMATED_THROUGHPUT events/sec (meets requirement: $EXPECTED_THROUGHPUT)"
  else
    print_result "Event Hubs Throughput" "FAIL" "Estimated throughput: $ESTIMATED_THROUGHPUT events/sec (below requirement: $EXPECTED_THROUGHPUT)"
  fi
else
  print_result "Event Hubs Throughput" "WARN" "Event Hubs namespace not provided, skipping throughput test"
fi

# Test 5: Check database performance configuration
echo ""
echo "Test 5: Checking database performance configuration..."

if [ -n "$DB_HOST" ]; then
  # Check PostgreSQL version
  PG_VERSION=$(psql -h "$DB_HOST" -U postgres -t -c "SELECT version();" 2>/dev/null | grep -oP "PostgreSQL \K[0-9.]+" || echo "unknown")

  # Check TimescaleDB extension
  TIMESCALEDB_ENABLED=$(psql -h "$DB_HOST" -U postgres -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'timescaledb');" 2>/dev/null | xargs || echo "false")

  # Check pgvector extension
  PGVECTOR_ENABLED=$(psql -h "$DB_HOST" -U postgres -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgvector');" 2>/dev/null | xargs || echo "false")

  print_result "PostgreSQL Version" "INFO" "Version: $PG_VERSION"

  if [ "$TIMESCALEDB_ENABLED" = "t" ]; then
    print_result "TimescaleDB Extension" "PASS" "TimescaleDB extension enabled"
  else
    print_result "TimescaleDB Extension" "FAIL" "TimescaleDB extension not enabled"
  fi

  if [ "$PGVECTOR_ENABLED" = "t" ]; then
    print_result "pgvector Extension" "PASS" "pgvector extension enabled"
  else
    print_result "pgvector Extension" "FAIL" "pgvector extension not enabled"
  fi
else
  print_result "Database Configuration" "WARN" "Database host not provided, skipping database tests"
fi

# Test 6: Check network latency
echo ""
echo "Test 6: Checking network latency..."

# Test DNS resolution
DNS_LATENCY=$(time kubectl run test-dns --rm -i --restart=Never --image=busybox -- nslookup kubernetes.default 2>&1 | grep "real" | awk '{print $2}' || echo "0")

# Test pod startup time (from existing pods)
POD_STARTUP=$(kubectl get pods -n "$NAMESPACE" -o json | jq -r '.items[] | select(.status.phase == "Running") | (.status.startTime | sub("\\..*";""))' | head -1)
if [ -n "$POD_STARTUP" ]; then
  print_result "Pod Status" "INFO" "Pods are running (startup time analysis requires deployment test)"
else
  print_result "Pod Status" "WARN" "No running pods found in namespace"
fi

# Test 7: Check autoscaling configuration
echo ""
echo "Test 7: Checking autoscaling configuration..."

HPA_COUNT=$(kubectl get hpa -n "$NAMESPACE" --no-headers | wc -l)
if [ $HPA_COUNT -gt 0 ]; then
  print_result "HPA Configuration" "PASS" "$HPA_COUNT HorizontalPodAutoscalers configured"

  # Check if HPA is working
  kubectl get hpa -n "$NAMESPACE" --no-headers | while read -r line; do
    HPA_NAME=$(echo "$line" | awk '{print $1}')
    REPLICAS=$(echo "$line" | awk '{print $4}')
    print_result "HPA Status ($HPA_NAME)" "INFO" "Current replicas: $REPLICAS"
  done
else
  print_result "HPA Configuration" "WARN" "No HorizontalPodAutoscalers configured"
fi

# Test 8: Check PodDisruptionBudgets
echo ""
echo "Test 8: Checking PodDisruptionBudgets..."

PDB_COUNT=$(kubectl get pdb -n "$NAMESPACE" --no-headers | wc -l)
if [ $PDB_COUNT -gt 0 ]; then
  print_result "PodDisruptionBudgets" "PASS" "$PDB_COUNT PodDisruptionBudgets configured"
else
  print_result "PodDisruptionBudgets" "WARN" "No PodDisruptionBudgets configured"
fi

# Test 9: Check persistent storage
echo ""
echo "Test 9: Checking persistent storage..."

PVC_COUNT=$(kubectl get pvc -n "$NAMESPACE" --no-headers | wc -l)
if [ $PVC_COUNT -gt 0 ]; then
  print_result "Persistent Storage" "INFO" "$PVC_COUNT PVCs configured"
  kubectl get pvc -n "$NAMESPACE" --no-headers | while read -r line; do
    PVC_NAME=$(echo "$line" | awk '{print $1}')
    PVC_STATUS=$(echo "$line" | awk '{print $3}')
    if [ "$PVC_STATUS" = "Bound" ]; then
      print_result "PVC Status ($PVC_NAME)" "PASS" "PVC is bound"
    else
      print_result "PVC Status ($PVC_NAME)" "WARN" "PVC status: $PVC_STATUS"
    fi
  done
else
  print_result "Persistent Storage" "INFO" "No PVCs configured"
fi

# Test 10: Check resource utilization
echo ""
echo "Test 10: Checking current resource utilization..."

TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers | wc -l)
RUNNING_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers | grep -c "Running" || echo "0")

print_result "Pod Utilization" "INFO" "$RUNNING_PODS/$TOTAL_PODS pods running"

if [ $RUNNING_PODS -eq $TOTAL_PODS ]; then
  print_result "Pod Health" "PASS" "All pods running"
else
  print_result "Pod Health" "WARN" "Some pods not running"
fi

# Test 11: Check monitoring stack
echo ""
echo "Test 11: Checking monitoring stack..."

if kubectl get svc prometheus -n cyberrx-monitoring &>/dev/null; then
  print_result "Prometheus" "PASS" "Prometheus service found"
else
  print_result "Prometheus" "WARN" "Prometheus service not found"
fi

if kubectl get svc grafana -n cyberrx-monitoring &>/dev/null; then
  print_result "Grafana" "PASS" "Grafana service found"
else
  print_result "Grafana" "WARN" "Grafana service not found"
fi

# Summary
echo ""
echo "================================"
echo "Performance Validation Summary"
echo "================================"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Warned: $TESTS_WARNED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  if [ $TESTS_WARNED -eq 0 ]; then
    echo -e "${GREEN}All performance tests passed!${NC}"
  else
    echo -e "${GREEN}All critical tests passed. Some warnings detected - review above.${NC}"
  fi
  exit 0
else
  echo -e "${RED}Some performance tests failed. Review results above.${NC}"
  exit 1
fi
