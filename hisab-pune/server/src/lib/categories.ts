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

export const CATEGORY_META: Record<
  CategoryId,
  { label: string; deptTip: string }
> = {
  solid_waste: { label: 'Solid waste / blackspot', deptTip: 'SWM / ward office' },
  drainage_flood: { label: 'Drainage / flooding', deptTip: 'Drainage / ward office' },
  roads_footpath: { label: 'Roads / footpath', deptTip: 'Roads / ward office' },
  streetlight: { label: 'Streetlight', deptTip: 'Electrical / ward office' },
  water_supply: { label: 'Water supply', deptTip: 'Water / ward office' },
  encroachment: { label: 'Encroachment', deptTip: 'Enforcement / ward office' },
  parks_trees: { label: 'Parks / trees', deptTip: 'Garden / tree cell' },
  stray_animals: { label: 'Stray animals', deptTip: 'Health / animal control' },
  other: { label: 'Other civic issue', deptTip: 'Ward office first' },
};

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}
