import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Playwright E2E configuration for SCRIBE EDC.
 *
 * Environment variables used:
 *   E2E_USER_EMAIL     - test user email (required for authenticated tests)
 *   E2E_USER_PASSWORD  - test user password (required for authenticated tests)
 *   E2E_ORG_SLUG       - org slug the test user belongs to (default: first available)
 *   E2E_STUDY_SLUG     - study slug the test user belongs to (default: first available)
 */

const STORAGE_STATE = path.join(__dirname, 'tests/e2e/.auth/user.json')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Setup project that logs in and saves auth state
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Tests that do NOT require authentication
    {
      name: 'unauthenticated',
      testMatch: /auth\.spec\.ts|marketing\.spec\.ts|study-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Tests that require authentication — depend on setup
    {
      name: 'chromium',
      testIgnore: /auth\.spec\.ts|marketing\.spec\.ts|study-flow\.spec\.ts|auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
