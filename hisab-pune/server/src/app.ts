import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { Db } from './db/client.ts';
import { resolveHere } from './lib/here.ts';
import { buildEscalation } from './lib/escalation.ts';
import { randomUUID } from 'node:crypto';

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function createApp(db: Db) {
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

  app.get('/v1/here', async (c) => {
    const lat = Number(c.req.query('lat'));
    const lng = Number(c.req.query('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return c.json({ error: 'lat and lng query params are required numbers' }, 400);
    }
    if (lat < 18.3 || lat > 18.8 || lng < 73.6 || lng > 74.1) {
      return c.json({ error: 'Coordinates outside greater Pune bounds' }, 400);
    }
    return c.json(await resolveHere(db, lat, lng));
  });

  app.get('/v1/wards', async (c) => {
    const rows = await db.all(
      `SELECT w.id, w.name, CAST(COUNT(c.id) AS INTEGER) AS "corporatorCount"
       FROM wards w
       LEFT JOIN official_roles c
         ON c.ward_id = w.id AND c.role = 'corporator' AND c.effective_to IS NULL
       GROUP BY w.id
       ORDER BY w.id`,
    );
    return c.json({ wards: rows });
  });

  app.get('/v1/wards/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const ward = await db.get<{ id: number; name: string }>(
      'SELECT id, name FROM wards WHERE id = ?',
      [id],
    );
    if (!ward) return c.json({ error: 'Ward not found' }, 404);

    const office = await db.get<{ id: string; name: string }>(
      `SELECT o.* FROM offices o
       JOIN office_wards ow ON ow.office_id = o.id
       WHERE ow.ward_id = ?`,
      [id],
    );

    const locality = await db.get<{ office_id: string; assembly_key: string }>(
      'SELECT * FROM localities WHERE ward_id = ? ORDER BY name LIMIT 1',
      [id],
    );

    const officeId = office?.id ?? locality?.office_id;
    const assemblyKey = locality?.assembly_key;
    if (!officeId || !assemblyKey) {
      return c.json({ error: 'Ward is missing office or assembly mapping' }, 500);
    }

    const escalation = await buildEscalation(db, {
      wardId: id,
      officeId,
      assemblyKey,
    });

    const localities = await db.all(
      'SELECT id, name, lat, lng, zone FROM localities WHERE ward_id = ? ORDER BY name',
      [id],
    );

    return c.json({ ward, office, localities, escalation });
  });

  app.get('/v1/localities', async (c) => {
    const rows = await db.all(
      `SELECT id, name, ward_id AS "electoralWardId", office_id AS "wardOfficeId",
              assembly_key AS "assemblyId", lat, lng, zone
       FROM localities ORDER BY name`,
    );
    return c.json({ localities: rows });
  });

  app.get('/v1/localities/:id', async (c) => {
    const id = c.req.param('id');
    const loc = await db.get<{
      id: string;
      name: string;
      electoralWardId: number;
      wardOfficeId: string;
      assemblyId: string;
      lat: number;
      lng: number;
      zone: string;
    }>(
      `SELECT id, name, ward_id AS "electoralWardId", office_id AS "wardOfficeId",
              assembly_key AS "assemblyId", lat, lng, zone
       FROM localities WHERE id = ?`,
      [id],
    );
    if (!loc) return c.json({ error: 'Locality not found' }, 404);
    const ward = await db.get<{ id: number; name: string }>(
      'SELECT id, name FROM wards WHERE id = ?',
      [loc.electoralWardId],
    );
    const escalation = await buildEscalation(db, {
      wardId: loc.electoralWardId,
      officeId: loc.wardOfficeId,
      assemblyKey: loc.assemblyId,
    });
    return c.json({ locality: loc, ward, escalation });
  });

  app.get('/v1/reports', async (c) => {
    const status = c.req.query('status');
    const rows = status
      ? await db.all(
          `SELECT * FROM reports
           WHERE moderation_state = 'approved' AND status = ?
           ORDER BY created_at DESC`,
          [status],
        )
      : await db.all(
          `SELECT * FROM reports
           WHERE moderation_state = 'approved'
           ORDER BY created_at DESC`,
        );
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
    const here = await resolveHere(db, lat, lng);
    const locId = localityId ?? here.locality.id;
    const now = new Date().toISOString();
    const id = `rpt-${randomUUID()}`;

    await db.run(
      `INSERT INTO reports (
        id, locality_id, ward_id, lat, lng, note, photo_path, status, moderation_state,
        created_at, updated_at, sla_due_at, escalation_eligible_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'open', 'approved', ?, ?, ?, ?, NULL)`,
      [id, locId, here.ward.id, lat, lng, note.trim(), now, now, hoursFromNow(48), hoursFromNow(24 * 7)],
    );

    await db.run(
      `INSERT INTO report_events (id, report_id, event_type, payload_json, created_at)
       VALUES (?, ?, 'created', ?, ?)`,
      [`evt-${id}`, id, JSON.stringify({ source: 'api' }), now],
    );

    const report = await db.get('SELECT * FROM reports WHERE id = ?', [id]);
    return c.json({ report, here }, 201);
  });

  app.get('/v1/freshness', async (c) => {
    const seededAt = await db.get<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [
      'seeded_at',
    ]);
    const sources = await db.get<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [
      'sources_json',
    ]);
    const roles = await db.all(
      `SELECT role, CAST(COUNT(*) AS INTEGER) AS count,
              MIN(source_date) AS "oldestSource",
              MAX(source_date) AS "newestSource"
       FROM official_roles
       WHERE effective_to IS NULL
       GROUP BY role
       ORDER BY role`,
    );
    return c.json({
      language: 'en',
      seededAt: seededAt?.value ?? null,
      roles,
      sources: sources ? JSON.parse(sources.value) : [],
    });
  });

  app.get('/v1/sla/eligible', async (c) => {
    const now = new Date().toISOString();
    const rows = await db.all(
      `SELECT * FROM reports
       WHERE status = 'open'
         AND moderation_state = 'approved'
         AND escalation_eligible_at <= ?
       ORDER BY escalation_eligible_at ASC`,
      [now],
    );
    return c.json({ eligibleAt: now, reports: rows });
  });

  return app;
}
