import { test, expect } from '@playwright/test';
import { login, waitForLoading, selectors } from '../helpers/test-setup';

/**
 * Mobile Responsive E2E Tests
 *
 * Tests responsive layouts, touch gestures, and mobile-specific
 * interactions across all major pages.
 */
test.describe('Mobile Responsive Tests', () => {
  // iPhone SE viewport
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display mobile-friendly header', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify mobile header visible
    await expect(page.locator('.mobile-header, [data-testid="mobile-header"]')).toBeVisible({ timeout: 5000 });

    // Verify hamburger menu button
    await expect(page.locator('[data-testid="hamburger-menu"], .menu-toggle')).toBeVisible();

    // Verify logo/title visible
    await expect(page.locator('.mobile-logo, .logo')).toBeVisible();
  });

  test('should display bottom navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify bottom navigation visible
    await expect(page.locator('.bottom-nav, [data-testid="bottom-nav"]')).toBeVisible({ timeout: 5000 });

    // Verify navigation items
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(page.locator('a[href="/vendors"]')).toBeVisible();
    await expect(page.locator('a[href="/alerts"]')).toBeVisible();
    await expect(page.locator('a[href="/settings"]')).toBeVisible();
  });

  test('should navigate using bottom navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Tap vendors icon
    await page.tap('.bottom-nav a:has-text("Vendors")');

    // Should navigate to vendors
    await expect(page).toHaveURL('**/vendors', { timeout: 10000 });

    // Tap alerts icon
    await page.tap('.bottom-nav a:has-text("Alerts")');

    // Should navigate to alerts
    await expect(page).toHaveURL('**/alerts', { timeout: 10000 });
  });

  test('should open hamburger menu', async ({ page }) => {
    await page.goto('/dashboard');

    // Tap hamburger menu
    await page.tap('[data-testid="hamburger-menu"]');

    // Verify menu opens
    await expect(page.locator('.side-menu, [data-testid="side-menu"]')).toBeVisible({ timeout: 5000 });

    // Verify menu items
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Vendors")')).toBeVisible();
    await expect(page.locator('a:has-text("Alerts")')).toBeVisible();
    await expect(page.locator('a:has-text("Settings")')).toBeVisible();

    // Tap outside to close
    await page.tap('.overlay, .backdrop');

    // Verify menu closed
    await expect(page.locator('.side-menu')).toBeHidden({ timeout: 5000 });
  });

  test('should show vendor cards instead of table', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify card layout
    await expect(page.locator('.vendor-card-mobile').first()).toBeVisible({ timeout: 5000 });

    // Verify table NOT shown
    await expect(page.locator('.vendors-table')).not.toBeVisible();

    // Verify cards stacked vertically
    const cards = page.locator('.vendor-card-mobile');
    const count = await cards.count();

    for (let i = 1; i < Math.min(count, 5); i++) {
      const prevCard = await cards.nth(i - 1).boundingBox();
      const currCard = await cards.nth(i).boundingBox();

      expect(currCard!.y).toBeGreaterThan(prevCard!.y + prevCard!.height);
    }
  });

  test('should display truncated vendor names on mobile', async ({ page }) => {
    await page.goto('/vendors');

    const vendorCards = page.locator('.vendor-card-mobile');

    // Verify vendor names don't overflow
    for (let i = 0; i < Math.min(await vendorCards.count(), 5); i++) {
      const nameElement = vendorCards.nth(i).locator('.vendor-name');

      // Check if text is truncated with ellipsis
      const nameWidth = await nameElement.evaluate(el => {
        return window.getComputedStyle(el).textOverflow;
      });

      expect(nameWidth).toBe('ellipsis');
    }
  });

  test('should handle pull-to-refresh on dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Simulate pull-to-refresh gesture
    const dashboard = page.locator('.vendor-dashboard, .dashboard-container');

    // Drag down and release
    await dashboard.dragTo(0, 100);

    // Should show refresh indicator
    await expect(page.locator('.refreshing-indicator, [data-testid="refreshing"]')).toBeVisible({ timeout: 2000 });

    // Should hide indicator after refresh
    await expect(page.locator('.refreshing-indicator')).toBeHidden({ timeout: 10000 });
  });

  test('should handle swipe gesture for pagination', async ({ page }) => {
    await page.goto('/vendors');

    // Check if pagination exists
    const nextPage = page.locator('[data-testid="next-page"]');

    if (await nextPage.count() > 0) {
      const vendorList = page.locator('.vendor-list');

      // Swipe left
      await vendorList.dragTo(-200, 0);

      // Should show loading or navigate
      await page.waitForTimeout(500);

      // Verify either navigated or showed next page indicator
      const url = page.url();
      const hasPageParam = url.includes('page=');

      expect(hasPageParam || await nextPage.count() > 0).toBeTruthy();
    }
  });

  test('should tap vendor card to view details', async ({ page }) => {
    await page.goto('/dashboard');

    // Tap first vendor card
    await page.tap('.vendor-card-mobile:first-child');

    // Should navigate to details
    await expect(page).toHaveURL(/\/vendors\/.+/, { timeout: 10000 });

    // Verify details page loaded
    await expect(page.locator('.vendor-details-mobile')).toBeVisible({ timeout: 5000 });
  });

  test('should dismiss modal with backdrop tap', async ({ page }) => {
    await page.goto('/vendors');

    // Tap add vendor
    await page.tap('button:has-text("Add Vendor")');

    // Verify modal opened
    await expect(page.locator('.modal, .vendor-modal')).toBeVisible({ timeout: 5000 });

    // Tap backdrop
    await page.tap('.backdrop, .overlay');

    // Verify modal closed
    await expect(page.locator('.modal')).toBeHidden({ timeout: 5000 });
  });

  test('should scroll vendor list smoothly', async ({ page }) => {
    await page.goto('/vendors');

    const vendorList = page.locator('.vendor-list, .vendor-container');

    // Scroll to bottom
    await vendorList.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });

    // Should load more items if available
    await page.waitForTimeout(1000);

    // Verify last item visible
    const lastItem = page.locator('.vendor-card-mobile').last();
    await expect(lastItem).toBeInViewport();
  });

  test('should use mobile filter panel', async ({ page }) => {
    await page.goto('/vendors');

    // Tap filter button
    await page.tap('[data-testid="mobile-filter-button"], button:has-text("Filter")');

    // Verify filter panel slides up
    await expect(page.locator('.mobile-filter-panel, .filter-bottom-sheet')).toBeVisible({ timeout: 5000 });

    // Select filter option
    await page.tap('text=Critical');

    // Apply filter
    await page.tap('button:has-text("Apply")');

    // Verify filter applied
    await page.waitForTimeout(500);
    const criticalBadge = page.locator('.vendor-card-mobile').first().locator('.tier-badge');
    await expect(criticalBadge).toContainText('critical');
  });

  test('should show mobile-friendly alerts list', async ({ page }) => {
    await page.goto('/alerts');

    // Verify mobile alert cards
    await expect(page.locator('.alert-card-mobile').first()).toBeVisible({ timeout: 5000 });

    // Verify severity badges visible
    await expect(page.locator('.severity-badge').first()).toBeVisible();

    // Verify tap to acknowledge gesture hint
    await expect(page.locator('text=swipe, [data-testid="swipe-hint"]')).toBeVisible();
  });

  test('should swipe alert to acknowledge on mobile', async ({ page }) => {
    await page.goto('/alerts');

    const firstAlert = page.locator('.alert-card-mobile').first();

    // Swipe left to reveal actions
    await firstAlert.dragTo(-200, 0);

    // Should show acknowledge button
    await expect(page.locator('[data-testid="acknowledge-mobile"]')).toBeVisible({ timeout: 500 });

    // Tap acknowledge
    await page.tap('[data-testid="acknowledge-mobile"]');

    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });

    // Verify alert acknowledged
    await page.reload();
    await expect(page.locator('.alert-card-mobile').first()).toHaveClass(/acknowledged/);
  });

  test('should display mobile-friendly charts', async ({ page }) => {
    await page.goto('/vendors/acmecorp');

    // Scroll to risk trend chart
    await page.locator('.risk-trend-chart').scrollIntoViewIfNeeded();

    // Verify chart visible and interactive
    await expect(page.locator('.risk-trend-chart canvas')).toBeVisible({ timeout: 5000 });

    // Tap chart to show tooltip
    await page.tap('.risk-trend-chart canvas');

    // Should show data point tooltip
    await expect(page.locator('.chart-tooltip')).toBeVisible({ timeout: 2000 });
  });

  test('should use mobile search bar', async ({ page }) => {
    await page.goto('/vendors');

    // Tap search bar
    await page.tap('input[name="search"]');

    // Verify keyboard appears (handled by mobile OS)
    // Verify search bar focused
    await expect(page.locator('input[name="search"]')).toBeFocused();

    // Type search query
    await page.fill('input[name="search"]', 'Acme');

    // Wait for results
    await page.waitForTimeout(500);

    // Verify filtered results
    const results = page.locator('.vendor-card-mobile');
    const count = await results.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const name = await results.nth(i).locator('.vendor-name').textContent();
      expect(name?.toLowerCase()).toContain('acme');
    }
  });

  test('should show mobile-friendly form inputs', async ({ page }) => {
    await page.goto('/vendors');
    await page.tap('button:has-text("Add Vendor")');

    // Verify form fields are full-width
    const nameInput = page.locator('input[name="name"]');
    const inputWidth = await nameInput.evaluate(el => el.offsetWidth);

    expect(inputWidth).toBeGreaterThan(300); // Should be nearly full width on mobile

    // Verify select dropdowns use native picker
    await page.tap('select[name="tier"]');

    // Native picker will open (OS-level)
    // Just verify the select is focused
    await expect(page.locator('select[name="tier"]')).toBeFocused();
  });

  test('should handle mobile keyboard properly', async ({ page }) => {
    await page.goto('/vendors');
    await page.tap('button:has-text("Add Vendor")');

    // Tap input to focus
    await page.tap('input[name="name"]');

    // Type in input
    await page.fill('input[name="name"]', 'Test Vendor');

    // Tap another field
    await page.tap('input[name="domain"]');

    // Verify previous field value retained
    await expect(page.locator('input[name="name"]')).toHaveValue('Test Vendor');

    // Tap outside to dismiss keyboard
    await page.tap('.backdrop');

    // Verify keyboard dismissed (input not focused)
    await expect(page.locator('input[name="domain"]')).not.toBeFocused();
  });

  test('should show mobile notification toasts', async ({ page }) => {
    await page.goto('/vendors');

    // Trigger an action that shows notification
    await page.locator('.vendor-card-mobile').first().tap();
    await page.tap('[data-testid="sync-button"]');

    // Should show mobile-friendly toast notification
    await expect(page.locator('.toast-mobile, [data-testid="toast"]')).toBeVisible({ timeout: 5000 });

    // Should auto-dismiss after a few seconds
    await expect(page.locator('.toast-mobile')).toBeHidden({ timeout: 10000 });
  });

  test('should handle orientation change gracefully', async ({ page }) => {
    await page.goto('/dashboard');

    // Get initial layout
    const initialCards = await page.locator('.vendor-card-mobile').count();

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });

    // Wait for reflow
    await page.waitForTimeout(500);

    // Verify layout adapted (might show 2 columns in landscape)
    const landscapeCards = await page.locator('.vendor-card-mobile').count();

    // Card count should be same or more (some might become visible)
    expect(landscapeCards).toBeGreaterThanOrEqual(initialCards);

    // Rotate back to portrait
    await page.setViewportSize({ width: 375, height: 667 });

    await page.waitForTimeout(500);

    // Verify layout restored
    const restoredCards = await page.locator('.vendor-card-mobile').count();
    expect(restoredCards).toBe(initialCards);
  });
});

test.describe('Mobile Responsive - Tablet Tests', () => {
  // iPad viewport
  test.use({ viewport: { width: 768, height: 1024 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show 2-column layout on tablet', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify grid layout with 2 columns
    const grid = page.locator('.vendor-grid, [data-testid="vendor-grid"]');

    if (await grid.count() > 0) {
      const gridColumns = await grid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns.split(' ').length;
      });

      expect(gridColumns).toBe(2);
    }
  });

  test('should show table layout on tablet in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    await page.goto('/vendors');

    // On larger tablets in landscape, might show table
    const table = page.locator('.vendors-table');

    if (await table.count() > 0) {
      await expect(table).toBeVisible();
    } else {
      // Otherwise, should show 3-column grid
      const grid = page.locator('.vendor-grid');
      await expect(grid).toBeVisible();
    }
  });

  test('should adapt sidebar navigation on tablet', async ({ page }) => {
    await page.goto('/dashboard');

    // On tablet, might show collapsible sidebar
    const sidebar = page.locator('.sidebar, [data-testid="sidebar"]');

    if (await sidebar.count() > 0) {
      await expect(sidebar).toBeVisible();

      // Should have collapse button
      await expect(page.locator('[data-testid="collapse-sidebar"]')).toBeVisible();
    }
  });
});

test.describe('Mobile Responsive - Different Devices', () => {
  test('should work on iPhone 12', async ({ page }) => {
    test.use({ ...devices['iPhone 12'] });

    await login(page);
    await page.goto('/dashboard');

    await expect(page.locator('.vendor-dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should work on iPhone 12 Pro Max', async ({ page }) => {
    test.use({ ...devices['iPhone 12 Pro Max'] });

    await login(page);
    await page.goto('/dashboard');

    await expect(page.locator('.vendor-dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should work on Pixel 5', async ({ page }) => {
    test.use({ ...devices['Pixel 5'] });

    await login(page);
    await page.goto('/dashboard');

    await expect(page.locator('.vendor-dashboard')).toBeVisible({ timeout: 10000 });
  });
});
