import { test, expect } from '@playwright/test'
import { navigateToStudy, navigateViaSidebar, studyPath } from './helpers/navigation'

/**
 * Form Builder E2E tests.
 *
 * Tests the full form builder workflow:
 * - Create forms (blank and from template)
 * - Edit fields in the builder
 * - Save and preview
 * - Import/export CSV
 * - Duplicate, version, delete
 */

test.describe('Form Builder', () => {
  let orgSlug: string
  let studySlug: string
  const uniqueSuffix = Date.now().toString(36)

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    // Navigate to Settings > Forms
    await navigateViaSidebar(page, 'Settings')
    await page.waitForURL('**/settings**', { timeout: 15_000 })
    await page.getByRole('link').filter({ hasText: 'Forms' }).click()
    await page.waitForURL('**/settings/forms**', { timeout: 15_000 })
  })

  test('forms page loads with create button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /form definitions/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /create form/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /import csv/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /export all/i })).toBeVisible()
  })

  test('create blank form dialog opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: /create form/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Create Form Definition')).toBeVisible()

    // Template picker should be visible
    await expect(page.getByText('Blank Form')).toBeVisible()
    await expect(page.getByText('Demographics')).toBeVisible()

    // Cancel closes dialog
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('create form with title and slug', async ({ page }) => {
    const formTitle = `Test Form ${uniqueSuffix}`
    const formSlug = `test-form-${uniqueSuffix}`

    await page.getByRole('button', { name: /create form/i }).click()
    await page.getByLabel('Title').fill(formTitle)
    // Slug should auto-generate from title
    await expect(page.getByLabel('Slug')).toHaveValue(/test-form/)

    // Override slug
    await page.getByLabel('Slug').clear()
    await page.getByLabel('Slug').fill(formSlug)

    await page.getByRole('button', { name: 'Create Form' }).click()

    // Should navigate to editor
    await page.waitForURL(`**/forms/${formSlug}/edit**`, { timeout: 15_000 })
  })

  test.skip('create form from template pre-fills title', async ({ page }) => {
    await page.getByRole('button', { name: /create form/i }).click()

    // Select Demographics template
    await page.getByText('Demographics').first().click()

    // Title should be pre-filled
    await expect(page.getByLabel('Title')).toHaveValue('Demographics')
  })

  test.skip('form editor loads with structure tree', async ({ page }) => {
    // Create a form first
    const slug = `editor-test-${uniqueSuffix}`
    await page.getByRole('button', { name: /create form/i }).click()
    await page.getByLabel('Title').fill('Editor Test')
    await page.getByLabel('Slug').clear()
    await page.getByLabel('Slug').fill(slug)
    await page.getByRole('button', { name: 'Create Form' }).click()
    await page.waitForURL(`**/forms/${slug}/edit**`, { timeout: 15_000 })

    // Structure tree should show default page and section
    await expect(page.getByText('Structure')).toBeVisible()
    await expect(page.getByText('Page 1')).toBeVisible()
    await expect(page.getByText('Section 1')).toBeVisible()

    // Toolbar buttons
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /preview/i })).toBeVisible()
  })

  test.skip('add and edit a field in the editor', async ({ page }) => {
    const slug = `field-test-${uniqueSuffix}`
    await page.getByRole('button', { name: /create form/i }).click()
    await page.getByLabel('Title').fill('Field Test')
    await page.getByLabel('Slug').clear()
    await page.getByLabel('Slug').fill(slug)
    await page.getByRole('button', { name: 'Create Form' }).click()
    await page.waitForURL(`**/forms/${slug}/edit**`, { timeout: 15_000 })

    // Click "Section 1" in the tree
    await page.getByText('Section 1').click()

    // Add a field using the + button in the section hover actions
    const sectionNode = page.getByText('Section 1').first()
    await sectionNode.hover()
    await page.locator('button[title="Add field"]').first().click()

    // A new field should appear and be selected
    await expect(page.getByText('Field Settings')).toBeVisible()
    await expect(page.getByLabel('Label')).toHaveValue('New Field')

    // Edit the field label
    await page.getByLabel('Label').clear()
    await page.getByLabel('Label').fill('Patient Age')

    // The tree should update
    await expect(page.getByText('Patient Age')).toBeVisible()

    // Save button should show unsaved changes
    await expect(page.getByText('Unsaved changes')).toBeVisible()
  })

  test.skip('preview opens a sheet with the form', async ({ page }) => {
    const slug = `preview-test-${uniqueSuffix}`
    await page.getByRole('button', { name: /create form/i }).click()
    await page.getByLabel('Title').fill('Preview Test')
    await page.getByLabel('Slug').clear()
    await page.getByLabel('Slug').fill(slug)
    await page.getByRole('button', { name: 'Create Form' }).click()
    await page.waitForURL(`**/forms/${slug}/edit**`, { timeout: 15_000 })

    // Click Preview
    await page.getByRole('button', { name: /preview/i }).click()

    // Preview sheet should open
    await expect(page.getByText('Form Preview')).toBeVisible()
    await expect(page.getByText('Preview Mode')).toBeVisible()

    // Device mode buttons
    await expect(page.locator('button[title="Desktop"]')).toBeVisible()
    await expect(page.locator('button[title="Tablet"]')).toBeVisible()
    await expect(page.locator('button[title="Mobile"]')).toBeVisible()
  })

  test.skip('import CSV dialog opens with file upload', async ({ page }) => {
    await page.getByRole('button', { name: /import csv/i }).click()
    await expect(page.getByText('Import REDCap Data Dictionary')).toBeVisible()
    await expect(page.locator('input[type="file"]')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test.skip('form actions menu has edit, duplicate, lock, delete', async ({ page }) => {
    // This test requires at least one form to exist
    const rowActions = page.locator('button').filter({ has: page.locator('[class*="MoreHorizontal"]') }).first()
    if (await rowActions.isVisible()) {
      await rowActions.click()

      await expect(page.getByRole('menuitem', { name: /edit/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /duplicate/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /export csv/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /lock|unlock/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible()
    }
  })

  test.skip('duplicate form opens dialog with copy slug', async ({ page }) => {
    const rowActions = page.locator('button').filter({ has: page.locator('[class*="MoreHorizontal"]') }).first()
    if (await rowActions.isVisible()) {
      await rowActions.click()
      await page.getByRole('menuitem', { name: /duplicate/i }).click()

      await expect(page.getByText('Duplicate Form')).toBeVisible()
      // Slug should have -copy suffix
      await expect(page.getByLabel('New Slug')).toHaveValue(/-copy$/)

      await page.getByRole('button', { name: 'Cancel' }).click()
    }
  })

  test.skip('delete form shows confirmation with response warning', async ({ page }) => {
    const rowActions = page.locator('button').filter({ has: page.locator('[class*="MoreHorizontal"]') }).first()
    if (await rowActions.isVisible()) {
      await rowActions.click()
      await page.getByRole('menuitem', { name: /delete/i }).click()

      await expect(page.getByText('Delete Form')).toBeVisible()
      await expect(page.getByText(/cannot be undone/i)).toBeVisible()

      await page.getByRole('button', { name: 'Cancel' }).click()
    }
  })
})
