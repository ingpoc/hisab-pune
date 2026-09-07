import { fail, pass, read, type GradeResult } from './lib.ts';

/** Render Free cold-start UX: resilient fetch, wake banner, no silent map swallow. */
export function gradeColdStart(): GradeResult {
  const api = read('src/lib/api.ts');
  const helper = read('src/lib/resilientFetch.ts');
  const wake = read('src/lib/apiWake.ts');
  const banner = read('src/components/WakeBanner.tsx');
  const app = read('src/App.tsx');
  const mapPage = read('src/pages/MapPage.tsx');
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

  if (errors.length) return fail('cold-start', errors.join('; '));
  return pass('cold-start', 'resilient fetch + wake banner + MapPage error/retry');
}
