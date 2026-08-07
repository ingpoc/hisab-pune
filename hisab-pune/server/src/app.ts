import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { resolveHere } from './lib/here.ts';
import { buildEscalation } from './lib/escalation.ts';
import { randomUUID } from 'node:crypto';
import { CATEGORY_IDS, CATEGORY_META, isCategoryId } from './lib/categories.ts';
import {
  PMC_CARE_HOME,
  buildCareWhatsAppUrl,
  pmcCareSubmitUnsupported,
} from './lib/gov.ts';
import { mintAnonymousPostingId } from './db/schema.ts';

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

function userFromSession(
  db: Database.Database,
  token: string | undefined,
): UserRow | null {
  if (!token) return null;
  return (
    (db
      .prepare(
        `SELECT id, session_token, anonymous_posting_id, public_display_id, role
         FROM users WHERE session_token = ?`,
      )
      .get(token) as UserRow | undefined) ?? null
  );
}

function publicReportRow(row: Record<string, unknown>) {
  const { author_user_id: _omit, ...rest } = row;
  return rest;
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
      const hit = db
        .prepare('SELECT 1 AS x FROM users WHERE anonymous_posting_id = ?')
        .get(anon);
      if (!hit) break;
      anon = mintAnonymousPostingId();
    }
    db.prepare(
      `INSERT INTO users (id, session_token, anonymous_posting_id, public_display_id, role, created_at)
       VALUES (?, ?, ?, ?, 'citizen', ?)`,
    ).run(id, sessionToken, anon, display || null, now);
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

  app.get('/v1/auth/me', (c) => {
    const user = userFromSession(db, c.req.header('x-hisab-session') ?? undefined);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    return c.json({
      anonymousPostingId: user.anonymous_posting_id,
      publicDisplayId: user.public_display_id,
      role: user.role,
    });
  });

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

  app.get('/v1/localities/:id/reports', (c) => {
    const id = c.req.param('id');
    const loc = db.prepare('SELECT id FROM localities WHERE id = ?').get(id);
    if (!loc) return c.json({ error: 'Locality not found' }, 404);
    const category = c.req.query('category');
    const rows =
      category && isCategoryId(category)
        ? db
            .prepare(
              `SELECT * FROM reports
               WHERE locality_id = ? AND moderation_state = 'approved' AND category_id = ?
               ORDER BY created_at DESC`,
            )
            .all(id, category)
        : db
            .prepare(
              `SELECT * FROM reports
               WHERE locality_id = ? AND moderation_state = 'approved'
               ORDER BY created_at DESC`,
            )
            .all(id);
    return c.json({
      reports: rows.map((r) => publicReportRow(r as Record<string, unknown>)),
    });
  });

  app.get('/v1/reports', (c) => {
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
    const rows = db.prepare(sql).all(...params);
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
    const user = userFromSession(db, c.req.header('x-hisab-session') ?? undefined);
    if (!user) {
      return c.json(
        { error: 'Session required. Call POST /v1/auth/session first.' },
        401,
      );
    }
    const body = await c.req.json().catch(() => null);
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);
    }
    const { lat, lng, note, localityId, categoryId, publishAs } = parsed.data;
    if (publishAs === 'identified' && !user.public_display_id) {
      return c.json(
        { error: 'Set publicDisplayId on session before publishing as identified' },
        400,
      );
    }
    const here = resolveHere(db, lat, lng);
    const locId = localityId ?? here.locality.id;
    const now = new Date().toISOString();
    const id = `rpt-${randomUUID()}`;
    const authorLabel = publicAuthorLabel(user, publishAs);

    db.prepare(
      `INSERT INTO reports (
        id, locality_id, ward_id, lat, lng, note, photo_path, status, moderation_state,
        created_at, updated_at, sla_due_at, escalation_eligible_at, resolved_at,
        category_id, author_user_id, publish_as, author_label
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'open', 'approved', ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
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
      categoryId,
      user.id,
      publishAs,
      authorLabel,
    );

    db.prepare(
      `INSERT INTO report_events (id, report_id, event_type, payload_json, created_at)
       VALUES (?, ?, 'created', ?, ?)`,
    ).run(
      `evt-${id}`,
      id,
      JSON.stringify({ source: 'api', categoryId, publishAs }),
      now,
    );

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    return c.json({ report: publicReportRow(report), here }, 201);
  });

  app.get('/v1/reports/:id/comments', (c) => {
    const reportId = c.req.param('id');
    const report = db.prepare('SELECT id FROM reports WHERE id = ?').get(reportId);
    if (!report) return c.json({ error: 'Report not found' }, 404);
    const rows = db
      .prepare(
        `SELECT c.id, c.body, c.publish_as, c.created_at,
                CASE
                  WHEN c.publish_as = 'identified' AND u.public_display_id IS NOT NULL
                  THEN u.public_display_id
                  ELSE u.anonymous_posting_id
                END AS author_label
         FROM comments c
         JOIN users u ON u.id = c.author_user_id
         WHERE c.report_id = ? AND c.moderation_state = 'approved'
         ORDER BY c.created_at ASC`,
      )
      .all(reportId);
    return c.json({ comments: rows });
  });

  app.post('/v1/reports/:id/comments', async (c) => {
    const user = userFromSession(db, c.req.header('x-hisab-session') ?? undefined);
    if (!user) return c.json({ error: 'Session required' }, 401);
    const reportId = c.req.param('id');
    const report = db.prepare('SELECT id FROM reports WHERE id = ?').get(reportId);
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
    db.prepare(
      `INSERT INTO comments (id, report_id, author_user_id, publish_as, body, moderation_state, created_at)
       VALUES (?, ?, ?, ?, ?, 'approved', ?)`,
    ).run(id, reportId, user.id, parsed.data.publishAs, parsed.data.body.trim(), now);
    db.prepare(
      `INSERT INTO report_events (id, report_id, event_type, payload_json, created_at)
       VALUES (?, ?, 'commented', ?, ?)`,
    ).run(`evt-${id}`, reportId, JSON.stringify({ commentId: id }), now);
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
    const user = userFromSession(db, c.req.header('x-hisab-session') ?? undefined);
    if (!user) return c.json({ error: 'Session required' }, 401);
    const reportId = c.req.param('id');
    const report = db.prepare('SELECT id FROM reports WHERE id = ?').get(reportId);
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
    db.prepare(
      `INSERT INTO escalation_tickets
         (id, report_id, adapter_id, status, external_id, last_error, created_at, updated_at)
       VALUES (?, ?, ?, 'submitted', ?, NULL, ?, ?)`,
    ).run(ticketId, reportId, parsed.data.channel, parsed.data.externalId.trim(), now, now);
    db.prepare(`UPDATE reports SET gov_ticket_id = ?, updated_at = ? WHERE id = ?`).run(
      parsed.data.externalId.trim(),
      now,
      reportId,
    );
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
    const report = db
      .prepare(
        `SELECT r.*, l.name AS locality_name
         FROM reports r
         LEFT JOIN localities l ON l.id = r.locality_id
         WHERE r.id = ?`,
      )
      .get(reportId) as
      | {
          id: string;
          note: string;
          ward_id: number;
          category_id: string;
          locality_name: string | null;
        }
      | undefined;
    if (!report) return c.json({ error: 'Report not found' }, 404);
    const result = pmcCareSubmitUnsupported();
    const now = new Date().toISOString();
    const ticketId = `tkt-${randomUUID()}`;
    db.prepare(
      `INSERT INTO escalation_tickets
         (id, report_id, adapter_id, status, external_id, last_error, created_at, updated_at)
       VALUES (?, ?, 'pmc_care', 'unsupported', NULL, ?, ?, ?)`,
    ).run(ticketId, reportId, result.message, now, now);
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

  app.get('/v1/signal/city', (c) => {
    const byCategory = db
      .prepare(
        `SELECT category_id AS categoryId,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS openCount,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolvedCount,
                COUNT(*) AS total
         FROM reports
         WHERE moderation_state = 'approved'
         GROUP BY category_id
         ORDER BY openCount DESC`,
      )
      .all();
    const hotLocalities = db
      .prepare(
        `SELECT locality_id AS localityId,
                COUNT(*) AS openCount,
                MIN(created_at) AS oldestOpen
         FROM reports
         WHERE moderation_state = 'approved' AND status = 'open' AND locality_id IS NOT NULL
         GROUP BY locality_id
         ORDER BY openCount DESC
         LIMIT 8`,
      )
      .all();
    return c.json({ byCategory, hotLocalities });
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
    return c.json({
      eligibleAt: now,
      reports: rows.map((r) => publicReportRow(r as Record<string, unknown>)),
    });
  });

  return app;
}
