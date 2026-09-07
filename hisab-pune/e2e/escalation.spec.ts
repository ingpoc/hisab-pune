import { expect, test, type Page } from '@playwright/test';

const BANER_LOCALITY = {
  id: 'baner',
  name: 'Baner',
  electoralWardId: 9,
  wardOfficeId: 'aundh-baner',
  assemblyId: 'mla-kothrud',
  lat: 18.559,
  lng: 73.7867,
  zone: 'West',
};

function person(
  id: string,
  name: string,
  role: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    name,
    role,
    shortTitle: role,
    title: null,
    party: null,
    xHandle: null,
    phone: '1800-103-0222',
    email: null,
    note: null,
    sourceLabel: 'Live roster test',
    ...extra,
  };
}

const MOCK_CHAIN = [
  person('api-san', 'Live Roster Desk', 'sanitation', { shortTitle: 'SWM' }),
  person('api-wo', 'Baner Ward Office', 'ward_officer'),
  person('api-corp', 'Test Corporator', 'corporator'),
  person('api-mla', 'Test MLA', 'mla'),
  person('api-dy', 'Test Deputy Mayor', 'deputy_mayor'),
  person('api-mayor', 'Test Mayor', 'mayor'),
  person('api-comm', 'Test Commissioner', 'commissioner'),
  person('api-mp', 'Murlidhar Mohol', 'mp', {
    shortTitle: 'MP',
    title: 'Member of Parliament — Pune Lok Sabha',
    xHandle: 'mohol_murlidhar',
    phone: null,
    sourceLabel: 'Lok Sabha 2024 (sitting) · X @mohol_murlidhar',
  }),
];

function isBanerLocalityUrl(url: string): boolean {
  return /\/v1\/localities\/baner\/?(\?|$)/.test(url) && !url.includes('/reports');
}

async function openBanerRail(page: Page) {
  await page.goto('/map?loc=baner');
  await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: /Escalation route/i }).click();
  const rail = page.getByRole('complementary', { name: 'Escalation route' });
  await expect(rail).toBeVisible();
  return rail;
}

test.describe('Map locality escalation (API-first)', () => {
  test('Baner rail uses live API last contact when available', async ({ page }) => {
    const locApi = page.waitForResponse(
      (res) =>
        /\/v1\/localities\/baner\/?(\?|$)/.test(res.url()) && !res.url().includes('/reports'),
    );
    const rail = await openBanerRail(page);
    const locRes = await locApi;
    expect(locRes.ok()).toBeTruthy();
    const last = page.locator('.ladder--rail .ladder__list > li').last();
    await expect(last.getByRole('heading', { name: /Murlidhar Mohol/i })).toBeVisible();
    await expect(rail.getByText(/Showing saved contacts/i)).toHaveCount(0);
  });

  test('Baner rail uses mocked API contacts ending with Murlidhar Mohol', async ({
    page,
  }) => {
    await page.route('**/v1/localities/baner**', async (route) => {
      if (!isBanerLocalityUrl(route.request().url())) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          locality: BANER_LOCALITY,
          ward: { id: 9, name: 'Sus-Baner-Pashan' },
          escalation: MOCK_CHAIN,
        }),
      });
    });

    const rail = await openBanerRail(page);
    await expect(rail.getByRole('heading', { name: /Live Roster Desk/i })).toBeVisible();
    await expect(page.getByText(/8 contacts/i).first()).toBeVisible();
    const last = page.locator('.ladder--rail .ladder__list > li').last();
    await expect(last.getByRole('heading', { name: /Murlidhar Mohol/i })).toBeVisible();
    await expect(page.getByText(/Showing saved contacts/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Avinash Sakpal/i })).toHaveCount(0);
  });

  test('Baner rail falls back to the static chain when localities/:id fails', async ({
    page,
  }) => {
    await page.route('**/v1/localities/baner**', async (route) => {
      if (!isBanerLocalityUrl(route.request().url())) {
        await route.continue();
        return;
      }
      await route.fulfill({ status: 500, body: 'roster down' });
    });

    const rail = await openBanerRail(page);
    await expect(page.getByText(/Showing saved contacts — live roster unavailable/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(rail.getByRole('heading', { name: /Avinash Sakpal/i })).toBeVisible();
    const last = page.locator('.ladder--rail .ladder__list > li').last();
    await expect(last.getByRole('heading', { name: /Murlidhar Mohol/i })).toBeVisible();
    await expect(rail.getByRole('heading', { name: /Live Roster Desk/i })).toHaveCount(0);
  });

  test('Retry refetches locality escalation after a live miss', async ({ page }) => {
    test.setTimeout(45_000);
    let down = true;
    await page.route('**/v1/reports', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      if (down) {
        await route.fulfill({ status: 500, body: 'unavailable' });
        return;
      }
      await route.continue();
    });
    await page.route('**/v1/localities/baner**', async (route) => {
      if (!isBanerLocalityUrl(route.request().url())) {
        await route.continue();
        return;
      }
      if (down) {
        await route.fulfill({ status: 500, body: 'roster down' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          locality: BANER_LOCALITY,
          ward: { id: 9, name: 'Sus-Baner-Pashan' },
          escalation: MOCK_CHAIN,
        }),
      });
    });

    await page.goto('/map?loc=baner');
    await expect(page.getByRole('heading', { level: 1, name: /Baner/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Showing saved contacts — live roster unavailable/i)).toBeVisible({
      timeout: 10_000,
    });
    const reportsError = page.getByRole('alert').filter({ hasText: /Could not load live reports/i });
    await expect(reportsError).toBeVisible();

    down = false;
    await reportsError.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText(/Showing saved contacts/i)).toHaveCount(0, { timeout: 15_000 });
    await page.getByRole('button', { name: /Escalation route/i }).click();
    await expect(page.getByRole('heading', { name: /Live Roster Desk/i })).toBeVisible();
    const last = page.locator('.ladder--rail .ladder__list > li').last();
    await expect(last.getByRole('heading', { name: /Murlidhar Mohol/i })).toBeVisible();
  });
});
