import { EXPECT } from './expect.ts';
import { fail, pass, read, type GradeResult } from './lib.ts';

/** Browser QA: every primary route + report deep-link must stay wired. */
export function gradeRoutes(): GradeResult {
  const app = read('src/App.tsx');
  const nav = read('src/components/Nav.tsx');
  const hero = read('src/components/Hero.tsx');
  const mapPage = read('src/pages/MapPage.tsx');
  const errors: string[] = [];

  for (const route of EXPECT.routes) {
    if (route === '/locality/:id') {
      if (!app.includes('path="/locality/:id"')) errors.push('missing Route /locality/:id');
    } else if (!app.includes(`path="${route}"`)) {
      errors.push(`missing Route ${route}`);
    }
  }

  for (const href of EXPECT.navHrefs) {
    if (!nav.includes(`to="${href}"`) && !nav.includes(`to={'${href}'}`)) {
      errors.push(`Nav missing link to ${href}`);
    }
  }

  if (!nav.includes('Hisab')) errors.push('Nav brand missing Hisab');
  if (!hero.includes('hero__brand') || !hero.includes('>Hisab<')) {
    errors.push('Hero must expose brand-level Hisab');
  }
  if (!hero.includes('/map?report=1')) errors.push('Hero CTA must deep-link report=1');
  if (!mapPage.includes("params.get('report') === '1'")) {
    errors.push('MapPage must open modal when report=1');
  }
  if (!mapPage.includes('ReportModal')) errors.push('MapPage must render ReportModal');

  // NavLink/Link produce real anchors — required so browser QA clicks work
  if (!nav.includes('NavLink')) errors.push('Nav must use NavLink (real <a href>)');

  if (errors.length) return fail('routes', errors.join('; '));
  return pass('routes', `App routes + Nav/Hero report deep-link + brand OK`);
}
