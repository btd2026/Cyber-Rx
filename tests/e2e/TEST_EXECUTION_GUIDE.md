# E2E Test Execution Guide

Quick reference for running and debugging E2E tests.

## Quick Start

```bash
# 1. Install dependencies
cd tests/e2e
npm install

# 2. Install browsers
npx playwright install --with-deps

# 3. Run tests
npm test
```

## Test Scenarios

### Vendor Onboarding (12 tests)

**Tests:**
- Add new vendor and configure SecurityScorecard connector
- Handle connection failure gracefully
- Validate vendor form fields
- Edit existing vendor
- Delete vendor with confirmation
- Configure multiple connectors for same vendor
- Filter vendors by tier
- Search vendors by name
- Handle API errors gracefully
- Add vendor on mobile device

**Coverage:**
- CRUD operations
- Connector configuration
- Form validation
- Error handling
- Mobile responsive

### Alert Management (10 tests)

**Tests:**
- View unacknowledged alerts
- Filter alerts by severity
- Filter alerts by vendor
- Filter alerts by date range
- Search alerts by keyword
- Acknowledge single alert
- Acknowledge multiple alerts at once
- Navigate to vendor from alert
- View alert details
- Export alerts to CSV
- Sort alerts by severity
- Sort alerts by date
- Show real-time alert updates
- Handle empty alert state
- Show alert count badge in navigation
- View and acknowledge alerts on mobile
- Filter alerts using mobile dropdown

**Coverage:**
- Filtering and sorting
- Bulk operations
- Navigation
- Data export
- Real-time updates
- Mobile interactions

### Dashboard Exploration (14 tests)

**Tests:**
- Load vendor portfolio dashboard
- Filter vendors by tier (Critical, High, Medium, Low)
- Filter vendors by risk score range
- Sort vendors by risk score ascending/descending
- Sort vendors by name alphabetically
- Search vendors by name
- Search vendors by domain
- View vendor details from dashboard
- View vendor risk trend chart
- View vendor signal breakdown
- Export dashboard to CSV
- Export filtered vendors to CSV
- Paginate vendors
- Show vendor count statistics
- Show average risk score
- Handle dashboard loading errors gracefully
- Refresh dashboard data
- Display mobile-friendly dashboard
- Show vendor cards in single column on mobile
- Tap vendor card to view details on mobile
- Use mobile filter dropdown

**Coverage:**
- Dashboard functionality
- Filtering and sorting
- Search
- Pagination
- Statistics
- Data export
- Error handling
- Mobile responsive

### Credential Rotation (12 tests)

**Tests:**
- View credentials list
- View credential rotation status
- View credential details
- Rotate overdue credential
- Validate credential rotation fields
- View credential rotation history
- Schedule future credential rotation
- Cancel credential rotation in progress
- Rotate credential before expiration
- Filter credentials by status
- Filter credentials by type
- Search credentials by vendor name
- Export credential report
- Handle rotation errors gracefully
- View credential usage statistics
- Rotate credential on mobile device

**Coverage:**
- Credential management
- Rotation workflow
- Scheduling
- History tracking
- Filtering and search
- Error handling
- Mobile interactions

### Mobile Responsive (18 tests)

**Tests:**
- Display mobile-friendly header
- Display bottom navigation
- Navigate using bottom navigation
- Open hamburger menu
- Show vendor cards instead of table
- Display truncated vendor names on mobile
- Handle pull-to-refresh on dashboard
- Handle swipe gesture for pagination
- Tap vendor card to view details
- Dismiss modal with backdrop tap
- Scroll vendor list smoothly
- Use mobile filter panel
- Show mobile-friendly alerts list
- Swipe alert to acknowledge on mobile
- Display mobile-friendly charts
- Use mobile search bar
- Show mobile-friendly form inputs
- Handle mobile keyboard properly
- Show mobile notification toasts
- Handle orientation change gracefully
- Show 2-column layout on tablet
- Show table layout on tablet in landscape
- Adapt sidebar navigation on tablet
- Work on iPhone 12, iPhone 12 Pro Max, Pixel 5

**Coverage:**
- Responsive layouts
- Touch gestures
- Mobile navigation
- Orientation changes
- Different device sizes
- Mobile-specific interactions

### Smoke Tests (20 tests)

**Tests:**
- API health check
- Database connectivity check
- Cache connectivity check
- Frontend loads successfully
- Authentication works
- Logout works
- Dashboard loads
- Vendors page loads
- Alerts page loads
- Settings page loads
- Vendor API returns data
- Alerts API returns data
- Credentials API is accessible
- Can navigate between pages
- API response time
- Frontend load time
- Dashboard render time
- Vendor list render time
- Chrome basic functionality
- Firefox basic functionality
- Safari basic functionality
- Mobile dashboard loads
- Mobile navigation works

**Coverage:**
- Health checks
- Core functionality
- Performance
- Cross-browser
- Mobile

## Test Statistics

| Suite | Tests | Est. Time | Browsers |
|-------|-------|-----------|----------|
| Smoke | 20 | 2 min | All |
| Vendor Onboarding | 12 | 3 min | All |
| Alert Management | 10 | 2.5 min | All |
| Dashboard | 14 | 3.5 min | All |
| Credential Rotation | 12 | 3 min | All |
| Mobile Responsive | 18 | 4 min | Mobile |
| **Total** | **86** | **18 min** | **All** |

**Parallel execution (4 workers): ~5 minutes**
**Sequential execution: ~18 minutes**

## Running Specific Scenarios

```bash
# Vendor onboarding flow
npm run test:vendor

# Alert management flow
npm run test:alerts

# Dashboard exploration
npm run test:dashboard

# Credential management
npm run test:credentials

# Mobile tests
npm run test:mobile

# Smoke tests only
npm run test:smoke
```

## Debugging Failed Tests

### 1. Run with Debug Mode

```bash
npm run test:debug
```

This opens the Playwright Inspector allowing you to:
- Step through tests
- Inspect selectors
- View DOM
- Execute Playwright commands

### 2. Run Specific Test

```bash
npx playwright test vendor-onboarding.spec.ts:23
```

### 3. Run with Video Recording

```bash
VIDEO=retain-on-failure npm test
```

Videos are saved to `playwright-report/videos/`

### 4. View Screenshots

```bash
open playwright-report/screenshots/
```

### 5. View Trace Files

```bash
npx playwright show-trace playwright-report/trace/test.zip
```

### 6. Run in Headed Mode

```bash
npm run test:headed
```

This opens a browser window so you can watch tests execute.

## Common Failures

### Timeout Errors

**Symptom:** `Test timeout of 30000ms exceeded`

**Solutions:**
- Increase timeout: `test.setTimeout(60000)`
- Check for slow network conditions
- Verify API is responding
- Check for memory leaks

### Element Not Found

**Symptom:** `Timeout waiting for selector`

**Solutions:**
- Verify selector is correct
- Check if element exists (conditional rendering)
- Wait for loading to complete
- Check if element is in viewport

### Flaky Tests

**Symptom:** Test passes sometimes, fails other times

**Solutions:**
- Add proper waits (waitForSelector, waitForResponse)
- Use more robust selectors
- Check for race conditions
- Increase retries in config

### Browser-Specific Failures

**Symptom:** Fails in Firefox but passes in Chrome

**Solutions:**
- Check for browser-specific APIs
- Verify CSS is cross-browser compatible
- Check for timing differences
- Use browser-agnostic APIs

## Performance Baselines

| Operation | Target | Actual |
|-----------|--------|--------|
| API health check | < 1s | TBD |
| Page load | < 3s | TBD |
| Dashboard render | < 2s | TBD |
| Vendor list render | < 2s | TBD |
| Full test suite (chromium) | < 3 min | TBD |
| Full test suite (all browsers) | < 5 min | TBD |

Run tests to establish baselines:

```bash
npm run test:ci > test-results.txt
```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to main, develop, feature branches
- Pull requests to main, develop
- Daily at midnight (scheduled)

### Local Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
npm run test:smoke
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# Run tests against local environment
BASE_URL=http://localhost:5173 npm test
```

## Test Data

### Seed Data Location

`tests/e2e/fixtures/seed-data.sql`

### Load Seed Data

```bash
psql -U postgres -d cyberrx_test < fixtures/seed-data.sql
```

### Test Data Includes

- 1 test organization
- 1 test user (test@cyberrx.com)
- 5 vendors (all tiers)
- 5 tool connections
- Vendor metrics (risk scores)
- 7 alerts (all severities)
- Sync jobs
- Credential versions

## Coverage Reporting

View coverage by feature:

```bash
# Generate coverage report
npm run test -- --reporter=json > coverage.json

# Parse coverage
node scripts/parse-coverage.js coverage.json
```

Expected coverage:
- Vendor Management: 95%
- Alert Management: 90%
- Dashboard: 95%
- Credentials: 90%
- Mobile: 85%

## Best Practices

1. **Run smoke tests first** - Verify basic functionality
2. **Use debug mode** - For new test development
3. **Check network** - Ensure stable connection
4. **Clean up** - Use `npm run clean` to remove old reports
5. **Update baselines** - After UI changes
6. **Review videos** - For flaky tests
7. **Keep tests independent** - No dependencies between tests
8. **Use semantic selectors** - `data-testid` attributes
9. **Wait properly** - Use waitForSelector, not sleep
10. **Mock external APIs** - For unreliable services

## Support

For issues:
1. Check this guide
2. Review test code for patterns
3. Check Playwright documentation
4. Ask in team chat
5. Create GitHub issue

## Changelog

### v1.0.0 (2026-05-31)
- Initial E2E test suite
- 86 test scenarios
- 6 test suites
- Mobile responsive tests
- Cross-browser support
- CI/CD integration
