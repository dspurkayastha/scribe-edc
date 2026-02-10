import { test, expect } from '@playwright/test'

// These tests verify that study pages load without crashing
// Full user flow requires authenticated state (see auth.setup.ts for future fixture)

test.describe('Study Flow (unauthenticated)', () => {
  test('select-study redirects to login', async ({ page }) => {
    await page.goto('/select-study')
    await expect(page).toHaveURL(/\/login/)
  })

  test('study dashboard redirects to login', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('participants page redirects to login', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/participants')
    await expect(page).toHaveURL(/\/login/)
  })

  test('settings page redirects to login', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/settings')
    await expect(page).toHaveURL(/\/login/)
  })

  test('audit log redirects to login', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/audit-log')
    await expect(page).toHaveURL(/\/login/)
  })
})
