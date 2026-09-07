import { expect, test } from '@playwright/test';

/**
 * Encodes browser-QA findings as deterministic DOM assertions.
 * Keep this suite small — prefer graders/ for static invariants.
 */
test.describe('Hisab smoke (browser QA regressions)', () => {
  test('viewport-fit and social preview metas are wired', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /viewport-fit=cover/,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://hisab-pune.onrender.com/',
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://hisab-pune.onrender.com/og-image.png',
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      'content',
      'https://hisab-pune.onrender.com/og-image.png',
    );
    const image = await page.request.get('/og-image.png');
    expect(image.ok()).toBeTruthy();
    expect(image.headers()['content-type']).toMatch(/image\/png/);
  });

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

  test('CARE L1 stays collapsed until asked and never fakes success', async ({ page }) => {
    const careMessage =
      'PMC CARE has no public partner write API. File on CARE yourself, then paste the ticket number.';
    await page.route('**/v1/reports/*/escalate-gov', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          result: { ok: false, reason: 'unsupported', message: careMessage },
          care: {
            portal: 'https://pmccare.in/cep/home',
            whatsapp: 'https://api.whatsapp.com/send/?phone=918888251001&text=hi',
          },
        },
      });
    });

    await page.goto('/map?loc=baner');
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /Get CARE links/i })).toHaveCount(0);

    await page.locator('.loc-panel__issue').filter({ hasText: /Overflowing dumpster/i }).click();
    const careBtn = page.getByRole('button', { name: /Get CARE links/i });
    await expect(careBtn).toBeVisible();
    await expect(careBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('link', { name: /CARE portal/i })).toHaveCount(0);
    await expect(page.getByText(/submitted to CARE/i)).toHaveCount(0);

    await careBtn.click();
    await expect(page.getByRole('button', { name: /Hide CARE links/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(page.getByText(careMessage)).toBeVisible();
    const portal = page.getByRole('link', { name: 'CARE portal' });
    await expect(portal).toBeVisible();
    await expect(portal).toHaveAttribute('href', 'https://pmccare.in/cep/home');
    await expect(portal).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('target', '_blank');
    await expect(page.getByText(/submitted to CARE/i)).toHaveCount(0);

    await page.getByRole('button', { name: /Edit draft/i }).click();
    await expect(page.getByRole('link', { name: /CARE portal/i })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: /Draft for X/i })).toBeVisible();
  });

  test('Comments L1 stays collapsed until asked, lists mocked thread, and posts honestly', async ({
    page,
  }) => {
    const mockedBody = 'Still overflowing this morning.';
    const postedBody = 'Same dumpster, still there.';
    let commentsFetched = false;
    let failPost = true;

    await page.route('**/v1/auth/session', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        json: {
          sessionToken: 'ses-test',
          anonymousPostingId: 'R-7F2A',
          publicDisplayId: null,
          publishAsDefault: 'anonymous',
        },
      });
    });
    await page.route('**/v1/reports/*/comments', async (route) => {
      if (route.request().method() === 'GET') {
        commentsFetched = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          json: {
            comments: [
              {
                id: 'cmt-mock-1',
                body: mockedBody,
                publish_as: 'anonymous',
                author_label: 'R-7F2A',
                created_at: '2026-08-04T09:00:00.000Z',
              },
            ],
          },
        });
        return;
      }
      if (route.request().method() === 'POST') {
        if (failPost) {
          failPost = false;
          await route.fulfill({ status: 500, body: 'unavailable' });
          return;
        }
        const posted = route.request().postDataJSON() as { body?: string; publishAs?: string };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          json: {
            comment: {
              id: 'cmt-mock-2',
              body: posted.body,
              publish_as: posted.publishAs ?? 'anonymous',
              author_label: 'R-7F2A',
              created_at: '2026-09-07T12:00:00.000Z',
            },
          },
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/map?loc=baner');
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Comments', exact: true })).toHaveCount(0);

    await page.locator('.loc-panel__issue').filter({ hasText: /Overflowing dumpster/i }).click();
    const commentsBtn = page.getByRole('button', { name: 'Comments', exact: true });
    await expect(commentsBtn).toBeVisible();
    await expect(commentsBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByText(mockedBody)).toHaveCount(0);
    expect(commentsFetched).toBe(false);

    await page.getByRole('button', { name: /Edit draft/i }).click();
    await expect(page.getByRole('textbox', { name: /Draft for X/i })).toBeVisible();

    await commentsBtn.click();
    await expect(page.getByRole('button', { name: 'Hide comments' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(page.getByRole('textbox', { name: /Draft for X/i })).toHaveCount(0);
    await expect(page.getByText(mockedBody)).toBeVisible();
    await expect(page.getByText('R-7F2A').first()).toBeVisible();
    await expect(page.locator('.issue-comments__meta').first()).toContainText(/ago|Just now/);
    await expect(page.locator('.issue-comments').getByText(/Sign-in/i)).toHaveCount(0);

    const composer = page.getByRole('textbox', { name: /^Comment$/i });
    await composer.fill(postedBody);
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /Could not post comment/i })).toBeVisible();
    await expect(composer).toHaveValue(postedBody);

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText(postedBody)).toBeVisible();
    await expect(composer).toHaveValue('');
    await expect(page.getByRole('alert').filter({ hasText: /Could not post comment/i })).toHaveCount(
      0,
    );
  });

  test('report modal Escape closes the dialog', async ({ page }) => {
    await page.goto('/map?report=1');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
