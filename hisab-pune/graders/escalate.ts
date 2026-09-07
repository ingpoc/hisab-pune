import { fail, pass, read, type GradeResult } from './lib.ts';

/** Public escalate must sync the ledger and stay honest on failure. */
export function gradeEscalate(): GradeResult {
  const app = read('server/src/app.ts');
  const api = read('src/lib/api.ts');
  const mapPage = read('src/pages/MapPage.tsx');
  const panel = read('src/components/LocalitySidePanel.tsx');
  const errors: string[] = [];

  if (!/app\.post\(\s*'\/v1\/reports\/:id\/escalate'/.test(app)) {
    errors.push('API must expose POST /v1/reports/:id/escalate');
  }
  if (!app.includes("event_type") || !app.includes("'escalated'")) {
    errors.push('escalate route must append report_events event_type escalated');
  }
  if (!app.includes("status = 'escalated'") && !app.includes(`status = "escalated"`)) {
    errors.push('escalate route must set status to escalated');
  }
  if (!app.includes('Cannot escalate a resolved report')) {
    errors.push('escalate route must reject resolved reports');
  }
  if (!api.includes('export async function escalateReport')) {
    errors.push('api.ts must export escalateReport');
  }
  if (!api.includes('/escalate')) {
    errors.push('escalateReport must POST /v1/reports/:id/escalate');
  }
  if (!mapPage.includes('escalateReport(')) {
    errors.push('MapPage must call escalateReport');
  }
  if (!mapPage.includes('ESCALATE_FAIL_COPY') || !mapPage.includes('Could not update the public ledger')) {
    errors.push('MapPage must show honest public-escalate failure copy');
  }
  const escalateFn = mapPage.match(/function escalate\([^)]*\) \{[\s\S]*?\n  \}/);
  if (escalateFn?.[0].includes('updateReportStatus')) {
    errors.push('MapPage.escalate must not persist local status before the public API');
  }
  if (!panel.includes('onRetryEscalate') || !panel.includes('Retry')) {
    errors.push('LocalitySidePanel must offer Retry after a public escalate miss');
  }
  if (/Sign[- ]?in/i.test(mapPage) || /Sign[- ]?in/i.test(panel)) {
    errors.push('escalate UI must not include Sign-in');
  }

  if (errors.length) return fail('escalate-status', errors.join('; '));
  return pass('escalate-status', 'POST escalate + honest MapPage failure/retry');
}
