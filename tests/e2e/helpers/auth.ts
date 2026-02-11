import { type Page, expect } from '@playwright/test'

/**
 * Test user credentials loaded from environment variables.
 *
 * Set E2E_USER_EMAIL and E2E_USER_PASSWORD in your .env.local or CI environment.
 */
export const TEST_USER = {
  email: process.env.E2E_USER_EMAIL ?? '',
  password: process.env.E2E_USER_PASSWORD ?? '',
}

/**
 * Log in interactively via the login page.
 * After login the page should redirect to /select-study.
 */
export async function login(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password,
) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  // Wait until we leave the login page
  await page.waitForURL('**/select-study**', { timeout: 30_000 })
  await expect(page).toHaveURL(/\/select-study/)
}

/**
 * Log out via the header dropdown menu.
 */
export async function logout(page: Page) {
  // Open user dropdown (the avatar / name button)
  const userMenuButton = page.locator('header').getByRole('button').filter({ has: page.locator('[class*="avatar"]') })
  await userMenuButton.click()
  // Click "Sign Out"
  await page.getByRole('menuitem', { name: /sign out/i }).click()
  await page.waitForURL('**/login**', { timeout: 15_000 })
}
