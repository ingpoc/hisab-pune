/**
 * Deterministic graders — encode browser QA / product invariants.
 * Prefer these over agent re-checks (token/cost efficient).
 *
 * Run: npm run grade
 */
import { gradeEnglish } from './english.ts';
import { gradeRoster } from './roster.ts';
import { gradeNoStaleAmc } from './no-stale-amc.ts';
import { gradeRoutes } from './routes.ts';
import { gradeGeojson, gradeViteHost } from './vite-and-geo.ts';
import type { GradeResult } from './lib.ts';

const results: GradeResult[] = [
  gradeEnglish(),
  gradeRoster(),
  gradeNoStaleAmc(),
  gradeRoutes(),
  gradeViteHost(),
  gradeGeojson(),
];

let failed = 0;
for (const r of results) {
  const mark = r.ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${r.name} — ${r.detail}`);
  if (!r.ok) failed += 1;
}

console.log(`\n${results.length - failed}/${results.length} graders passed`);
if (failed) process.exit(1);
