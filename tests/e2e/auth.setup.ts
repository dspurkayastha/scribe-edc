import { test as setup, expect } from '@playwright/test'
import path from 'path'

const STORAGE_STATE = path.join(__dirname, '.auth/user.json')

/**
 * Global authentication setup.
 *
 * This runs once before all authenticated test projects.
 * It logs in via the UI and saves the browser storage state
 * (cookies + localStorage) so subsequent tests skip the login step.
 *
 * Requires E2E_USER_EMAIL and E2E_USER_PASSWORD environment variables.
 */
setup('authenticate test user', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set. ' +
        'Add them to .env.local or export them in your shell.',
    )
  }

  // Navigate to login
  await page.goto('/login')
  await expect(page.getByText('SCRIBE EDC')).toBeVisible({ timeout: 15_000 })

  // Fill credentials and submit
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for successful navigation to select-study
  await page.waitForURL('**/select-study**', { timeout: 30_000 })
  await expect(page.getByText(/select a study|no studies found/i)).toBeVisible({ timeout: 15_000 })

  // Persist authentication state
  await page.context().storageState({ path: STORAGE_STATE })
})
