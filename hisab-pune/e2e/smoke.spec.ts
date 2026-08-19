import { expect, test } from '@playwright/test';

/**
 * Encodes browser-QA findings as deterministic DOM assertions.
 * Keep this suite small — prefer graders/ for static invariants.
 */
test.describe('Hisab smoke (browser QA regressions)', () => {
  test('home shows brand-level Hisab and CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__brand')).toHaveText('Hisab');
    await expect(page.getByRole('link', { name: 'Report an issue' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    // Real anchors (computerUse could not click non-anchors)
    await expect(page.locator('a.nav__brand')).toHaveAttribute('href', '/');
    await expect(page.locator('nav.nav__links a[href="/localities"]')).toBeVisible();
    await expect(page.locator('a.nav__cta')).toHaveAttribute('href', '/map?report=1');
  });

  test('primary routes render expected content', async ({ page }) => {
    await page.goto('/localities');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/locality/i);
    await expect(page.locator('a[href^="/map?loc="]').first()).toBeVisible();

    await page.goto('/wards');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /All 41 electoral wards · 165 corporators/,
    );

    await page.goto('/how');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Transparency/i);
  });

  test('map locality ledger is the place surface (no separate full page)', async ({ page }) => {
    await page.goto('/locality/aundh');
    await expect(page).toHaveURL(/\/map\?loc=aundh/);
    await expect(page.getByRole('heading', { level: 1, name: /Aundh/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('tab', { name: /Open/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Report in Aundh/i })).toBeVisible();
    await expect(page.getByText(/Escalation route/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Avinash Sakpal/i })).toHaveCount(0);
  });

  test('map page loads and report=1 opens modal', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('.maplibregl-canvas, .map-page, canvas').first()).toBeVisible({
      timeout: 20_000,
    });

    await page.goto('/map?report=1');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /report an issue/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /use my location|refine with gps/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /publish report/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /solid waste/i })).toBeVisible();
    await expect(page.getByText(/photo \(optional\)/i)).toBeVisible();
  });

  test('hero locality search opens the map ledger', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Baner, Kothrud, Hadapsar/i).fill('Baner');
    await page.locator('.loc-search__pick').filter({ hasText: 'Baner' }).click();
    await expect(page).toHaveURL(/\/map\?loc=baner/);
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('map locality ledger shows Baner without auto-expanded ladder', async ({ page }) => {
    await page.goto('/map?loc=baner');
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('tab', { name: /Open/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Report in Baner/i })).toBeVisible();
    await expect(page.getByText(/Escalation route/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Avinash Sakpal/i })).toHaveCount(0);
    // No duplicate map FAB
    await expect(page.locator('.map-page__fab')).toHaveCount(0);
  });

  test('report modal publishes from map locality', async ({ page }) => {
    await page.goto('/map?loc=baner&report=1');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Baner/i).first()).toBeVisible();
    const note = `E2E drain Baner ${Date.now()}`;
    await page.getByRole('textbox', { name: /what happened/i }).fill(note);
    await page.getByRole('button', { name: /publish report/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 15_000 });
  });

  test('mobile menu reaches Map, Localities, Wards, How, and Report', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Report issue' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Wards' }).click();
    await expect(page).toHaveURL(/\/wards/);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'How it works' }).click();
    await expect(page).toHaveURL(/\/how/);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Map' }).click();
    await expect(page).toHaveURL(/\/map/);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Localities' }).click();
    await expect(page).toHaveURL(/\/localities/);
    await page.getByRole('link', { name: 'Report issue' }).click();
    await expect(page).toHaveURL(/report=1/);
  });

  test('how page loads live freshness and does not claim no backend', async ({ page }) => {
    const freshness = page.waitForResponse((res) => res.url().includes('/v1/freshness'));
    await page.goto('/how');
    const res = await freshness;
    expect(res.ok()).toBeTruthy();
    await expect(page.getByText(/Live backend roster/i)).toBeVisible();
    await expect(page.getByText(/localStorage/i)).toHaveCount(0);
    await expect(page.getByText(/Next: live backend/i)).toHaveCount(0);
  });

  test('nav Localities click navigates (real link)', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav.nav__links a[href="/localities"]').click();
    await expect(page).toHaveURL(/\/localities/);
    await expect(page.locator('a[href^="/map?loc="]').first()).toBeVisible();
  });

  test('rendered UI stays English-only (no Devanagari)', async ({ page }) => {
    for (const path of ['/', '/localities', '/wards', '/how', '/map?report=1']) {
      await page.goto(path);
      const text = await page.locator('body').innerText();
      expect(text, path).not.toMatch(/[\u0900-\u097F]/);
    }
  });
});
