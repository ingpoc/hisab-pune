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

  test('Escalation route makes the rail primary and still reaches the last contact', async ({ page }) => {
    await page.goto('/map?loc=baner');
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });
    const map = page.locator('.map-page__map');
    const closedMapHeight = (await map.boundingBox())?.height ?? 0;

    await page.getByRole('button', { name: /Escalation route/i }).click();
    const rail = page.getByRole('complementary', { name: 'Escalation route' });
    await expect(rail).toBeVisible();
    const railHeight = (await rail.boundingBox())?.height ?? 0;
    expect(railHeight).toBeGreaterThanOrEqual(844 * 0.6);
    expect(railHeight).toBeLessThanOrEqual(844 * 0.64 + 8);

    const close = page.getByRole('button', { name: 'Close escalation route' });
    await expect(close).toBeVisible();
    expect((await close.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    // DESIGN.md L1 — do not auto-expand every card on rail mount.
    const moreButtons = page.locator('.ladder--rail .official__more');
    await expect(moreButtons.first()).toBeVisible();
    expect(await moreButtons.evaluateAll((btns) => btns.every((b) => b.getAttribute('aria-expanded') === 'false'))).toBe(
      true,
    );

    const scroller = page.locator('.ladder--rail .ladder__rail-body');
    const metrics = await scroller.evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(
      await scroller.locator('.official').evaluateAll((cards) => {
        const body = cards[0]?.closest('.ladder__rail-body')?.getBoundingClientRect();
        if (!body) return 0;
        return cards.filter((card) => {
          const rect = card.getBoundingClientRect();
          return rect.top >= body.top && rect.bottom <= body.bottom;
        }).length;
      }),
    ).toBeGreaterThanOrEqual(3);

    const firstPhone = page.locator('.ladder--rail .official__actions a').first();
    const firstMore = moreButtons.first();
    expect((await firstPhone.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect((await firstMore.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    const lastItem = page.locator('.ladder--rail .ladder__list > li').last();
    const last = lastItem.getByRole('heading', { name: /Murlidhar Mohol/i });
    await expect(last).toBeVisible({ timeout: 10_000 });

    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    await expect(close).toBeVisible();
    const closeAfter = await close.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    });
    const railTop = (await rail.boundingBox())?.y ?? 0;
    expect(closeAfter.top).toBeGreaterThanOrEqual(railTop - 1);
    expect(closeAfter.bottom).toBeLessThan(railTop + 180);
    expect(closeAfter.height).toBeGreaterThanOrEqual(44);

    const lastGeo = await lastItem.evaluate((el) => {
      const item = el.getBoundingClientRect();
      const body = el.closest('.ladder__rail-body')?.getBoundingClientRect();
      const more = el.querySelector('.official__more')?.getBoundingClientRect();
      const contact = el.querySelector('.official__actions a')?.getBoundingClientRect();
      return {
        itemTop: item.top,
        itemBottom: item.bottom,
        itemHeight: item.height,
        itemWidth: item.width,
        bodyTop: body?.top ?? null,
        bodyBottom: body?.bottom ?? null,
        moreHeight: more?.height ?? null,
        contactHeight: contact?.height ?? null,
      };
    });
    expect(lastGeo.bodyTop).not.toBeNull();
    expect(lastGeo.bodyBottom).not.toBeNull();
    expect(lastGeo.itemTop).toBeGreaterThanOrEqual((lastGeo.bodyTop ?? 0) - 1);
    expect(lastGeo.itemBottom).toBeLessThanOrEqual((lastGeo.bodyBottom ?? 0) + 1);
    expect(lastGeo.itemHeight).toBeGreaterThanOrEqual(44);
    expect(lastGeo.itemWidth).toBeGreaterThanOrEqual(44);
    if (lastGeo.moreHeight != null) expect(lastGeo.moreHeight).toBeGreaterThanOrEqual(44);
    if (lastGeo.contactHeight != null) expect(lastGeo.contactHeight).toBeGreaterThanOrEqual(44);

    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible();
    await shot(page, 'escalation_rail_last_contact');

    await close.click();
    await expect(rail).toBeHidden();
    expect((await map.boundingBox())?.height ?? 0).toBeCloseTo(closedMapHeight, 0);
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
