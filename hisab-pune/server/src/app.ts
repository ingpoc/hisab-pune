import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { resolveHere } from './lib/here.ts';
import { buildEscalation } from './lib/escalation.ts';
import { randomUUID } from 'node:crypto';

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function createApp(db: Database.Database) {
  const app = new Hono();
  app.use('*', cors({ origin: '*' }));

  app.get('/health', (c) =>
    c.json({
      ok: true,
      service: 'hisab-api',
      language: 'en',
      time: new Date().toISOString(),
    }),
  );

  app.get('/v1/here', (c) => {
    const lat = Number(c.req.query('lat'));
    const lng = Number(c.req.query('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return c.json({ error: 'lat and lng query params are required numbers' }, 400);
    }
    if (lat < 18.3 || lat > 18.8 || lng < 73.6 || lng > 74.1) {
      return c.json({ error: 'Coordinates outside greater Pune bounds' }, 400);
    }
    return c.json(resolveHere(db, lat, lng));
  });

  app.get('/v1/wards', (c) => {
    const rows = db
      .prepare(
        `SELECT w.id, w.name, COUNT(c.id) AS corporatorCount
         FROM wards w
         LEFT JOIN official_roles c
           ON c.ward_id = w.id AND c.role = 'corporator' AND c.effective_to IS NULL
         GROUP BY w.id
         ORDER BY w.id`,
      )
      .all();
    return c.json({ wards: rows });
  });

  app.get('/v1/wards/:id', (c) => {
    const id = Number(c.req.param('id'));
    const ward = db.prepare('SELECT id, name FROM wards WHERE id = ?').get(id) as
      | { id: number; name: string }
      | undefined;
    if (!ward) return c.json({ error: 'Ward not found' }, 404);

    const office = db
      .prepare(
        `SELECT o.* FROM offices o
         JOIN office_wards ow ON ow.office_id = o.id
         WHERE ow.ward_id = ?`,
      )
      .get(id) as { id: string; name: string } | undefined;

    const locality = db
      .prepare('SELECT * FROM localities WHERE ward_id = ? ORDER BY name LIMIT 1')
      .get(id) as { office_id: string; assembly_key: string } | undefined;

    const officeId = office?.id ?? locality?.office_id;
    const assemblyKey = locality?.assembly_key;
    if (!officeId || !assemblyKey) {
      return c.json({ error: 'Ward is missing office or assembly mapping' }, 500);
    }

    const escalation = buildEscalation(db, {
      wardId: id,
      officeId,
      assemblyKey,
    });

    const localities = db
      .prepare(
        'SELECT id, name, lat, lng, zone FROM localities WHERE ward_id = ? ORDER BY name',
      )
      .all(id);

    return c.json({ ward, office, localities, escalation });
  });

  app.get('/v1/localities', (c) => {
    const rows = db
      .prepare(
        `SELECT id, name, ward_id AS electoralWardId, office_id AS wardOfficeId,
                assembly_key AS assemblyId, lat, lng, zone
         FROM localities ORDER BY name`,
      )
      .all();
    return c.json({ localities: rows });
  });

  app.get('/v1/localities/:id', (c) => {
    const id = c.req.param('id');
    const loc = db
      .prepare(
        `SELECT id, name, ward_id AS electoralWardId, office_id AS wardOfficeId,
                assembly_key AS assemblyId, lat, lng, zone
         FROM localities WHERE id = ?`,
      )
      .get(id) as
      | {
          id: string;
          name: string;
          electoralWardId: number;
          wardOfficeId: string;
          assemblyId: string;
          lat: number;
          lng: number;
          zone: string;
        }
      | undefined;
    if (!loc) return c.json({ error: 'Locality not found' }, 404);
    const ward = db
      .prepare('SELECT id, name FROM wards WHERE id = ?')
      .get(loc.electoralWardId) as { id: number; name: string };
    const escalation = buildEscalation(db, {
      wardId: loc.electoralWardId,
      officeId: loc.wardOfficeId,
      assemblyKey: loc.assemblyId,
    });
    return c.json({ locality: loc, ward, escalation });
  });

  app.get('/v1/reports', (c) => {
    const status = c.req.query('status');
    const rows = status
      ? db
          .prepare(
            `SELECT * FROM reports
             WHERE moderation_state = 'approved' AND status = ?
             ORDER BY created_at DESC`,
          )
          .all(status)
      : db
          .prepare(
            `SELECT * FROM reports
             WHERE moderation_state = 'approved'
             ORDER BY created_at DESC`,
          )
          .all();
    return c.json({ reports: rows });
  });

  const createReportSchema = z.object({
    lat: z.number(),
    lng: z.number(),
    note: z.string().min(3).max(500),
    localityId: z.string().optional(),
  });

  app.post('/v1/reports', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);
    }
    const { lat, lng, note, localityId } = parsed.data;
    const here = resolveHere(db, lat, lng);
    const locId = localityId ?? here.locality.id;
    const now = new Date().toISOString();
    const id = `rpt-${randomUUID()}`;

    db.prepare(
      `INSERT INTO reports (
        id, locality_id, ward_id, lat, lng, note, photo_path, status, moderation_state,
        created_at, updated_at, sla_due_at, escalation_eligible_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'open', 'approved', ?, ?, ?, ?, NULL)`,
    ).run(
      id,
      locId,
      here.ward.id,
      lat,
      lng,
      note.trim(),
      now,
      now,
      hoursFromNow(48),
      hoursFromNow(24 * 7),
    );

    db.prepare(
      `INSERT INTO report_events (id, report_id, event_type, payload_json, created_at)
       VALUES (?, ?, 'created', ?, ?)`,
    ).run(`evt-${id}`, id, JSON.stringify({ source: 'api' }), now);

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    return c.json({ report, here }, 201);
  });

  app.get('/v1/freshness', (c) => {
    const seededAt = db.prepare(`SELECT value FROM meta WHERE key = 'seeded_at'`).get() as
      | { value: string }
      | undefined;
    const sources = db.prepare(`SELECT value FROM meta WHERE key = 'sources_json'`).get() as
      | { value: string }
      | undefined;
    const roles = db
      .prepare(
        `SELECT role, COUNT(*) AS count,
                MIN(source_date) AS oldestSource,
                MAX(source_date) AS newestSource
         FROM official_roles
         WHERE effective_to IS NULL
         GROUP BY role
         ORDER BY role`,
      )
      .all();
    return c.json({
      language: 'en',
      seededAt: seededAt?.value ?? null,
      roles,
      sources: sources ? JSON.parse(sources.value) : [],
    });
  });

  app.get('/v1/sla/eligible', (c) => {
    const now = new Date().toISOString();
    const rows = db
      .prepare(
        `SELECT * FROM reports
         WHERE status = 'open'
           AND moderation_state = 'approved'
           AND escalation_eligible_at <= ?
         ORDER BY escalation_eligible_at ASC`,
      )
      .all(now);
    return c.json({ eligibleAt: now, reports: rows });
  });

  return app;
}
