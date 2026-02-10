import { test, expect } from '@playwright/test'

test.describe('Marketing Page', () => {
  test('loads the landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/SCRIBE/i)
  })

  test('has navigation to login', async ({ page }) => {
    await page.goto('/')
    const loginLink = page.getByRole('link', { name: /login/i })
    await expect(loginLink).toBeVisible()
  })

  test('displays key features', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/clinical research/i)).toBeVisible()
  })
})
