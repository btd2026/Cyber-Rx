import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for CyberRx E2E tests
 *
 * This configuration supports:
 * - Multiple browsers (Chrome, Firefox, Safari, Edge)
 * - Mobile viewport testing (iOS, Android)
 * - Local development and CI environments
 * - Test artifacts (traces, screenshots, videos)
 * - Parallel test execution
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report/html' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    contextOptions: {
      // Ignore HTTPS errors for local testing
      ignoreHTTPSErrors: true,
    },
    // Action timeout for slower operations
    actionTimeout: 30000,
    // Navigation timeout
    navigationTimeout: 60000,
  },
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'edge',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'msedge',
      },
    },

    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro 11'] },
    },

    // Debug configuration
    {
      name: 'debug',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        actionTimeout: 0,
      },
      only: !!process.env.DEBUG,
    },
  ],
  // Local dev server for testing
  webServer: {
    command: 'cd ../../frontend && npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
