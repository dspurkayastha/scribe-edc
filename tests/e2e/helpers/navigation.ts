import { type Page, expect } from '@playwright/test'

/**
 * Org and study slug for the test user.
 * These are read from env vars or discovered at runtime.
 */
export const TEST_ORG_SLUG = process.env.E2E_ORG_SLUG ?? ''
export const TEST_STUDY_SLUG = process.env.E2E_STUDY_SLUG ?? ''

/**
 * Navigate to the study selection page and pick the first study,
 * returning the { orgSlug, studySlug } pair extracted from the resulting URL.
 *
 * If E2E_ORG_SLUG / E2E_STUDY_SLUG are set, it navigates directly.
 */
export async function navigateToStudy(page: Page): Promise<{ orgSlug: string; studySlug: string }> {
  if (TEST_ORG_SLUG && TEST_STUDY_SLUG) {
    await page.goto(`/org/${TEST_ORG_SLUG}/study/${TEST_STUDY_SLUG}/dashboard`)
    await page.waitForURL(`**/org/${TEST_ORG_SLUG}/study/${TEST_STUDY_SLUG}/dashboard**`, { timeout: 30_000 })
    return { orgSlug: TEST_ORG_SLUG, studySlug: TEST_STUDY_SLUG }
  }

  // Otherwise, go to select-study and click the first study card
  await page.goto('/select-study')
  await page.waitForURL('**/select-study**', { timeout: 30_000 })

  const studyCard = page.locator('a[href*="/org/"][href*="/study/"]').first()
  await expect(studyCard).toBeVisible({ timeout: 15_000 })
  const href = await studyCard.getAttribute('href')
  await studyCard.click()
  await page.waitForURL('**/dashboard**', { timeout: 30_000 })

  // Parse orgSlug and studySlug from /org/<orgSlug>/study/<studySlug>/dashboard
  const match = (href ?? '').match(/\/org\/([^/]+)\/study\/([^/]+)\//)
  const orgSlug = match?.[1] ?? ''
  const studySlug = match?.[2] ?? ''
  return { orgSlug, studySlug }
}

/**
 * Build a path inside the current study context.
 */
export function studyPath(orgSlug: string, studySlug: string, path: string): string {
  return `/org/${orgSlug}/study/${studySlug}${path}`
}

/**
 * Navigate to a study sub-page using the sidebar.
 */
export async function navigateViaSidebar(page: Page, linkText: string) {
  const sidebarLink = page.locator('aside nav').getByRole('link', { name: linkText })
  await expect(sidebarLink).toBeVisible({ timeout: 10_000 })
  await sidebarLink.click()
}

/**
 * Wait for page to finish loading (network idle).
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 })
}
