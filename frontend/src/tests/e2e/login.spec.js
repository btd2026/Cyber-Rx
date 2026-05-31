const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/CyberRx/);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]');

    // Check for error messages
    const emailError = page.locator('text=Email is required');
    const passwordError = page.locator('text=Password is required');

    await expect(emailError.or(passwordError)).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    const error = page.locator('text=Invalid email format');
    await expect(error).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for API response
    await page.waitForTimeout(1000);

    const error = page.locator('text=Invalid credentials');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'cio@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verify dashboard is loaded
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.fill('input[type="email"]', 'cio@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Check URL
    expect(page.url()).toContain('/dashboard');
  });

  test('should store authentication token', async ({ page }) => {
    await page.fill('input[type="email"]', 'cio@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Check localStorage for token
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'cio@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
    await logoutButton.click();

    // Verify redirected to login
    await page.waitForURL('/', { timeout: 5000 });

    // Check token is removed
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).toBeNull();
  });

  test('should remember user with "Remember Me" checkbox', async ({ page }) => {
    await page.fill('input[type="email"]', 'cio@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');

    // Check "Remember Me" if it exists
    const rememberMe = page.locator('input[type="checkbox"]');
    if (await rememberMe.isVisible()) {
      await rememberMe.check();
    }

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Check if email is stored
    const rememberedEmail = await page.evaluate(() => localStorage.getItem('rememberedEmail'));
    if (await rememberMe.isVisible()) {
      expect(rememberedEmail).toBe('cio@testbcbs.com');
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure by intercepting request
    await page.route('**/api/auth/login', route => {
      route.abort('failed');
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    const error = page.locator('text=Network error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('should disable submit button while loading', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Button should be disabled during loading
    await expect(submitButton).toBeDisabled();
  });
});

test.describe('Multi-Factor Authentication (MFA)', () => {
  test('should request MFA code after login', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'mfa-user@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show MFA input
    const mfaInput = page.locator('input[type="text"][maxlength="6"], input[name="mfaCode"]');
    await expect(mfaInput).toBeVisible({ timeout: 5000 });
  });

  test('should validate MFA code format', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'mfa-user@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for MFA screen
    const mfaInput = page.locator('input[type="text"][maxlength="6"]');
    await expect(mfaInput).toBeVisible({ timeout: 5000 });

    // Enter invalid code
    await mfaInput.fill('abc');
    await page.click('button:has-text("Verify")');

    const error = page.locator('text=Invalid code format');
    await expect(error).toBeVisible();
  });

  test('should complete MFA flow successfully', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'mfa-user@testbcbs.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for MFA screen
    const mfaInput = page.locator('input[type="text"][maxlength="6"]');
    await expect(mfaInput).toBeVisible({ timeout: 5000 });

    // Enter valid MFA code (would be mocked in real scenario)
    await mfaInput.fill('123456');
    await page.click('button:has-text("Verify")');

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
