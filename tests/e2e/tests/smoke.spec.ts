import { test, expect } from '@playwright/test';

/**
 * Smoke tests - Verify core functionality
 * These tests run after every deployment
 */

test.describe('@smoke Smoke Tests', () => {
  test('@smoke @api API health check', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status', 'healthy');
  });

  test('@smoke @ui Frontend loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that page loads without errors
    await expect(page).toHaveTitle(/CyberRx/);
    
    // Check for critical elements
    await expect(page.locator('nav')).toBeVisible();
  });

  test('@smoke @auth Authentication works', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in login form
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@cyberrx.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'testpass123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should be redirected to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('@smoke @api Database connectivity', async ({ request }) => {
    const response = await request.get('/api/users/me');
    
    // Should return 401 without auth, but 500 if DB is down
    expect(response.status()).not.toBe(500);
  });

  test('@smoke @api Cache connectivity', async ({ request }) => {
    const response = await request.get('/api/health/cache');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('cache', 'connected');
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
    expect(duration).beLessThan(3000); // Should load within 3 seconds
  });
});
