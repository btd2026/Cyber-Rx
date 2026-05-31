import { test, expect } from '@playwright/test';
import { login, waitForLoading, selectors } from '../helpers/test-setup';

/**
 * Credential Rotation Journey E2E Tests
 *
 * Tests the complete flow of viewing credential status,
 * rotating credentials, and managing credential versions.
 */
test.describe('Credential Rotation Journey', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view credentials list', async ({ page }) => {
    // Navigate to credentials/settings page
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Verify credentials list visible
    await expect(page.locator('.credentials-list, [data-testid="credentials-list"]')).toBeVisible({ timeout: 10000 });

    // Verify credential items
    const credentials = page.locator(selectors.credentialItem);
    expect(await credentials.count()).toBeGreaterThan(0);
  });

  test('should view credential rotation status', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Find a credential with rotation status
    const firstCredential = page.locator(selectors.credentialItem).first();

    // Verify rotation status badge visible
    await expect(firstCredential.locator('.rotation-status, [data-testid="rotation-status"]')).toBeVisible({ timeout: 5000 });

    // Verify rotation status is one of: active, overdue, expiring
    const statusText = await firstCredential.locator('.rotation-status').textContent();
    expect(statusText?.toLowerCase()).toMatch(/active|overdue|expiring/);
  });

  test('should view credential details', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Click on first credential
    await page.locator(selectors.credentialItem).first().click();

    // Should open credential details
    await expect(page.locator('.credential-details, [data-testid="credential-details"]')).toBeVisible({ timeout: 5000 });

    // Verify details sections
    await expect(page.locator('.credential-name')).toBeVisible();
    await expect(page.locator('.credential-type')).toBeVisible();
    await expect(page.locator('.rotation-status')).toBeVisible();
    await expect(page.locator('.last-rotated')).toBeVisible();
    await expect(page.locator('.expires-at')).toBeVisible();
  });

  test('should rotate overdue credential', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Find overdue credential
    const overdueCredential = page.locator('.credential-item.overdue, [data-status="overdue"]').first();

    if (await overdueCredential.count() > 0) {
      // Click on overdue credential
      await overdueCredential.click();

      // Verify rotation status displayed
      await expect(page.locator('.credential-rotation, [data-testid="credential-rotation"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.rotation-status')).toContainText('overdue', { timeout: 5000 });

      // Click "Rotate Now" button
      await page.click('button:has-text("Rotate Now"), [data-testid="rotate-now"]');

      // Wait for rotation modal
      await expect(page.locator(selectors.rotationModal)).toBeVisible({ timeout: 5000 });

      // Verify modal shows current and new credential fields
      await expect(page.locator('input[name="currentApiKey"]')).toBeVisible();
      await expect(page.locator('input[name="newApiKey"]')).toBeVisible();
      await expect(page.locator('input[name="confirmApiKey"]')).toBeVisible();

      // Enter new credentials
      await page.fill('input[name="currentApiKey"]', 'old-key-12345');
      await page.fill('input[name="newApiKey"]', 'new-api-key-67890');
      await page.fill('input[name="confirmApiKey"]', 'new-api-key-67890');

      // Submit rotation
      await page.click('button:has-text("Rotate")');

      // Wait for success message
      await expect(page.locator('.success-message, [data-testid="success-toast"]')).toBeVisible({ timeout: 10000 });

      // Verify version incremented
      await expect(page.locator('.credential-version')).toContainText(/v\d+/, { timeout: 5000 });

      // Verify rotation status updated to "active"
      await expect(page.locator('.rotation-status')).toContainText('active', { timeout: 5000 });
    }
  });

  test('should validate credential rotation fields', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Click on a credential
    await page.locator(selectors.credentialItem).first().click();
    await page.click('button:has-text("Rotate Now")');

    // Try to submit without filling fields
    await page.click('button:has-text("Rotate")');

    // Should show validation errors
    await expect(page.locator('.error, .validation-error')).toBeVisible({ timeout: 5000 });

    // Fill mismatched confirmation
    await page.fill('input[name="currentApiKey"]', 'old-key');
    await page.fill('input[name="newApiKey"]', 'new-key');
    await page.fill('input[name="confirmApiKey"]', 'different-key');

    await page.click('button:has-text("Rotate")');

    // Should show mismatch error
    await expect(page.locator('text=do not match')).toBeVisible({ timeout: 5000 });
  });

  test('should view credential rotation history', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Click on a credential
    await page.locator(selectors.credentialItem).first().click();

    // Scroll to rotation history
    await page.locator(selectors.rotationHistory).scrollIntoViewIfNeeded();

    // Verify history section visible
    await expect(page.locator(selectors.rotationHistory)).toBeVisible({ timeout: 5000 });

    // Verify history entries
    const historyEntries = page.locator('.rotation-history li, .history-entry');
    expect(await historyEntries.count()).toBeGreaterThanOrEqual(1);

    // Verify each entry has required fields
    for (let i = 0; i < Math.min(await historyEntries.count(), 3); i++) {
      await expect(historyEntries.nth(i).locator('.version')).toBeVisible();
      await expect(historyEntries.nth(i).locator('.rotated-at')).toBeVisible();
      await expect(historyEntries.nth(i).locator('.rotated-by')).toBeVisible();
    }
  });

  test('should schedule future credential rotation', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Click on a credential
    await page.locator(selectors.credentialItem).first().click();

    // Click "Schedule Rotation" button
    await page.click('button:has-text("Schedule Rotation"), [data-testid="schedule-rotation"]');

    // Wait for schedule modal
    await expect(page.locator('.schedule-modal')).toBeVisible({ timeout: 5000 });

    // Select future date (30 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    await page.fill('input[name="scheduleDate"]', futureDate.toISOString().split('T')[0]);

    // Submit schedule
    await page.click('button:has-text("Schedule")');

    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });

    // Verify scheduled rotation shown
    await expect(page.locator('.scheduled-rotation')).toContainText(futureDate.toISOString().split('T')[0]);
  });

  test('should cancel credential rotation in progress', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Start rotation
    await page.locator(selectors.credentialItem).first().click();
    await page.click('button:has-text("Rotate Now")');

    // Fill form
    await page.fill('input[name="currentApiKey"]', 'old-key');
    await page.fill('input[name="newApiKey"]', 'new-key');
    await page.fill('input[name="confirmApiKey"]', 'new-key');

    // Instead of rotating, cancel
    await page.click('button:has-text("Cancel")');

    // Verify modal closed
    await expect(page.locator(selectors.rotationModal)).toBeHidden({ timeout: 5000 });

    // Verify no new version created
    const currentVersion = await page.locator('.credential-version').textContent();
    expect(currentVersion).toMatch(/v1/);
  });

  test('should rotate credential before expiration', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Find expiring credential (not yet expired)
    const expiringCredential = page.locator('[data-status="expiring"], .credential-item.expiring').first();

    if (await expiringCredential.count() > 0) {
      await expiringCredential.click();

      // Verify shows warning but not error
      await expect(page.locator('.warning-message')).toContainText('expiring soon');

      // Rotate anyway
      await page.click('button:has-text("Rotate Now")');

      await page.fill('input[name="currentApiKey"]', 'current-key');
      await page.fill('input[name="newApiKey"]', 'new-key-123');
      await page.fill('input[name="confirmApiKey"]', 'new-key-123');

      await page.click('button:has-text("Rotate")');

      // Verify success
      await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });

      // Verify status updated
      await expect(page.locator('.rotation-status')).toContainText('active');
    }
  });

  test('should filter credentials by status', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Filter to show only overdue credentials
    await page.selectOption('select[name="status"]', 'overdue');
    await waitForLoading(page);

    // Verify all shown credentials are overdue
    const credentials = page.locator(selectors.credentialItem);
    const count = await credentials.count();

    for (let i = 0; i < count; i++) {
      await expect(credentials.nth(i)).toHaveAttribute('data-status', 'overdue');
    }
  });

  test('should filter credentials by type', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Filter to show only SecurityScorecard credentials
    await page.selectOption('select[name="type"]', 'securityscorecard');
    await waitForLoading(page);

    // Verify all shown credentials are SecurityScorecard
    const credentials = page.locator(selectors.credentialItem);
    const count = await credentials.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const type = await credentials.nth(i).locator('.credential-type').textContent();
      expect(type?.toLowerCase()).toContain('securityscorecard');
    }
  });

  test('should search credentials by vendor name', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Search for specific vendor
    await page.fill('input[name="search"]', 'Acme');
    await waitForLoading(page);

    // Verify search results
    const credentials = page.locator(selectors.credentialItem);
    const count = await credentials.count();

    for (let i = 0; i < count; i++) {
      const vendorName = await credentials.nth(i).locator('.vendor-name').textContent();
      expect(vendorName?.toLowerCase()).toContain('acme');
    }
  });

  test('should export credential report', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export Report"), [data-testid="export-credentials"]');

    const download = await downloadPromise;

    // Verify PDF/CSV downloaded
    expect(download.suggestedFilename()).toMatch(/credentials.*\.(pdf|csv)$/);
  });

  test('should handle rotation errors gracefully', async ({ page }) => {
    // Mock rotation API error
    await page.route('**/api/credentials/*/rotate', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rotation failed' })
      });
    });

    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Attempt rotation
    await page.locator(selectors.credentialItem).first().click();
    await page.click('button:has-text("Rotate Now")');

    await page.fill('input[name="currentApiKey"]', 'old-key');
    await page.fill('input[name="newApiKey"]', 'new-key');
    await page.fill('input[name="confirmApiKey"]', 'new-key');

    await page.click('button:has-text("Rotate")');

    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });

    // Should offer retry
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should view credential usage statistics', async ({ page }) => {
    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Scroll to statistics section
    await page.locator('.credential-stats, [data-testid="credential-stats"]').scrollIntoViewIfNeeded();

    // Verify statistics visible
    await expect(page.locator('text=Total Credentials')).toBeVisible();
    await expect(page.locator('text=Active')).toBeVisible();
    await expect(page.locator('text=Overdue')).toBeVisible();
    await expect(page.locator('text=Expiring')).toBeVisible();
  });
});

test.describe('Credential Rotation - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should rotate credential on mobile device', async ({ page }) => {
    await login(page);

    await page.goto('/settings/credentials');
    await waitForLoading(page);

    // Tap on first credential
    await page.tap(selectors.credentialItem);

    // Verify mobile-friendly credential details
    await expect(page.locator('.credential-details-mobile')).toBeVisible({ timeout: 5000 });

    // Tap rotate button
    await page.tap('button:has-text("Rotate Now")');

    // Verify mobile modal
    await expect(page.locator('.rotation-modal-mobile')).toBeVisible({ timeout: 5000 });

    // Fill credentials
    await page.fill('input[name="currentApiKey"]', 'old-key');
    await page.fill('input[name="newApiKey"]', 'new-key');
    await page.fill('input[name="confirmApiKey"]', 'new-key');

    // Submit
    await page.tap('button:has-text("Rotate")');

    // Verify success
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
  });
});
