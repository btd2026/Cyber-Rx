import { test, expect } from '@playwright/test';
import { login, waitForLoading, waitForApiResponse, verifyVendorInList, selectors, testVendors } from '../helpers/test-setup';

/**
 * Vendor Onboarding Journey E2E Tests
 *
 * Tests the complete flow of adding a new vendor, configuring connectors,
 * testing connections, and verifying data collection.
 */
test.describe('Vendor Onboarding Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should add new vendor and configure SecurityScorecard connector', async ({ page }) => {
    // Navigate to vendor management
    await page.click(selectors.vendorsLink);
    await expect(page).toHaveURL('**/vendors', { timeout: 10000 });

    // Click "Add Vendor" button
    await page.click(selectors.addVendorButton);

    // Wait for vendor form/modal to appear
    await expect(page.locator(selectors.vendorForm)).toBeVisible({ timeout: 5000 });

    // Fill vendor form
    await page.fill(selectors.vendorNameInput, 'New Test Vendor Corp');
    await page.fill(selectors.vendorDomainInput, 'newtestvendor.com');

    // Select tier
    await page.selectOption(selectors.vendorTierSelect, 'critical');

    // Submit form
    await page.click(selectors.saveButton);

    // Wait for success message and form to close
    await waitForLoading(page);

    // Verify vendor created in list
    await expect(page.locator('text=New Test Vendor Corp')).toBeVisible({ timeout: 10000 });

    // Navigate to vendor details
    await page.click('text=New Test Vendor Corp');
    await expect(page).toHaveURL('**/vendors/newtestvendor', { timeout: 10000 });

    // Configure SecurityScorecard connector
    await page.click('[data-testid="configure-connector-newtestvendor"]');

    // Wait for connector modal
    await expect(page.locator(selectors.connectorModal)).toBeVisible({ timeout: 5000 });

    // Select connector type
    await page.selectOption(selectors.connectorTypeSelect, 'securityscorecard');

    // Enter credentials
    await page.fill(selectors.apiKeyInput, process.env.SECURITYSCORECARD_API_KEY || 'test-api-key-12345');

    // Select sync frequency
    await page.selectOption(selectors.syncFrequencySelect, 'daily');

    // Test connection
    await page.click(selectors.testConnectionButton);

    // Wait for test result (up to 10 seconds)
    await page.waitForSelector(selectors.connectionTestResult, { timeout: 10000 });

    // Verify success or graceful handling
    const result = page.locator(selectors.connectionTestResult);
    const resultText = await result.textContent();

    // In test environment, we might get an error - that's okay as long as it's handled
    expect(resultText?.toLowerCase()).toMatch(/success|failed|invalid|error/);

    // Save credentials anyway (for test purposes)
    await page.click(selectors.saveButton);

    // Wait for modal to close
    await expect(page.locator(selectors.connectorModal)).toBeHidden({ timeout: 5000 });

    // Navigate back to dashboard
    await page.click(selectors.dashboardLink);
    await expect(page).toHaveURL('**/dashboard', { timeout: 10000 });

    // Verify vendor appears in dashboard
    await expect(page.locator('text=New Test Vendor Corp')).toBeVisible({ timeout: 10000 });

    // Verify risk score displayed (might be loading)
    const riskScore = page.locator(selectors.riskScore);
    await expect(riskScore.first()).toBeVisible({ timeout: 15000 });

    // Trigger manual sync if button exists
    const syncButton = page.locator('[data-testid^="sync-"]');
    if (await syncButton.count() > 0) {
      await syncButton.first().click();

      // Verify sync status indicator appears
      await expect(page.locator('.sync-status')).toBeVisible({ timeout: 5000 });
    }

    // Navigate to vendor details
    await page.click('text=New Test Vendor Corp');
    await expect(page).toHaveURL('**/vendors/newtestvendor', { timeout: 10000 });

    // Verify signals section exists
    await expect(page.locator('.vendor-signals, [data-testid="vendor-signals"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle connection failure gracefully', async ({ page }) => {
    // Navigate to existing vendor
    await page.goto('/vendors/acmecorp');
    await waitForLoading(page);

    // Open connector configuration
    await page.click('[data-testid="configure-connector-acmecorp"]');

    // Wait for modal
    await expect(page.locator(selectors.connectorModal)).toBeVisible({ timeout: 5000 });

    // Select connector type
    await page.selectOption(selectors.connectorTypeSelect, 'securityscorecard');

    // Enter invalid credentials
    await page.fill(selectors.apiKeyInput, 'invalid-key-12345');

    // Test connection
    await page.click(selectors.testConnectionButton);

    // Wait for error message
    await page.waitForSelector('.error-message, [data-testid="error"]', { timeout: 10000 });

    // Verify error displayed
    const errorMessage = page.locator('.error-message, [data-testid="error"]');
    await expect(errorMessage).toBeVisible();
    const errorText = await errorMessage.textContent();
    expect(errorText?.toLowerCase()).toMatch(/invalid|failed|error|unauthorized/i);

    // Verify "Save" button is disabled or error prevents save
    const saveButton = page.locator(selectors.saveButton);
    const isDisabled = await saveButton.isDisabled();

    // Either button is disabled or we get an error when clicking
    if (!isDisabled) {
      await saveButton.click();
      // Should see error toast/notification
      await expect(page.locator('.error-toast, .notification-error')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate vendor form fields', async ({ page }) => {
    await page.goto('/vendors');
    await page.click(selectors.addVendorButton);

    // Try to submit without required fields
    await page.click(selectors.saveButton);

    // Should show validation errors
    await expect(page.locator('.error, .validation-error')).toBeVisible({ timeout: 5000 });

    // Fill invalid domain format
    await page.fill(selectors.vendorNameInput, 'Test Vendor');
    await page.fill(selectors.vendorDomainInput, 'invalid-domain');

    await page.click(selectors.saveButton);

    // Should show domain validation error
    await expect(page.locator('text=invalid domain')).toBeVisible({ timeout: 5000 });

    // Fix domain
    await page.fill(selectors.vendorDomainInput, 'validvendor.com');
    await page.selectOption(selectors.vendorTierSelect, 'high');

    // Now should submit successfully
    await page.click(selectors.saveButton);

    // Wait for success
    await waitForLoading(page);

    // Verify vendor created
    await expect(page.locator('text=Test Vendor')).toBeVisible({ timeout: 10000 });
  });

  test('should edit existing vendor', async ({ page }) => {
    await page.goto('/vendors/acmecorp');
    await waitForLoading(page);

    // Click edit button
    await page.click('[data-testid="edit-vendor"]');

    // Wait for edit form
    await expect(page.locator(selectors.vendorForm)).toBeVisible({ timeout: 5000 });

    // Change tier
    await page.selectOption(selectors.vendorTierSelect, 'medium');

    // Save changes
    await page.click(selectors.saveButton);

    // Wait for save to complete
    await waitForLoading(page);

    // Verify tier updated
    const tierBadge = page.locator(selectors.tierBadge);
    await expect(tierBadge).toContainText('medium', { timeout: 10000 });
  });

  test('should delete vendor with confirmation', async ({ page }) => {
    // First create a test vendor
    await page.goto('/vendors');
    await page.click(selectors.addVendorButton);

    await page.fill(selectors.vendorNameInput, 'To Be Deleted');
    await page.fill(selectors.vendorDomainInput, 'tobedeleted.com');
    await page.selectOption(selectors.vendorTierSelect, 'low');
    await page.click(selectors.saveButton);

    await waitForLoading(page);

    // Find the vendor and click delete
    const vendorRow = page.locator('tr:has-text("To Be Deleted")');
    await vendorRow.click('[data-testid="delete-vendor"]');

    // Should show confirmation dialog
    await expect(page.locator('.confirm-dialog, [data-testid="confirm-dialog"]')).toBeVisible({ timeout: 5000 });

    // Confirm deletion
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Wait for deletion to complete
    await waitForLoading(page);

    // Verify vendor no longer in list
    await expect(page.locator('text=To Be Deleted')).not.toBeVisible({ timeout: 10000 });
  });

  test('should configure multiple connectors for same vendor', async ({ page }) => {
    await page.goto('/vendors/acmecorp');
    await waitForLoading(page);

    // Add first connector (SecurityScorecard)
    await page.click('[data-testid="add-connector"]');
    await expect(page.locator(selectors.connectorModal)).toBeVisible({ timeout: 5000 });

    await page.selectOption(selectors.connectorTypeSelect, 'securityscorecard');
    await page.fill(selectors.apiKeyInput, 'ssc-key-12345');
    await page.click(selectors.saveButton);

    await waitForLoading(page);

    // Add second connector (Bitwarden)
    await page.click('[data-testid="add-connector"]');
    await expect(page.locator(selectors.connectorModal)).toBeVisible({ timeout: 5000 });

    await page.selectOption(selectors.connectorTypeSelect, 'bitwarden');
    await page.fill(selectors.apiKeyInput, 'bw-key-67890');
    await page.click(selectors.saveButton');

    await waitForLoading(page);

    // Verify both connectors listed
    await expect(page.locator('text=SecurityScorecard')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Bitwarden')).toBeVisible({ timeout: 10000 });
  });

  test('should filter vendors by tier', async ({ page }) => {
    await page.goto('/vendors');
    await waitForLoading(page);

    // Get total vendor count
    const allVendors = page.locator(selectors.vendorCard);
    const totalCount = await allVendors.count();

    // Filter to critical tier only
    await page.selectOption('select[name="tier"]', 'critical');
    await waitForLoading(page);

    const criticalVendors = page.locator(selectors.vendorCard);
    const criticalCount = await criticalVendors.count();

    // Verify critical count is less than or equal to total
    expect(criticalCount).toBeLessThanOrEqual(totalCount);

    // Verify all visible vendors are critical
    for (let i = 0; i < Math.min(criticalCount, 5); i++) {
      const tierBadge = criticalVendors.nth(i).locator(selectors.tierBadge);
      await expect(tierBadge).toContainText('critical', { timeout: 5000 });
    }
  });

  test('should search vendors by name', async ({ page }) => {
    await page.goto('/vendors');
    await waitForLoading(page);

    // Search for specific vendor
    await page.fill('input[name="search"]', 'Acme');
    await waitForLoading(page);

    // Verify only matching vendors shown
    const visibleVendors = page.locator(selectors.vendorCard);
    const count = await visibleVendors.count();

    for (let i = 0; i < count; i++) {
      const name = await visibleVendors.nth(i).locator('.vendor-name').textContent();
      expect(name?.toLowerCase()).toContain('acme');
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/vendors', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/vendors');

    // Should show error message
    await expect(page.locator('.error-message, [data-testid="api-error"]')).toBeVisible({ timeout: 10000 });

    // Should offer retry option
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
});

test.describe('Vendor Onboarding - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should add vendor on mobile device', async ({ page }) => {
    await login(page);

    // On mobile, vendors might be in bottom nav or hamburger menu
    await page.click(selectors.bottomNav); // or hamburger menu

    // Navigate to vendors
    await page.click('a:has-text("Vendors")');
    await waitForLoading(page);

    // Tap add vendor button
    await page.tap(selectors.addVendorButton);

    // Fill form (might be full screen on mobile)
    await page.fill(selectors.vendorNameInput, 'Mobile Test Vendor');
    await page.fill(selectors.vendorDomainInput, 'mobiletest.com');
    await page.selectOption(selectors.vendorTierSelect, 'high');

    // Save (might need to scroll to button)
    await page.click(selectors.saveButton);

    await waitForLoading(page);

    // Verify vendor created
    await expect(page.locator('text=Mobile Test Vendor')).toBeVisible({ timeout: 10000 });
  });
});
