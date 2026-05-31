#!/bin/bash

# Test script for Credential Validation API endpoint
# Usage: ./test-credential-validation.sh

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
JWT_TOKEN="${JWT_TOKEN:-your-test-jwt-token}"

echo "====================================="
echo "Credential Validation API Test Suite"
echo "====================================="
echo ""
echo "API Base URL: $API_BASE_URL"
echo "JWT Token: ${JWT_TOKEN:0:20}..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
  TESTS_RUN=$((TESTS_RUN + 1))
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Function to make API call and check result
test_validation() {
  local test_name="$1"
  local connector_type="$2"
  local api_key="$3"
  local expected_valid="$4"
  local domain="${5:-example.com}"

  echo -e "\n${YELLOW}Testing:${NC} $test_name"

  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    "$API_BASE_URL/api/credentials/$connector_type/validate" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"credentials\":{\"apiKey\":\"$api_key\",\"domain\":\"$domain\"}}" || true)

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  echo "Response Code: $http_code"
  echo "Response Body: $body"

  if [ "$expected_valid" = "true" ]; then
    # Should return 200 with valid: true
    if echo "$body" | grep -q '"valid":true' && [ "$http_code" = "200" ]; then
      print_result 0 "$test_name"
    else
      print_result 1 "$test_name (expected valid: true)"
    fi
  else
    # Should return 400 with valid: false
    if echo "$body" | grep -q '"valid":false' && [ "$http_code" = "400" ]; then
      print_result 0 "$test_name"
    else
      print_result 1 "$test_name (expected valid: false)"
    fi
  fi
}

# Test 1: Valid SecurityScorecard credentials (will fail without real key)
echo -e "\n${YELLOW}=== SecurityScorecard Tests ===${NC}"
test_validation \
  "SecurityScorecard with invalid key" \
  "securityscorecard" \
  "invalid_key_12345" \
  "false" \
  "securityscorecard.com"

# Test 2: Missing API key
echo -e "\n${YELLOW}=== Missing Credentials Tests ===${NC}"
response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "$API_BASE_URL/api/credentials/securityscorecard/validate" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credentials":{"domain":"example.com"}}' || true)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if echo "$body" | grep -q 'API key is required' && [ "$http_code" = "400" ]; then
  print_result 0 "Missing API key validation"
else
  print_result 1 "Missing API key validation"
fi

# Test 3: Unsupported connector type
echo -e "\n${YELLOW}=== Unsupported Connector Test ===${NC}"
response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "$API_BASE_URL/api/credentials/unsupported_tool/validate" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credentials":{"apiKey":"test_key"}}' || true)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if echo "$body" | grep -q 'ERR_UNSUPPORTED_CONNECTOR' && [ "$http_code" = "400" ]; then
  print_result 0 "Unsupported connector type"
else
  print_result 1 "Unsupported connector type"
fi

# Test 4: Missing credentials object
echo -e "\n${YELLOW}=== Invalid Request Tests ===${NC}"
response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "$API_BASE_URL/api/credentials/securityscorecard/validate" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' || true)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if echo "$body" | grep -q 'Credentials object is required' && [ "$http_code" = "400" ]; then
  print_result 0 "Missing credentials object"
else
  print_result 1 "Missing credentials object"
fi

# Test 5: No JWT token
echo -e "\n${YELLOW}=== Authentication Tests ===${NC}"
response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "$API_BASE_URL/api/credentials/securityscorecard/validate" \
  -H "Content-Type: application/json" \
  -d '{"credentials":{"apiKey":"test_key"}}' || true)

http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
  print_result 0 "Authentication required"
else
  print_result 1 "Authentication required (got $http_code)"
fi

# Test 6: Rate limiting (11th request should fail)
echo -e "\n${YELLOW}=== Rate Limiting Tests ===${NC}"
echo "Sending 11 validation requests to test rate limiting..."

for i in {1..11}; do
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    "$API_BASE_URL/api/credentials/securityscorecard/validate" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"credentials":{"apiKey":"test_key_'$i'"}}' || true)

  http_code=$(echo "$response" | tail -n1)

  if [ $i -eq 11 ]; then
    # 11th request should be rate limited
    if [ "$http_code" = "429" ]; then
      print_result 0 "Rate limiting on 11th request"
    else
      print_result 1 "Rate limiting on 11th request (got $http_code)"
    fi
  fi
done

# Summary
echo -e "\n====================================="
echo -e "Test Summary"
echo -e "====================================="
echo -e "Total Tests: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
