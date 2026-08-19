import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, migrate } from './db/schema.ts';
import { toPgPlaceholders } from './db/client.ts';
import { createApp } from './app.ts';
import { mountSpa } from './spa.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDb = path.resolve(__dirname, '../data/hisab.sqlite');

describe('Hisab API', () => {
  it('converts ? placeholders for Postgres', () => {
    assert.equal(toPgPlaceholders('SELECT * FROM t WHERE a = ? AND b = ?'), 'SELECT * FROM t WHERE a = $1 AND b = $2');
  });

  it('health returns ok', async () => {
    assert.ok(fs.existsSync(rootDb), 'run npm run seed first');
    const db = await openDatabase({ sqlitePath: rootDb });
    const app = createApp(db);
    const res = await app.request('http://local/health');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; service: string };
    assert.equal(body.ok, true);
    assert.equal(body.service, 'hisab-api');
    await db.close();
  });

  it('resolves Baner-ish coordinates to a ward via /v1/here', async () => {
    assert.ok(fs.existsSync(rootDb), 'run npm run seed first');
    const db = await openDatabase({ sqlitePath: rootDb });
    await migrate(db);
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
    await db.close();
  });

  it('lists approved reports', async () => {
    const db = await openDatabase({ sqlitePath: rootDb });
    const app = createApp(db);
    const res = await app.request('http://local/v1/reports');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.reports.length > 0);
    await db.close();
  });

  it('creates a report', async () => {
    const db = await openDatabase({ sqlitePath: rootDb });
    const app = createApp(db);
    const res = await app.request('http://local/v1/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 18.5074,
        lng: 73.8077,
        note: 'Test blackspot near Kothrud for API validation.',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.report.id);
    assert.equal(body.report.status, 'open');
    assert.ok(body.report.sla_due_at);
    await db.close();
  });

  it('SPA fallback serves index.html for client routes', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hisab-spa-'));
    fs.writeFileSync(path.join(tmp, 'index.html'), '<!doctype html><title>Hisab</title>');
    const db = await openDatabase({ sqlitePath: rootDb });
    const app = createApp(db);
    mountSpa(app, tmp);
    const res = await app.request('http://local/wards');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Hisab/);
    const health = await app.request('http://local/health');
    assert.equal(health.status, 200);
    const api404 = await app.request('http://local/v1/does-not-exist');
    assert.equal(api404.status, 404);
    await db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
