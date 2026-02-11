import { test, expect } from '@playwright/test'
import { navigateToStudy, navigateViaSidebar, studyPath } from './helpers/navigation'

/**
 * Data Queries E2E tests.
 *
 * These run with pre-authenticated state.
 */

test.describe('Data Queries page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await navigateViaSidebar(page, 'Queries')
    await page.waitForURL('**/queries**', { timeout: 15_000 })
  })

  test('queries page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /data queries/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/track and manage data queries/i)).toBeVisible()
  })

  test('summary cards display (total, open, answered, closed)', async ({ page }) => {
    // Summary cards are inside a grid container in the main content
    const summaryGrid = page.locator('.grid.grid-cols-2')
    await expect(summaryGrid.getByText('Total', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(summaryGrid.getByText('Open', { exact: true })).toBeVisible()
    await expect(summaryGrid.getByText('Answered', { exact: true })).toBeVisible()
    await expect(summaryGrid.getByText('Closed', { exact: true })).toBeVisible()

    // Each card should have a numeric value (text-2xl font-bold)
    const cards = summaryGrid.locator('.text-2xl')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThanOrEqual(4)
  })

  test('status filter section is visible', async ({ page }) => {
    await expect(page.getByText('Filters')).toBeVisible({ timeout: 15_000 })

    // Status select trigger
    const statusTrigger = page.locator('#status, [name="status"]').first()
    const hasTrigger = await statusTrigger.isVisible().catch(() => false)
    if (!hasTrigger) {
      // Select trigger via role
      const selectTrigger = page.getByRole('combobox').first()
      await expect(selectTrigger).toBeVisible()
    }

    // Apply button
    await expect(page.getByRole('button', { name: /apply/i })).toBeVisible()

    // Clear button
    await expect(page.getByRole('link', { name: /clear/i })).toBeVisible()
  })

  test('raise query dialog opens', async ({ page }) => {
    const raiseButton = page.getByRole('button', { name: /raise query/i })
    const hasButton = await raiseButton.isVisible().catch(() => false)

    if (!hasButton) {
      // User might not have query management permissions
      test.skip()
      return
    }

    await raiseButton.click()

    // Dialog should open
    await expect(page.getByText('Raise Data Query')).toBeVisible({ timeout: 5_000 })

    // Required fields
    await expect(page.getByLabel(/participant/i)).toBeVisible()
    await expect(page.getByLabel(/priority/i)).toBeVisible()
    await expect(page.getByLabel(/query text/i)).toBeVisible()

    // Buttons
    await expect(page.getByRole('button', { name: /create query/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()

    // Close
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByText('Raise Data Query')).not.toBeVisible()
  })

  test('query rows are displayed in a table', async ({ page }) => {
    // Query count header
    const countHeader = page.locator('text=/\\d+ quer(y|ies)/i').first()
    await expect(countHeader).toBeVisible({ timeout: 15_000 })

    // Check for table if queries exist
    const table = page.locator('.card table, [class*="card"] table').last()
    const hasTable = await table.isVisible().catch(() => false)

    if (hasTable) {
      // Table headers
      await expect(page.getByRole('columnheader', { name: /participant/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /query text/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /priority/i })).toBeVisible()
    } else {
      // Empty state
      await expect(page.getByText(/no data queries found/i)).toBeVisible()
    }
  })

  test('clicking a query row opens detail dialog', async ({ page }) => {
    const queryRow = page.locator('table tbody tr').first()
    const hasRow = await queryRow.isVisible().catch(() => false)

    if (!hasRow) {
      test.skip()
      return
    }

    await queryRow.click()

    // Detail dialog should open
    await expect(page.getByText('Query Details')).toBeVisible({ timeout: 10_000 })

    // Should show query metadata
    await expect(page.getByText(/status:/i)).toBeVisible()
    await expect(page.getByText(/priority:/i)).toBeVisible()
    await expect(page.getByText(/query text/i)).toBeVisible()
  })

  test('query detail dialog shows respond form for open queries', async ({ page }) => {
    // Find an open query row
    const openQueryRow = page.locator('table tbody tr').filter({
      has: page.locator('[class*="badge"]').filter({ hasText: 'open' }),
    }).first()
    const hasOpen = await openQueryRow.isVisible().catch(() => false)

    if (!hasOpen) {
      test.skip()
      return
    }

    await openQueryRow.click()
    await expect(page.getByText('Query Details')).toBeVisible({ timeout: 10_000 })

    // Response text area
    await expect(page.getByLabel(/add response/i)).toBeVisible()

    // Respond button
    await expect(page.getByRole('button', { name: /^respond$/i })).toBeVisible()
  })

  test('query detail dialog shows close/cancel buttons for managers', async ({ page }) => {
    const openQueryRow = page.locator('table tbody tr').filter({
      has: page.locator('[class*="badge"]').filter({ hasText: 'open' }),
    }).first()
    const hasOpen = await openQueryRow.isVisible().catch(() => false)

    if (!hasOpen) {
      test.skip()
      return
    }

    await openQueryRow.click()
    await expect(page.getByText('Query Details')).toBeVisible({ timeout: 10_000 })

    // Close Query and Cancel Query buttons (only visible for managers)
    const closeButton = page.getByRole('button', { name: /close query/i })
    const cancelButton = page.getByRole('button', { name: /cancel query/i })

    const hasClose = await closeButton.isVisible().catch(() => false)
    const hasCancel = await cancelButton.isVisible().catch(() => false)

    // At least the respond button should be there
    await expect(page.getByRole('button', { name: /^respond$/i })).toBeVisible()

    // If user has manage permissions, both buttons are visible
    if (hasClose) {
      await expect(closeButton).toBeVisible()
      await expect(cancelButton).toBeVisible()
    }
  })

  test('status filter works with Apply button', async ({ page }) => {
    // The status filter is a <select> submitted as form
    const applyButton = page.getByRole('button', { name: /apply/i })
    await expect(applyButton).toBeVisible()

    // Click apply without changing filter (should reload)
    await applyButton.click()
    await page.waitForLoadState('networkidle')

    // Page should still show queries heading
    await expect(page.getByRole('heading', { name: /data queries/i })).toBeVisible()
  })

  test('clear filter link resets to all queries', async ({ page }) => {
    const clearLink = page.getByRole('link', { name: /clear/i })
    await expect(clearLink).toBeVisible()

    await clearLink.click()
    await page.waitForURL(`**/queries`, { timeout: 10_000 })

    // No status parameter in URL
    const url = page.url()
    expect(url).not.toContain('status=')
  })
})
