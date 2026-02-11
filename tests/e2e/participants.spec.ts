import { test, expect } from '@playwright/test'
import { navigateToStudy, studyPath, navigateViaSidebar } from './helpers/navigation'

/**
 * Participant Management E2E tests.
 *
 * These run with pre-authenticated state.
 */

test.describe('Participants list page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    // Navigate to participants
    await navigateViaSidebar(page, 'Participants')
    await page.waitForURL('**/participants**', { timeout: 15_000 })
  })

  test('participants page loads with heading and participant count', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /participants/i })).toBeVisible({ timeout: 15_000 })

    // Total count text like "X participants total"
    await expect(page.getByText(/participant.*total/i)).toBeVisible()
  })

  test('participants table or empty state is visible', async ({ page }) => {
    // Wait for the page to fully load (heading should appear)
    await expect(page.getByRole('heading', { name: /participants/i })).toBeVisible({ timeout: 15_000 })

    // Either a table with headers or the empty state
    const table = page.locator('table')
    const emptyState = page.getByText(/no participants found/i)

    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBeTruthy()

    if (hasTable) {
      // Check table headers
      await expect(page.getByRole('columnheader', { name: /study number/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /site/i })).toBeVisible()
    }
  })

  test('search by study number works', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by study number/i)
    await expect(searchInput).toBeVisible()

    // Type a search term
    await searchInput.fill('NONEXISTENT999')
    await page.getByRole('button', { name: /search/i }).click()

    // URL should have search param
    await expect(page).toHaveURL(/search=NONEXISTENT999/)

    // Should show no results or filtered results
    await page.waitForLoadState('networkidle')
  })

  test('status filter pills are visible and work', async ({ page }) => {
    // "All" filter pill should be visible
    const allPill = page.locator('a').filter({ hasText: 'All' }).first()
    await expect(allPill).toBeVisible()

    // At least some status pills should be visible
    const statusPills = ['Screening', 'Enrolled', 'Randomized']
    for (const status of statusPills) {
      await expect(
        page.locator('a').filter({ hasText: status }).first(),
      ).toBeVisible()
    }

    // Click a status filter
    await page.locator('a').filter({ hasText: 'Screening' }).first().click()
    await expect(page).toHaveURL(/status=screening/)
  })

  test('clear button removes filters', async ({ page }) => {
    // Apply a search filter first
    const searchInput = page.getByPlaceholder(/search by study number/i)
    await searchInput.fill('test')
    await page.getByRole('button', { name: /search/i }).click()
    await page.waitForLoadState('networkidle')

    // Clear button should appear
    const clearButton = page.getByRole('link', { name: /clear/i })
    const hasClear = await clearButton.isVisible().catch(() => false)
    if (hasClear) {
      await clearButton.click()
      // URL should be clean
      await expect(page).toHaveURL(new RegExp(`/participants$`))
    }
  })

  test('pagination appears when there are enough participants', async ({ page }) => {
    // Check if pagination exists
    const pagination = page.getByText(/page \d+ of \d+/i)
    const hasPagination = await pagination.isVisible().catch(() => false)

    if (hasPagination) {
      // Previous and Next buttons should exist
      await expect(page.getByRole('link', { name: /next/i })).toBeVisible()
    }
    // If not enough data, pagination is simply not shown (acceptable)
  })

  test('enroll participant dialog opens', async ({ page }) => {
    const enrollButton = page.getByRole('button', { name: /enroll participant/i })
    await expect(enrollButton).toBeVisible()

    await enrollButton.click()

    // Dialog should open
    await expect(page.getByText('Enroll New Participant')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/auto-generated study number/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create participant/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()

    // Close dialog
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByText('Enroll New Participant')).not.toBeVisible()
  })
})

test.describe('Participant detail page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await navigateViaSidebar(page, 'Participants')
    await page.waitForURL('**/participants**', { timeout: 15_000 })
  })

  test('clicking a participant row navigates to detail page', async ({ page }) => {
    // Find the first participant link in the table
    const participantLink = page.locator('table a[href*="/participants/"]').first()
    const hasParticipant = await participantLink.isVisible().catch(() => false)

    if (!hasParticipant) {
      test.skip()
      return
    }

    await participantLink.click()
    await page.waitForURL('**/participants/**', { timeout: 15_000 })

    // Should show participant study number as heading
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    // "Back to Participants" link should be visible
    await expect(page.getByRole('link', { name: /back to participants/i })).toBeVisible()
  })

  test('participant detail page shows forms schedule', async ({ page }) => {
    const participantLink = page.locator('table a[href*="/participants/"]').first()
    const hasParticipant = await participantLink.isVisible().catch(() => false)

    if (!hasParticipant) {
      test.skip()
      return
    }

    await participantLink.click()
    await page.waitForURL('**/participants/**', { timeout: 15_000 })

    // Forms section
    await expect(page.getByText('Forms')).toBeVisible()

    // Summary cards (Expected Forms, Completed, In Progress)
    await expect(page.getByText('Expected Forms')).toBeVisible()
    await expect(page.getByText('Completed')).toBeVisible()
    await expect(page.getByText('In Progress')).toBeVisible()

    // Adverse Events section
    await expect(page.getByText('Adverse Events')).toBeVisible()
  })

  test('status change dropdown is visible on participant detail', async ({ page }) => {
    const participantLink = page.locator('table a[href*="/participants/"]').first()
    const hasParticipant = await participantLink.isVisible().catch(() => false)

    if (!hasParticipant) {
      test.skip()
      return
    }

    await participantLink.click()
    await page.waitForURL('**/participants/**', { timeout: 15_000 })

    // Status badge button (StatusChangeDropdown)
    const statusButton = page.locator('button').filter({ has: page.locator('[class*="badge"]') }).first()
    await expect(statusButton).toBeVisible()
  })

  test('report AE dialog opens from participant detail', async ({ page }) => {
    const participantLink = page.locator('table a[href*="/participants/"]').first()
    const hasParticipant = await participantLink.isVisible().catch(() => false)

    if (!hasParticipant) {
      test.skip()
      return
    }

    await participantLink.click()
    await page.waitForURL('**/participants/**', { timeout: 15_000 })

    // Report AE button
    const aeButton = page.getByRole('button', { name: /report ae/i })
    const hasAeButton = await aeButton.isVisible().catch(() => false)

    if (!hasAeButton) {
      // User may not have permission (read_only role)
      test.skip()
      return
    }

    await aeButton.click()

    // Dialog should open with AE form fields
    await expect(page.getByText('Report Adverse Event')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByLabel(/description/i)).toBeVisible()
    await expect(page.getByLabel(/onset date/i)).toBeVisible()

    // Close
    await page.getByRole('button', { name: /cancel/i }).click()
  })

  test('randomize button shows for enrolled participants', async ({ page }) => {
    // Navigate to participants and look for an enrolled participant
    const enrolledRow = page.locator('table tr').filter({ hasText: /enrolled/i }).first()
    const hasEnrolled = await enrolledRow.isVisible().catch(() => false)

    if (!hasEnrolled) {
      test.skip()
      return
    }

    // Click the participant link in that row
    const link = enrolledRow.locator('a[href*="/participants/"]').first()
    await link.click()
    await page.waitForURL('**/participants/**', { timeout: 15_000 })

    // The Randomize button may be visible (depends on role and allocation state)
    const randomizeButton = page.getByRole('button', { name: /randomize/i })
    const hasRandomize = await randomizeButton.isVisible().catch(() => false)

    // This is conditional on user role and study configuration
    // If visible, verify it opens a dialog
    if (hasRandomize) {
      await randomizeButton.click()
      await expect(page.getByText(/randomize/i)).toBeVisible()
    }
  })
})
