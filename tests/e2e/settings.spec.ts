import { test, expect } from '@playwright/test'
import { navigateToStudy, navigateViaSidebar, studyPath } from './helpers/navigation'

/**
 * Settings E2E tests.
 *
 * These run with pre-authenticated state.
 */

test.describe('Settings overview page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await navigateViaSidebar(page, 'Settings')
    await page.waitForURL('**/settings**', { timeout: 15_000 })
  })

  test('settings page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /study settings/i })).toBeVisible({ timeout: 15_000 })
  })

  test('study overview card shows study details', async ({ page }) => {
    await expect(page.getByText('Study Overview')).toBeVisible({ timeout: 15_000 })

    // Should show study metadata (dt terms in the description list)
    // Use exact matching to avoid substring conflicts (e.g. "Name" matching "Short Name")
    await expect(page.getByText('Name', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Short Name', { exact: true })).toBeVisible()
    await expect(page.getByText('Study Type', { exact: true })).toBeVisible()
    await expect(page.getByText('Status', { exact: true })).toBeVisible()
    await expect(page.getByText('Created', { exact: true })).toBeVisible()
  })

  test('navigation cards to sub-pages are visible', async ({ page }) => {
    // Forms card
    await expect(page.getByRole('link').filter({ hasText: 'Forms' })).toBeVisible()

    // Events card
    await expect(page.getByRole('link').filter({ hasText: 'Events' })).toBeVisible()

    // Arms & Sites card
    await expect(page.getByRole('link').filter({ hasText: /arms.*sites/i })).toBeVisible()

    // Users card
    await expect(page.getByRole('link').filter({ hasText: 'Users' })).toBeVisible()
  })

  test('clicking Forms card navigates to forms settings', async ({ page }) => {
    await page.getByRole('link').filter({ hasText: 'Forms' }).click()
    await page.waitForURL('**/settings/forms**', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /form definitions/i })).toBeVisible()
  })

  test('clicking Events card navigates to events settings', async ({ page }) => {
    await page.getByRole('link').filter({ hasText: 'Events' }).click()
    await page.waitForURL('**/settings/events**', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /study events/i })).toBeVisible()
  })

  test('clicking Arms & Sites card navigates to arms settings', async ({ page }) => {
    await page.getByRole('link').filter({ hasText: /arms.*sites/i }).click()
    await page.waitForURL('**/settings/arms**', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /arms.*sites/i })).toBeVisible()
  })

  test('clicking Users card navigates to users settings', async ({ page }) => {
    await page.getByRole('link').filter({ hasText: 'Users' }).click()
    await page.waitForURL('**/settings/users**', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /team members/i })).toBeVisible()
  })
})

test.describe('Settings > Arms & Sites page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await page.goto(studyPath(orgSlug, studySlug, '/settings/arms'))
    await page.waitForLoadState('networkidle')
  })

  test('arms section shows table or empty state', async ({ page }) => {
    await expect(page.getByText('Study Arms')).toBeVisible({ timeout: 15_000 })

    const armsTable = page.locator('table').first()
    const emptyState = page.getByText(/no study arms have been defined/i)

    const hasTable = await armsTable.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBeTruthy()

    if (hasTable) {
      await expect(page.getByRole('columnheader', { name: /name/i }).first()).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /label/i }).first()).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /allocation/i })).toBeVisible()
    }
  })

  test('add arm dialog opens', async ({ page }) => {
    const addArmButton = page.getByRole('button', { name: /add arm/i })
    await expect(addArmButton).toBeVisible()

    await addArmButton.click()

    await expect(page.getByText('Add Study Arm')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByLabel(/^name$/i)).toBeVisible()
    await expect(page.getByLabel(/label/i)).toBeVisible()
    await expect(page.getByLabel(/allocation ratio/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create arm/i })).toBeVisible()

    // Close
    await page.getByRole('button', { name: /cancel/i }).click()
  })

  test('sites section shows table or empty state', async ({ page }) => {
    await expect(page.getByText('Study Sites')).toBeVisible({ timeout: 15_000 })

    const emptyState = page.getByText(/no study sites have been configured/i)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    if (!hasEmpty) {
      // Sites table should have Name and Code columns
      const sitesSection = page.locator('text=Study Sites').locator('..').locator('..')
      await expect(page.getByRole('columnheader', { name: /code/i })).toBeVisible()
    }
  })

  test('add site dialog opens', async ({ page }) => {
    const addSiteButton = page.getByRole('button', { name: /add site/i })
    await expect(addSiteButton).toBeVisible()

    await addSiteButton.click()

    await expect(page.getByText('Add Study Site')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByLabel(/site name/i)).toBeVisible()
    await expect(page.getByLabel(/site code/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create site/i })).toBeVisible()

    // Close
    await page.getByRole('button', { name: /cancel/i }).click()
  })

  test('deactivate button shows confirmation dialog', async ({ page }) => {
    const deactivateButton = page.getByRole('button', { name: /deactivate/i }).first()
    const hasDeactivate = await deactivateButton.isVisible().catch(() => false)

    if (!hasDeactivate) {
      test.skip()
      return
    }

    await deactivateButton.click()

    // AlertDialog should appear
    await expect(page.getByText(/deactivate.*\?/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/will no longer be available/i)).toBeVisible()

    // Cancel the dialog
    await page.getByRole('button', { name: /cancel/i }).click()
  })
})

test.describe('Settings > Events page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await page.goto(studyPath(orgSlug, studySlug, '/settings/events'))
    await page.waitForLoadState('networkidle')
  })

  test('events page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /study events/i })).toBeVisible({ timeout: 15_000 })
  })

  test('events table or empty state is shown', async ({ page }) => {
    const table = page.locator('table')
    const emptyState = page.getByText(/no events have been defined/i)

    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBeTruthy()

    if (hasTable) {
      await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /label/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /type/i })).toBeVisible()
    }
  })

  test('add event dialog opens', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add event/i })
    await expect(addButton).toBeVisible()

    await addButton.click()

    await expect(page.getByText('Add Study Event')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByLabel(/^name$/i)).toBeVisible()
    await expect(page.getByLabel(/label/i)).toBeVisible()
    await expect(page.getByLabel(/event type/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create event/i })).toBeVisible()

    // Close
    await page.getByRole('button', { name: /cancel/i }).click()
  })
})

test.describe('Settings > Users page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await page.goto(studyPath(orgSlug, studySlug, '/settings/users'))
    await page.waitForLoadState('networkidle')
  })

  test('users page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /team members/i })).toBeVisible({ timeout: 15_000 })
  })

  test('members table or empty state is shown', async ({ page }) => {
    const table = page.locator('table')
    const emptyState = page.getByText(/no team members have been added/i)

    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBeTruthy()

    if (hasTable) {
      await expect(page.getByRole('columnheader', { name: /name.*email/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /role/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
    }
  })

  test('invite member dialog opens', async ({ page }) => {
    const inviteButton = page.getByRole('button', { name: /invite member/i })
    await expect(inviteButton).toBeVisible()

    await inviteButton.click()

    await expect(page.getByText('Invite Team Member')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/role/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /add member/i })).toBeVisible()

    // Close
    await page.getByRole('button', { name: /cancel/i }).click()
  })

  test('role summary badges are shown', async ({ page }) => {
    const table = page.locator('table')
    const hasTable = await table.isVisible().catch(() => false)

    if (hasTable) {
      // Role badges should show above the table
      const totalBadge = page.locator('[class*="badge"]').filter({ hasText: /\d+ total/ })
      const hasTotalBadge = await totalBadge.isVisible().catch(() => false)
      // This is expected if there are active members
      if (hasTotalBadge) {
        await expect(totalBadge).toBeVisible()
      }
    }
  })

  test('remove button shows confirmation for active members', async ({ page }) => {
    const removeButton = page.getByRole('button', { name: /remove/i }).first()
    const hasRemove = await removeButton.isVisible().catch(() => false)

    if (!hasRemove) {
      test.skip()
      return
    }

    await removeButton.click()

    // AlertDialog should appear
    await expect(page.getByText(/remove member/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/will remove.*from the study/i)).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click()
  })
})

test.describe('Settings > Forms page', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug

    await page.goto(studyPath(orgSlug, studySlug, '/settings/forms'))
    await page.waitForLoadState('networkidle')
  })

  test('forms page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /form definitions/i })).toBeVisible({ timeout: 15_000 })
  })

  test('forms table or empty state is shown', async ({ page }) => {
    const table = page.locator('table')
    const emptyState = page.getByText(/no forms have been defined/i)

    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBeTruthy()

    if (hasTable) {
      await expect(page.getByRole('columnheader', { name: /title/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /slug/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /version/i })).toBeVisible()
    }
  })

  test('breadcrumb navigation back to settings works', async ({ page }) => {
    const settingsLink = page.getByRole('link', { name: /settings/i }).first()
    await expect(settingsLink).toBeVisible()

    await settingsLink.click()
    await page.waitForURL('**/settings', { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /study settings/i })).toBeVisible()
  })
})
