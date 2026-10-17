import { expect, type Page } from '@playwright/test';
import { waitForLocalityCamera } from './markerAnchor';

const CAMERAS: Array<{ id: string; heading: RegExp }> = [
  { id: 'baner', heading: /Baner/i },
  { id: 'katraj', heading: /Katraj/i },
  { id: 'vadgaon-sheri', heading: /Vadgaon Sheri/i },
];

/**
 * At each locality's default camera, marker boxes stay on their true points
 * and off the sheet handle, zoom, attribution, and logo.
 */
export async function expectMarkersClearOfChrome(page: Page) {
  for (const camera of CAMERAS) {
    await waitForLocalityCamera(page, camera.id, camera.heading);
    const audit = await page.evaluate(() => {
      const visible = (el: Element | null) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
      };
      const controls: Array<{ name: string; rect: DOMRect }> = [];
      const add = (el: Element | null, name: string) => {
        if (!visible(el) || !el) return;
        controls.push({ name, rect: el.getBoundingClientRect() });
      };
      add(document.querySelector('.map-page__sheet-handle'), 'sheet-handle');
      add(document.querySelector('.maplibregl-ctrl-zoom-in'), 'zoom-in');
      add(document.querySelector('.maplibregl-ctrl-zoom-out'), 'zoom-out');
      add(document.querySelector('a.maplibregl-ctrl-logo'), 'logo');
      const attrib = document.querySelector('.maplibregl-ctrl-attrib');
      if (attrib?.classList.contains('maplibregl-compact') && !attrib.classList.contains('maplibregl-compact-show')) {
        add(attrib.querySelector('summary'), 'attribution');
      } else {
        add(attrib, 'attribution');
      }

      const canvasBox = document.querySelector('.map-shell__canvas')?.getBoundingClientRect();
      const hits: string[] = [];
      for (const el of document.querySelectorAll('button.map-pin, button.map-loc')) {
        if (!visible(el)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) hits.push(`${el.getAttribute('title')} under 44px`);
        if (!canvasBox) continue;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const inside =
          cx >= canvasBox.left && cx <= canvasBox.right && cy >= canvasBox.top && cy <= canvasBox.bottom;
        for (const control of controls) {
          const zoomControl = control.name === 'zoom-in' || control.name === 'zoom-out';
          if (!inside && !zoomControl) continue;
          const overlaps =
            rect.left < control.rect.right &&
            rect.right > control.rect.left &&
            rect.top < control.rect.bottom &&
            rect.bottom > control.rect.top;
          if (overlaps) hits.push(`${el.getAttribute('title')} intersects ${control.name}`);
        }
      }

      const canvas = document.querySelector('.map-shell__canvas') as HTMLElement & {
        __hisabMap?: { getPadding: () => { top: number; right: number; bottom: number; left: number } };
      };
      const map = canvas.__hisabMap;
      const pin = document.querySelector('button.map-loc.is-active') as HTMLElement;
      const pad = map?.getPadding();
      const origin = canvas.getBoundingClientRect();
      const box = pin.getBoundingClientRect();
      const usableX = pad ? origin.left + pad.left + (origin.width - pad.left - pad.right) / 2 : origin.left + origin.width / 2;
      const usableY = pad ? origin.top + pad.top + (origin.height - pad.top - pad.bottom) / 2 : origin.top + origin.height / 2;
      return {
        hits,
        dx: Math.abs(box.left + box.width / 2 - usableX),
        dy: Math.abs(box.top + box.height / 2 - usableY),
        controls: controls.map((control) => control.name),
      };
    });

    expect(audit.controls, camera.id).toEqual(expect.arrayContaining(['zoom-in', 'zoom-out', 'attribution']));
    expect(audit.hits, camera.id).toEqual([]);
    expect(audit.dx, `${camera.id} centre x`).toBeLessThanOrEqual(2);
    expect(audit.dy, `${camera.id} centre y`).toBeLessThanOrEqual(2);
  }
}
