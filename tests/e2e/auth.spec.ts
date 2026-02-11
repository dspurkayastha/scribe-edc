import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Authentication E2E tests.
 *
 * These run WITHOUT pre-saved auth state (unauthenticated project).
 */

test.describe('Login page', () => {
  test('renders the login form correctly', async ({ page }) => {
    await page.goto('/login')

    // Branding / title
    await expect(page.getByText('SCRIBE EDC')).toBeVisible()
    await expect(page.getByText('Sign in to your account')).toBeVisible()

    // Form fields
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()

    // Submit button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Link to signup
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('login with valid credentials succeeds and redirects to select-study', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    const password = process.env.E2E_USER_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }

    await login(page, email, password)
    await expect(page).toHaveURL(/\/select-study/)
    await expect(page.getByText(/select a study|no studies found/i)).toBeVisible()
  })

  test('login with invalid credentials shows error message', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('nonexistent@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // The button should show loading state
    await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible()

    // Wait for error message to appear
    await expect(
      page.locator('.bg-destructive\\/10, [class*="destructive"]').first(),
    ).toBeVisible({ timeout: 15_000 })

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('empty form submission is prevented by browser validation', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Browser native validation should prevent navigation, email field stays focused
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Signup page', () => {
  test('renders the signup form correctly', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.locator('[data-slot="card-title"]', { hasText: 'Create Account' })).toBeVisible()
    await expect(page.getByText('Sign up for SCRIBE EDC')).toBeVisible()

    // Form fields
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()

    // Submit button
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()

    // Link back to login
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('signup link from login navigates to signup', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('login link from signup navigates to login', async ({ page }) => {
    await page.goto('/signup')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Logout', () => {
  test('logout redirects to login', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    const password = process.env.E2E_USER_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }

    // Login first
    await login(page, email, password)

    // Navigate to a study to get the header
    const studyLink = page.locator('a[href*="/org/"][href*="/study/"]').first()
    const studyLinkExists = await studyLink.isVisible().catch(() => false)
    if (!studyLinkExists) {
      // No studies - cannot test logout from study header
      test.skip()
      return
    }

    await studyLink.click()
    await page.waitForURL('**/dashboard**', { timeout: 30_000 })

    // Open user dropdown
    const userMenuButton = page.locator('header').getByRole('button').last()
    await userMenuButton.click()

    // Click Sign Out
    await page.getByRole('menuitem', { name: /sign out/i }).click()

    // Should redirect to login
    await page.waitForURL('**/login**', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Route protection', () => {
  test('unauthenticated users are redirected to login from select-study', async ({ page }) => {
    await page.goto('/select-study')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated users are redirected to login from dashboard', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated users are redirected to login from participants', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/participants')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated users are redirected to login from settings', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/settings')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirect preserves original path', async ({ page }) => {
    await page.goto('/org/test-org/study/test-study/queries')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })
})
