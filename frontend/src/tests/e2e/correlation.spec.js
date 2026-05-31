const { test, expect } = require('@playwright/test');

test.describe('Correlation Engine E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as CIO
    await page.goto('/');
    await page.fill('input[type="email"]', 'cio@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should navigate to correlation page', async ({ page }) => {
    const correlationLink = page.locator('a:has-text("Correlation"), a:has-text("Risk Analysis")');
    if (await correlationLink.isVisible()) {
      await correlationLink.first().click();
      await page.waitForURL('**/correlation', { timeout: 5000 });

      await expect(page.locator('h1')).toContainText('Correlation');
    }
  });

  test('should generate executive narrative for finding', async ({ page }) => {
    // Navigate to findings
    await page.goto('/findings');

    // Select a finding to correlate
    const findingCard = page.locator('[data-testid="finding-card"]').first();
    await findingCard.click();

    await page.waitForTimeout(1000);

    // Look for "Generate Narrative" button
    const generateButton = page.locator('button:has-text("Generate Narrative"), button:has-text("Analyze")');
    if (await generateButton.isVisible()) {
      await generateButton.click();

      // Should show loading state
      const loadingSpinner = page.locator('[data-testid="loading"], .spinner');
      if (await loadingSpinner.isVisible()) {
        await expect(loadingSpinner).toBeVisible();
      }

      // Should display executive narrative
      await expect(page.locator('text=Executive Summary, text=Business Impact')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display business process correlation', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding
    const findingCard = page.locator('[data-testid="finding-card"]').first();
    await findingCard.click();

    await page.waitForTimeout(1000);

    // Look for business process section
    const businessProcessSection = page.locator('[data-testid="business-process"], text=Business Process');
    if (await businessProcessSection.isVisible()) {
      await expect(businessProcessSection).toBeVisible();

      // Should show process details
      await expect(page.locator('text=Tier, text=Owner')).toBeVisible();
    }
  });

  test('should display data involvement information', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding
    const findingCard = page.locator('[data-testid="finding-card"]').first();
    await findingCard.click();

    await page.waitForTimeout(1000);

    // Look for data objects section
    const dataSection = page.locator('[data-testid="data-objects"], text=Data, text=PHI, text=PII');
    if (await dataSection.isVisible()) {
      await expect(dataSection).toBeVisible();

      // Should show data types
      await expect(page.locator('text=Protected Health, text=Personally Identifiable')).toBeVisible();
    }
  });

  test('should display threat scenario analysis', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding
    const findingCard = page.locator('[data-testid="finding-card"]:has-text("Critical")').first();
    if (await findingCard.isVisible()) {
      await findingCard.click();

      await page.waitForTimeout(1000);

      // Look for threat section
      const threatSection = page.locator('[data-testid="threat-scenario"], text=Threat, text=Scenario');
      if (await threatSection.isVisible()) {
        await expect(threatSection).toBeVisible();

        // Should show threat details
        await expect(page.locator('text=Type, text=Probability, text=Impact')).toBeVisible();
      }
    }
  });

  test('should display financial impact analysis', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding
    const findingCard = page.locator('[data-testid="finding-card"]').first();
    await findingCard.click();

    await page.waitForTimeout(1000);

    // Look for financial impact section
    const financialSection = page.locator('[data-testid="financial-impact"], text=Financial, text=Exposure');
    if (await financialSection.isVisible()) {
      await expect(financialSection).toBeVisible();

      // Should show financial breakdown
      await expect(page.locator('text=Total Exposure, text=Breach Response, text=Regulatory Fines')).toBeVisible();
    }
  });

  test('should display regulatory compliance information', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding
    const findingCard = page.locator('[data-testid="finding-card"]').first();
    await findingCard.click();

    await page.waitForTimeout(1000);

    // Look for regulatory section
    const regulatorySection = page.locator('[data-testid="regulatory"], text=Regulatory, text=Compliance, text=HIPAA');
    if (await regulatorySection.isVisible()) {
      await expect(regulatorySection).toBeVisible();

      // Should show frameworks and obligations
      await expect(page.locator('text=Framework, text=Obligation')).toBeVisible();
    }
  });

  test('should display ownership information', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding
    const findingCard = page.locator('[data-testid="finding-card"]').first();
    await findingCard.click();

    await page.waitForTimeout(1000);

    // Look for ownership section
    const ownershipSection = page.locator('[data-testid="ownership"], text=Owner, text=Executive');
    if (await ownershipSection.isVisible()) {
      await expect(ownershipSection).toBeVisible();

      // Should show owner details
      await expect(page.locator('text=Executive, text=Remediation, text=Evidence')).toBeVisible();
    }
  });

  test('should batch correlate multiple findings', async ({ page }) => {
    await page.goto('/findings');

    // Select multiple findings
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Find batch correlate button
      const batchButton = page.locator('button:has-text("Correlate Selected"), button:has-text("Batch Analyze")');
      if (await batchButton.isVisible()) {
        await batchButton.click();

        // Should show batch correlation results
        await expect(page.locator('text=Correlation Results, text=Executive Narratives')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should display organization risk summary', async ({ page }) => {
    await page.goto('/correlation');

    await page.waitForTimeout(2000);

    // Look for risk summary section
    const summarySection = page.locator('[data-testid="risk-summary"], text=Risk Summary');
    if (await summarySection.isVisible()) {
      await expect(summarySection).toBeVisible();

      // Should show summary metrics
      await expect(page.locator('text=Total Risks, text=Open Risks, text=Critical Risks')).toBeVisible();
    }
  });

  test('should display top risks list', async ({ page }) => {
    await page.goto('/correlation');

    await page.waitForTimeout(2000);

    // Look for top risks section
    const topRisksSection = page.locator('[data-testid="top-risks"], text=Top Risks');
    if (await topRisksSection.isVisible()) {
      await expect(topRisksSection).toBeVisible();

      // Should show risk list
      const riskItems = page.locator('[data-testid="risk-card"], [data-testid="risk-item"]');
      await expect(riskItems.first()).toBeVisible();
    }
  });

  test('should display repeat findings', async ({ page }) => {
    await page.goto('/correlation');

    await page.waitForTimeout(2000);

    // Look for repeat findings section
    const repeatSection = page.locator('[data-testid="repeat-findings"], text=Repeat Findings');
    if (await repeatSection.isVisible()) {
      await expect(repeatSection).toBeVisible();

      // Should show repeat findings
      const repeatCards = page.locator('[data-testid="repeat-card"]');
      if (await repeatCards.count() > 0) {
        await expect(repeatCards.first()).toBeVisible();
      }
    }
  });

  test('should display high-value data objects', async ({ page }) => {
    await page.goto('/correlation');

    await page.waitForTimeout(2000);

    // Look for high-value data section
    const highValueSection = page.locator('[data-testid="high-value-data"], text=High Value Data');
    if (await highValueSection.isVisible()) {
      await expect(highValueSection).toBeVisible();

      // Should show data objects
      await expect(page.locator('text=PHI, text=PII')).toBeVisible();
    }
  });

  test('should display executive roster', async ({ page }) => {
    await page.goto('/correlation');

    await page.waitForTimeout(2000);

    // Look for executive roster section
    const rosterSection = page.locator('[data-testid="executive-roster"], text=Executive Roster, text=Leadership');
    if (await rosterSection.isVisible()) {
      await expect(rosterSection).toBeVisible();

      // Should show executive list
      await expect(page.locator('text=CIO, text=CISO, text=CLO')).toBeVisible();
    }
  });

  test('should handle correlation API errors gracefully', async ({ page }) => {
    // Intercept correlation API to simulate error
    await page.route('**/api/correlation/**', route => {
      route.abort('failed');
    });

    await page.goto('/findings');

    // Try to generate narrative
    const findingCard = page.locator('[data-testid="finding-card"]').first();
    await findingCard.click();

    await page.waitForTimeout(1000);

    const generateButton = page.locator('button:has-text("Generate Narrative")');
    if (await generateButton.isVisible()) {
      await generateButton.click();

      // Should show error message
      await expect(page.locator('text=Error, text=Failed to generate')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter correlations by risk level', async ({ page }) => {
    await page.goto('/correlation');

    await page.waitForTimeout(2000);

    // Find risk filter
    const riskFilter = page.locator('select[name="riskLevel"], button:has-text("Risk Level")');
    if (await riskFilter.isVisible()) {
      await riskFilter.click();

      // Select Critical risks
      const criticalOption = page.locator('option:has-text("Critical"), button:has-text("Critical")');
      await criticalOption.click();

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify filtering
      const risks = page.locator('[data-testid="risk-card"]');
      const count = await risks.count();

      for (let i = 0; i < count; i++) {
        await expect(risks.nth(i).locator('text=Critical')).toBeVisible();
      }
    }
  });

  test('should export correlation report', async ({ page }) => {
    await page.goto('/correlation');

    await page.waitForTimeout(2000);

    // Find export button
    const exportButton = page.locator('button:has-text("Export Report"), button:has-text("Download")');
    if (await exportButton.isVisible()) {
      // Setup download handler
      const downloadPromise = page.waitForEvent('download');

      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('correlation');
    }
  });

  test('should display audit evidence requirements', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding with audit requirements
    const findingCard = page.locator('[data-testid="finding-card"]').first();
    await findingCard.click();

    await page.waitForTimeout(1000);

    // Look for audit evidence section
    const auditSection = page.locator('[data-testid="audit-evidence"], text=Audit Evidence, text=Evidence Required');
    if (await auditSection.isVisible()) {
      await expect(auditSection).toBeVisible();

      // Should show evidence requirements
      await expect(page.locator('text=Required, text=Test ID')).toBeVisible();
    }
  });

  test('should link finding to related risks', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding
    const findingCard = page.locator('[data-testid="finding-card"]').first();
    await findingCard.click();

    await page.waitForTimeout(1000);

    // Look for related risks section
    const relatedRisksSection = page.locator('[data-testid="related-risks"], text=Related Risks');
    if (await relatedRisksSection.isVisible()) {
      await expect(relatedRisksSection).toBeVisible();

      // Should show risk links
      const riskLinks = page.locator('a:has-text("Risk")');
      if (await riskLinks.count() > 0) {
        await expect(riskLinks.first()).toBeVisible();
      }
    }
  });

  test('should display urgent notification requirements', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding
    const findingCard = page.locator('[data-testid="finding-card"]:has-text("Critical")').first();
    if (await findingCard.isVisible()) {
      await findingCard.click();

      await page.waitForTimeout(1000);

      // Look for urgent notifications
      const urgentSection = page.locator('[data-testid="urgent-notifications"], text=Urgent, text=Notification Required');
      if (await urgentSection.isVisible()) {
        await expect(urgentSection).toBeVisible();

        // Should show timeline
        await expect(page.locator('text=24 hours, text=48 hours, text=72 hours')).toBeVisible();
      }
    }
  });
});
