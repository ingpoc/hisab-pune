import type { FeatureCollection, Polygon, MultiPolygon, Position } from 'geojson';

export type WardGeom = {
  wardId: number;
  name: string;
  geometry: Polygon | MultiPolygon;
};

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

export function wardIdAt(lon: number, lat: number, wards: WardGeom[]): number | null {
  for (const w of wards) {
    const g = w.geometry;
    if (g.type === 'Polygon') {
      if (pointInPolygon(lon, lat, g.coordinates)) return w.wardId;
    } else {
      if (g.coordinates.some((poly) => pointInPolygon(lon, lat, poly))) return w.wardId;
    }
  }
  return null;
}

export function loadWardGeomsFromFC(
  fc: FeatureCollection<Polygon | MultiPolygon, { wardId: number; name: string }>,
): WardGeom[] {
  return fc.features.map((f) => ({
    wardId: f.properties.wardId,
    name: f.properties.name,
    geometry: f.geometry,
  }));
}
