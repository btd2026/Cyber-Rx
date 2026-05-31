#!/bin/bash

# =====================================================
# Vendor Alerts Migration Test Script
# =====================================================
# This script tests the vendor_alerts table migration
# including table creation, indexes, functions, and constraints

set -e

echo "====================================================="
echo "Vendor Alerts Migration Test"
echo "====================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cyberrx}"
DB_USER="${DB_USER:-postgres}"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run SQL and check result
run_test() {
  local test_name="$1"
  local sql="$2"
  local expected="$3"

  echo -n "Testing: $test_name ... "

  result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$sql" 2>/dev/null | xargs)

  if [ "$result" = "$expected" ]; then
    echo -e "${GREEN}PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}FAILED${NC}"
    echo "  Expected: $expected"
    echo "  Got: $result"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Function to check if table exists
check_table_exists() {
  local table_name="$1"
  echo -n "Checking table $table_name exists ... "

  result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = '$table_name'
    );
  " 2>/dev/null | xargs)

  if [ "$result" = "t" ]; then
    echo -e "${GREEN}PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Function to check if index exists
check_index_exists() {
  local index_name="$1"
  echo -n "Checking index $index_name exists ... "

  result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT EXISTS (
      SELECT FROM pg_indexes
      WHERE indexname = '$index_name'
    );
  " 2>/dev/null | xargs)

  if [ "$result" = "t" ]; then
    echo -e "${GREEN}PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Function to check if function exists
check_function_exists() {
  local function_name="$1"
  echo -n "Checking function $function_name exists ... "

  result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT EXISTS (
      SELECT FROM pg_proc
      WHERE proname = '$function_name'
    );
  " 2>/dev/null | xargs)

  if [ "$result" = "t" ]; then
    echo -e "${GREEN}PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Function to check if trigger exists
check_trigger_exists() {
  local trigger_name="$1"
  local table_name="$2"
  echo -n "Checking trigger $trigger_name exists on $table_name ... "

  result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT EXISTS (
      SELECT FROM pg_trigger
      WHERE tgname = '$trigger_name'
    );
  " 2>/dev/null | xargs)

  if [ "$result" = "t" ]; then
    echo -e "${GREEN}PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

echo "Step 1: Running migration"
echo "-------------------------------------------"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/2025_01_31_create_vendor_alerts.sql
echo ""

echo "Step 2: Verifying table structure"
echo "-------------------------------------------"
check_table_exists "vendor_alerts"

run_test "id column is SERIAL PRIMARY KEY" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vendor_alerts' AND column_name = 'id' AND is_nullable = 'NO'" \
  "1"

run_test "organization_id column exists" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vendor_alerts' AND column_name = 'organization_id'" \
  "1"

run_test "vendor_id column exists and is nullable" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vendor_alerts' AND column_name = 'vendor_id' AND is_nullable = 'YES'" \
  "1"

run_test "alert_type column has CHECK constraint" \
  "SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name LIKE '%vendor_alerts%' AND constraint_name LIKE '%alert_type%'" \
  "1"

run_test "severity column has CHECK constraint" \
  "SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name LIKE '%vendor_alerts%' AND constraint_name LIKE '%severity%'" \
  "1"

run_test "delivery_status column has CHECK constraint" \
  "SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name LIKE '%vendor_alerts%' AND constraint_name LIKE '%delivery_status%'" \
  "1"

run_test "data column is JSONB" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vendor_alerts' AND column_name = 'data' AND data_type = 'jsonb'" \
  "1"

echo ""
echo "Step 3: Verifying foreign keys"
echo "-------------------------------------------"
run_test "organization_id foreign key to orgs" \
  "SELECT COUNT(*) FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = 'vendor_alerts' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'organization_id'" \
  "1"

run_test "vendor_id foreign key to vendors" \
  "SELECT COUNT(*) FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = 'vendor_alerts' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'vendor_id'" \
  "1"

echo ""
echo "Step 4: Verifying indexes"
echo "-------------------------------------------"
check_index_exists "idx_vendor_alerts_org_created"
check_index_exists "idx_vendor_alerts_vendor_created"
check_index_exists "idx_vendor_alerts_severity_created"
check_index_exists "idx_vendor_alerts_type_created"
check_index_exists "idx_vendor_alerts_delivery_status"
check_index_exists "idx_vendor_alerts_org_severity"

echo ""
echo "Step 5: Verifying trigger"
echo "-------------------------------------------"
check_trigger_exists "vendor_alerts_update_timestamp" "vendor_alerts"

check_function_exists "update_vendor_alerts_timestamp"

echo ""
echo "Step 6: Verifying helper functions"
echo "-------------------------------------------"
check_function_exists "get_org_alerts"
check_function_exists "get_alert_stats"
check_function_exists "acknowledge_alert"

echo ""
echo "Step 7: Testing CRUD operations"
echo "-------------------------------------------"

# Test insert
echo -n "Testing: INSERT alert ... "
TEST_INSERT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  INSERT INTO vendor_alerts (organization_id, vendor_id, alert_type, severity, message, data)
  VALUES (1, 1, 'critical_signal', 'Critical', 'Test alert', '{\"test\": true}')
  RETURNING id;
" 2>/dev/null | xargs)

if [ -n "$TEST_INSERT" ]; then
  echo -e "${GREEN}PASSED${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}FAILED${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test select
echo -n "Testing: SELECT alert ... "
TEST_SELECT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT id FROM vendor_alerts WHERE id = $TEST_INSERT;
" 2>/dev/null | xargs)

if [ "$TEST_SELECT" = "$TEST_INSERT" ]; then
  echo -e "${GREEN}PASSED${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}FAILED${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test update
echo -n "Testing: UPDATE delivery_status ... "
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
  UPDATE vendor_alerts SET delivery_status = 'sent', sent_at = NOW() WHERE id = $TEST_INSERT;
" >/dev/null 2>&1

TEST_UPDATE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT delivery_status FROM vendor_alerts WHERE id = $TEST_INSERT;
" 2>/dev/null | xargs)

if [ "$TEST_UPDATE" = "sent" ]; then
  echo -e "${GREEN}PASSED${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}FAILED${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test acknowledge function
echo -n "Testing: acknowledge_alert function ... "
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT acknowledge_alert($TEST_INSERT, 1);
" >/dev/null 2>&1

TEST_ACK=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT acknowledged_at IS NOT NULL FROM vendor_alerts WHERE id = $TEST_INSERT;
" 2>/dev/null | xargs)

if [ "$TEST_ACK" = "t" ]; then
  echo -e "${GREEN}PASSED${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}FAILED${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test delete
echo -n "Testing: DELETE alert ... "
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
  DELETE FROM vendor_alerts WHERE id = $TEST_INSERT;
" >/dev/null 2>&1

TEST_DELETE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT COUNT(*) FROM vendor_alerts WHERE id = $TEST_INSERT;
" 2>/dev/null | xargs)

if [ "$TEST_DELETE" = "0" ]; then
  echo -e "${GREEN}PASSED${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}FAILED${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "Step 8: Testing helper functions"
echo "-------------------------------------------"

# Create test data
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
  INSERT INTO vendor_alerts (organization_id, vendor_id, alert_type, severity, message, data)
  VALUES
    (1, 1, 'critical_signal', 'Critical', 'Critical alert', '{}'),
    (1, 1, 'score_increase', 'High', 'Score increased', '{}'),
    (1, 1, 'grade_degradation', 'Medium', 'Grade degraded', '{}'),
    (1, 2, 'sync_failure', 'Low', 'Sync failed', '{}');
" >/dev/null 2>&1

# Test get_org_alerts
echo -n "Testing: get_org_alerts function ... "
TEST_ORG_ALERTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT COUNT(*) FROM get_org_alerts(1, 50, 0);
" 2>/dev/null | xargs)

if [ "$TEST_ORG_ALERTS" -ge 4 ]; then
  echo -e "${GREEN}PASSED${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}FAILED${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test get_alert_stats
echo -n "Testing: get_alert_stats function ... "
TEST_STATS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT total FROM get_alert_stats(1, 30);
" 2>/dev/null | xargs)

if [ "$TEST_STATS" -ge 4 ]; then
  echo -e "${GREEN}PASSED${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}FAILED${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "====================================================="
echo "Test Results Summary"
echo "====================================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
