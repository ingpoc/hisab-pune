import { expect, test } from '@playwright/test';

/**
 * Encodes browser-QA findings as deterministic DOM assertions.
 * Keep this suite small — prefer graders/ for static invariants.
 */
test.describe('Hisab smoke (browser QA regressions)', () => {
  test('home shows brand-level Hisab and CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__brand')).toHaveText('Hisab');
    await expect(page.getByRole('link', { name: 'Report a blackspot' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    // Real anchors (computerUse could not click non-anchors)
    await expect(page.locator('a.nav__brand')).toHaveAttribute('href', '/');
    await expect(page.locator('nav.nav__links a[href="/localities"]')).toBeVisible();
    await expect(page.locator('a.nav__cta')).toHaveAttribute('href', '/map?report=1');
  });

  test('primary routes render expected content', async ({ page }) => {
    await page.goto('/localities');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/locality/i);
    await expect(page.locator('a[href^="/locality/"]').first()).toBeVisible();

    await page.goto('/wards');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /All 41 electoral wards · 165 corporators/,
    );

    await page.goto('/how');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Transparency/i);
  });

  test('locality detail shows escalation ladder', async ({ page }) => {
    await page.goto('/locality/aundh');
    await expect(page.getByText(/Aundh/i).first()).toBeVisible();
    await expect(page.getByText(/SWM|Ward office|Corporator|MLA/i).first()).toBeVisible();
  });

  test('map page loads and report=1 opens modal', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('.maplibregl-canvas, .map-page, canvas').first()).toBeVisible({
      timeout: 20_000,
    });

    await page.goto('/map?report=1');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /report a blackspot/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /use my location/i })).toBeVisible();
  });

  test('nav Localities click navigates (real link)', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav.nav__links a[href="/localities"]').click();
    await expect(page).toHaveURL(/\/localities/);
    await expect(page.locator('a[href^="/locality/"]').first()).toBeVisible();
  });

  test('rendered UI stays English-only (no Devanagari)', async ({ page }) => {
    for (const path of ['/', '/localities', '/wards', '/how', '/map?report=1']) {
      await page.goto(path);
      const text = await page.locator('body').innerText();
      expect(text, path).not.toMatch(/[\u0900-\u097F]/);
    }
  });
});
