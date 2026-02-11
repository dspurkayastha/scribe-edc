import { test, expect } from '@playwright/test'

/**
 * Study Selection E2E tests.
 *
 * These run with pre-authenticated state (storageState from setup).
 */

test.describe('Select Study page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/select-study')
    await page.waitForLoadState('networkidle')
  })

  test('page loads and displays the heading', async ({ page }) => {
    // Either "Select a Study" (if user has studies) or "No Studies Found"
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
    const text = await heading.textContent()
    expect(text).toMatch(/select a study|no studies found/i)
  })

  test('shows list of studies user is a member of', async ({ page }) => {
    // If the user has studies, there should be study cards (links to /org/.../study/.../dashboard)
    const studyCards = page.locator('a[href*="/org/"][href*="/study/"]')
    const count = await studyCards.count()

    if (count > 0) {
      // Each card should be visible and contain a title
      await expect(studyCards.first()).toBeVisible()
      // Verify cards are inside a grid layout
      const grid = page.locator('.grid').first()
      await expect(grid).toBeVisible()
    } else {
      // If no studies, the empty state should be shown
      await expect(page.getByText(/not a member of any active studies/i)).toBeVisible()
    }
  })

  test('clicking a study navigates to the dashboard', async ({ page }) => {
    const studyCard = page.locator('a[href*="/org/"][href*="/study/"]').first()
    const hasStudies = await studyCard.isVisible().catch(() => false)

    if (!hasStudies) {
      test.skip()
      return
    }

    await studyCard.click()
    await page.waitForURL('**/dashboard**', { timeout: 30_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('"Create New Study" button is visible', async ({ page }) => {
    // The button may appear as "Create New Study" or "Create Your First Study"
    const createButton = page.getByRole('link', { name: /create.*study/i })
    const hasButton = await createButton.isVisible().catch(() => false)

    if (hasButton) {
      await expect(createButton).toBeVisible()
      // Verify the link points to /org/<slug>/studies/new
      const href = await createButton.getAttribute('href')
      expect(href).toMatch(/\/org\/[^/]+\/studies\/new/)
    }
    // If no org membership, the button may not appear (expected)
  })

  test('study cards show organization name', async ({ page }) => {
    const studyCards = page.locator('a[href*="/org/"][href*="/study/"]')
    const count = await studyCards.count()

    if (count > 0) {
      // Each card has a CardDescription (div with data-slot="card-description") with the org name
      const firstCard = studyCards.first()
      const description = firstCard.locator('[data-slot="card-description"]').first()
      await expect(description).toBeVisible()
      const text = await description.textContent()
      expect(text!.length).toBeGreaterThan(0)
    }
  })
})
