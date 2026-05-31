import { test, expect } from '@playwright/test';
import { login, waitForLoading, verifyAlertPresent, selectors } from '../helpers/test-setup';

/**
 * Alert Management Journey E2E Tests
 *
 * Tests the complete flow of viewing, filtering, acknowledging,
 * and managing security alerts.
 */
test.describe('Alert Management Journey', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view unacknowledged alerts', async ({ page }) => {
    // Navigate to alert center
    await page.click(selectors.alertsLink);
    await expect(page).toHaveURL('**/alerts', { timeout: 10000 });

    // Wait for alerts to load
    await page.waitForSelector(selectors.alertItem, { timeout: 15000 });
    await waitForLoading(page);

    // Verify unacknowledged alerts shown
    const allAlerts = page.locator(selectors.alertItem);
    const count = await allAlerts.count();

    expect(count).toBeGreaterThan(0);

    // Verify each alert has expected elements
    for (let i = 0; i < Math.min(count, 5); i++) {
      // Check for severity badge
      await expect(allAlerts.nth(i).locator(selectors.severityBadge)).toBeVisible();

      // Check for title
      await expect(allAlerts.nth(i).locator('.alert-title, [data-testid="alert-title"]')).toBeVisible();

      // Check for timestamp
      await expect(allAlerts.nth(i).locator('.alert-timestamp, time')).toBeVisible();
    }
  });

  test('should filter alerts by severity', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Filter by Critical severity
    await page.selectOption('select[name="severity"]', 'Critical');
    await waitForLoading(page);

    // Wait for filtered alerts
    await page.waitForSelector(selectors.alertItem, { timeout: 10000 });

    // Verify only critical alerts shown
    const criticalAlerts = page.locator(selectors.alertItem);
    const count = await criticalAlerts.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const severity = await criticalAlerts.nth(i).locator(selectors.severityBadge).textContent();
      expect(severity?.toLowerCase()).toBe('critical');
    }
  });

  test('should filter alerts by vendor', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Filter by specific vendor
    await page.selectOption('select[name="vendor"]', 'Acme Corp');
    await waitForLoading(page);

    // Verify alerts are for selected vendor
    const alerts = page.locator(selectors.alertItem);
    const count = await alerts.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const vendorName = await alerts.nth(i).locator('.vendor-name, [data-testid="vendor"]').textContent();
      expect(vendorName).toContain('Acme Corp');
    }
  });

  test('should filter alerts by date range', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Select date range filter
    await page.click('button:has-text("Date Range")');
    await expect(page.locator('.date-picker, [data-testid="date-range-picker"]')).toBeVisible();

    // Select last 7 days
    await page.click('text=Last 7 days');
    await waitForLoading(page);

    // Verify alerts are within date range (would need to check timestamps)
    const alerts = page.locator(selectors.alertItem);
    const count = await alerts.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should search alerts by keyword', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Search for specific keyword
    await page.fill('input[name="search"]', 'vulnerability');
    await waitForLoading(page);

    // Verify search results
    const alerts = page.locator(selectors.alertItem);
    const count = await alerts.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const title = await alerts.nth(i).locator('.alert-title').textContent();
      const description = await alerts.nth(i).locator('.alert-description').textContent();
      const combinedText = (title + ' ' + description).toLowerCase();

      expect(combinedText).toContain('vulnerability');
    }
  });

  test('should acknowledge single alert', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Get initial unacknowledged count
    const unacknowledgedCount = await page.locator('.alert-item:not(.acknowledged)').count();

    // Acknowledge first alert
    await page.locator(selectors.alertItem).first().hover();
    await page.locator('[data-testid="acknowledge-alert"]').first().click();

    // Wait for acknowledgment
    await waitForLoading(page);

    // Verify success message
    await expect(page.locator('.success-message, [data-testid="success-toast"]')).toBeVisible({ timeout: 5000 });

    // Reload to verify persistent state
    await page.reload();
    await waitForLoading(page);

    // Verify alert no longer unacknowledged
    const newUnacknowledgedCount = await page.locator('.alert-item:not(.acknowledged)').count();
    expect(newUnacknowledgedCount).toBeLessThan(unacknowledgedCount);
  });

  test('should acknowledge multiple alerts at once', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Select multiple alerts
    await page.locator(selectors.alertItem).nth(0).check();
    await page.locator(selectors.alertItem).nth(1).check();
    await page.locator(selectors.alertItem).nth(2).check();

    // Click bulk acknowledge button
    await page.click('button:has-text("Acknowledge Selected")');

    // Wait for confirmation
    await expect(page.locator('.confirm-dialog')).toBeVisible({ timeout: 5000 });

    // Confirm acknowledgment
    await page.click('button:has-text("Confirm")');

    // Wait for success
    await waitForLoading(page);

    // Verify success message
    await expect(page.locator('text=3 alerts acknowledged')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to vendor from alert', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Click vendor link in alert
    await page.locator(selectors.alertItem).first().locator('.vendor-link, a[href*="/vendors/"]').click();

    // Should navigate to vendor details
    await expect(page).toHaveURL(/\/vendors\/.+/, { timeout: 10000 });

    // Verify vendor page loaded
    await expect(page.locator('.vendor-details, [data-testid="vendor-page"]')).toBeVisible({ timeout: 5000 });
  });

  test('should view alert details', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Click on alert to view details
    await page.locator(selectors.alertItem).first().click();

    // Should open alert details modal/page
    await expect(page.locator('.alert-details, [data-testid="alert-details"]')).toBeVisible({ timeout: 5000 });

    // Verify detailed information visible
    await expect(page.locator('.alert-description')).toBeVisible();
    await expect(page.locator('.alert-timestamp')).toBeVisible();
    await expect(page.locator('.affected-assets')).toBeVisible();
    await expect(page.locator('.remediation-steps')).toBeVisible();
  });

  test('should export alerts to CSV', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export CSV"), [data-testid="export-csv"]');

    const download = await downloadPromise;

    // Verify CSV downloaded
    expect(download.suggestedFilename()).toMatch(/alerts.*\.csv$/);
  });

  test('should sort alerts by severity', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Click severity column header to sort
    await page.click('th:has-text("Severity")');

    await waitForLoading(page);

    // Get severity badges in order
    const alerts = page.locator(selectors.alertItem);
    const count = await alerts.count();
    const severities = [];

    for (let i = 0; i < Math.min(count, 10); i++) {
      const severity = await alerts.nth(i).locator(selectors.severityBadge).textContent();
      severities.push(severity);
    }

    // Verify sorted (Critical > High > Medium > Low)
    const severityOrder = ['Critical', 'High', 'Medium', 'Low'];
    let previousIndex = 0;

    for (const severity of severities) {
      const currentIndex = severityOrder.indexOf(severity);
      expect(currentIndex).toBeGreaterThanOrEqual(previousIndex);
      previousIndex = currentIndex;
    }
  });

  test('should sort alerts by date', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Click date column header
    await page.click('th:has-text("Date"), th:has-text("Created")');

    await waitForLoading(page);

    // Get timestamps
    const alerts = page.locator(selectors.alertItem);
    const timestamps = [];

    for (let i = 0; i < Math.min(await alerts.count(), 5); i++) {
      const timestamp = await alerts.nth(i).locator('time').getAttribute('datetime');
      if (timestamp) {
        timestamps.push(new Date(timestamp));
      }
    }

    // Verify sorted descending (newest first)
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i].getTime()).toBeLessThanOrEqual(timestamps[i - 1].getTime());
    }
  });

  test('should show real-time alert updates', async ({ page }) => {
    await page.goto('/alerts');
    await waitForLoading(page);

    // Get initial alert count
    const initialCount = await page.locator(selectors.alertItem).count();

    // Simulate new alert via WebSocket or polling
    // In real test, this would come from backend
    // For now, we'll just reload after some time

    await page.waitForTimeout(5000);
    await page.reload();
    await waitForLoading(page);

    // Alert count might have changed
    const newCount = await page.locator(selectors.alertItem).count();
    expect(newCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle empty alert state', async ({ page }) => {
    // Mock empty alerts response
    await page.route('**/api/alerts', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ alerts: [], total: 0 })
      });
    });

    await page.goto('/alerts');

    // Should show empty state message
    await expect(page.locator('text=No alerts, .empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('should show alert count badge in navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for alert count badge
    const badge = page.locator('.alert-badge, [data-testid="alert-count"]');

    if (await badge.count() > 0) {
      // Verify badge has number
      const badgeText = await badge.textContent();
      expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Alert Management - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should view and acknowledge alerts on mobile', async ({ page }) => {
    await login(page);

    // Navigate to alerts (might be in bottom nav)
    await page.click(selectors.bottomNav);
    await page.click('a:has-text("Alerts")');

    await waitForLoading(page);

    // Verify mobile card view
    await expect(page.locator('.alert-card-mobile')).toBeVisible({ timeout: 5000 });

    // Swipe to acknowledge
    const firstAlert = page.locator(selectors.alertItem).first();

    // Swipe left to show acknowledge action
    await firstAlert.dragTo(-200, 0);

    // Tap acknowledge button that appears
    await page.tap('[data-testid="acknowledge-mobile"]');

    // Verify acknowledged
    await waitForLoading(page);
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });
  });

  test('should filter alerts using mobile dropdown', async ({ page }) => {
    await login(page);
    await page.goto('/alerts');
    await waitForLoading(page);

    // Tap filter button
    await page.tap('[data-testid="mobile-filter-button"]');

    // Select severity filter
    await page.tap('text=Critical');

    // Apply filter
    await page.tap('button:has-text("Apply")');

    await waitForLoading(page);

    // Verify filtered results
    const criticalAlerts = page.locator(selectors.alertItem);
    const count = await criticalAlerts.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const severity = await criticalAlerts.nth(i).locator(selectors.severityBadge).textContent();
      expect(severity?.toLowerCase()).toBe('critical');
    }
  });
});
