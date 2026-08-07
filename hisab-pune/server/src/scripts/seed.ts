/**
 * Seed SQLite from the web app's 2026-verified data modules + ward GeoJSON.
 * Run: npx tsx server/src/scripts/seed.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, migrate, DB_PATH, DATA_DIR } from '../db/schema.ts';
import { electoralWards } from '../../../src/data/electoralWards.ts';
import { wardOffices } from '../../../src/data/wardOffices.ts';
import { cityOfficials, mlas, mp } from '../../../src/data/cityOfficials.ts';
import { localities } from '../../../src/data/localities.ts';
import { seedReports } from '../../../src/data/seedReports.ts';
import { dataSources } from '../../../src/data/sources.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const geoPath = path.join(root, 'public/data/wards-2026.geojson');

function hoursFrom(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3600_000).toISOString();
}

function main() {
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  const db = openDb();
  migrate(db);

  const fc = JSON.parse(fs.readFileSync(geoPath, 'utf8')) as {
    features: { properties: { wardId: number; name: string }; geometry: unknown }[];
    meta?: { source?: string; url?: string };
  };

  const insertBoundary = db.prepare(`
    INSERT INTO boundary_versions (id, label, source_url, effective_from, effective_to)
    VALUES (@id, @label, @source_url, @effective_from, @effective_to)
  `);
  insertBoundary.run({
    id: '2025-final-41',
    label: 'PMC Electoral Wards 2025 (final_41wardboundary) — Jan 2026 election',
    source_url: fc.meta?.url ?? 'https://data.opencity.in/dataset/pune-wards-info',
    effective_from: '2025-10-06',
    effective_to: null,
  });

  const wardNameById = new Map(electoralWards.map((w) => [w.id, w.name]));
  const insertWard = db.prepare(`
    INSERT INTO wards (id, name, boundary_version_id, geometry_json)
    VALUES (@id, @name, @boundary_version_id, @geometry_json)
  `);
  const insertWards = db.transaction(() => {
    for (const f of fc.features) {
      const id = f.properties.wardId;
      insertWard.run({
        id,
        name: wardNameById.get(id) ?? f.properties.name,
        boundary_version_id: '2025-final-41',
        geometry_json: JSON.stringify(f.geometry),
      });
    }
  });
  insertWards();

  const insertOffice = db.prepare(`
    INSERT INTO offices (id, name, zone, phone, note) VALUES (@id, @name, @zone, @phone, @note)
  `);
  const insertOfficeWard = db.prepare(`
    INSERT INTO office_wards (office_id, ward_id) VALUES (@office_id, @ward_id)
  `);
  for (const o of Object.values(wardOffices)) {
    insertOffice.run({
      id: o.id,
      name: o.name,
      zone: o.zone,
      phone: o.phone ?? null,
      note: o.note ?? null,
    });
    for (const wid of o.electoralWardIds) {
      insertOfficeWard.run({ office_id: o.id, ward_id: wid });
    }
  }

  const insertOfficial = db.prepare(
    `INSERT OR IGNORE INTO officials (id, name) VALUES (@id, @name)`,
  );
  const insertRole = db.prepare(`
    INSERT INTO official_roles (
      id, official_id, role, title, party, x_handle, phone, email, note,
      ward_id, seat, office_id, assembly_key, source_url, source_date, source_label,
      effective_from, effective_to, confidence
    ) VALUES (
      @id, @official_id, @role, @title, @party, @x_handle, @phone, @email, @note,
      @ward_id, @seat, @office_id, @assembly_key, @source_url, @source_date, @source_label,
      @effective_from, @effective_to, @confidence
    )
  `);

  const from = '2026-01-16';

  for (const o of cityOfficials) {
    insertOfficial.run({ id: o.id, name: o.name });
    insertRole.run({
      id: `role-${o.id}`,
      official_id: o.id,
      role: o.role,
      title: o.title,
      party: o.party ?? null,
      x_handle: o.xHandle ?? null,
      phone: o.phone ?? null,
      email: o.email ?? null,
      note: o.note ?? null,
      ward_id: null,
      seat: null,
      office_id: null,
      assembly_key: null,
      source_url: null,
      source_date: '2026-03-01',
      source_label: o.source ?? null,
      effective_from: o.role === 'sanitation' ? '2026-03-01' : from,
      effective_to: null,
      confidence: 'high',
    });
  }

  for (const [key, o] of Object.entries(mlas)) {
    insertOfficial.run({ id: o.id, name: o.name });
    insertRole.run({
      id: `role-${o.id}`,
      official_id: o.id,
      role: 'mla',
      title: o.title,
      party: o.party ?? null,
      x_handle: o.xHandle ?? null,
      phone: o.phone ?? null,
      email: o.email ?? null,
      note: o.note ?? null,
      ward_id: null,
      seat: null,
      office_id: null,
      assembly_key: key,
      source_url: null,
      source_date: '2024-11-23',
      source_label: o.source ?? null,
      effective_from: '2024-11-23',
      effective_to: null,
      confidence: 'high',
    });
  }

  insertOfficial.run({ id: mp.id, name: mp.name });
  insertRole.run({
    id: `role-${mp.id}`,
    official_id: mp.id,
    role: 'mp',
    title: mp.title,
    party: mp.party ?? null,
    x_handle: mp.xHandle ?? null,
    phone: null,
    email: null,
    note: null,
    ward_id: null,
    seat: null,
    office_id: null,
    assembly_key: null,
    source_url: null,
    source_date: '2024-06-04',
    source_label: mp.source ?? null,
    effective_from: '2024-06-04',
    effective_to: null,
    confidence: 'high',
  });

  for (const w of electoralWards) {
    for (const c of w.corporators) {
      const oid = `corp-${w.id}-${c.seat}`;
      insertOfficial.run({ id: oid, name: c.name });
      insertRole.run({
        id: `role-${oid}`,
        official_id: oid,
        role: 'corporator',
        title: `PMC Corporator · Ward ${w.id} · Seat ${c.seat}`,
        party: c.party,
        x_handle: null,
        phone: null,
        email: null,
        note: null,
        ward_id: w.id,
        seat: c.seat,
        office_id: null,
        assembly_key: null,
        source_url: 'https://en.wikipedia.org/wiki/2026_Pune_Municipal_Corporation_election',
        source_date: '2026-01-16',
        source_label: '2026 PMC election winners',
        effective_from: from,
        effective_to: null,
        confidence: 'high',
      });
    }
  }

  // Regional office placeholders (no named AMC until posting order published)
  for (const o of Object.values(wardOffices)) {
    const oid = `office-desk-${o.id}`;
    insertOfficial.run({ id: oid, name: o.name });
    insertRole.run({
      id: `role-${oid}`,
      official_id: oid,
      role: 'ward_officer',
      title: `Regional ward office (AMC) · Circle ${o.zone}`,
      party: null,
      x_handle: 'PMCPune',
      phone: o.phone ?? null,
      email: null,
      note: o.note ?? null,
      ward_id: null,
      seat: null,
      office_id: o.id,
      assembly_key: null,
      source_url:
        'https://thekarbhari.com/pmc-ward-committee-ward-committees-circles-and-regional-offices-attached-to-them-established-as-per-ward-structure-order-issued-by-municipal-commissioner/',
      source_date: '2026-02-01',
      source_label: 'PMC ward-committee order (post Jan 2026)',
      effective_from: from,
      effective_to: null,
      confidence: 'medium',
    });
  }

  const insertLoc = db.prepare(`
    INSERT INTO localities (id, name, ward_id, office_id, assembly_key, lat, lng, zone)
    VALUES (@id, @name, @ward_id, @office_id, @assembly_key, @lat, @lng, @zone)
  `);
  for (const l of localities) {
    insertLoc.run({
      id: l.id,
      name: l.name,
      ward_id: l.electoralWardId,
      office_id: l.wardOfficeId,
      assembly_key: l.assemblyId,
      lat: l.lat,
      lng: l.lng,
      zone: l.zone,
    });
  }

  const insertReport = db.prepare(`
    INSERT INTO reports (
      id, locality_id, ward_id, lat, lng, note, photo_path, status, moderation_state,
      created_at, updated_at, sla_due_at, escalation_eligible_at, resolved_at,
      category_id, publish_as, author_label
    ) VALUES (
      @id, @locality_id, @ward_id, @lat, @lng, @note, @photo_path, @status, @moderation_state,
      @created_at, @updated_at, @sla_due_at, @escalation_eligible_at, @resolved_at,
      @category_id, @publish_as, @author_label
    )
  `);
  const insertEvent = db.prepare(`
    INSERT INTO report_events (id, report_id, event_type, payload_json, created_at)
    VALUES (@id, @report_id, @event_type, @payload_json, @created_at)
  `);

  for (const r of seedReports) {
    const loc = localities.find((l) => l.id === r.localityId);
    insertReport.run({
      id: r.id,
      locality_id: r.localityId,
      ward_id: loc?.electoralWardId ?? null,
      lat: r.lat,
      lng: r.lng,
      note: r.note,
      photo_path: null,
      status: r.status,
      moderation_state: 'approved',
      created_at: r.createdAt,
      updated_at: r.createdAt,
      sla_due_at: hoursFrom(r.createdAt, 48),
      escalation_eligible_at: hoursFrom(r.createdAt, 24 * 7),
      resolved_at: null,
      category_id: 'solid_waste',
      publish_as: 'anonymous',
      author_label: 'R-SEED',
    });
    insertEvent.run({
      id: `evt-${r.id}-created`,
      report_id: r.id,
      event_type: 'created',
      payload_json: JSON.stringify({ source: 'seed' }),
      created_at: r.createdAt,
    });
  }

  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run(
    'sources_json',
    JSON.stringify(dataSources),
  );
  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run(
    'seeded_at',
    new Date().toISOString(),
  );

  const counts = {
    wards: db.prepare('SELECT COUNT(*) AS c FROM wards').get() as { c: number },
    roles: db.prepare('SELECT COUNT(*) AS c FROM official_roles').get() as { c: number },
    localities: db.prepare('SELECT COUNT(*) AS c FROM localities').get() as { c: number },
    reports: db.prepare('SELECT COUNT(*) AS c FROM reports').get() as { c: number },
  };
  console.log('Seeded', DB_PATH);
  console.log(counts);
  console.log('DATA_DIR', DATA_DIR);
  db.close();
}

main();
