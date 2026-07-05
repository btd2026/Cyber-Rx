# BitSight Connector Implementation - T-008

## Overview

This document describes the implementation of the BitSight Connector for Nerion's Third-Party Cyber Intelligence system. The connector integrates with BitSight's API to collect security ratings and vulnerability intelligence for vendor risk assessment.

## Implementation Details

### File Modified
- **Path:** `/cyberrx-api/src/connectors/BitSightConnector.js`
- **Lines:** 505 lines (production-ready, fully commented)

### Features Implemented

#### 1. Real API Integration
- **Base URL:** `https://api.bitsighttech.com/ratings/v1`
- **Authentication:** Bearer token (API key from vault)
- **Endpoint:** `GET /companies/{domain}`
- **Timeout:** 10 seconds (configurable)
- **Rate Limiting:** Automatic retry with exponential backoff

#### 2. Credential Management
- Credentials retrieved from vault using `vault.get(organizationId, 'bitsight')`
- Falls back to manual entry mode when credentials unavailable
- Environment variable: `BITSIGHT_APIKEY` (for local development)

#### 3. Score/Grade Normalization

BitSight uses dual scoring system:

**Grade Mapping (A+-F):**
- `A+` or `A` (800-900) → `Info` severity
- `B+` or `B` (700-799) → `Low` severity
- `C+` or `C` (600-699) → `Medium` severity
- `D` (500-599) → `High` severity
- `F` (250-499) → `Critical` severity

**Score Fallback (250-900):**
- `>= 800` → `Info`
- `>= 700` → `Low`
- `>= 600` → `Medium`
- `>= 500` → `High`
- `>= 250` → `Critical`

#### 4. Signal Mapping

The connector maps BitSight API responses to 5 signal types:

1. **BitSight Security Grade** (External Attack Surface)
   - Overall rating with confidence 100
   - Maps to NIST-A.5.19, HIPAA-SA-9
   - Evidence URL to BitSight platform

2. **Compromise History** (Breach/Incident Intelligence)
   - Historical compromise events
   - Severity based on recency and count
   - Last 10 events in rawData

3. **Vulnerability Findings** (Vulnerability Management)
   - Total vulnerability count
   - Severity based on critical/high counts
   - Severity breakdown included

4. **Patching Cadence** (Vulnerability Management)
   - Average days to patch
   - Severity: >90 days = Critical, >60 = High, >30 = Medium

5. **Network Security Posture** (External Attack Surface)
   - Network security score/grade
   - Maps to NIST-A.5.19, CIS v8

#### 5. Error Handling

Comprehensive error handling for:
- `400` - Bad request (invalid domain/parameters)
- `401` - Invalid API key
- `403` - Forbidden (insufficient permissions)
- `404` - Company not found in BitSight database
- `429` - Rate limit exceeded (automatic retry)
- `500+` - Server errors (retry with fallback)

#### 6. Rate Limit Handling

- Automatic retry on 429 responses
- Respects `Retry-After` header
- Configurable delay (default 1000ms)
- Maximum 3 retry attempts

#### 7. Fallback Mode

When API unavailable or credentials missing:
- Returns fallback signal with reduced confidence (50)
- Sets `fallback: true` in rawData
- Recommends manual verification
- Prevents system failure

## Unit Tests

### Test File
- **Path:** `/cyberrx-api/tests/unit/connectors/BitSightConnector.test.js`
- **Test Count:** 50+ test cases
- **Coverage:** All methods and edge cases

### Test Categories

1. **Constructor Tests**
   - Configuration initialization
   - Custom timeout/rate limit settings

2. **collectSignals Tests**
   - Successful API calls
   - Grade/score normalization
   - Compromise history handling
   - Missing credentials
   - API error responses (401, 404, 429, 500)
   - Network timeouts
   - Invalid response validation

3. **Severity Calculation Tests**
   - Grade to severity mapping (A+-F)
   - Score to severity mapping (250-900)
   - Vulnerability severity calculation
   - Patching speed severity
   - Compromise severity (with recency weighting)

4. **Signal Mapping Tests**
   - Complete BitSight response (all 5 signals)
   - Minimal response (grade only)
   - Optional field handling

5. **Error Handling Tests**
   - HTTP error code mapping
   - Error response parsing
   - User-friendly error messages

6. **Connection Tests**
   - Valid credentials (success)
   - Invalid API key (401)
   - Forbidden access (403)
   - Missing credentials
   - Network errors

7. **Retry Logic Tests**
   - Rate limit retry (429)
   - Timeout retry
   - Maximum retry attempts

## Environment Variables

### Required for Production

```bash
# BitSight API Credentials
# Source: BitSight platform (https://bitsighttech.com/)
# Format: Bearer token API key
BITSIGHT_APIKEY=your_bitsight_api_key_here
```

### Required for AWS Secrets Manager (Production)

```bash
# AWS Secrets Manager Configuration
AWS_REGION=us-east-1
VAULT_MODE=aws
```

Secret path: `cyberrx/{organizationId}/bitsight`

Secret JSON:
```json
{
  "apiKey": "your_bitsight_api_key_here"
}
```

### Required for Local Development

```bash
# Local Vault Mode (Environment Variables)
VAULT_MODE=local
BITSIGHT_APIKEY=your_bitsight_api_key_here
```

## API Integration Details

### BitSight API Documentation
- **Base URL:** https://api.bitsighttech.com/ratings/v1
- **Documentation:** https://www.bitsighttech.com/resources/api_documentation/
- **Authentication:** Bearer token in Authorization header
- **Content-Type:** application/json

### Example API Response

```json
{
  "company_name": "Example Corp",
  "grade": "B",
  "score": 720,
  "vector_score": 715,
  "rating_date": "2026-05-31",
  "industry": "Healthcare",
  "industry_average": 680,
  "compromises": [
    {
      "date": "2025-01-15",
      "type": "Botnet",
      "severity": "High"
    }
  ],
  "vulnerabilities": {
    "count": 25,
    "critical": 1,
    "high": 10,
    "medium": 10,
    "low": 4,
    "severity_breakdown": {
      "critical": 1,
      "high": 10,
      "medium": 10,
      "low": 4
    }
  },
  "patching_speed": 35,
  "patching_percentile": 70,
  "network_security": {
    "score": 750,
    "grade": "B+"
  }
}
```

## Usage Examples

### Initialize Connector

```javascript
const BitSightConnector = require('./connectors/BitSightConnector');

const connector = new BitSightConnector({
  organizationId: 'org-123',
  vendorId: 'vendor-456',
  timeout: 10000,
  rateLimitDelay: 1000
});
```

### Collect Signals

```javascript
const signals = await connector.collectSignals('vendor.com', 'vendor-456', 'org-123');

// Returns array of signals:
// [
//   {
//     vendorName: 'Vendor Corp',
//     signalCategory: 'External Attack Surface',
//     signalName: 'BitSight Security Grade',
//     severity: 'Low',
//     confidence: 100,
//     observedAt: '2026-05-31T12:00:00.000Z',
//     evidenceUrl: 'https://bitsighttech.com/companies/vendor.com',
//     description: 'BitSight security rating: B (720)',
//     recommendedAction: 'Monitor for security improvements...',
//     mappedFrameworks: ['NIST-A.5.19', 'HIPAA-SA-9'],
//     mappedPolicies: ['Third-Party Risk Policy'],
//     rawData: { score: 720, grade: 'B', ... }
//   },
//   ... (additional signals)
// ]
```

### Test Connection

```javascript
const result = await connector.testConnection();

// Success response:
// {
//   status: 'success',
//   message: 'BitSight API connection successful',
//   connectorType: 'bitsight'
// }

// Error response:
// {
//   status: 'error',
//   message: 'Invalid BitSight API key',
//   connectorType: 'bitsight'
// }
```

### Sync with Database

```javascript
const result = await connector.sync();

// {
//   connectorType: 'bitsight',
//   status: 'success',
//   signalsCollected: 3,
//   signals: [...] // Stored signal objects
// }
```

## Testing

### Run Unit Tests

```bash
# Run all BitSight connector tests
npm test -- BitSightConnector.test.js

# Run with coverage
npm test:coverage -- BitSightConnector.test.js

# Run in watch mode during development
npm test:watch -- BitSightConnector.test.js
```

### Manual API Testing

```bash
# Test BitSight API connection (requires valid API key)
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.bitsighttech.com/ratings/v1/companies/example.com

# Expected response: 404 (company not found) but validates API key
# If you get 401, your API key is invalid
```

## Troubleshooting

### Common Issues

1. **Invalid API Key (401)**
   - Symptom: All API calls return 401 Unauthorized
   - Solution: Verify API key in BitSight platform
   - Check: `BITSIGHT_APIKEY` environment variable or AWS Secrets Manager

2. **Company Not Found (404)**
   - Symptom: API returns 404 for vendor domain
   - Solution: Vendor may not be tracked by BitSight
   - Fallback: Returns fallback signal with manual review recommendation

3. **Rate Limit Exceeded (429)**
   - Symptom: API calls return 429
   - Solution: Connector auto-retries with exponential backoff
   - Prevention: Increase `rateLimitDelay` in config

4. **Timeout Errors**
   - Symptom: Requests timeout after 10 seconds
   - Solution: Increase `timeout` in connector config
   - Check: Network connectivity to BitSight API

5. **Missing Credentials**
   - Symptom: Returns fallback signals with 50 confidence
   - Solution: Configure credentials in vault or environment
   - Check: Vault mode (local vs AWS)

### Debug Mode

Enable debug logging:

```javascript
const connector = new BitSightConnector({
  organizationId: 'org-123',
  vendorId: 'vendor-456',
  debug: true // Enable detailed logging
});
```

## Integration Points

### BaseConnector Methods
- `normalizeSignal()` - Inherited for signal normalization
- `storeSignals()` - Inherited for database persistence
- `sync()` - Inherited for complete sync workflow
- `promptManualEntry()` - Inherited for manual data entry

### Vault Integration
- `vault.get(organizationId, 'bitsight')` - Retrieve credentials
- Supports both local (env vars) and AWS Secrets Manager
- Automatic fallback when credentials unavailable

### Database Integration
- Signals stored in `vendor_risk_signals` table
- Uses `VendorRiskSignal.create()` model
- Includes all metadata in `rawData` JSONB column

## Security Considerations

1. **API Key Storage**
   - Never store API keys in code
   - Use AWS Secrets Manager for production
   - Use environment variables for local development

2. **Request Security**
   - All requests use HTTPS
   - API keys in Authorization header (not URL)
   - Timeout protection prevents hanging

3. **Rate Limiting**
   - Respects BitSight rate limits
   - Automatic retry with backoff
   - Configurable delay between requests

4. **Error Handling**
   - Graceful fallback on errors
   - User-friendly error messages
   - No sensitive data in error logs

## Performance Considerations

1. **Timeout Configuration**
   - Default: 10 seconds
   - Adjust based on network conditions
   - Prevents resource exhaustion

2. **Rate Limit Handling**
   - Automatic retry on 429
   - Exponential backoff
   - Configurable delay (default 1000ms)

3. **Signal Caching**
   - Consider caching signals for 24 hours
   - Reduces API call volume
   - Improves response times

4. **Batch Processing**
   - Process vendors sequentially
   - Avoid parallel API calls
   - Prevents rate limit issues

## Future Enhancements

1. **Additional BitSight Endpoints**
   - Portfolio monitoring
   - Industry benchmarking
   - Historical trends

2. **Advanced Signal Types**
   - Detailed vulnerability breakdown
   - Compromised credential checks
   - SPF/DKIM/DMARC validation

3. **Integration Features**
   - Webhook support for real-time updates
   - Custom alert thresholds
   - Automated remediation workflows

4. **Analytics**
   - Trend analysis over time
   - Peer comparison
   - Risk scoring improvements

## Dependencies

### Runtime Dependencies
- `node-fetch` (native fetch in Node 20+)
- BaseConnector (extends base class)
- vault (credential management)

### Development Dependencies
- `jest` (unit testing framework)
- `supertest` (HTTP testing)
- `nock` (HTTP mocking - optional)

## Compliance Mapping

### NIST CSF
- `NIST-A.5.19` - External threat monitoring
- `NIST-A.10.1` - Incident response

### HIPAA Security Rule
- `HIPAA-SA-9` - Vendor risk assessment

### CIS Controls v8
- CIS v8 - Network security monitoring

## Maintenance

### Regular Tasks
- Monitor BitSight API changelog
- Update API endpoints if deprecated
- Review and update severity mappings
- Check rate limit compliance

### On-Call Procedures
- Check API status page if errors spike
- Verify credentials if 401 errors increase
- Review rate limit usage if 429 errors occur
- Test fallback mode during outages

## References

- [BitSight API Documentation](https://www.bitsighttech.com/resources/api_documentation/)
- [Nerion BaseConnector](/cyberrx-api/src/connectors/BaseConnector.js)
- [VendorRiskSignal Model](/cyberrx-api/src/models/VendorRiskSignal.js)
- [Vault Implementation](/cyberrx-api/src/utils/vault.js)

## Changelog

### Version 1.0.0 (2026-05-31)
- Initial implementation
- Real API integration
- Grade/score normalization
- Error handling and retry logic
- Comprehensive unit tests
- Production-ready code

## Contact

For questions or issues:
- GitHub Issue Tracker
- Development Team
- Backend Engineering Lead
