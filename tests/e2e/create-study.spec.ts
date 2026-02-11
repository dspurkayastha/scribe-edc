import { test, expect } from '@playwright/test'
import { navigateToStudy } from './helpers/navigation'

/**
 * Study Creation Wizard E2E tests.
 *
 * These run with pre-authenticated state.
 */

test.describe('Create Study Wizard', () => {
  let wizardUrl: string

  test.beforeEach(async ({ page }) => {
    // Navigate to select-study to discover the org slug
    await page.goto('/select-study')
    await page.waitForLoadState('networkidle')

    // Find the "Create New Study" or "Create Your First Study" link
    const createLink = page.getByRole('link', { name: /create.*study/i })
    const hasLink = await createLink.isVisible().catch(() => false)

    if (!hasLink) {
      // User might not have permission or no org
      test.skip()
      return
    }

    wizardUrl = (await createLink.getAttribute('href')) ?? ''
    await createLink.click()
    await page.waitForURL('**/studies/new**', { timeout: 15_000 })
  })

  test('wizard page loads with template selection step', async ({ page }) => {
    // "Choose a Template" heading
    await expect(page.getByText('Choose a Template')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/start from a template/i)).toBeVisible()
  })

  test('all template options are displayed', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Parallel-Group RCT/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Observational Cohort/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Single-Arm Interventional/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Start Blank/ })).toBeVisible()
  })

  test('next button is disabled until a template is selected', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: /^Next$/ })
    await expect(nextButton).toBeVisible()
    await expect(nextButton).toBeDisabled()
  })

  test('selecting a template enables next button', async ({ page }) => {
    // Click on the Parallel-Group RCT template
    await page.getByText('Parallel-Group RCT').first().click()

    const nextButton = page.getByRole('button', { name: /^Next$/ })
    await expect(nextButton).toBeEnabled()
  })

  test('template selection navigates to basic info step', async ({ page }) => {
    await page.getByText('Parallel-Group RCT').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    await expect(page.getByText('Basic Information')).toBeVisible()
    await expect(page.getByLabel(/study name/i)).toBeVisible()
    await expect(page.getByLabel(/short name/i)).toBeVisible()
    await expect(page.getByLabel(/url slug/i)).toBeVisible()
    await expect(page.getByLabel(/id prefix/i)).toBeVisible()
  })

  test('basic info step validates required fields', async ({ page }) => {
    await page.getByText('Parallel-Group RCT').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    await expect(page.getByText('Basic Information')).toBeVisible()

    // Next should be disabled with empty fields
    const nextButton = page.getByRole('button', { name: /^Next$/ })
    await expect(nextButton).toBeDisabled()

    // Fill required fields
    await page.getByLabel(/study name/i).fill('E2E Test Study')
    await page.getByLabel(/short name/i).fill('E2ETS')

    // Now next should be enabled (slug and prefix auto-generated)
    await expect(nextButton).toBeEnabled()
  })

  test('auto-slug generation works when name is entered', async ({ page }) => {
    await page.getByText('Parallel-Group RCT').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    await page.getByLabel(/study name/i).fill('My New Clinical Trial')

    // Slug should be auto-generated
    const slugInput = page.getByLabel(/url slug/i)
    const slugValue = await slugInput.inputValue()
    expect(slugValue).toBe('my-new-clinical-trial')
  })

  test('auto-prefix generation works when short name is entered', async ({ page }) => {
    await page.getByText('Parallel-Group RCT').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    await page.getByLabel(/short name/i).fill('MNCT')

    // Prefix should be auto-generated
    const prefixInput = page.getByLabel(/id prefix/i)
    const prefixValue = await prefixInput.inputValue()
    expect(prefixValue).toBe('MNCT')
  })

  test('arms step appears for RCT template', async ({ page }) => {
    // Select Parallel-Group RCT
    await page.getByText('Parallel-Group RCT').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Fill basic info
    await page.getByLabel(/study name/i).fill('E2E Test RCT')
    await page.getByLabel(/short name/i).fill('E2ERCT')

    // Ensure Next is enabled before clicking
    await expect(page.getByRole('button', { name: /^Next$/ })).toBeEnabled()
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Arms step should appear - use data-slot for precision
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Treatment Arms' }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/define the treatment arms/i)).toBeVisible()

    // Should have pre-filled arms from the RCT template (Control + Experimental)
    const nameInputs = page.locator('input[placeholder="e.g. Control"]')
    await expect(nameInputs.first()).toHaveValue('Control')
    await expect(nameInputs.nth(1)).toHaveValue('Experimental')
  })

  test('arms step is skipped for observational template', async ({ page }) => {
    // Select Observational Cohort
    await page.getByText('Observational Cohort').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Fill basic info
    await page.getByLabel(/study name/i).fill('E2E Observational')
    await page.getByLabel(/short name/i).fill('E2EOBS')
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Should go directly to Sites step (skip Arms)
    await expect(page.getByText('Study Sites')).toBeVisible()
    await expect(page.getByText(/add the sites/i)).toBeVisible()
  })

  test('sites step allows adding sites', async ({ page }) => {
    // Select Observational (skips arms step, faster)
    await page.getByText('Observational Cohort').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    await page.getByLabel(/study name/i).fill('E2E Sites Test')
    await page.getByLabel(/short name/i).fill('E2EST')
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Should be on Sites step
    await expect(page.getByText('Study Sites')).toBeVisible()

    // Initial site row should exist
    const siteNameInputs = page.locator('input[placeholder*="Johns Hopkins"]')
    await expect(siteNameInputs.first()).toBeVisible()

    // Add Site button
    const addSiteButton = page.getByRole('button', { name: /add site/i })
    await expect(addSiteButton).toBeVisible()

    // Click to add another site row
    await addSiteButton.click()

    // Should now have more site input rows
    const siteRows = page.locator('.rounded-lg.border.p-3')
    const count = await siteRows.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('confirm step shows summary of study details', async ({ page }) => {
    // Full flow: template -> info -> sites -> confirm (observational)
    await page.getByText('Observational Cohort').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    await page.getByLabel(/study name/i).fill('E2E Confirm Test')
    await page.getByLabel(/short name/i).fill('E2ECT')
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Skip sites
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Should be on Confirm step
    await expect(page.getByText('Review & Create')).toBeVisible()
    await expect(page.getByText('Study Details')).toBeVisible()

    // Verify summary shows the entered data
    await expect(page.getByText('E2E Confirm Test')).toBeVisible()
    // E2ECT appears as both Short Name and ID Prefix - check at least one is visible
    await expect(page.getByText('E2ECT').first()).toBeVisible()
    await expect(page.getByText(/observational/i)).toBeVisible()

    // Create Study button should be visible
    await expect(page.getByRole('button', { name: /create study/i })).toBeVisible()
  })

  test('back button navigates to previous step', async ({ page }) => {
    await page.getByText('Parallel-Group RCT').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    // On info step
    await expect(page.getByText('Basic Information')).toBeVisible()

    // Click back
    await page.getByRole('button', { name: /back/i }).click()

    // Should be back on template step
    await expect(page.getByText('Choose a Template')).toBeVisible()
  })

  test('step indicator shows progress', async ({ page }) => {
    // Step indicator should be visible
    const stepIndicator = page.locator('.flex.items-center.justify-center.gap-1')
    await expect(stepIndicator).toBeVisible()

    // Should show Template, Basic Info, etc. step labels within the step indicator
    await expect(stepIndicator.getByText('Template')).toBeVisible()
    await expect(stepIndicator.getByText('Basic Info')).toBeVisible()
    await expect(stepIndicator.getByText('Confirm')).toBeVisible()
  })

  test('RCT template flow shows arms in confirm summary', async ({ page }) => {
    // Select RCT
    await page.getByText('Parallel-Group RCT').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Fill info
    await page.getByLabel(/study name/i).fill('E2E RCT Summary')
    await page.getByLabel(/short name/i).fill('RCTSM')
    await expect(page.getByRole('button', { name: /^Next$/ })).toBeEnabled()
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Arms step - keep defaults, go next
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Treatment Arms' }),
    ).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Sites step - skip
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Study Sites' }),
    ).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Confirm step
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Review & Create' }),
    ).toBeVisible({ timeout: 10_000 })

    // Arms summary should be visible
    await expect(page.getByRole('heading', { name: /treatment arms/i })).toBeVisible()
    await expect(page.getByText('Control').first()).toBeVisible()
    await expect(page.getByText('Experimental').first()).toBeVisible()
  })

  test('add arm button works on arms step', async ({ page }) => {
    // Select RCT
    await page.getByText('Parallel-Group RCT').first().click()
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Fill info
    await page.getByLabel(/study name/i).fill('E2E Add Arm')
    await page.getByLabel(/short name/i).fill('ADDARM')
    await page.getByRole('button', { name: /^Next$/ }).click()

    // Arms step
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: 'Treatment Arms' }),
    ).toBeVisible({ timeout: 15_000 })

    // Count current arm rows
    const armRows = page.locator('.rounded-lg.border.p-3')
    const initialCount = await armRows.count()

    // Click Add Arm
    await page.getByRole('button', { name: /add arm/i }).click()

    // Should have one more row
    const newCount = await armRows.count()
    expect(newCount).toBe(initialCount + 1)
  })
})
