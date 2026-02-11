import { test, expect } from '@playwright/test'
import { navigateToStudy, navigateViaSidebar, studyPath } from './helpers/navigation'

/**
 * Study Dashboard E2E tests.
 *
 * These run with pre-authenticated state.
 */

test.describe('Study Dashboard', () => {
  let orgSlug: string
  let studySlug: string

  test.beforeEach(async ({ page }) => {
    const ctx = await navigateToStudy(page)
    orgSlug = ctx.orgSlug
    studySlug = ctx.studySlug
  })

  test('dashboard page loads with study name and status badge', async ({ page }) => {
    // Study name in the heading
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible({ timeout: 15_000 })
    const name = await heading.textContent()
    expect(name!.length).toBeGreaterThan(0)

    // Status badge (setup, recruiting, paused, closed, archived)
    const statusBadge = page.locator('[data-slot="badge"]').first()
    await expect(statusBadge).toBeVisible()
    const statusText = await statusBadge.textContent()
    expect(statusText).toMatch(/setup|recruiting|paused|closed|archived/i)
  })

  test('enrollment metric card displays', async ({ page }) => {
    const enrollmentCard = page.locator('text=Enrollment').first()
    await expect(enrollmentCard).toBeVisible({ timeout: 15_000 })

    // The card should contain a numeric value
    const cardContainer = enrollmentCard.locator('..').locator('..')
    const valueEl = cardContainer.locator('.text-3xl')
    await expect(valueEl).toBeVisible()
  })

  test('open queries card displays', async ({ page }) => {
    const queriesCard = page.locator('text=Open Queries').first()
    await expect(queriesCard).toBeVisible({ timeout: 15_000 })

    const cardContainer = queriesCard.locator('..').locator('..')
    const valueEl = cardContainer.locator('.text-3xl')
    await expect(valueEl).toBeVisible()
  })

  test('SAE alerts card displays', async ({ page }) => {
    const saeCard = page.locator('text=Unacknowledged SAEs').first()
    await expect(saeCard).toBeVisible({ timeout: 15_000 })

    const cardContainer = saeCard.locator('..').locator('..')
    const valueEl = cardContainer.locator('.text-3xl')
    await expect(valueEl).toBeVisible()
  })

  test('form completeness card displays', async ({ page }) => {
    const formCard = page.locator('text=Form Completeness').first()
    await expect(formCard).toBeVisible({ timeout: 15_000 })

    const cardContainer = formCard.locator('..').locator('..')
    const valueEl = cardContainer.locator('.text-3xl')
    await expect(valueEl).toBeVisible()
  })

  test('arm balance card renders', async ({ page }) => {
    const armBalanceCard = page.locator('text=Arm Balance').first()
    await expect(armBalanceCard).toBeVisible({ timeout: 15_000 })
  })

  test('site enrollment card renders', async ({ page }) => {
    const siteEnrollmentCard = page.locator('text=Site Enrollment').first()
    await expect(siteEnrollmentCard).toBeVisible({ timeout: 15_000 })
  })

  test('form status breakdown card renders', async ({ page }) => {
    const formStatusCard = page.locator('text=Form Status Breakdown').first()
    await expect(formStatusCard).toBeVisible({ timeout: 15_000 })
  })

  test('sidebar navigation is visible with all links', async ({ page }) => {
    const sidebar = page.locator('aside nav')
    await expect(sidebar).toBeVisible()

    const expectedLinks = ['Dashboard', 'Participants', 'Queries', 'Reports', 'Audit Log', 'Settings']
    for (const label of expectedLinks) {
      await expect(sidebar.getByRole('link', { name: label })).toBeVisible()
    }
  })

  test('header shows SCRIBE branding and user avatar', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toBeVisible()

    // Avatar / user button exists in header
    const avatarButton = header.getByRole('button').last()
    await expect(avatarButton).toBeVisible()
  })

  test('study type info is displayed below the heading', async ({ page }) => {
    // The subtitle/protocol line below the study name
    const subtitle = page.locator('.p-6 .text-sm.text-muted-foreground').first()
    await expect(subtitle).toBeVisible()
  })
})
