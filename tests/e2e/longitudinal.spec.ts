import { test, expect } from '@playwright/test'
import { navigateToStudy, navigateViaSidebar, studyPath } from './helpers/navigation'

/**
 * Longitudinal & Events E2E tests.
 *
 * Phase 3: event schedules, event-form matrix, visit timeline,
 * period management, eligibility criteria, and overdue detection.
 */

test.describe('Settings > Events page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await navigateViaSidebar(page, 'Settings')
    await page.waitForURL('**/settings**', { timeout: 15_000 })
    await page.getByRole('link').filter({ hasText: 'Events' }).click()
    await page.waitForURL('**/settings/events**', { timeout: 15_000 })
  })

  test('events page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /study events/i })).toBeVisible({ timeout: 15_000 })
  })

  test('add event dialog opens and shows all fields', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add event/i })
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    await addBtn.click()

    // Dialog should appear with form fields
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByLabel(/^name/i)).toBeVisible()
    await expect(page.getByLabel(/label/i)).toBeVisible()

    // Type selector should be present
    const typeCombobox = page.getByRole('combobox').first()
    await expect(typeCombobox).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('event-form matrix link is visible', async ({ page }) => {
    const matrixLink = page.getByRole('link', { name: /event.*form.*matrix/i })
    await expect(matrixLink).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Settings > Event-Form Matrix page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug
  })

  test('matrix page loads', async ({ page }) => {
    await page.goto(studyPath(orgSlug, studySlug, '/settings/events/matrix'))
    await expect(page.getByRole('heading', { name: /event.*form.*matrix/i })).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Settings > Periods page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    // Navigate directly via URL since Periods card is only visible for crossover/factorial studies
    await page.goto(studyPath(orgSlug, studySlug, '/settings/periods'))
  })

  test('periods page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /study periods/i })).toBeVisible({ timeout: 15_000 })
  })

  test('add period dialog opens', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add period/i })
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    await addBtn.click()

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByLabel(/^name/i)).toBeVisible()
    await expect(page.getByLabel(/label/i)).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})

test.describe('Settings > Eligibility Criteria page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await navigateViaSidebar(page, 'Settings')
    await page.waitForURL('**/settings**', { timeout: 15_000 })
    await page.getByRole('link').filter({ hasText: /eligibility/i }).click()
    await page.waitForURL('**/settings/eligibility**', { timeout: 15_000 })
  })

  test('eligibility page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /eligibility criteria/i })).toBeVisible({ timeout: 15_000 })
  })

  test('shows inclusion and exclusion sections', async ({ page }) => {
    await expect(page.getByText('Inclusion', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Exclusion', { exact: true })).toBeVisible()
  })

  test('add criteria form opens and closes', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add criteria/i })
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    await addBtn.click()

    // Form should show label and rule inputs
    const labelInput = page.getByPlaceholder('e.g. Age >= 18 years')
    await expect(labelInput).toBeVisible()

    // Cancel closes the form
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(labelInput).not.toBeVisible()
  })
})

test.describe('Dashboard > Overdue Visits', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug
  })

  test('dashboard shows overdue visits card', async ({ page }) => {
    await expect(page.getByText('Overdue Visits')).toBeVisible({ timeout: 15_000 })
  })

  test('overdue visits card links to overdue page', async ({ page }) => {
    const overdueLink = page.getByRole('link').filter({ hasText: /overdue/i })
    await expect(overdueLink).toBeVisible({ timeout: 15_000 })
    await overdueLink.click()
    await page.waitForURL('**/dashboard/overdue**', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /overdue visits/i })).toBeVisible()
  })

  test('overdue page shows breadcrumb back to dashboard', async ({ page }) => {
    await page.goto(studyPath(orgSlug, studySlug, '/dashboard/overdue'))
    await expect(page.getByRole('main').getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Participant Visit Timeline', () => {
  test.skip(true, 'Requires participant with enrolled_at and scheduled events — skipping in CI')

  // These tests are integration-level and depend on seed data with:
  // 1. Scheduled events with day_offset
  // 2. Enrolled participants
  // 3. Event-form assignments
  //
  // Run locally with seeded data when available.

  test('timeline renders on participant detail page', async ({ page }) => {
    // Would navigate to participant page and verify timeline component
  })

  test('timeline nodes show correct colors for status', async ({ page }) => {
    // Would verify node colors match visit statuses
  })
})

test.describe('Settings navigation cards', () => {
  test('settings page hides Periods card for non-crossover studies', async ({ page }) => {
    // Demo study is parallel_rct — Periods card should NOT be visible
    const ctx = await navigateToStudy(page)
    await navigateViaSidebar(page, 'Settings')
    await page.waitForURL('**/settings**', { timeout: 15_000 })
    await expect(page.getByRole('link').filter({ hasText: 'Periods' })).not.toBeVisible({ timeout: 10_000 })
  })

  test('settings page shows Eligibility Criteria card', async ({ page }) => {
    const ctx = await navigateToStudy(page)
    await navigateViaSidebar(page, 'Settings')
    await page.waitForURL('**/settings**', { timeout: 15_000 })
    await expect(page.getByRole('link').filter({ hasText: /eligibility/i })).toBeVisible({ timeout: 10_000 })
  })
})
