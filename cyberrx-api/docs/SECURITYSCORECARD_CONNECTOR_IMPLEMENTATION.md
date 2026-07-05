# SecurityScorecard Connector Implementation Guide

## Overview

This document describes the implementation of the SecurityScorecard connector with real API integration for Nerion's Third-Party Cyber Intelligence system.

## Implementation Details

### File Modified
- `cyberrx-api/src/connectors/SecurityScorecardConnector.js`

### Key Features

#### 1. Real API Integration
- Direct integration with SecurityScorecard API (https://api.securityscorecard.com)
- Fetches company security scores and factor grades
- Maps API responses to Nerion signal schema

#### 2. Signal Collection
The connector collects the following signals:

**Overall Security Score**
- Source: SecurityScorecard API `/companies/{domain}`
- Score Range: 0-100 (higher = better)
- Severity Mapping:
  - 90+ → Info (Low risk)
  - 70-89 → Low (Medium-low risk)
  - 50-69 → Medium (Medium risk)
  - 30-49 → High (High risk)
  - <30 → Critical (Critical risk)

**Factor Signals**
- **Network Security**: Network infrastructure security posture
- **Patching Cadence**: Vulnerability patching speed and effectiveness
- **Endpoint Protection**: Malware and endpoint threat protection
- **Hacker Chatter**: Discussions about vendor in hacker communities
- **Leaked Credentials**: Credentials found in dark web breaches

**SSL Certificate Issues**
- Expiring certificates
- Invalid certificates
- Certificate misconfigurations

#### 3. Error Handling
- **Timeout Protection**: 10-second timeout for all API requests
- **Rate Limiting**: Exponential backoff (1s, 2s, 4s) for 429 responses
- **Invalid API Keys**: Clear error messages for 401 responses
- **Company Not Found**: Graceful handling for 404 responses
- **Fallback Signals**: Returns fallback signals when API is unavailable
- **Retry Logic**: Up to 3 retries with exponential backoff

#### 4. Security
- **Credential Storage**: Uses vault for secure API key storage
- **No Key Logging**: Never logs actual API keys (masked versions only)
- **Environment Variables**: Supports both local (.env) and AWS Secrets Manager
- **Request Validation**: Validates all API responses before processing

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# SecurityScorecard API Configuration
# Get your API key from: https://securityscorecard.com/api-management
SECURITYSCORECARD_APIKEY=your-api-key-here
```

### AWS Secrets Manager (Production)

For production deployments using AWS:

```bash
# Secret Path: cyberrx/{organizationId}/securityscorecard
{
  "apiKey": "your-production-api-key"
}
```

## API Integration Details

### Endpoint Used
```
GET https://api.securityscorecard.com/companies/{domain}
```

### Request Headers
```javascript
{
  'Authorization': 'Bearer {API_KEY}',
  'Content-Type': 'application/json'
}
```

### Response Format
```json
{
  "score": 72,
  "grade": "B",
  "industry": "Technology",
  "size": "Mid-Market",
  "score_history": [
    {"date": "2024-01-01", "score": 70},
    {"date": "2024-02-01", "score": 72}
  ],
  "factors": {
    "network_security": {
      "score": 85,
      "grade": "A",
      "variability": "improving"
    },
    "patching_cadence": {
      "score": 65,
      "grade": "C",
      "variability": "stable"
    }
  },
  "issues": {
    "ssl_certificates": []
  }
}
```

## Usage Examples

### Basic Signal Collection

```javascript
const SecurityScorecardConnector = require('./connectors/SecurityScorecardConnector');

// Initialize connector
const connector = new SecurityScorecardConnector({
  organizationId: 'org-123',
  vendorId: 'vendor-456'
});

// Collect signals for a vendor
const signals = await connector.collectSignals(
  'vendor-456',
  'org-123',
  {
    name: 'Example Corp',
    domain: 'example.com',
    website: 'https://example.com'
  }
);

// Process signals
console.log(`Collected ${signals.length} signals`);
signals.forEach(signal => {
  console.log(`- ${signal.signalName}: ${signal.severity}`);
});
```

### Testing Connection

```javascript
// Test if credentials are valid
const result = await connector.testConnection('org-123');

if (result.status === 'success') {
  console.log('SecurityScorecard connection successful');
  console.log(`Test score: ${result.details.score}`);
} else {
  console.error('Connection failed:', result.message);
}
```

### Sync with Database

```javascript
// Collect and store signals in database
const result = await connector.sync();

console.log(`Sync completed: ${result.signalsCollected} signals stored`);
```

## Signal Schema

Each signal returned by the connector follows this schema:

```javascript
{
  vendorName: 'String',
  signalCategory: 'String',  // Enum: External Attack Surface, Vulnerability Management, etc.
  signalName: 'String',
  severity: 'String',       // Enum: Critical, High, Medium, Low, Info
  confidence: Number,        // 0-100
  observedAt: 'ISO8601 Date',
  evidenceUrl: 'String (URL)',
  description: 'String',
  recommendedAction: 'String',
  mappedFrameworks: ['String'],
  mappedPolicies: ['String'],
  rawData: {
    // API-specific data
  }
}
```

## Rate Limiting

### API Limits
- **Free Tier**: 1000 requests/day
- **Rate Limit Response**: HTTP 429 with `Retry-After` header

### Implementation
- Respects `Retry-After` header when provided
- Falls back to exponential backoff if no header
- Maximum 3 retries before failing
- Implements graceful fallback to mock data

## Testing

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run specific connector tests
npm test tests/unit/connectors/SecurityScorecardConnector.test.js
```

### Test Coverage
The implementation includes comprehensive unit tests covering:
- Successful API integration
- Signal mapping for all factors
- Score normalization logic
- Error handling (401, 404, 429, 500)
- Timeout protection
- Rate limiting with backoff
- Fallback signal generation
- Domain extraction logic
- Connection testing

### Manual Testing

```bash
# Set environment variables
export SECURITYSCORECARD_APIKEY=your-test-key

# Run the connector
node -e "
const connector = require('./src/connectors/SecurityScorecardConnector');
const instance = new connector({ organizationId: 'test-org' });
instance.collectSignals('vendor-1', 'test-org', {
  name: 'google.com',
  domain: 'google.com'
}).then(console.log).catch(console.error);
"
```

## Troubleshooting

### Common Issues

#### 1. "Invalid API key" (401)
**Cause**: API key is missing or invalid
**Solution**:
- Verify `SECURITYSCORECARD_APIKEY` is set correctly
- Check API key in SecurityScorecard dashboard
- Ensure key has not expired

#### 2. "Company not found" (404)
**Cause**: Domain not found in SecurityScorecard database
**Solution**:
- Verify the domain is correct
- Check if company exists in SecurityScorecard
- Try alternative domain (e.g., `company.com` instead of `www.company.com`)

#### 3. "Rate limit exceeded" (429)
**Cause**: Exceeded daily API quota
**Solution**:
- Wait until quota resets (daily)
- Consider upgrading SecurityScorecard tier
- Implement caching to reduce API calls

#### 4. Timeout errors
**Cause**: API response took longer than 10 seconds
**Solution**:
- Check network connectivity
- Verify SecurityScorecard service status
- Consider increasing timeout if needed

#### 5. Fallback signals returned
**Cause**: API unavailable or credentials not configured
**Solution**:
- Check if credentials are configured
- Verify API key has required permissions
- Check vault service availability

## Performance Considerations

### Response Times
- Typical API response: 500ms - 2s
- Timeout threshold: 10s
- Retry attempts: 3 (with exponential backoff)

### Best Practices
1. **Cache Results**: Store signals in database to avoid repeated API calls
2. **Batch Requests**: Process multiple vendors sequentially to avoid rate limits
3. **Error Handling**: Always handle API failures gracefully
4. **Monitoring**: Track API usage and rate limit violations
5. **Fallback**: Ensure fallback signals are useful for risk assessment

## Production Deployment

### Prerequisites
1. Valid SecurityScorecard API key
2. Database table `vendor_risk_signals` created
3. Vault service configured (local or AWS)

### Environment Setup
```bash
# Production .env configuration
VAULT_MODE=aws
AWS_REGION=us-east-1
SECURITYSCORECARD_APIKEY=production-key-here
```

### AWS Secrets Manager
Create secret:
```bash
aws secretsmanager create-secret \
  --name cyberrx/ORG-ID/securityscorecard \
  --secret-string '{"apiKey":"your-production-key"}'
```

### Monitoring
Monitor these metrics:
- API success rate
- Response times
- Rate limit violations
- Signal collection frequency
- Error types and frequency

## Maintenance

### Regular Tasks
1. **Rotate API Keys**: Every 90 days
2. **Review Usage**: Check SecurityScorecard dashboard for usage trends
3. **Update Documentation**: Keep API docs current with any SecurityScorecard changes
4. **Monitor Costs**: Track API usage against budget

### Updates
When SecurityScorecard releases API updates:
1. Review API documentation
2. Update response mapping if schema changes
3. Add new factors/signals if available
4. Update unit tests
5. Test in development environment
6. Deploy to production

## Related Files

- **Connector**: `src/connectors/SecurityScorecardConnector.js`
- **Base Connector**: `src/connectors/BaseConnector.js`
- **Vault**: `src/utils/vault.js`
- **Signal Model**: `src/models/VendorRiskSignal.js`
- **Unit Tests**: `tests/unit/connectors/SecurityScorecardConnector.test.js`
- **Environment**: `.env.example`

## API Reference

### Official Documentation
- SecurityScorecard API: https://api.securityscorecard.com/docs/
- API Management: https://securityscorecard.com/api-management
- Rate Limits: https://securityscorecard.com/docs/rate-limits

### Support
- SecurityScorecard Support: support@securityscorecard.com
- Nerion Documentation: See project README

## Changelog

### Version 1.0.0 (2024)
- Initial implementation with real API integration
- Support for all major SecurityScorecard factors
- Comprehensive error handling and rate limiting
- Full unit test coverage
- Production-ready deployment guide
