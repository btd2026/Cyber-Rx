import { test, expect } from '@playwright/test';
import { login, waitForLoading, selectors } from '../helpers/test-setup';

/**
 * Smoke Tests - Verify core functionality
 * These tests run after every deployment to ensure basic functionality works
 */

test.describe('@smoke Smoke Tests', () => {
  test('@smoke @api API health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status', 'healthy');
  });

  test('@smoke @api Database connectivity check', async ({ request }) => {
    const response = await request.get('/api/health/database');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('database', 'connected');
  });

  test('@smoke @api Cache connectivity check', async ({ request }) => {
    const response = await request.get('/api/health/cache');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('cache', 'connected');
  });

  test('@smoke @ui Frontend loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check that page loads without errors
    await expect(page).toHaveTitle(/CyberRx/);

    // Check for critical elements
    await expect(page.locator('nav, .navigation')).toBeVisible({ timeout: 10000 });
  });

  test('@smoke @auth Authentication works', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@cyberrx.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'testpass123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should be redirected to dashboard
    await expect(page).toHaveURL('**/dashboard', { timeout: 10000 });
  });

  test('@smoke @auth Logout works', async ({ page }) => {
    await login(page);

    // Click logout
    await page.click('[data-testid="logout-button"], a:has-text("Logout")');

    // Should redirect to login
    await expect(page).toHaveURL('**/login', { timeout: 10000 });
  });

  test('@smoke @ui Dashboard loads', async ({ page }) => {
    await login(page);

    await page.goto('/dashboard');

    // Verify dashboard loaded
    await expect(page.locator('.vendor-dashboard, [data-testid="vendor-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Verify vendors shown
    await expect(page.locator('.vendor-card, .vendor-row').first()).toBeVisible();
  });

  test('@smoke @ui Vendors page loads', async ({ page }) => {
    await login(page);

    await page.goto('/vendors');

    // Verify vendors page loaded
    await expect(page.locator('.vendors-list, [data-testid="vendors-page"]')).toBeVisible({ timeout: 10000 });
  });

  test('@smoke @ui Alerts page loads', async ({ page }) => {
    await login(page);

    await page.goto('/alerts');

    // Verify alerts page loaded
    await expect(page.locator('.alerts-list, [data-testid="alerts-page"]')).toBeVisible({ timeout: 10000 });
  });

  test('@smoke @ui Settings page loads', async ({ page }) => {
    await login(page);

    await page.goto('/settings');

    // Verify settings page loaded
    await expect(page.locator('.settings-page, [data-testid="settings-page"]')).toBeVisible({ timeout: 10000 });
  });

  test('@smoke @api Vendor API returns data', async ({ request }) => {
    const response = await request.get('/api/vendors');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('vendors');
    expect(Array.isArray(body.vendors)).toBeTruthy();
  });

  test('@smoke @api Alerts API returns data', async ({ request }) => {
    const response = await request.get('/api/alerts');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('alerts');
    expect(Array.isArray(body.alerts)).toBeTruthy();
  });

  test('@smoke @api Credentials API is accessible', async ({ request }) => {
    const response = await request.get('/api/credentials');

    // Should return 401 without auth, but 500 if server error
    expect(response.status()).not.toBe(500);
  });

  test('@smoke @navigation Can navigate between pages', async ({ page }) => {
    await login(page);

    // Navigate to vendors
    await page.click(selectors.vendorsLink);
    await expect(page).toHaveURL('**/vendors', { timeout: 10000 });

    // Navigate to alerts
    await page.click(selectors.alertsLink);
    await expect(page).toHaveURL('**/alerts', { timeout: 10000 });

    // Navigate back to dashboard
    await page.click(selectors.dashboardLink);
    await expect(page).toHaveURL('**/dashboard', { timeout: 10000 });
  });
});

test.describe('@smoke Performance Smoke Tests', () => {
  test('@smoke @perf API response time', async ({ request }) => {
    const startTime = Date.now();

    await request.get('/api/health');

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should respond within 1 second
  });

  test('@smoke @perf Frontend load time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(3000); // Should load within 3 seconds
  });

  test('@smoke @perf Dashboard render time', async ({ page }) => {
    await login(page);

    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForSelector('.vendor-dashboard');

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000); // Should render within 2 seconds
  });

  test('@smoke @perf Vendor list render time', async ({ page }) => {
    await login(page);

    const startTime = Date.now();

    await page.goto('/vendors');
    await page.waitForSelector('.vendor-card, .vendor-row');

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000); // Should render within 2 seconds
  });
});

test.describe('@smoke Cross-Browser Smoke Tests', () => {
  test('@smoke @browser @chrome Chrome basic functionality', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only test');

    await login(page);
    await page.goto('/dashboard');

    await expect(page.locator('.vendor-dashboard')).toBeVisible();
  });

  test('@smoke @browser @firefox Firefox basic functionality', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-only test');

    await login(page);
    await page.goto('/dashboard');

    await expect(page.locator('.vendor-dashboard')).toBeVisible();
  });

  test('@smoke @browser @safari Safari basic functionality', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-only test');

    await login(page);
    await page.goto('/dashboard');

    await expect(page.locator('.vendor-dashboard')).toBeVisible();
  });
});

test.describe('@smoke Mobile Smoke Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('@smoke @mobile Mobile dashboard loads', async ({ page }) => {
    await login(page);

    await page.goto('/dashboard');

    // Verify mobile layout
    await expect(page.locator('.mobile-header')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.bottom-nav')).toBeVisible();
    await expect(page.locator('.vendor-card-mobile').first()).toBeVisible();
  });

  test('@smoke @mobile Mobile navigation works', async ({ page }) => {
    await login(page);

    await page.goto('/dashboard');

    // Tap vendors in bottom nav
    await page.tap('.bottom-nav a[href="/vendors"]');

    await expect(page).toHaveURL('**/vendors', { timeout: 10000 });
  });
});
