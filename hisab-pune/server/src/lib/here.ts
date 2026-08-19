import type { Db } from '../db/client.ts';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { wardIdAt, loadWardGeomsFromFC, type WardGeom } from './geo.ts';
import { buildEscalation, widgetEscalation } from './escalation.ts';

type LocalityRow = {
  id: string;
  name: string;
  ward_id: number;
  office_id: string;
  assembly_key: string;
  lat: number;
  lng: number;
  zone: string | null;
};

type WardRow = { id: number; name: string; geometry_json: string };

let wardCache: WardGeom[] | null = null;

export async function loadWards(db: Db): Promise<WardGeom[]> {
  if (wardCache) return wardCache;
  const rows = await db.all<WardRow>('SELECT id, name, geometry_json FROM wards');
  const fc: FeatureCollection<Polygon | MultiPolygon, { wardId: number; name: string }> = {
    type: 'FeatureCollection',
    features: rows.map((r) => ({
      type: 'Feature',
      properties: { wardId: r.id, name: r.name },
      geometry: JSON.parse(r.geometry_json) as Polygon | MultiPolygon,
    })),
  };
  wardCache = loadWardGeomsFromFC(fc);
  return wardCache;
}

export function invalidateWardCache(): void {
  wardCache = null;
}

async function nearestLocality(
  db: Db,
  lat: number,
  lng: number,
  wardId?: number | null,
): Promise<LocalityRow> {
  const rows =
    wardId != null
      ? await db.all<LocalityRow>('SELECT * FROM localities WHERE ward_id = ?', [wardId])
      : await db.all<LocalityRow>('SELECT * FROM localities');
  const pool = rows.length ? rows : await db.all<LocalityRow>('SELECT * FROM localities');
  let best = pool[0];
  let bestD = Infinity;
  for (const loc of pool) {
    const d = (loc.lat - lat) ** 2 + (loc.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = loc;
    }
  }
  return best;
}

export async function resolveHere(db: Db, lat: number, lng: number) {
  const wards = await loadWards(db);
  const wardId = wardIdAt(lng, lat, wards);
  const locality = await nearestLocality(db, lat, lng, wardId);
  const named =
    wardId != null
      ? await db.get<{ name: string }>('SELECT name FROM wards WHERE id = ?', [wardId])
      : undefined;
  const fallback = await db.get<{ name: string }>('SELECT name FROM wards WHERE id = ?', [
    locality.ward_id,
  ]);
  const wardName = named?.name ?? fallback?.name ?? '';

  const effectiveWardId = wardId ?? locality.ward_id;
  const escalation = await buildEscalation(db, {
    wardId: effectiveWardId,
    officeId: locality.office_id,
    assemblyKey: locality.assembly_key,
  });

  const boundary = await db.get<{
    id: string;
    label: string;
    source_url: string | null;
    effective_from: string;
  }>('SELECT id, label, source_url, effective_from FROM boundary_versions LIMIT 1');

  return {
    locality: {
      id: locality.id,
      name: locality.name,
      zone: locality.zone,
    },
    ward: {
      id: effectiveWardId,
      name: wardName,
      matchedByPolygon: wardId != null,
    },
    escalation,
    widget: {
      localityName: locality.name,
      wardId: effectiveWardId,
      people: widgetEscalation(escalation).map((p) => ({
        role: p.role,
        shortTitle: p.shortTitle,
        name: p.name,
      })),
    },
    resolvedAt: new Date().toISOString(),
    boundaryVersion: boundary?.id ?? '',
    boundaryLabel: boundary?.label ?? '',
  };
}
