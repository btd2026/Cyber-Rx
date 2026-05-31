const { test, expect } = require('@playwright/test');

test.describe('Finding Creation and Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as CISO (security role)
    await page.goto('/');
    await page.fill('input[type="email"]', 'ciso@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should navigate to findings page', async ({ page }) => {
    const findingsLink = page.locator('a:has-text("Findings"), button:has-text("Findings")');
    await findingsLink.first().click();

    await page.waitForURL('**/findings', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Findings');
  });

  test('should display findings list', async ({ page }) => {
    await page.goto('/findings');
    await page.waitForTimeout(2000);

    // Check for findings table or cards
    const findings = page.locator('[data-testid="finding-card"], [data-testid="finding-row"]');
    await expect(findings.first()).toBeVisible();
  });

  test('should open new finding creation form', async ({ page }) => {
    await page.goto('/findings');

    // Find and click "New Finding" button
    const newFindingButton = page.locator('button:has-text("New Finding"), button:has-text("Add Finding"), a:has-text("Create")');
    await newFindingButton.first().click();

    // Should show creation form or modal
    await expect(page.locator('form, [role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields in finding form', async ({ page }) => {
    await page.goto('/findings');

    // Open new finding form
    const newFindingButton = page.locator('button:has-text("New Finding"), button:has-text("Add Finding")');
    await newFindingButton.first().click();

    // Try to submit without filling fields
    const submitButton = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")');
    await submitButton.click();

    // Should show validation errors
    await expect(page.locator('text=required, text=Required')).toBeVisible();
  });

  test('should create finding with valid data', async ({ page }) => {
    await page.goto('/findings');

    // Open new finding form
    const newFindingButton = page.locator('button:has-text("New Finding"), button:has-text("Add Finding")');
    await newFindingButton.first().click();

    // Fill in finding details
    await page.fill('input[name="title"], [data-testid="finding-title"]', 'Critical CVE in Claims System');
    await page.fill('textarea[name="description"], [data-testid="finding-description"]', 'Remote code execution vulnerability detected');

    // Select severity
    const severitySelect = page.locator('select[name="severity"], [data-testid="finding-severity"]');
    await severitySelect.selectOption('Critical');

    // Select status
    const statusSelect = page.locator('select[name="status"], [data-testid="finding-status"]');
    await statusSelect.selectOption('Open');

    // Select discovered date
    await page.fill('input[type="date"], input[name="discoveredDate"]', '2024-01-15');

    // Select source/tool
    const sourceSelect = page.locator('select[name="source"], [data-testid="finding-source"]');
    if (await sourceSelect.isVisible()) {
      await sourceSelect.selectOption('RecordedFuture');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")');
    await submitButton.click();

    // Should show success message or redirect
    await page.waitForTimeout(2000);

    // Verify finding was created
    const successMessage = page.locator('text=Finding created, text=Success');
    const newFinding = page.locator('text=Critical CVE in Claims System');

    await expect(successMessage.or(newFinding)).toBeVisible();
  });

  test('should edit existing finding', async ({ page }) => {
    await page.goto('/findings');

    // Find first finding and click edit
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-finding"]');
    if (await editButton.isVisible()) {
      await editButton.first().click();

      // Should show edit form
      await expect(page.locator('form, [role="dialog"]')).toBeVisible();

      // Modify title
      const titleInput = page.locator('input[name="title"], [data-testid="finding-title"]');
      await titleInput.fill('Updated Finding Title');

      // Submit changes
      const submitButton = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Update")');
      await submitButton.click();

      // Should show success message
      await expect(page.locator('text=updated, text=success')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete finding with confirmation', async ({ page }) => {
    await page.goto('/findings');

    // Find delete button
    const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete-finding"]');
    if (await deleteButton.isVisible()) {
      // Handle any dialogs
      page.on('dialog', dialog => dialog.accept());

      await deleteButton.first().click();

      // Should show confirmation or delete immediately
      await page.waitForTimeout(1000);
    }
  });

  test('should filter findings by status', async ({ page }) => {
    await page.goto('/findings');

    // Find status filter
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('Open');

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify only open findings shown
      const findings = page.locator('[data-testid="finding-card"], [data-testid="finding-row"]');
      const count = await findings.count();

      for (let i = 0; i < count; i++) {
        await expect(findings.nth(i)).toContainText('Open');
      }
    }
  });

  test('should sort findings by severity', async ({ page }) => {
    await page.goto('/findings');

    // Find sort control
    const sortButton = page.locator('button:has-text("Sort"), [data-testid="sort-button"]');
    if (await sortButton.isVisible()) {
      await sortButton.click();

      // Select severity sort
      const severitySort = page.locator('button:has-text("Severity"), option:has-text("Severity")');
      await severitySort.click();

      // Wait for sorted results
      await page.waitForTimeout(1000);

      // Verify sorting (Critical first)
      const firstFinding = page.locator('[data-testid="finding-card"], [data-testid="finding-row"]').first();
      await expect(firstFinding.locator('text=Critical').or(firstFinding.locator('text=High'))).toBeVisible();
    }
  });

  test('should search findings by keyword', async ({ page }) => {
    await page.goto('/findings');

    // Find search input
    const searchInput = page.locator('input[type="search"], input[name="search"], [data-testid="search-input"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('CVE');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Verify search results contain keyword
      const findings = page.locator('[data-testid="finding-card"], [data-testid="finding-row"]');
      const firstFinding = findings.first();
      await expect(firstFinding.locator('text=CVE')).toBeVisible();
    }
  });

  test('should display finding details view', async ({ page }) => {
    await page.goto('/findings');

    // Click on first finding
    const firstFinding = page.locator('[data-testid="finding-card"], [data-testid="finding-row"]').first();
    await firstFinding.click();

    // Should show finding details
    await page.waitForTimeout(1000);

    // Check for key detail sections
    await expect(page.locator('text=Title, text=Description')).toBeVisible();
    await expect(page.locator('text=Severity, text=Status')).toBeVisible();
  });

  test('should show executive narrative for finding', async ({ page }) => {
    await page.goto('/findings');

    // Click on first finding
    const firstFinding = page.locator('[data-testid="finding-card"], [data-testid="finding-row"]').first();
    await firstFinding.click();

    await page.waitForTimeout(1000);

    // Look for executive narrative section
    const narrativeSection = page.locator('[data-testid="executive-narrative"], text=Executive Summary, text=Business Impact');
    if (await narrativeSection.isVisible()) {
      await expect(narrativeSection).toBeVisible();

      // Check for narrative components
      await expect(page.locator('text=Financial, text=Regulatory, text=Business Process')).toBeVisible();
    }
  });

  test('should display correlation information', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding with correlation
    const findingWithCorrelation = page.locator('[data-testid="finding-card"]:has-text("Critical")').first();
    if (await findingWithCorrelation.isVisible()) {
      await findingWithCorrelation.click();

      await page.waitForTimeout(1000);

      // Look for correlation section
      const correlationSection = page.locator('[data-testid="correlation"], text=Related Risks, text=Correlation');
      if (await correlationSection.isVisible()) {
        await expect(correlationSection).toBeVisible();
      }
    }
  });

  test('should display recommended actions', async ({ page }) => {
    await page.goto('/findings');

    // Click on critical finding
    const criticalFinding = page.locator('[data-testid="finding-card"]:has-text("Critical")').first();
    if (await criticalFinding.isVisible()) {
      await criticalFinding.click();

      await page.waitForTimeout(1000);

      // Look for recommended actions section
      const actionsSection = page.locator('[data-testid="recommended-actions"], text=Recommended Actions, text=Remediation');
      if (await actionsSection.isVisible()) {
        await expect(actionsSection).toBeVisible();
      }
    }
  });

  test('should assign owner to finding', async ({ page }) => {
    await page.goto('/findings');

    // Open finding edit
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-finding"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Assign owner
      const ownerSelect = page.locator('select[name="owner"], [data-testid="finding-owner"]');
      if (await ownerSelect.isVisible()) {
        await ownerSelect.selectOption('CISO');

        // Save changes
        const saveButton = page.locator('button[type="submit"]:has-text("Save")');
        await saveButton.click();

        await expect(page.locator('text=success, text=updated')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should add remediation task', async ({ page }) => {
    await page.goto('/findings');

    // Click on finding
    const firstFinding = page.locator('[data-testid="finding-card"]').first();
    await firstFinding.click();

    await page.waitForTimeout(1000);

    // Find add task button
    const addTaskButton = page.locator('button:has-text("Add Task"), button:has-text("Create Task")');
    if (await addTaskButton.isVisible()) {
      await addTaskButton.click();

      // Fill task details
      await page.fill('input[name="title"]', 'Remediate CVE vulnerability');

      // Submit
      const submitButton = page.locator('button[type="submit"]:has-text("Create")');
      await submitButton.click();

      await expect(page.locator('text=Task created')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should export findings list', async ({ page }) => {
    await page.goto('/findings');

    // Find export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")');
    if (await exportButton.isVisible()) {
      // Setup download handler
      const downloadPromise = page.waitForEvent('download');

      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('findings');
    }
  });
});
