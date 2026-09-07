import { expect, test } from '@playwright/test';

/**
 * Render Free cold-start: waking banner, failed health + Retry, MapPage load error.
 * Health/report failures use instant 503 so backoff (1s+2s+4s) stays inside the
 * 30s default timeout without waiting on per-attempt network timeouts.
 */
test.describe('Render Free cold-start UX', () => {
  test('fast /health does not flash the waking banner', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero__brand')).toHaveText('Hisab');
    await expect(page.getByText(/Waking Hisab/i)).toHaveCount(0);
    await expect(page.getByText(/Could not reach Hisab/i)).toHaveCount(0);
  });

  test('slow /health shows waking copy then hides when ok', async ({ page }) => {
    await page.route('**/health', async (route) => {
      await new Promise((r) => setTimeout(r, 1_400));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, service: 'hisab-api', language: 'en' }),
      });
    });
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText(/Waking Hisab — free hosting may take up to a minute/i);
    await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('.hero__brand')).toHaveText('Hisab');
  });

  test('failed /health shows error and Retry recovers', async ({ page }) => {
    test.setTimeout(45_000);
    let down = true;
    await page.route('**/health', async (route) => {
      if (down) {
        await route.fulfill({ status: 503, body: 'unavailable' });
        return;
      }
      await route.continue();
    });
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText(/Waking Hisab/i, { timeout: 5_000 });
    await expect(page.getByRole('alert')).toContainText(/Could not reach Hisab/i, {
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    down = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText(/Waking Hisab/i)).toHaveCount(0);
  });

  test('MapPage shows live-report error and Retry instead of swallowing', async ({ page }) => {
    test.setTimeout(45_000);
    let down = true;
    await page.route('**/v1/reports', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      if (down) {
        await route.fulfill({ status: 503, body: 'unavailable' });
        return;
      }
      await route.continue();
    });
    await page.goto('/map');
    const reportsError = page.getByRole('alert').filter({ hasText: /Could not load live reports/i });
    await expect(reportsError).toBeVisible({ timeout: 20_000 });
    await expect(reportsError.getByRole('button', { name: 'Retry' })).toBeVisible();
    down = false;
    await reportsError.getByRole('button', { name: 'Retry' }).click();
    await expect(reportsError).toHaveCount(0, { timeout: 15_000 });
  });

  test('failed POST keeps report modal open; Retry publishes', async ({ page }) => {
    test.setTimeout(45_000);
    let down = true;
    await page.route('**/v1/reports', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      if (down) {
        await route.fulfill({ status: 503, body: 'unavailable' });
        return;
      }
      await route.continue();
    });
    await page.goto('/map?loc=baner&report=1');
    await expect(page.getByRole('dialog')).toBeVisible();
    const note = `E2E unpublished Baner ${Date.now()}`;
    await page.getByRole('textbox', { name: /what happened/i }).fill(note);
    await page.getByRole('button', { name: /publish report/i }).click();
    const publishError = page.getByRole('alert').filter({
      hasText: /Could not publish to Hisab/i,
    });
    await expect(publishError).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save on this device only' })).toBeVisible();
    await expect(page.locator('.loc-panel__issue-note', { hasText: note })).toHaveCount(0);
    down = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });
    await expect(page.locator('.loc-panel__issue-note', { hasText: note })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('device-only save is opt-in after publish failure', async ({ page }) => {
    test.setTimeout(45_000);
    await page.route('**/v1/reports', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({ status: 503, body: 'unavailable' });
    });
    await page.goto('/map?loc=baner&report=1');
    await expect(page.getByRole('dialog')).toBeVisible();
    const note = `E2E device-only Baner ${Date.now()}`;
    await page.getByRole('textbox', { name: /what happened/i }).fill(note);
    await page.getByRole('button', { name: /publish report/i }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: /Could not publish to Hisab/i }),
    ).toBeVisible({ timeout: 25_000 });
    await page.getByRole('button', { name: 'Save on this device only' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('.loc-panel__issue-note', { hasText: note })).toBeVisible({
      timeout: 10_000,
    });
  });
});
