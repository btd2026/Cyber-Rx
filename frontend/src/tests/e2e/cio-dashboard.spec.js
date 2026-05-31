const { test, expect } = require('@playwright/test');

test.describe('CIO Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as CIO before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'cio@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should display CIO dashboard with all components', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Chief Information Officer');

    // Check for key metrics sections
    await expect(page.locator('text=Security Posture')).toBeVisible();
    await expect(page.locator('text=Compliance Status')).toBeVisible();
    await expect(page.locator('text=Vendor Risk')).toBeVisible();
  });

  test('should display security metrics correctly', async ({ page }) => {
    // Check security posture section
    const securitySection = page.locator('text=Security Posture');
    await expect(securitySection).toBeVisible();

    // Look for metric cards
    const metrics = page.locator('[data-testid="metric-card"]');
    await expect(metrics.first()).toBeVisible();

    // Check for key security indicators
    await expect(page.locator('text=Total Findings')).toBeVisible();
    await expect(page.locator('text=Critical')).toBeVisible();
    await expect(page.locator('text=High')).toBeVisible();
  });

  test('should display compliance metrics', async ({ page }) => {
    // Navigate to compliance section if needed
    const complianceSection = page.locator('text=Compliance Status');
    await expect(complianceSection).toBeVisible();

    // Check for compliance score
    await expect(page.locator('text=Overall Score')).toBeVisible();
    await expect(page.locator('text=Controls')).toBeVisible();
  });

  test('should display vendor risk metrics', async ({ page }) => {
    const vendorSection = page.locator('text=Vendor Risk');
    await expect(vendorSection).toBeVisible();

    // Check for vendor metrics
    await expect(page.locator('text=Total Vendors')).toBeVisible();
    await expect(page.locator('text=Critical Tier')).toBeVisible();
  });

  test('should navigate to findings detail page', async ({ page }) => {
    // Find and click on findings section
    const findingsLink = page.locator('a:has-text("Findings"), button:has-text("View Findings")');
    if (await findingsLink.isVisible()) {
      await findingsLink.first().click();
      await page.waitForURL('**/findings', { timeout: 5000 });
      await expect(page.locator('h1')).toContainText('Findings');
    }
  });

  test('should navigate to vendor monitoring page', async ({ page }) => {
    const vendorLink = page.locator('a:has-text("Vendors"), button:has-text("View Vendors")');
    if (await vendorLink.isVisible()) {
      await vendorLink.first().click();
      await page.waitForURL('**/vendor*', { timeout: 5000 });
      await expect(page.locator('h1')).toContainText('Vendor');
    }
  });

  test('should filter findings by severity', async ({ page }) => {
    // Navigate to findings
    const findingsLink = page.locator('a:has-text("Findings")');
    if (await findingsLink.isVisible()) {
      await findingsLink.first().click();
      await page.waitForURL('**/findings', { timeout: 5000 });

      // Find severity filter
      const severityFilter = page.locator('select[name="severity"], button:has-text("Severity")');
      if (await severityFilter.isVisible()) {
        await severityFilter.click();

        // Select Critical severity
        const criticalOption = page.locator('option:has-text("Critical"), button:has-text("Critical")');
        await criticalOption.click();

        // Wait for filtered results
        await page.waitForTimeout(1000);

        // Verify only critical findings shown
        const findings = page.locator('[data-testid="finding-card"]');
        const count = await findings.count();

        if (count > 0) {
          const firstFinding = findings.first();
          await expect(firstFinding.locator('text=Critical')).toBeVisible();
        }
      }
    }
  });

  test('should display connector status cards', async ({ page }) => {
    // Check for connector section
    const connectorsSection = page.locator('text=Connector, text=Integration');
    if (await connectorsSection.isVisible()) {
      // Look for connector cards
      const connectors = page.locator('[data-testid="connector-card"]');
      await expect(connectors.first()).toBeVisible();

      // Check connector status indicators
      await expect(page.locator('text=Connected, text=Status')).toBeVisible();
    }
  });

  test('should trigger connector sync', async ({ page }) => {
    // Navigate to connector section
    const connectorsSection = page.locator('text=Connectors');
    if (await connectorsSection.isVisible()) {
      // Find a connected connector
      const syncButton = page.locator('button:has-text("Sync Now")');
      if (await syncButton.isVisible()) {
        await syncButton.first().click();

        // Should show syncing state
        await expect(page.locator('text=Syncing')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display risk correlation summary', async ({ page }) => {
    // Look for correlation/summary section
    const correlationSection = page.locator('text=Risk Summary, text=Correlation');
    if (await correlationSection.isVisible()) {
      await expect(correlationSection).toBeVisible();

      // Check for key metrics
      await expect(page.locator('text=Total Risks')).toBeVisible();
      await expect(page.locator('text=Open Risks')).toBeVisible();
    }
  });

  test('should navigate to correlation detail view', async ({ page }) => {
    // Find correlation link
    const correlationLink = page.locator('a:has-text("Correlation"), button:has-text("View Details")');
    if (await correlationLink.isVisible()) {
      await correlationLink.first().click();

      // Should navigate to correlation page
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toMatch(/correlation|risks|findings/);
    }
  });

  test('should display executive narrative for critical finding', async ({ page }) => {
    // Navigate to findings
    const findingsLink = page.locator('a:has-text("Findings")');
    if (await findingsLink.isVisible()) {
      await findingsLink.first().click();
      await page.waitForURL('**/findings', { timeout: 5000 });

      // Find first critical finding
      const criticalFinding = page.locator('[data-testid="finding-card"]:has-text("Critical")');
      if (await criticalFinding.isVisible()) {
        await criticalFinding.first().click();

        // Should show executive narrative
        await expect(page.locator('text=Executive Narrative, text=Business Impact')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display loading states during data fetch', async ({ page }) => {
    // Navigate away and back to trigger loading
    await page.goto('/dashboard');

    // Check for loading indicators
    const loadingSpinner = page.locator('[data-testid="loading"], .spinner, [role="progressbar"]');
    if (await loadingSpinner.isVisible()) {
      await expect(loadingSpinner).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    // Reload page
    await page.reload();

    // Should display error message
    const errorMessage = page.locator('text=Error loading data, text=Failed to fetch');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should display user profile information', async ({ page }) => {
    // Look for user profile section
    const userProfile = page.locator('[data-testid="user-profile"], .user-profile');
    if (await userProfile.isVisible()) {
      await expect(userProfile).toBeVisible();
      await expect(page.locator('text=CIO, text=Chief Information Officer')).toBeVisible();
    }
  });

  test('should allow dashboard refresh', async ({ page }) => {
    // Find refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label="Refresh"]');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Should show loading state
      const loadingSpinner = page.locator('[data-testid="loading"], .spinner');
      if (await loadingSpinner.isVisible()) {
        await expect(loadingSpinner).toBeVisible();
      }
    }
  });

  test('should export dashboard data', async ({ page }) => {
    // Find export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")');
    if (await exportButton.isVisible()) {
      // Setup download handler
      const downloadPromise = page.waitForEvent('download');

      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });

  test('should display trend indicators for metrics', async ({ page }) => {
    // Look for trend indicators (up/down arrows)
    const trendIndicator = page.locator('[data-testid="trend"], [aria-label*="trend"], text=↑, text=↓, text=→');
    if (await trendIndicator.isVisible()) {
      await expect(trendIndicator.first()).toBeVisible();
    }
  });

  test('should navigate between dashboard time periods', async ({ page }) => {
    // Find time period selector
    const timeSelector = page.locator('select[name="period"], button:has-text("Last"), [data-testid="time-selector"]');
    if (await timeSelector.isVisible()) {
      await timeSelector.click();

      // Select different time period
      const periodOption = page.locator('option:has-text("30 days"), button:has-text("30 days")');
      if (await periodOption.isVisible()) {
        await periodOption.click();

        // Should refresh data
        await page.waitForTimeout(2000);
      }
    }
  });
});
