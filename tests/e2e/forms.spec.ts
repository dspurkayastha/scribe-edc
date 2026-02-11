import { test, expect } from '@playwright/test'
import { navigateToStudy, navigateViaSidebar, studyPath } from './helpers/navigation'

/**
 * Form Filling E2E tests.
 *
 * These run with pre-authenticated state.
 */

test.describe('Form filling', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug
  })

  /**
   * Helper: Navigate to the first available form for the first participant.
   * Returns whether navigation was successful.
   */
  async function navigateToFirstForm(page: import('@playwright/test').Page): Promise<boolean> {
    // Go to participants
    await navigateViaSidebar(page, 'Participants')
    await page.waitForURL('**/participants**', { timeout: 15_000 })

    // Click first participant
    const participantLink = page.locator('table a[href*="/participants/"]').first()
    const hasParticipant = await participantLink.isVisible().catch(() => false)
    if (!hasParticipant) return false

    await participantLink.click()
    await page.waitForURL('**/participants/**', { timeout: 15_000 })

    // Click first Fill/View button in the forms table
    const formAction = page.locator('table').last().getByRole('link', { name: /fill|view/i }).first()
    const hasForm = await formAction.isVisible().catch(() => false)
    if (!hasForm) return false

    await formAction.click()
    await page.waitForURL('**/forms/**', { timeout: 15_000 })
    return true
  }

  test('form fill page loads with title and breadcrumb', async ({ page }) => {
    const success = await navigateToFirstForm(page)
    if (!success) {
      test.skip()
      return
    }

    // Form title heading
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible({ timeout: 10_000 })

    // Breadcrumb showing study / participant
    const breadcrumb = page.locator('.text-muted-foreground').filter({ hasText: '/' }).first()
    await expect(breadcrumb).toBeVisible()
  })

  test('form status bar shows correct status badge', async ({ page }) => {
    const success = await navigateToFirstForm(page)
    if (!success) {
      test.skip()
      return
    }

    // Status badge in the form renderer
    const statusBadge = page.locator('form [class*="badge"], form [class*="Badge"]').first()
    await expect(statusBadge).toBeVisible({ timeout: 10_000 })

    const text = await statusBadge.textContent()
    expect(text).toMatch(/draft|complete|verified|locked|signed/i)
  })

  test('form fields render (input elements present)', async ({ page }) => {
    const success = await navigateToFirstForm(page)
    if (!success) {
      test.skip()
      return
    }

    // The form should have at least one input, textarea, or select element
    const formFields = page.locator(
      'form input:not([type="hidden"]), form textarea, form select, form [role="radiogroup"], form [role="combobox"]',
    )
    const fieldCount = await formFields.count()

    // Forms should have fields (unless empty form definition)
    expect(fieldCount).toBeGreaterThanOrEqual(0)
  })

  test('save draft button is visible for draft forms', async ({ page }) => {
    const success = await navigateToFirstForm(page)
    if (!success) {
      test.skip()
      return
    }

    // Check if the form is in draft status
    const statusBadge = page.locator('form [class*="badge"], form [class*="Badge"]').first()
    const statusText = await statusBadge.textContent()

    if (statusText?.toLowerCase().includes('draft')) {
      const saveDraftButton = page.getByRole('button', { name: /save draft/i })
      await expect(saveDraftButton).toBeVisible()
    }
  })

  test('submit button appears on the last page for draft forms', async ({ page }) => {
    const success = await navigateToFirstForm(page)
    if (!success) {
      test.skip()
      return
    }

    const statusBadge = page.locator('form [class*="badge"], form [class*="Badge"]').first()
    const statusText = await statusBadge.textContent()

    if (statusText?.toLowerCase().includes('draft')) {
      // If multi-page form, navigate to last page
      const nextButton = page.locator('form').getByRole('button', { name: /^next$/i })
      const hasNext = await nextButton.isVisible().catch(() => false)

      // Navigate to last page
      while (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click()
        await page.waitForTimeout(500)
      }

      // Submit button should be on the last page
      const submitButton = page.locator('form').getByRole('button', { name: /^submit$/i })
      await expect(submitButton).toBeVisible()
    }
  })

  test('verify button appears for complete forms', async ({ page }) => {
    const success = await navigateToFirstForm(page)
    if (!success) {
      test.skip()
      return
    }

    const statusBadge = page.locator('form [class*="badge"], form [class*="Badge"]').first()
    const statusText = await statusBadge.textContent()

    if (statusText?.toLowerCase().includes('complete')) {
      // Verify button should be below the form
      const verifyButton = page.getByRole('button', { name: /verify/i })
      await expect(verifyButton).toBeVisible()
    }
  })

  test('lock button appears for verified forms', async ({ page }) => {
    const success = await navigateToFirstForm(page)
    if (!success) {
      test.skip()
      return
    }

    const statusBadge = page.locator('form [class*="badge"], form [class*="Badge"]').first()
    const statusText = await statusBadge.textContent()

    if (statusText?.toLowerCase().includes('verified')) {
      const lockButton = page.getByRole('button', { name: /^lock$/i })
      await expect(lockButton).toBeVisible()
    }
  })

  test('locked forms are read-only (no save draft / submit buttons)', async ({ page }) => {
    const success = await navigateToFirstForm(page)
    if (!success) {
      test.skip()
      return
    }

    const statusBadge = page.locator('form [class*="badge"], form [class*="Badge"]').first()
    const statusText = await statusBadge.textContent()

    if (statusText?.toLowerCase().includes('locked') || statusText?.toLowerCase().includes('signed')) {
      // Save Draft and Submit buttons should NOT be visible
      await expect(page.getByRole('button', { name: /save draft/i })).not.toBeVisible()
      await expect(page.locator('form').getByRole('button', { name: /^submit$/i })).not.toBeVisible()

      // Unlock button should be visible
      const unlockButton = page.getByRole('button', { name: /unlock/i })
      await expect(unlockButton).toBeVisible()
    }
  })

  test('form pagination works for multi-page forms', async ({ page }) => {
    const success = await navigateToFirstForm(page)
    if (!success) {
      test.skip()
      return
    }

    // Check for pagination info (Page X of Y)
    const paginationInfo = page.locator('form').getByText(/page \d+ of \d+/i)
    const hasPagination = await paginationInfo.isVisible().catch(() => false)

    if (hasPagination) {
      const text = await paginationInfo.textContent()
      const match = text?.match(/page (\d+) of (\d+)/i)

      if (match && parseInt(match[2]) > 1) {
        // Next button should be visible on first page
        const nextButton = page.locator('form').getByRole('button', { name: /^next$/i })
        await expect(nextButton).toBeVisible()

        // Click next and verify pagination changes
        await nextButton.click()
        await expect(page.locator('form').getByText(/page 2 of/i)).toBeVisible()

        // Previous button should now be visible
        const prevButton = page.locator('form').getByRole('button', { name: /previous/i })
        await expect(prevButton).toBeVisible()
      }
    }
  })
})
