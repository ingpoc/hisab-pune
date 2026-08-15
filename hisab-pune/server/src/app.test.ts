import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, migrate } from './db/schema.ts';
import { createApp } from './app.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDb = path.resolve(__dirname, '../data/hisab.sqlite');

async function sessionToken(app: ReturnType<typeof createApp>): Promise<string> {
  const res = await app.request('http://local/v1/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.sessionToken);
  assert.ok(body.anonymousPostingId?.startsWith('R-'));
  return body.sessionToken as string;
}

describe('Hisab API', () => {
  it('resolves Baner-ish coordinates to a ward via /v1/here', async () => {
    assert.ok(fs.existsSync(rootDb), 'run npm run seed first');
    const db = openDb(rootDb);
    migrate(db);
    const app = createApp(db);
    const res = await app.request('http://local/v1/here?lat=18.559&lng=73.7867');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.locality?.name);
    assert.ok(body.ward?.id);
    assert.ok(Array.isArray(body.escalation));
    assert.ok(body.escalation.length >= 4);
    assert.equal(typeof body.widget.localityName, 'string');
    assert.equal(/[\u0900-\u097F]/.test(body.locality.name), false);
    db.close();
  });

  it('lists approved reports', async () => {
    const db = openDb(rootDb);
    migrate(db);
    const app = createApp(db);
    const res = await app.request('http://local/v1/reports');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.reports.length > 0);
    assert.equal('author_user_id' in body.reports[0], false);
    db.close();
  });

  it('creates a report with session and category', async () => {
    const db = openDb(rootDb);
    migrate(db);
    const app = createApp(db);
    const token = await sessionToken(app);
    const res = await app.request('http://local/v1/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hisab-Session': token,
      },
      body: JSON.stringify({
        lat: 18.5074,
        lng: 73.8077,
        note: 'Test blackspot near Kothrud for API validation.',
        categoryId: 'solid_waste',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.report.id);
    assert.equal(body.report.status, 'open');
    assert.equal(body.report.category_id, 'solid_waste');
    assert.ok(body.report.author_label?.startsWith('R-'));
    assert.equal(body.report.publish_as, 'anonymous');
    assert.equal('author_user_id' in body.report, false);
    assert.ok(body.report.sla_due_at);
    db.close();
  });

  it('returns roster freshness from /v1/freshness', async () => {
    const db = openDb(rootDb);
    migrate(db);
    const app = createApp(db);
    const res = await app.request('http://local/v1/freshness');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.language, 'en');
    assert.ok(body.seededAt);
    assert.ok(Array.isArray(body.roles));
    assert.ok(body.roles.length > 0);
    assert.ok(Array.isArray(body.sources));
    assert.ok(body.sources.length > 0);
    assert.ok(body.sources[0].url);
    assert.ok(body.sources[0].title);
    db.close();
  });

  it('rejects report without session', async () => {
    const db = openDb(rootDb);
    migrate(db);
    const app = createApp(db);
    const res = await app.request('http://local/v1/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 18.5074,
        lng: 73.8077,
        note: 'Should fail without session.',
      }),
    });
    assert.equal(res.status, 401);
    db.close();
  });
});
