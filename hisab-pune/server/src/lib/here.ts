import type Database from 'better-sqlite3';
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

export function loadWards(db: Database.Database): WardGeom[] {
  if (wardCache) return wardCache;
  const rows = db.prepare('SELECT id, name, geometry_json FROM wards').all() as WardRow[];
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

function nearestLocality(
  db: Database.Database,
  lat: number,
  lng: number,
  wardId?: number | null,
): LocalityRow {
  const rows = (
    wardId != null
      ? (db
          .prepare('SELECT * FROM localities WHERE ward_id = ?')
          .all(wardId) as LocalityRow[])
      : (db.prepare('SELECT * FROM localities').all() as LocalityRow[])
  );
  const pool = rows.length ? rows : (db.prepare('SELECT * FROM localities').all() as LocalityRow[]);
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

export function resolveHere(db: Database.Database, lat: number, lng: number) {
  const wards = loadWards(db);
  const wardId = wardIdAt(lng, lat, wards);
  const locality = nearestLocality(db, lat, lng, wardId);
  const wardName =
    (wardId != null
      ? (db.prepare('SELECT name FROM wards WHERE id = ?').get(wardId) as { name: string } | undefined)
          ?.name
      : null) ??
    (db.prepare('SELECT name FROM wards WHERE id = ?').get(locality.ward_id) as { name: string })
      .name;

  const effectiveWardId = wardId ?? locality.ward_id;
  const escalation = buildEscalation(db, {
    wardId: effectiveWardId,
    officeId: locality.office_id,
    assemblyKey: locality.assembly_key,
  });

  const boundary = db
    .prepare('SELECT id, label, source_url, effective_from FROM boundary_versions LIMIT 1')
    .get() as {
    id: string;
    label: string;
    source_url: string | null;
    effective_from: string;
  };

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
    boundaryVersion: boundary.id,
    boundaryLabel: boundary.label,
  };
}
