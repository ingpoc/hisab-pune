import type { Feature, FeatureCollection, Polygon, MultiPolygon, Position } from 'geojson';

type WardProps = { wardId: number; name: string };

let cache: FeatureCollection<Polygon | MultiPolygon, WardProps> | null = null;

export async function loadWardGeoJSON(): Promise<
  FeatureCollection<Polygon | MultiPolygon, WardProps>
> {
  if (cache) return cache;
  const res = await fetch('/data/wards-2026.geojson');
  if (!res.ok) throw new Error('Failed to load ward boundaries');
  cache = (await res.json()) as FeatureCollection<Polygon | MultiPolygon, WardProps>;
  return cache;
}

function pointInRing(lon: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon: number, lat: number, poly: Position[][]): boolean {
  if (!pointInRing(lon, lat, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) {
    if (pointInRing(lon, lat, poly[i])) return false;
  }
  return true;
}

export function wardIdAt(
  lon: number,
  lat: number,
  fc: FeatureCollection<Polygon | MultiPolygon, WardProps>,
): number | null {
  for (const f of fc.features) {
    if (featureContains(f, lon, lat)) return f.properties.wardId;
  }
  return null;
}

function featureContains(
  f: Feature<Polygon | MultiPolygon, WardProps>,
  lon: number,
  lat: number,
): boolean {
  const g = f.geometry;
  if (g.type === 'Polygon') return pointInPolygon(lon, lat, g.coordinates);
  return g.coordinates.some((poly) => pointInPolygon(lon, lat, poly));
}
