import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * Phone-sized (390×844) coverage for ledger/rail scroll, tap targets, and
 * the existing hamburger / freshness / photo-optional contracts.
 */
const BANER_NOTE =
  'Overflowing dumpster near Baner–Pashan link road. Uncollected for 4 days.';

const SHOT_DIR = process.env.MOBILE_SHOTS_DIR ?? '/opt/cursor/artifacts';

async function shot(page: Page, name: string) {
  if (!existsSync(SHOT_DIR) && SHOT_DIR.startsWith('/opt/')) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

async function fullyInView(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
}

test.describe('Mobile Chrome 390×844', () => {
  test('Baner ledger scrolls so the issue note and actions are fully readable', async ({
    page,
  }) => {
    await page.goto('/map?loc=baner');
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });

    const sheet = page.locator('.map-page__sheet-body');
    await expect(sheet).toBeVisible();

    const note = page.getByText(BANER_NOTE);
    await fullyInView(note);
    const noteBox = await note.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(noteBox.scrollHeight).toBeLessThanOrEqual(noteBox.clientHeight + 1);

    await fullyInView(page.getByRole('button', { name: /Escalation route/i }));
    await fullyInView(page.getByRole('link', { name: /Report in Baner/i }));

    const metrics = await sheet.evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));
    const reportBottom = await page.getByRole('link', { name: /Report in Baner/i }).evaluate(
      (el) => el.getBoundingClientRect().bottom,
    );
    const sheetBottom = await sheet.evaluate((el) => el.getBoundingClientRect().bottom);
    expect(
      metrics.scrollHeight > metrics.clientHeight + 1 || reportBottom <= sheetBottom + 2,
    ).toBeTruthy();

    await shot(page, 'baner_ledger_note_visible');
  });

  test('sheet handle expands the ledger and is a real control', async ({ page }) => {
    await page.goto('/map?loc=baner');
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });

    const handle = page.getByRole('button', { name: 'Expand locality sheet' });
    await expect(handle).toBeVisible();
    const handleBox = await handle.boundingBox();
    expect(handleBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await handle.click();
    await expect(page.locator('.map-page--sheet-expanded')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Collapse locality sheet' })).toBeVisible();
    await fullyInView(page.getByText(BANER_NOTE));
    await fullyInView(page.getByRole('link', { name: /Report in Baner/i }));
    await shot(page, 'baner_sheet_expanded');
  });

  test('Escalation route rail scrolls to the last contact', async ({ page }) => {
    await page.goto('/map?loc=baner');
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Escalation route/i }).click();
    const rail = page.getByRole('complementary', { name: 'Escalation route' });
    await expect(rail).toBeVisible();

    const list = page.locator('.ladder--rail .ladder__list');
    const metrics = await list.evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

    const last = page.getByRole('heading', { name: /Murlidhar Mohol/i });
    await expect(last).toBeVisible({ timeout: 10_000 });
    await fullyInView(last);
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible();
    await shot(page, 'escalation_rail_last_contact');
  });

  test('tap targets are at least 44px (menu, report, brand, rows, how-link)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.hero__brand')).toHaveText('Hisab');

    const menu = page.getByRole('button', { name: 'Open menu' });
    await expect(menu).toBeVisible();
    expect((await menu.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    const report = page.getByRole('link', { name: 'Report issue' });
    expect((await report.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    const brand = page.locator('a.nav__brand');
    expect((await brand.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    await shot(page, 'home_390');
    await menu.click();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    const row = page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Map' });
    expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await shot(page, 'menu_open');

    const how = page.getByRole('link', { name: /How escalation works/i });
    await how.scrollIntoViewIfNeeded();
    expect((await how.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
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

  test('hamburger reaches Map, Localities, Wards, How, and Report', async ({ page }) => {
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

  test('how page loads live freshness', async ({ page }) => {
    const freshness = page.waitForResponse((res) => res.url().includes('/v1/freshness'));
    await page.goto('/how');
    const res = await freshness;
    expect(res.ok()).toBeTruthy();
    await expect(page.getByText(/Live backend roster/i)).toBeVisible();
    await expect(page.getByText(/localStorage/i)).toHaveCount(0);
  });

  test('report modal keeps photo optional and GPS control', async ({ page }) => {
    await page.goto('/map?loc=baner&report=1');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /report an issue/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /use my location|refine with gps/i }),
    ).toBeVisible();
    await expect(page.getByText(/photo \(optional\)/i)).toBeVisible();
    await shot(page, 'report_modal');
  });

  test('map legend sits above the locality sheet seam', async ({ page }) => {
    await page.goto('/map?loc=baner');
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });
    const legend = page.locator('.map-shell__legend');
    await expect(legend).toBeVisible();
    await expect(legend).toContainText(/Open/i);
    await expect(legend).toContainText(/41 ward polygons/i);
    const gap = await page.evaluate(() => {
      const legendEl = document.querySelector('.map-shell__legend');
      const sheet = document.querySelector('.map-page__side');
      if (!legendEl || !sheet) return null;
      const lr = legendEl.getBoundingClientRect();
      const sr = sheet.getBoundingClientRect();
      return { legendBottom: lr.bottom, sheetTop: sr.top, fullyOnScreen: lr.top >= 0 };
    });
    expect(gap).not.toBeNull();
    expect(gap!.fullyOnScreen).toBe(true);
    expect(gap!.legendBottom).toBeLessThan(gap!.sheetTop);
  });
});
