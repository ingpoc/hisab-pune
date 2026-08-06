/**
 * Expected invariants from product + browser QA.
 * Keep graders cheap: static checks first, Playwright only for DOM contracts.
 */
export const EXPECT = {
  brand: 'Hisab',
  wards: 41,
  corporators: 165,
  localities: 30,
  wardOffices: 15,
  routes: ['/', '/map', '/localities', '/wards', '/how', '/locality/:id'] as const,
  navHrefs: ['/map', '/localities', '/wards', '/how', '/map?report=1'] as const,
  reportQuery: 'report=1',
  geojsonPath: 'public/data/wards-2026.geojson',
  geojsonMinFeatures: 41,
} as const;

/** Devanagari block — English-only product rule */
export const DEVANAGARI = /[\u0900-\u097F]/;

export const FORBIDDEN_FIELD_NAMES = ['nameMr', 'name_mr', 'marathi', 'nameHi'] as const;
