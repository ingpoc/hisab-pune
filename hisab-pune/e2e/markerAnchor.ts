import { expect, type Page } from '@playwright/test';

/**
 * MapLibre's Marker({ element, anchor: 'center' }) uses that element as the
 * marker node. Its box centre must sit on map.project(lngLat).
 */
export async function waitForLocalityCamera(page: Page, id: string, heading: RegExp) {
  await page.goto(`/map?loc=${id}`);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('button.map-loc.is-active')).toBeVisible({ timeout: 15_000 });
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('.map-shell__canvas') as
        | (HTMLElement & {
            __hisabMap?: {
              project: (ll: [number, number]) => { x: number; y: number };
              getZoom: () => number;
              getCenter: () => { lng: number; lat: number };
            };
          })
        | null;
      const pin = document.querySelector('button.map-loc.is-active') as HTMLElement | null;
      if (!canvas?.__hisabMap || !pin) return false;
      const lng = Number(pin.dataset.lng);
      const lat = Number(pin.dataset.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
      const map = canvas.__hisabMap;
      const center = map.getCenter();
      if (Math.abs(map.getZoom() - 13.4) > 0.05) return false;
      if (Math.abs(center.lng - lng) > 0.002 || Math.abs(center.lat - lat) > 0.002) return false;
      const projected = map.project([lng, lat]);
      const origin = canvas.getBoundingClientRect();
      const box = pin.getBoundingClientRect();
      const dx = Math.abs(box.left + box.width / 2 - (origin.left + projected.x));
      const dy = Math.abs(box.top + box.height / 2 - (origin.top + projected.y));
      const state = window as Window & { __anchorKey?: string; __anchorFrames?: number };
      const key = `${Math.round(box.left)},${Math.round(box.top)}`;
      if (state.__anchorKey !== key) {
        state.__anchorKey = key;
        state.__anchorFrames = 0;
        return false;
      }
      state.__anchorFrames = (state.__anchorFrames ?? 0) + 1;
      return dx <= 1.5 && dy <= 1.5 && state.__anchorFrames > 8;
    },
    undefined,
    { timeout: 15_000 },
  );
}

export async function expectMarkersOnProjectedPoints(page: Page) {
  await waitForLocalityCamera(page, 'baner', /Baner/i);

  const rows = await page.evaluate(() => {
    const canvas = document.querySelector('.map-shell__canvas') as HTMLElement & {
      __hisabMap?: { project: (ll: [number, number]) => { x: number; y: number } };
    };
    const map = canvas.__hisabMap;
    if (!map) return [];
    const origin = canvas.getBoundingClientRect();
    return [...document.querySelectorAll('button.map-pin, button.map-loc')].map((el) => {
      const node = el as HTMLElement;
      const box = node.getBoundingClientRect();
      const lng = Number(node.dataset.lng);
      const lat = Number(node.dataset.lat);
      const projected = map.project([lng, lat]);
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      return {
        name: node.getAttribute('title') || node.className,
        dx: Math.abs(cx - (origin.left + projected.x)),
        dy: Math.abs(cy - (origin.top + projected.y)),
        w: box.width,
        h: box.height,
        hidden: getComputedStyle(node).visibility === 'hidden',
      };
    });
  });

  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row.hidden, row.name).toBe(false);
    expect(row.dx, row.name).toBeLessThanOrEqual(1.5);
    expect(row.dy, row.name).toBeLessThanOrEqual(1.5);
    expect(row.w, row.name).toBeGreaterThanOrEqual(44);
    expect(row.h, row.name).toBeGreaterThanOrEqual(44);
  }
}
