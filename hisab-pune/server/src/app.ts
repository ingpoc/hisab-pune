import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { Db } from './db/client.ts';
import { mintAnonymousPostingId } from './db/schema.ts';
import { resolveHere } from './lib/here.ts';
import { buildEscalation } from './lib/escalation.ts';
import { randomUUID } from 'node:crypto';
import { CATEGORY_IDS, CATEGORY_META, isCategoryId } from './lib/categories.ts';
import {
  PMC_CARE_HOME,
  buildCareWhatsAppUrl,
  pmcCareSubmitUnsupported,
} from './lib/gov.ts';

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

type UserRow = {
  id: string;
  session_token: string;
  anonymous_posting_id: string;
  public_display_id: string | null;
  role: string;
};

function publicAuthorLabel(
  user: UserRow,
  publishAs: 'anonymous' | 'identified',
): string {
  if (publishAs === 'identified' && user.public_display_id) {
    return user.public_display_id;
  }
  return user.anonymous_posting_id;
}

async function userFromSession(db: Db, token: string | undefined): Promise<UserRow | null> {
  if (!token) return null;
  return (
    (await db.get<UserRow>(
      `SELECT id, session_token, anonymous_posting_id, public_display_id, role
       FROM users WHERE session_token = ?`,
      [token],
    )) ?? null
  );
}

function publicReportRow(row: Record<string, unknown>) {
  const { author_user_id: _omit, ...rest } = row;
  return rest;
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

  app.get('/v1/categories', (c) =>
    c.json({
      categories: CATEGORY_IDS.map((id) => ({
        id,
        label: CATEGORY_META[id].label,
        deptTip: CATEGORY_META[id].deptTip,
      })),
    }),
  );

  /** MVP session: resident + stable anonymous_posting_id. Phone OTP later. */
  app.post('/v1/auth/session', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const display =
      typeof body?.publicDisplayId === 'string'
        ? body.publicDisplayId.trim().slice(0, 32)
        : '';
    const now = new Date().toISOString();
    const id = `usr-${randomUUID()}`;
    const sessionToken = `ses-${randomUUID()}`;
    let anon = mintAnonymousPostingId();
    for (let i = 0; i < 5; i++) {
      const hit = await db.get('SELECT 1 AS x FROM users WHERE anonymous_posting_id = ?', [anon]);
      if (!hit) break;
      anon = mintAnonymousPostingId();
    }
    await db.run(
      `INSERT INTO users (id, session_token, anonymous_posting_id, public_display_id, role, created_at)
       VALUES (?, ?, ?, ?, 'citizen', ?)`,
      [id, sessionToken, anon, display || null, now],
    );
    return c.json(
      {
        sessionToken,
        anonymousPostingId: anon,
        publicDisplayId: display || null,
        publishAsDefault: 'anonymous',
      },
      201,
    );
  });

  app.get('/v1/auth/me', async (c) => {
    const user = await userFromSession(db, c.req.header('x-hisab-session') ?? undefined);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    return c.json({
      anonymousPostingId: user.anonymous_posting_id,
      publicDisplayId: user.public_display_id,
      role: user.role,
    });
  });

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

  app.get('/v1/localities/:id/reports', async (c) => {
    const id = c.req.param('id');
    const loc = await db.get('SELECT id FROM localities WHERE id = ?', [id]);
    if (!loc) return c.json({ error: 'Locality not found' }, 404);
    const category = c.req.query('category');
    const rows =
      category && isCategoryId(category)
        ? await db.all(
            `SELECT * FROM reports
             WHERE locality_id = ? AND moderation_state = 'approved' AND category_id = ?
             ORDER BY created_at DESC`,
            [id, category],
          )
        : await db.all(
            `SELECT * FROM reports
             WHERE locality_id = ? AND moderation_state = 'approved'
             ORDER BY created_at DESC`,
            [id],
          );
    return c.json({
      reports: rows.map((r) => publicReportRow(r as Record<string, unknown>)),
    });
  });

  app.get('/v1/reports', async (c) => {
    const status = c.req.query('status');
    const localityId = c.req.query('localityId');
    const category = c.req.query('category');
    let sql = `SELECT * FROM reports WHERE moderation_state = 'approved'`;
    const params: unknown[] = [];
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (localityId) {
      sql += ` AND locality_id = ?`;
      params.push(localityId);
    }
    if (category && isCategoryId(category)) {
      sql += ` AND category_id = ?`;
      params.push(category);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = await db.all(sql, params);
    return c.json({
      reports: rows.map((r) => publicReportRow(r as Record<string, unknown>)),
    });
  });

  const createReportSchema = z.object({
    lat: z.number(),
    lng: z.number(),
    note: z.string().min(3).max(500),
    localityId: z.string().optional(),
    categoryId: z.enum(CATEGORY_IDS).default('solid_waste'),
    publishAs: z.enum(['anonymous', 'identified']).default('anonymous'),
  });

  app.post('/v1/reports', async (c) => {
    const user = await userFromSession(db, c.req.header('x-hisab-session') ?? undefined);
    const body = await c.req.json().catch(() => null);
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);
    }
    const { lat, lng, note, localityId, categoryId, publishAs } = parsed.data;
    if (publishAs === 'identified' && !user?.public_display_id) {
      return c.json(
        { error: 'Set publicDisplayId on session before publishing as identified' },
        400,
      );
    }
    const here = await resolveHere(db, lat, lng);
    const locId = localityId ?? here.locality.id;
    const now = new Date().toISOString();
    const id = `rpt-${randomUUID()}`;
    const authorLabel = user ? publicAuthorLabel(user, publishAs) : null;

    await db.run(
      `INSERT INTO reports (
        id, locality_id, ward_id, lat, lng, note, photo_path, status, moderation_state,
        created_at, updated_at, sla_due_at, escalation_eligible_at, resolved_at,
        category_id, author_user_id, publish_as, author_label
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'open', 'approved', ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      [
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
        categoryId,
        user?.id ?? null,
        publishAs,
        authorLabel,
      ],
    );

    await db.run(
      `INSERT INTO report_events (id, report_id, event_type, payload_json, created_at)
       VALUES (?, ?, 'created', ?, ?)`,
      [`evt-${id}`, id, JSON.stringify({ source: 'api', categoryId, publishAs }), now],
    );

    const report = (await db.get('SELECT * FROM reports WHERE id = ?', [id])) as Record<
      string,
      unknown
    >;
    return c.json({ report: publicReportRow(report), here }, 201);
  });

  app.get('/v1/reports/:id/comments', async (c) => {
    const reportId = c.req.param('id');
    const report = await db.get('SELECT id FROM reports WHERE id = ?', [reportId]);
    if (!report) return c.json({ error: 'Report not found' }, 404);
    const rows = await db.all(
      `SELECT c.id, c.body, c.publish_as, c.created_at,
              CASE
                WHEN c.publish_as = 'identified' AND u.public_display_id IS NOT NULL
                THEN u.public_display_id
                ELSE u.anonymous_posting_id
              END AS "author_label"
       FROM comments c
       JOIN users u ON u.id = c.author_user_id
       WHERE c.report_id = ? AND c.moderation_state = 'approved'
       ORDER BY c.created_at ASC`,
      [reportId],
    );
    return c.json({ comments: rows });
  });

  app.post('/v1/reports/:id/comments', async (c) => {
    const user = await userFromSession(db, c.req.header('x-hisab-session') ?? undefined);
    if (!user) return c.json({ error: 'Session required' }, 401);
    const reportId = c.req.param('id');
    const report = await db.get('SELECT id FROM reports WHERE id = ?', [reportId]);
    if (!report) return c.json({ error: 'Report not found' }, 404);
    const body = await c.req.json().catch(() => null);
    const parsed = z
      .object({
        body: z.string().min(2).max(400),
        publishAs: z.enum(['anonymous', 'identified']).default('anonymous'),
      })
      .safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);
    }
    if (parsed.data.publishAs === 'identified' && !user.public_display_id) {
      return c.json({ error: 'No public display id set' }, 400);
    }
    const now = new Date().toISOString();
    const id = `cmt-${randomUUID()}`;
    await db.run(
      `INSERT INTO comments (id, report_id, author_user_id, publish_as, body, moderation_state, created_at)
       VALUES (?, ?, ?, ?, ?, 'approved', ?)`,
      [id, reportId, user.id, parsed.data.publishAs, parsed.data.body.trim(), now],
    );
    await db.run(
      `INSERT INTO report_events (id, report_id, event_type, payload_json, created_at)
       VALUES (?, ?, 'commented', ?, ?)`,
      [`evt-${id}`, reportId, JSON.stringify({ commentId: id }), now],
    );
    return c.json(
      {
        comment: {
          id,
          body: parsed.data.body.trim(),
          publish_as: parsed.data.publishAs,
          author_label: publicAuthorLabel(user, parsed.data.publishAs),
          created_at: now,
        },
      },
      201,
    );
  });

  app.post('/v1/reports/:id/gov-ticket', async (c) => {
    const user = await userFromSession(db, c.req.header('x-hisab-session') ?? undefined);
    if (!user) return c.json({ error: 'Session required' }, 401);
    const reportId = c.req.param('id');
    const report = await db.get('SELECT id FROM reports WHERE id = ?', [reportId]);
    if (!report) return c.json({ error: 'Report not found' }, 404);
    const body = await c.req.json().catch(() => null);
    const parsed = z
      .object({
        externalId: z.string().min(3).max(64),
        channel: z.enum(['pmc_care', 'manual']).default('pmc_care'),
      })
      .safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);
    }
    const now = new Date().toISOString();
    const ticketId = `tkt-${randomUUID()}`;
    await db.run(
      `INSERT INTO escalation_tickets
         (id, report_id, adapter_id, status, external_id, last_error, created_at, updated_at)
       VALUES (?, ?, ?, 'submitted', ?, NULL, ?, ?)`,
      [ticketId, reportId, parsed.data.channel, parsed.data.externalId.trim(), now, now],
    );
    await db.run(`UPDATE reports SET gov_ticket_id = ?, updated_at = ? WHERE id = ?`, [
      parsed.data.externalId.trim(),
      now,
      reportId,
    ]);
    return c.json({
      ticket: {
        id: ticketId,
        externalId: parsed.data.externalId.trim(),
        channel: parsed.data.channel,
        status: 'submitted',
      },
    });
  });

  app.post('/v1/reports/:id/escalate-gov', async (c) => {
    const reportId = c.req.param('id');
    const report = await db.get<{
      id: string;
      note: string;
      ward_id: number;
      category_id: string;
      locality_name: string | null;
    }>(
      `SELECT r.*, l.name AS locality_name
       FROM reports r
       LEFT JOIN localities l ON l.id = r.locality_id
       WHERE r.id = ?`,
      [reportId],
    );
    if (!report) return c.json({ error: 'Report not found' }, 404);
    const result = pmcCareSubmitUnsupported();
    const now = new Date().toISOString();
    const ticketId = `tkt-${randomUUID()}`;
    await db.run(
      `INSERT INTO escalation_tickets
         (id, report_id, adapter_id, status, external_id, last_error, created_at, updated_at)
       VALUES (?, ?, 'pmc_care', 'unsupported', NULL, ?, ?, ?)`,
      [ticketId, reportId, result.message, now, now],
    );
    const categoryLabel = isCategoryId(report.category_id)
      ? CATEGORY_META[report.category_id].label
      : report.category_id;
    return c.json({
      result,
      care: {
        portal: PMC_CARE_HOME,
        whatsapp: buildCareWhatsAppUrl({
          localityName: report.locality_name ?? 'Pune',
          wardId: report.ward_id,
          categoryLabel,
          note: report.note,
        }),
      },
      ticketId,
    });
  });

  app.get('/v1/signal/city', async (c) => {
    const byCategory = await db.all(
      `SELECT category_id AS "categoryId",
              CAST(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS INTEGER) AS "openCount",
              CAST(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS INTEGER) AS "resolvedCount",
              CAST(COUNT(*) AS INTEGER) AS total
       FROM reports
       WHERE moderation_state = 'approved'
       GROUP BY category_id
       ORDER BY "openCount" DESC`,
    );
    const hotLocalities = await db.all(
      `SELECT locality_id AS "localityId",
              CAST(COUNT(*) AS INTEGER) AS "openCount",
              MIN(created_at) AS "oldestOpen"
       FROM reports
       WHERE moderation_state = 'approved' AND status = 'open' AND locality_id IS NOT NULL
       GROUP BY locality_id
       ORDER BY "openCount" DESC
       LIMIT 8`,
    );
    return c.json({ byCategory, hotLocalities });
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
    return c.json({
      eligibleAt: now,
      reports: rows.map((r) => publicReportRow(r as Record<string, unknown>)),
    });
  });

  return app;
}
