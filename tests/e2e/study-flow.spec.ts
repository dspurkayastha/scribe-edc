import { test, expect } from '@playwright/test'

/**
 * Study Flow E2E tests for unauthenticated access.
 *
 * Verifies all protected routes correctly redirect to login.
 */

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

  test('queries page redirects to login', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/queries')
    await expect(page).toHaveURL(/\/login/)
  })

  test('reports page redirects to login', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/reports')
    await expect(page).toHaveURL(/\/login/)
  })

  test('create study wizard redirects to login', async ({ page }) => {
    await page.goto('/org/test-org/studies/new')
    await expect(page).toHaveURL(/\/login/)
  })
})
