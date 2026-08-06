import { EXPECT } from './expect.ts';
import { exists, fail, pass, read, type GradeResult } from './lib.ts';

/** Regression: Vite must bind 0.0.0.0 so cloud/browser QA can reach the app. */
export function gradeViteHost(): GradeResult {
  if (!exists('vite.config.ts')) return fail('vite-host', 'vite.config.ts missing');
  const cfg = read('vite.config.ts');
  if (!/host:\s*['"]0\.0\.0\.0['"]/.test(cfg) && !/host:\s*true/.test(cfg)) {
    return fail('vite-host', 'server.host must be 0.0.0.0 (or true) for remote browser QA');
  }
  if (!cfg.includes("'/v1'") || !cfg.includes('8787')) {
    return fail('vite-host', 'dev proxy must forward /v1 to API :8787');
  }
  return pass('vite-host', 'Vite host 0.0.0.0 + /v1 proxy configured');
}

/** Browser QA: map uses 2026 ward polygons. */
export function gradeGeojson(): GradeResult {
  if (!exists(EXPECT.geojsonPath)) {
    return fail('geojson', `${EXPECT.geojsonPath} missing`);
  }
  const raw = read(EXPECT.geojsonPath);
  let json: { type?: string; features?: unknown[] };
  try {
    json = JSON.parse(raw) as { type?: string; features?: unknown[] };
  } catch {
    return fail('geojson', 'invalid JSON');
  }
  if (json.type !== 'FeatureCollection') return fail('geojson', 'expected FeatureCollection');
  const n = json.features?.length ?? 0;
  if (n < EXPECT.geojsonMinFeatures) {
    return fail('geojson', `features ${n} < ${EXPECT.geojsonMinFeatures}`);
  }
  return pass('geojson', `${n} ward polygon features`);
}
