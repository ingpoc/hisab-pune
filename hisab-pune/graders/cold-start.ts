import { exists, fail, pass, read, type GradeResult } from './lib.ts';

/** Render Free cold-start UX: resilient fetch, wake banner, no silent map swallow. */
export function gradeColdStart(): GradeResult {
  const api = read('src/lib/api.ts');
  const helper = read('src/lib/resilientFetch.ts');
  const wake = read('src/lib/apiWake.ts');
  const banner = read('src/components/WakeBanner.tsx');
  const app = read('src/App.tsx');
  const mapPage = read('src/pages/MapPage.tsx');
  const modal = read('src/components/ReportModal.tsx');
  const html = read('index.html');
  const errors: string[] = [];

  if (!api.includes('resilientFetch')) errors.push('api.ts must use resilientFetch');
  if (!api.includes('fetchHealth') && !wake.includes("resilientFetch('/health')")) {
    errors.push('health probe must call GET /health');
  }
  if (!helper.includes('502') || !helper.includes('503') || !helper.includes('504')) {
    errors.push('resilientFetch must retry 502/503/504');
  }
  if (!helper.includes('timeoutMs')) errors.push('resilientFetch must apply a timeout');
  if (!wake.includes('Waking Hisab — free hosting may take up to a minute.')) {
    errors.push('missing waking copy');
  }
  if (!banner.includes('Retry') || !wake.includes('DOWN_COPY')) {
    errors.push('failed health must offer Retry');
  }
  if (/Sign[- ]?in/i.test(banner)) errors.push('wake banner must not include Sign-in');
  if (!app.includes('WakeBanner')) errors.push('App must render WakeBanner');
  if (!mapPage.includes('Retry')) errors.push('MapPage must expose Retry after API read failure');
  if (/fetchReports\(\)[\s\S]*?\.catch\(\s*\(\)\s*=>\s*\{\s*\/\* keep local\/seed fallback \*\//.test(mapPage)) {
    errors.push('MapPage must not swallow fetchReports failures');
  }
  if (/\.catch\(\s*\(\)\s*=>\s*\{\s*\}\)/.test(mapPage)) {
    errors.push('MapPage must not use an empty catch on API reads');
  }

  const createIdx = modal.indexOf('await createReport');
  const submitCatch = createIdx >= 0
    ? modal.slice(createIdx).match(/\} catch(?:\s*\([^)]*\))?\s*\{([\s\S]*?)\n    \} finally/)
    : null;
  const catchBlock = submitCatch?.[1] ?? '';
  if (!catchBlock) {
    errors.push('ReportModal submit must catch API failure');
  } else {
    if (catchBlock.includes('saveUserReport')) {
      errors.push('ReportModal catch must not save a local report');
    }
    if (catchBlock.includes('onCreated')) {
      errors.push('ReportModal catch must not call onCreated');
    }
    if (catchBlock.includes('onClose()')) {
      errors.push('ReportModal catch must not close the modal');
    }
  }
  if (!modal.includes('PUBLISH_FAIL_COPY') || !modal.includes('Could not publish to Hisab')) {
    errors.push('ReportModal must show honest publish-failure copy');
  }
  if (!modal.includes('Save on this device only')) {
    errors.push('ReportModal must offer opt-in device-only save');
  }
  if (/Sign[- ]?in/i.test(modal)) errors.push('ReportModal must not include Sign-in');

  if (!html.includes('viewport-fit=cover')) {
    errors.push('index.html viewport must include viewport-fit=cover');
  }
  if (!html.includes('property="og:url"') || !html.includes('https://hisab-pune.onrender.com/')) {
    errors.push('index.html must set og:url to the Render host');
  }
  if (!html.includes('property="og:image"') || !html.includes('/og-image.png')) {
    errors.push('index.html must set og:image to the static share card');
  }
  if (!html.includes('name="twitter:image"')) {
    errors.push('index.html must set twitter:image');
  }
  if (!exists('public/og-image.png')) {
    errors.push('public/og-image.png share card missing');
  }

  if (errors.length) return fail('cold-start', errors.join('; '));
  return pass('cold-start', 'resilient fetch + honest publish + viewport-fit + OG image');
}
