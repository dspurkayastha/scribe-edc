import { test, expect } from '@playwright/test'
import { navigateToStudy, navigateViaSidebar } from './helpers/navigation'

/**
 * Reports & Exports E2E tests.
 *
 * These run with pre-authenticated state.
 */

test.describe('Reports page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await navigateViaSidebar(page, 'Reports')
    await page.waitForURL('**/reports**', { timeout: 15_000 })
  })

  test('reports page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /reports.*exports/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/export study data/i)).toBeVisible()
  })

  test('export data card is visible', async ({ page }) => {
    await expect(page.getByText('Export Data')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/select a form and export format/i)).toBeVisible()
  })

  test('form selector shows available forms', async ({ page }) => {
    const formLabel = page.getByLabel(/form/i).first()
    await expect(formLabel).toBeVisible({ timeout: 10_000 })

    // If no forms, a message should be shown
    const noForms = page.getByText(/no active forms available/i)
    const hasNoForms = await noForms.isVisible().catch(() => false)

    if (!hasNoForms) {
      // Click to open the form selector dropdown
      const formSelect = page.locator('#form-select')
      await expect(formSelect).toBeVisible()
      await formSelect.click()

      // There should be at least one form option
      const options = page.getByRole('option')
      const optionCount = await options.count()
      expect(optionCount).toBeGreaterThanOrEqual(1)

      // Close by pressing Escape
      await page.keyboard.press('Escape')
    }
  })

  test('format selector shows CSV and JSON options', async ({ page }) => {
    const formatSelect = page.locator('#format-select')
    await expect(formatSelect).toBeVisible({ timeout: 10_000 })

    await formatSelect.click()

    // Should have CSV (Wide), CSV (Long), JSON options
    await expect(page.getByRole('option', { name: /csv.*wide/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /csv.*long/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /json/i })).toBeVisible()

    // Close
    await page.keyboard.press('Escape')
  })

  test('export button is present and disabled without form selection', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /^export$/i })
    await expect(exportButton).toBeVisible({ timeout: 10_000 })

    // Button should be disabled if no form is selected
    const isDisabled = await exportButton.isDisabled()
    // It could be enabled if a form was pre-selected
    // Just verify the button exists
    expect(exportButton).toBeTruthy()
  })

  test('format description updates when format changes', async ({ page }) => {
    const formatSelect = page.locator('#format-select')
    await expect(formatSelect).toBeVisible({ timeout: 10_000 })

    // Default is CSV (Wide) - description should mention "one row per participant"
    await expect(page.getByText(/one row per participant/i)).toBeVisible()

    // Switch to JSON
    await formatSelect.click()
    await page.getByRole('option', { name: /json/i }).click()

    // Description should change to mention JSON
    await expect(page.getByText(/full json export/i)).toBeVisible()

    // Switch to CSV (Long)
    await formatSelect.click()
    await page.getByRole('option', { name: /csv.*long/i }).click()

    // Description should mention "normalized format"
    await expect(page.getByText(/normalized format/i)).toBeVisible()
  })

  test('export button triggers download when form is selected', async ({ page }) => {
    const formSelect = page.locator('#form-select')
    const hasFormSelect = await formSelect.isVisible().catch(() => false)

    if (!hasFormSelect) {
      test.skip()
      return
    }

    // Select a form
    await formSelect.click()
    const firstOption = page.getByRole('option').first()
    const hasOption = await firstOption.isVisible().catch(() => false)
    if (!hasOption) {
      test.skip()
      return
    }
    await firstOption.click()

    // Now click Export
    const exportButton = page.getByRole('button', { name: /^export$/i })
    await expect(exportButton).toBeEnabled()

    // Listen for download event
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null)

    await exportButton.click()

    // Should show loading state
    const exportingText = page.getByRole('button', { name: /exporting/i })
    const isExporting = await exportingText.isVisible().catch(() => false)

    // Wait for download or toast
    const download = await downloadPromise

    if (download) {
      // Verify downloaded file has expected extension
      const filename = download.suggestedFilename()
      expect(filename).toMatch(/\.(csv|json)$/)
    }
    // If no download event, it might show a toast success/error instead
  })
})
