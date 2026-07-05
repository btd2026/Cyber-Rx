# Nerion E2E Test Suite

Comprehensive end-to-end testing for the Nerion vendor monitoring system using Playwright.

## Overview

This E2E test suite covers the complete user journey across all major features:

- **Vendor Onboarding**: Adding vendors, configuring connectors, testing connections
- **Alert Management**: Viewing, filtering, acknowledging alerts
- **Dashboard Exploration**: Filtering, sorting, viewing vendor details
- **Credential Rotation**: Managing, rotating, and auditing credentials
- **Mobile Responsive**: Touch gestures, mobile layouts, adaptive UI
- **Smoke Tests**: Quick health checks for CI/CD pipelines

## Test Coverage

### By Feature

| Feature | Tests | Coverage |
|---------|-------|----------|
| Vendor Management | 12 tests | CRUD operations, connector config, validation |
| Alert Management | 10 tests | Filtering, sorting, bulk actions |
| Dashboard | 14 tests | Filtering, sorting, search, export |
| Credential Rotation | 12 tests | Rotation, scheduling, history |
| Mobile Responsive | 18 tests | Touch gestures, layouts, orientation |
| Smoke Tests | 20 tests | Health checks, performance, cross-browser |

**Total: 86+ test scenarios**

### By Browser

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)
- ✅ Tablet (iPad Pro 11)

## Installation

```bash
# Install dependencies
cd tests/e2e
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

## Configuration

### Environment Variables

Create a `.env` file in the `tests/e2e` directory:

```env
# Test user credentials
TEST_USER_EMAIL=test@cyberrx.com
TEST_USER_PASSWORD=testpass123

# API keys for connector testing
SECURITYSCORECARD_API_KEY=your_test_key_here
BITWARDEN_API_KEY=your_test_key_here

# Base URL (default: http://localhost:5173)
BASE_URL=http://localhost:5173

# CI/CD settings (optional)
CI=true
DEBUG=false
```

### Playwright Config

The `playwright.config.ts` includes:

- Multiple browser projects (Chrome, Firefox, Safari, Edge)
- Mobile device emulation (Pixel 5, iPhone 12, iPad)
- Test artifacts (screenshots, videos, traces)
- Parallel execution for faster runs
- Local dev server startup

## Running Tests

### Run All Tests

```bash
# All tests, all browsers
npm run test:e2e

# With UI (headed mode)
npm run test:e2e:headed

# Specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug
```

### Run Specific Test Suites

```bash
# Vendor onboarding tests
npx playwright test vendor-onboarding

# Alert management tests
npx playwright test alert-management

# Dashboard tests
npx playwright test dashboard-exploration

# Credential rotation tests
npx playwright test credential-rotation

# Mobile responsive tests
npx playwright test mobile-responsive

# Smoke tests only
npx playwright test smoke
```

### Run by Tags

```bash
# Smoke tests only
npx playwright test --grep @smoke

# API tests only
npx playwright test --grep @api

# Mobile tests only
npx playwright test --grep @mobile

# Performance tests only
npx playwright test --grep @perf
```

### Run in CI Mode

```bash
# With retries and parallel execution
CI=true npm run test:e2e

# Without starting dev server (use existing server)
BASE_URL=https://staging.cyberrx.com npm run test:e2e
```

## Test Structure

```
tests/e2e/
├── playwright.config.ts       # Playwright configuration
├── package.json               # Test dependencies
├── fixtures/
│   └── seed-data.sql          # Test database seed data
├── helpers/
│   └── test-setup.ts          # Common helpers and fixtures
└── tests/
    ├── smoke.spec.ts          # Smoke tests (health checks)
    ├── vendor-onboarding.spec.ts   # Vendor CRUD + connectors
    ├── alert-management.spec.ts    # Alert filtering + actions
    ├── dashboard-exploration.spec.ts # Dashboard interactions
    ├── credential-rotation.spec.ts  # Credential management
    └── mobile-responsive.spec.ts   # Mobile + touch tests
```

## Writing New Tests

### Template

```typescript
import { test, expect } from '@playwright/test';
import { login, waitForLoading, selectors } from '../helpers/test-setup';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/some-page');

    // Act
    await page.click('button');

    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Best Practices

1. **Use helper functions**: Import `login`, `waitForLoading` from `test-setup.ts`
2. **Add data-testid**: Use semantic selectors like `[data-testid="submit-btn"]`
3. **Wait for loading**: Always use `waitForLoading(page)` after actions
4. **Use timeouts**: Set reasonable timeouts for slow operations
5. **Clean up**: Use `beforeEach`/`afterEach` for test isolation
6. **Add tags**: Use `@smoke`, `@api`, `@mobile` for filtering
7. **Mock APIs**: Use `page.route()` to test error scenarios

### Selectors

Prefer semantic selectors:

```typescript
// ✅ Good
await page.click('[data-testid="submit-button"]');

// ⚠️ Okay
await page.click('button:has-text("Submit")');

// ❌ Bad (brittle)
await page.click('.btn.primary:nth-child(2)');
```

## Test Data

### Seed Data

The `fixtures/seed-data.sql` file creates:

- Test organization
- Test user (test@cyberrx.com)
- 5 test vendors with different tiers
- 5 tool connections (SecurityScorecard, Bitwarden, SFTP)
- Vendor metrics (risk scores, signals)
- 7 alerts (various severities)
- 4 sync jobs
- Credential versions for rotation testing

### Loading Seed Data

```bash
# PostgreSQL
psql -U postgres -d cyberrx_test < fixtures/seed-data.sql

# Or via API (if endpoint exists)
curl -X POST http://localhost:3000/api/test/seed \
  -H "Content-Type: application/json" \
  -d '{"fixtures": ["vendors", "alerts", "credentials"]}'
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd tests/e2e && npm install
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: tests/e2e/playwright-report/
```

### Docker

```dockerfile
FROM mcr.microsoft.com/playwright:latest

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx playwright install --with-deps

CMD ["npm", "run", "test:e2e"]
```

## Test Reports

After running tests, view reports:

```bash
# HTML report
npx playwright show-report

# Open in browser
open playwright-report/html/index.html
```

Reports include:
- Test results (pass/fail/skip)
- Screenshots of failures
- Video recordings
- Trace files for debugging
- Performance metrics

## Debugging

### Debug Mode

```bash
# Run with inspector
npx playwright test --debug

# Run specific test in debug
npx playwright test --debug vendor-onboarding

# Run with headed mode
npx playwright test --headed
```

### View Traces

```bash
# Open trace viewer
npx playwright show-trace playwright-report/trace/test.zip
```

### Common Issues

**Tests timeout too early**
```typescript
// Increase timeout
test.setTimeout(60000); // 60 seconds
```

**Flaky tests due to timing**
```typescript
// Wait for element
await page.waitForSelector('.button', { timeout: 10000 });

// Wait for navigation
await page.waitForURL('**/dashboard');

// Wait for load state
await page.waitForLoadState('networkidle');
```

**Element not found**
```typescript
// Check if exists first
if (await page.locator('.button').count() > 0) {
  await page.click('.button');
}
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Full suite execution | < 5 minutes |
| Smoke tests | < 30 seconds |
| Single browser run | < 3 minutes |
| Parallel execution (4 workers) | < 2 minutes |

## Maintenance

### Regular Tasks

- **Weekly**: Review and update failing tests
- **Monthly**: Add tests for new features
- **Quarterly**: Audit test coverage and remove duplicates

### Updating Playwright

```bash
# Check for updates
npm outdated @playwright/test

# Update to latest
npm install @playwright/test@latest

# Install new browsers
npx playwright install
```

## Support

For issues or questions:

1. Check [Playwright docs](https://playwright.dev)
2. Review existing tests for patterns
3. Ask in team chat
4. Create issue with reproduction steps

## Contributing

When adding new tests:

1. Follow existing patterns
2. Use semantic selectors
3. Add helpful comments
4. Include both positive and negative cases
5. Test on multiple browsers
6. Update this README

## License

Same as parent project.
