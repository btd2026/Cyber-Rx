import { test, expect } from '@playwright/test';
import { login, waitForLoading, selectors } from '../helpers/test-setup';

/**
 * Dashboard Exploration Journey E2E Tests
 *
 * Tests the vendor portfolio dashboard functionality including
 * filtering, sorting, viewing details, and exporting data.
 */
test.describe('Dashboard Exploration Journey', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load vendor portfolio dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Verify dashboard loaded
    await expect(page.locator(selectors.vendorDashboard)).toBeVisible({ timeout: 15000 });

    // Verify vendor cards/rows present
    const vendors = page.locator(selectors.vendorCard);
    expect(await vendors.count()).toBeGreaterThan(0);
  });

  test('should filter vendors by tier - Critical only', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Filter by Critical tier
    await page.selectOption('select[name="tier"]', 'critical');
    await waitForLoading(page);

    // Get vendor cards
    const vendorCards = page.locator(selectors.vendorCard);
    const count = await vendorCards.count();

    expect(count).toBeGreaterThan(0);

    // Verify all visible vendors are critical tier
    for (let i = 0; i < Math.min(count, 10); i++) {
      const tierBadge = vendorCards.nth(i).locator(selectors.tierBadge);
      await expect(tierBadge).toContainText('critical', { timeout: 5000 });
    }
  });

  test('should filter vendors by tier - High only', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    await page.selectOption('select[name="tier"]', 'high');
    await waitForLoading(page);

    const vendorCards = page.locator(selectors.vendorCard);
    const count = await vendorCards.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const tierBadge = vendorCards.nth(i).locator(selectors.tierBadge);
      await expect(tierBadge).toContainText('high', { timeout: 5000 });
    }
  });

  test('should filter vendors by risk score range', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Open risk score filter
    await page.click('button:has-text("Risk Score")');
    await expect(page.locator('.risk-score-filter')).toBeVisible({ timeout: 5000 });

    // Set range: 70-100
    await page.fill('input[name="min-score"]', '70');
    await page.fill('input[name="max-score"]', '100');

    // Apply filter
    await page.click('button:has-text("Apply")');
    await waitForLoading(page);

    // Verify all vendors in range
    const vendorCards = page.locator(selectors.vendorCard);
    const scores = await vendorCards.locator(selectors.riskScore).allTextContents();

    for (const scoreText of scores) {
      const score = parseInt(scoreText);
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  test('should sort vendors by risk score ascending', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Click risk score column header to sort ascending
    await page.click('th:has-text("Risk Score"), button:has-text("Sort by Risk Score")');
    await waitForLoading(page);

    // Get risk scores in order
    const vendorCards = page.locator(selectors.vendorCard);
    const scores = [];

    for (let i = 0; i < Math.min(await vendorCards.count(), 20); i++) {
      const scoreText = await vendorCards.nth(i).locator(selectors.riskScore).textContent();
      if (scoreText) {
        scores.push(parseInt(scoreText));
      }
    }

    // Verify ascending order
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });

  test('should sort vendors by risk score descending', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Click twice for descending order
    await page.click('th:has-text("Risk Score")');
    await page.click('th:has-text("Risk Score")');
    await waitForLoading(page);

    // Get risk scores
    const vendorCards = page.locator(selectors.vendorCard);
    const scores = [];

    for (let i = 0; i < Math.min(await vendorCards.count(), 20); i++) {
      const scoreText = await vendorCards.nth(i).locator(selectors.riskScore).textContent();
      if (scoreText) {
        scores.push(parseInt(scoreText));
      }
    }

    // Verify descending order
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  test('should sort vendors by name alphabetically', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Click name column header
    await page.click('th:has-text("Vendor Name")');
    await waitForLoading(page);

    // Get vendor names
    const vendorCards = page.locator(selectors.vendorCard);
    const names = [];

    for (let i = 0; i < Math.min(await vendorCards.count(), 20); i++) {
      const name = await vendorCards.nth(i).locator('.vendor-name').textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    // Verify alphabetical order
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sortedNames);
  });

  test('should search vendors by name', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Search for specific vendor
    await page.fill('input[name="search"]', 'Acme');
    await waitForLoading(page);

    // Verify search results
    const vendorCards = page.locator(selectors.vendorCard);
    const count = await vendorCards.count();

    for (let i = 0; i < count; i++) {
      const name = await vendorCards.nth(i).locator('.vendor-name').textContent();
      expect(name?.toLowerCase()).toContain('acme');
    }
  });

  test('should search vendors by domain', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    await page.fill('input[name="search"]', 'acmecorp.com');
    await waitForLoading(page);

    const vendorCards = page.locator(selectors.vendorCard);
    const count = await vendorCards.count();

    // Should find exact match
    expect(count).toBeGreaterThan(0);

    const name = await vendorCards.first().locator('.vendor-name').textContent();
    expect(name?.toLowerCase()).toContain('acme');
  });

  test('should view vendor details from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Click on first vendor
    await page.locator(selectors.vendorCard).first().click();

    // Should navigate to vendor details page
    await expect(page).toHaveURL(/\/vendors\/.+/, { timeout: 10000 });

    // Verify vendor details page loaded
    await expect(page.locator('.vendor-details, [data-testid="vendor-page"]')).toBeVisible({ timeout: 5000 });

    // Verify sections present
    await expect(page.locator('.vendor-overview')).toBeVisible();
    await expect(page.locator('.risk-score-chart')).toBeVisible();
    await expect(page.locator('.signals-section')).toBeVisible();
  });

  test('should view vendor risk trend chart', async ({ page }) => {
    await page.goto('/vendors/acmecorp');
    await waitForLoading(page);

    // Scroll to risk trend chart
    await page.locator('.risk-trend-chart').scrollIntoViewIfNeeded();

    // Verify chart visible
    await expect(page.locator('.risk-trend-chart canvas, .chart-container')).toBeVisible({ timeout: 5000 });

    // Verify chart has data points
    const chart = page.locator('.risk-trend-chart');
    await expect(chart).toContainText('Score');
  });

  test('should view vendor signal breakdown', async ({ page }) => {
    await page.goto('/vendors/acmecorp');
    await waitForLoading(page);

    // Scroll to signals section
    await page.locator('.signals-section').scrollIntoViewIfNeeded();

    // Verify all 7 SecurityScorecard signals shown
    const signalTypes = ['Information Security', 'Patch Cadence', 'Malware',
      'Social Engineering', 'Physical Security', 'Ecosystem', 'Brand', 'Employee'];

    for (const signalType of signalTypes) {
      await expect(page.locator(`text=${signalType}`)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should export dashboard to CSV', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click(selectors.exportCsvButton);

    const download = await downloadPromise;

    // Verify CSV downloaded
    expect(download.suggestedFilename()).toMatch(/vendors.*\.csv$/);

    // Verify file size reasonable (not empty, not huge)
    const size = await download.createReadStream();
    let byteCount = 0;
    for await (const chunk of size) {
      byteCount += chunk.length;
    }
    expect(byteCount).toBeGreaterThan(100);
    expect(byteCount).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
  });

  test('should export filtered vendors to CSV', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Apply filter
    await page.selectOption('select[name="tier"]', 'critical');
    await waitForLoading(page);

    // Export filtered results
    const downloadPromise = page.waitForEvent('download');
    await page.click(selectors.exportCsvButton);

    const download = await downloadPromise;

    // Verify CSV downloaded
    expect(download.suggestedFilename()).toMatch(/vendors.*\.csv$/);
  });

  test('should paginate vendors', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Check if pagination exists
    const nextPageButton = page.locator('button:has-text("Next"), [data-testid="next-page"]');

    if (await nextPageButton.count() > 0) {
      // Get vendors on first page
      const firstPageVendors = await page.locator(selectors.vendorCard).allTextContents();

      // Click next page
      await nextPageButton.click();
      await waitForLoading(page);

      // Get vendors on second page
      const secondPageVendors = await page.locator(selectors.vendorCard).allTextContents();

      // Verify different vendors
      expect(firstPageVendors).not.toEqual(secondPageVendors);

      // Go back to first page
      await page.click('button:has-text("Previous"), [data-testid="prev-page"]');
      await waitForLoading(page);

      // Verify back to first page
      const backToFirstVendors = await page.locator(selectors.vendorCard).allTextContents();
      expect(backToFirstVendors).toEqual(firstPageVendors);
    }
  });

  test('should show vendor count statistics', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Verify total vendor count displayed
    await expect(page.locator('.total-vendors, [data-testid="vendor-count"]')).toBeVisible({ timeout: 5000 });

    // Verify breakdown by tier
    await expect(page.locator('text=Critical')).toBeVisible();
    await expect(page.locator('text=High')).toBeVisible();
    await expect(page.locator('text=Medium')).toBeVisible();
    await expect(page.locator('text=Low')).toBeVisible();
  });

  test('should show average risk score', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Verify average risk score displayed
    await expect(page.locator('.average-risk-score, [data-testid="avg-risk-score"]')).toBeVisible({ timeout: 5000 });

    // Verify score is reasonable (0-100)
    const avgScoreText = await page.locator('.average-risk-score').textContent();
    const avgScore = parseInt(avgScoreText || '0');
    expect(avgScore).toBeGreaterThanOrEqual(0);
    expect(avgScore).toBeLessThanOrEqual(100);
  });

  test('should handle dashboard loading errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/vendors', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/dashboard');

    // Should show error message
    await expect(page.locator('.error-message, [data-testid="api-error"]')).toBeVisible({ timeout: 10000 });

    // Should offer retry
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should refresh dashboard data', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Click refresh button
    await page.click('button:has-text("Refresh"), [data-testid="refresh"]');

    // Should show loading indicator
    await expect(page.locator('.loading, .spinner')).toBeVisible({ timeout: 5000 });

    // Should complete loading
    await expect(page.locator('.loading, .spinner')).toBeHidden({ timeout: 15000 });
  });
});

test.describe('Dashboard - Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display mobile-friendly dashboard', async ({ page }) => {
    await login(page);

    await page.goto('/dashboard');
    await waitForLoading(page);

    // Verify mobile header
    await expect(page.locator('.mobile-header, [data-testid="mobile-header"]')).toBeVisible({ timeout: 5000 });

    // Verify bottom navigation
    await expect(page.locator('.bottom-nav, [data-testid="bottom-nav"]')).toBeVisible();

    // Verify card layout (not table)
    await expect(page.locator('.vendor-card-mobile').first()).toBeVisible();
    await expect(page.locator('.vendors-table')).not.toBeVisible();
  });

  test('should show vendor cards in single column on mobile', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await waitForLoading(page);

    const vendorCards = page.locator('.vendor-card-mobile');

    // Verify cards stacked vertically
    const firstCard = vendorCards.first();
    const secondCard = vendorCards.nth(1);

    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();

    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height);
  });

  test('should tap vendor card to view details on mobile', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Tap first vendor card
    await page.tap('.vendor-card-mobile:first-child');

    // Should navigate to details
    await expect(page).toHaveURL(/\/vendors\/.+/, { timeout: 10000 });
  });

  test('should use mobile filter dropdown', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await waitForLoading(page);

    // Tap filter button
    await page.tap('[data-testid="mobile-filter-button"]');

    // Verify filter modal/panel
    await expect(page.locator('.mobile-filter-panel')).toBeVisible({ timeout: 5000 });

    // Select tier filter
    await page.tap('text=Critical');

    // Apply filter
    await page.tap('button:has-text("Apply")');
    await waitForLoading(page);

    // Verify filtered
    await expect(page.locator('.vendor-card-mobile').first()).toBeVisible();
  });
});
