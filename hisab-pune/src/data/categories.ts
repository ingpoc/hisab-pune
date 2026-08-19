/** Flat civic issue categories — keep in sync with server CATEGORY_IDS. */
export const CATEGORY_IDS = [
  'solid_waste',
  'drainage_flood',
  'roads_footpath',
  'streetlight',
  'water_supply',
  'encroachment',
  'parks_trees',
  'stray_animals',
  'other',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type CategoryMeta = {
  id: CategoryId;
  label: string;
  deptTip: string;
};

export const CATEGORIES: CategoryMeta[] = [
  { id: 'solid_waste', label: 'Solid waste / blackspot', deptTip: 'SWM / ward office' },
  { id: 'drainage_flood', label: 'Drainage / flooding', deptTip: 'Drainage / ward office' },
  { id: 'roads_footpath', label: 'Roads / footpath', deptTip: 'Roads / ward office' },
  { id: 'streetlight', label: 'Streetlight', deptTip: 'Electrical / ward office' },
  { id: 'water_supply', label: 'Water supply', deptTip: 'Water / ward office' },
  { id: 'encroachment', label: 'Encroachment', deptTip: 'Enforcement / ward office' },
  { id: 'parks_trees', label: 'Parks / trees', deptTip: 'Garden / tree cell' },
  { id: 'stray_animals', label: 'Stray animals', deptTip: 'Health / animal control' },
  { id: 'other', label: 'Other civic issue', deptTip: 'Ward office first' },
];

export function getCategory(id: string | undefined | null): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}
