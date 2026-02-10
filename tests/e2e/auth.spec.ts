import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/select-study')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('SCRIBE EDC')).toBeVisible()
    await expect(page.getByText('Sign in to your account')).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows signup form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByText('Create Account', { exact: true })).toBeVisible()
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('shows validation errors for empty login', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Browser validation should prevent empty submit, or form shows error
    await expect(page.getByLabel(/email/i)).toBeFocused()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('nonexistent@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword123')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Should show error message (not redirect)
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 })
  })

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login')
    const signupLink = page.getByRole('link', { name: /sign up/i })
    await expect(signupLink).toBeVisible()
  })
})
