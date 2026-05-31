import { test as base } from '@playwright/test';

/**
 * Test fixtures and helper functions for E2E tests
 */

// Test data
export const testUsers = {
  admin: {
    email: process.env.TEST_USER_EMAIL || 'test@cyberrx.com',
    password: process.env.TEST_USER_PASSWORD || 'testpass123',
    name: 'Test User'
  },
};

export const testVendors = {
  acme: {
    name: 'Acme Corp',
    domain: 'acmecorp.com',
    tier: 'critical',
    expectedScore: 85
  },
  globex: {
    name: 'Globex Inc',
    domain: 'globex.com',
    tier: 'high',
    expectedScore: 72
  },
  soylent: {
    name: 'Soylent Corp',
    domain: 'soylent.com',
    tier: 'medium',
    expectedScore: 58
  }
};

// Custom test fixture with authenticated page
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/login');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Use authenticated page
    await use(page);

    // Cleanup after test (logout)
    // await page.click('[data-testid="logout-button"]');
  },
});

// Helper functions
export async function login(page, email = testUsers.admin.email, password = testUsers.admin.password) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

export async function waitForLoading(page, selector = '.loading, .spinner, [data-testid="loading"]') {
  try {
    await page.waitForSelector(selector, { state: 'attached', timeout: 5000 });
    await page.waitForSelector(selector, { state: 'detached', timeout: 30000 });
  } catch (error) {
    // Loading indicator might not appear - that's okay
  }
}

export async function waitForApiResponse(page, urlPattern) {
  return page.waitForResponse(response =>
    response.url().includes(urlPattern) && response.status() === 200
  );
}

export async function selectOption(page, selector, value) {
  await page.click(selector);
  await page.click(`li[data-value="${value}"]`);
}

export async function verifyAlertPresent(page, severity) {
  const alerts = page.locator(`.alert-item, [data-testid="alert-item"]`);
  const count = await alerts.count();

  for (let i = 0; i < count; i++) {
    const alertSeverity = await alerts.nth(i).locator('.severity-badge, [data-testid="severity"]').textContent();
    if (alertSeverity?.toLowerCase() === severity.toLowerCase()) {
      return alerts.nth(i);
    }
  }

  throw new Error(`No alert found with severity: ${severity}`);
}

export async function verifyVendorInList(page, vendorName) {
  const vendors = page.locator('.vendor-card, tr.vendor-row, [data-testid="vendor-item"]');
  const count = await vendors.count();

  for (let i = 0; i < count; i++) {
    const name = await vendors.nth(i).locator('.vendor-name, [data-testid="vendor-name"]').textContent();
    if (name?.includes(vendorName)) {
      return vendors.nth(i);
    }
  }

  throw new Error(`Vendor not found in list: ${vendorName}`);
}

export async function getRandomVendor(page) {
  const vendors = page.locator('.vendor-card, tr.vendor-row, [data-testid="vendor-item"]');
  const count = await vendors.count();
  const randomIndex = Math.floor(Math.random() * count);
  return vendors.nth(randomIndex);
}

export async function takeScreenshot(page, name) {
  await page.screenshot({
    path: `playwright-report/screenshots/${name}.png`,
    fullPage: true
  });
}

export async function mockApi(page, urlPattern, responseData) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseData)
    });
  });
}

// Selectors
export const selectors = {
  // Navigation
  dashboardLink: 'a[href="/dashboard"], nav a:has-text("Dashboard")',
  vendorsLink: 'a[href="/vendors"], nav a:has-text("Vendors")',
  alertsLink: 'a[href="/alerts"], nav a:has-text("Alerts")',
  settingsLink: 'a[href="/settings"], nav a:has-text("Settings")',

  // Vendor management
  addVendorButton: 'button:has-text("Add Vendor"), [data-testid="add-vendor"]',
  vendorForm: 'form[data-testid="vendor-form"]',
  vendorNameInput: 'input[name="name"]',
  vendorDomainInput: 'input[name="domain"]',
  vendorTierSelect: 'select[name="tier"]',
  saveButton: 'button:has-text("Save"), button[type="submit"]',

  // Connector configuration
  configureConnectorButton: '[data-testid^="configure-connector-"]',
  connectorModal: '.connector-modal, [data-testid="connector-modal"]',
  connectorTypeSelect: 'select[name="connectorType"]',
  apiKeyInput: 'input[name="apiKey"]',
  syncFrequencySelect: 'select[name="syncFrequency"]',
  testConnectionButton: 'button:has-text("Test Connection")',
  connectionTestResult: '.connection-test-result, [data-testid="connection-result"]',

  // Dashboard
  vendorDashboard: '.vendor-dashboard, [data-testid="vendor-dashboard"]',
  vendorCard: '.vendor-card, [data-testid="vendor-item"]',
  riskScore: '.risk-score, [data-testid="risk-score"]',
  tierBadge: '.tier-badge, [data-testid="tier-badge"]',
  exportCsvButton: 'button:has-text("Export CSV"), [data-testid="export-csv"]',

  // Alerts
  alertItem: '.alert-item, [data-testid="alert-item"]',
  severityBadge: '.severity-badge, [data-testid="severity"]',
  acknowledgeCheckbox: 'input[type="checkbox"], .acknowledge-checkbox',
  acknowledgeButton: 'button:has-text("Acknowledge")',

  // Credentials
  credentialItem: '.credential-item, [data-testid="credential-item"]',
  rotateNowButton: 'button:has-text("Rotate Now"), [data-testid="rotate-now"]',
  rotationModal: '.rotation-modal, [data-testid="rotation-modal"]',
  rotationHistory: '.rotation-history, [data-testid="rotation-history"]',

  // Mobile
  mobileHeader: '.mobile-header, [data-testid="mobile-header"]',
  bottomNav: '.bottom-nav, [data-testid="bottom-nav"]',
  pullToRefresh: '[data-testid="pull-to-refresh"]',
};

export const expect = base.expect;
