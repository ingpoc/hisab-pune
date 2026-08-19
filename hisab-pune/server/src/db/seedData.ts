/**
 * Idempotent 2026 roster/wards seed. Safe to re-run on SQLite and Postgres
 * (`ON CONFLICT DO NOTHING` / `DO UPDATE` on primary keys).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from './client.ts';
import { withTransaction } from './client.ts';
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

async function countRows(db: Db, table: string): Promise<number> {
  const row = await db.get<{ c: number }>(`SELECT CAST(COUNT(*) AS INTEGER) AS c FROM ${table}`);
  return Number(row?.c ?? 0);
}

export async function seedIfEmpty(db: Db): Promise<boolean> {
  const seeded = await db.get<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [
    'seeded_at',
  ]);
  if (seeded?.value) return false;
  await seedRoster(db);
  return true;
}

export async function seedRoster(db: Db): Promise<void> {
  const fc = JSON.parse(fs.readFileSync(geoPath, 'utf8')) as {
    features: { properties: { wardId: number; name: string }; geometry: unknown }[];
    meta?: { source?: string; url?: string };
  };

  await withTransaction(db, async () => {
    await db.run(
      `INSERT INTO boundary_versions (id, label, source_url, effective_from, effective_to)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [
        '2025-final-41',
        'PMC Electoral Wards 2025 (final_41wardboundary) — Jan 2026 election',
        fc.meta?.url ?? 'https://data.opencity.in/dataset/pune-wards-info',
        '2025-10-06',
        null,
      ],
    );

    const wardNameById = new Map(electoralWards.map((w) => [w.id, w.name]));
    for (const f of fc.features) {
      const id = f.properties.wardId;
      await db.run(
        `INSERT INTO wards (id, name, boundary_version_id, geometry_json)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          wardNameById.get(id) ?? f.properties.name,
          '2025-final-41',
          JSON.stringify(f.geometry),
        ],
      );
    }

    for (const o of Object.values(wardOffices)) {
      await db.run(
        `INSERT INTO offices (id, name, zone, phone, note) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [o.id, o.name, o.zone, o.phone ?? null, o.note ?? null],
      );
      for (const wid of o.electoralWardIds) {
        await db.run(
          `INSERT INTO office_wards (office_id, ward_id) VALUES (?, ?)
           ON CONFLICT (office_id, ward_id) DO NOTHING`,
          [o.id, wid],
        );
      }
    }

    const insertOfficial = async (id: string, name: string) => {
      await db.run(
        `INSERT INTO officials (id, name) VALUES (?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [id, name],
      );
    };

    const insertRole = async (row: {
      id: string;
      official_id: string;
      role: string;
      title: string | null;
      party: string | null;
      x_handle: string | null;
      phone: string | null;
      email: string | null;
      note: string | null;
      ward_id: number | null;
      seat: string | null;
      office_id: string | null;
      assembly_key: string | null;
      source_url: string | null;
      source_date: string | null;
      source_label: string | null;
      effective_from: string;
      effective_to: string | null;
      confidence: string;
    }) => {
      await db.run(
        `INSERT INTO official_roles (
          id, official_id, role, title, party, x_handle, phone, email, note,
          ward_id, seat, office_id, assembly_key, source_url, source_date, source_label,
          effective_from, effective_to, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.official_id,
          row.role,
          row.title,
          row.party,
          row.x_handle,
          row.phone,
          row.email,
          row.note,
          row.ward_id,
          row.seat,
          row.office_id,
          row.assembly_key,
          row.source_url,
          row.source_date,
          row.source_label,
          row.effective_from,
          row.effective_to,
          row.confidence,
        ],
      );
    };

    const from = '2026-01-16';

    for (const o of cityOfficials) {
      await insertOfficial(o.id, o.name);
      await insertRole({
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
      await insertOfficial(o.id, o.name);
      await insertRole({
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

    await insertOfficial(mp.id, mp.name);
    await insertRole({
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
        await insertOfficial(oid, c.name);
        await insertRole({
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

    for (const o of Object.values(wardOffices)) {
      const oid = `office-desk-${o.id}`;
      await insertOfficial(oid, o.name);
      await insertRole({
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

    for (const l of localities) {
      await db.run(
        `INSERT INTO localities (id, name, ward_id, office_id, assembly_key, lat, lng, zone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.name, l.electoralWardId, l.wardOfficeId, l.assemblyId, l.lat, l.lng, l.zone],
      );
    }

    for (const r of seedReports) {
      const loc = localities.find((l) => l.id === r.localityId);
      await db.run(
        `INSERT INTO reports (
          id, locality_id, ward_id, lat, lng, note, photo_path, status, moderation_state,
          created_at, updated_at, sla_due_at, escalation_eligible_at, resolved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.localityId,
          loc?.electoralWardId ?? null,
          r.lat,
          r.lng,
          r.note,
          null,
          r.status,
          'approved',
          r.createdAt,
          r.createdAt,
          hoursFrom(r.createdAt, 48),
          hoursFrom(r.createdAt, 24 * 7),
          r.status === 'resolved' ? r.createdAt : null,
        ],
      );
      await db.run(
        `INSERT INTO report_events (id, report_id, event_type, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [
          `evt-${r.id}-created`,
          r.id,
          'created',
          JSON.stringify({ source: 'seed' }),
          r.createdAt,
        ],
      );
    }

    await db.run(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['sources_json', JSON.stringify(dataSources)],
    );
    await db.run(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO NOTHING`,
      ['seeded_at', new Date().toISOString()],
    );
  });
}

export async function seedSummary(db: Db): Promise<Record<string, number>> {
  return {
    wards: await countRows(db, 'wards'),
    roles: await countRows(db, 'official_roles'),
    localities: await countRows(db, 'localities'),
    reports: await countRows(db, 'reports'),
  };
}
