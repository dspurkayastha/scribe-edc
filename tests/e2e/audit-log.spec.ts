import { test, expect } from '@playwright/test'
import { navigateToStudy, navigateViaSidebar, studyPath } from './helpers/navigation'

/**
 * Audit Log E2E tests.
 *
 * These run with pre-authenticated state.
 */

test.describe('Audit Log page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await navigateViaSidebar(page, 'Audit Log')
    await page.waitForURL('**/audit-log**', { timeout: 15_000 })
  })

  test('audit log page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/complete audit trail/i)).toBeVisible()
  })

  test('filters section is visible with all filter controls', async ({ page }) => {
    await expect(page.getByText('Filters', { exact: true })).toBeVisible({ timeout: 15_000 })

    // Filters are inside a form element
    const filtersForm = page.locator('form')

    // Table name filter label and select
    await expect(filtersForm.getByText('Table', { exact: true })).toBeVisible()

    // Action filter label and select
    await expect(filtersForm.getByText('Action', { exact: true })).toBeVisible()

    // Date From filter label and input
    await expect(filtersForm.getByText('From', { exact: true })).toBeVisible()
    await expect(filtersForm.locator('input[name="dateFrom"]')).toBeVisible()

    // Date To filter label and input
    await expect(filtersForm.getByText('To', { exact: true })).toBeVisible()
    await expect(filtersForm.locator('input[name="dateTo"]')).toBeVisible()
  })

  test('Apply Filters button is present and works', async ({ page }) => {
    const applyButton = page.getByRole('button', { name: /apply filters/i })
    await expect(applyButton).toBeVisible()

    // Click apply
    await applyButton.click()
    await page.waitForLoadState('networkidle')

    // Page should still be audit log
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible()
  })

  test('Clear button is present and resets filters', async ({ page }) => {
    const clearButton = page.getByRole('link', { name: /clear/i })
    await expect(clearButton).toBeVisible()

    await clearButton.click()
    await page.waitForURL(`**/audit-log`, { timeout: 10_000 })

    // URL should be clean
    const url = page.url()
    expect(url).not.toContain('tableName=')
    expect(url).not.toContain('action=')
    expect(url).not.toContain('dateFrom=')
    expect(url).not.toContain('dateTo=')
  })

  test('results section shows record count', async ({ page }) => {
    // "X records found" text
    await expect(page.getByText(/\d+ records? found/i)).toBeVisible({ timeout: 15_000 })
  })

  test('audit log table or empty state is shown', async ({ page }) => {
    // Wait for the results section to load (either table or empty message)
    await expect(page.getByText(/\d+ records? found/i)).toBeVisible({ timeout: 15_000 })

    const table = page.locator('table').last()
    const emptyState = page.getByText(/no audit log entries found/i)

    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBeTruthy()

    if (hasTable) {
      // Check for expected column headers
      await expect(page.getByRole('columnheader', { name: /timestamp/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /table/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /action/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /record id/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /changed fields/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /reason/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /user/i })).toBeVisible()
    }
  })

  test('action badges display correctly (INSERT, UPDATE, DELETE)', async ({ page }) => {
    const table = page.locator('table').last()
    const hasTable = await table.isVisible().catch(() => false)

    if (!hasTable) {
      test.skip()
      return
    }

    // Check for action badges
    const actionBadges = table.locator('[class*="badge"], [class*="Badge"]')
    const count = await actionBadges.count()

    if (count > 0) {
      const firstBadge = await actionBadges.first().textContent()
      expect(firstBadge).toMatch(/INSERT|UPDATE|DELETE/)
    }
  })

  test('table filter select works', async ({ page }) => {
    // Open the table name select - find the first combobox trigger in the form
    const filtersForm = page.locator('form')
    const tableSelect = filtersForm.getByRole('combobox').first()
    await expect(tableSelect).toBeVisible()

    // This is a Radix select trigger - click to open
    await tableSelect.click()

    // Select "Participants" from the dropdown
    const participantsOption = page.getByRole('option', { name: /participants/i })
    const hasOption = await participantsOption.isVisible().catch(() => false)

    if (hasOption) {
      await participantsOption.click()

      // Apply the filter
      await page.getByRole('button', { name: /apply filters/i }).click()
      await page.waitForLoadState('networkidle')

      // URL should contain the filter
      await expect(page).toHaveURL(/tableName=participants/)
    }
  })

  test('date filters accept date input', async ({ page }) => {
    const dateFrom = page.locator('input[name="dateFrom"]')
    const dateTo = page.locator('input[name="dateTo"]')

    await expect(dateFrom).toBeVisible()
    await expect(dateTo).toBeVisible()

    // Fill date inputs
    await dateFrom.fill('2024-01-01')
    await dateTo.fill('2025-12-31')

    // Apply filters
    await page.getByRole('button', { name: /apply filters/i }).click()
    await page.waitForLoadState('networkidle')

    // URL should contain date parameters
    await expect(page).toHaveURL(/dateFrom=2024-01-01/)
    await expect(page).toHaveURL(/dateTo=2025-12-31/)
  })

  test('pagination works when there are enough records', async ({ page }) => {
    const pagination = page.getByText(/page \d+ of \d+/i)
    const hasPagination = await pagination.isVisible().catch(() => false)

    if (hasPagination) {
      const text = await pagination.textContent()
      const match = text?.match(/page (\d+) of (\d+)/i)

      if (match && parseInt(match[2]) > 1) {
        // Next button should be visible
        const nextButton = page.getByRole('link', { name: /next/i })
        await expect(nextButton).toBeVisible()

        await nextButton.click()
        await page.waitForLoadState('networkidle')

        // Should now be on page 2
        await expect(page.getByText(/page 2 of/i)).toBeVisible()

        // Previous button should now be visible
        await expect(page.getByRole('link', { name: /previous/i })).toBeVisible()
      }
    }
  })
})
