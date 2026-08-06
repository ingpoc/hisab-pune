import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, migrate } from './db/schema.ts';
import { createApp } from './app.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDb = path.resolve(__dirname, '../data/hisab.sqlite');

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
    // English-only: no Devanagari in locality name
    assert.equal(/[\u0900-\u097F]/.test(body.locality.name), false);
    db.close();
  });

  it('lists approved reports', async () => {
    const db = openDb(rootDb);
    const app = createApp(db);
    const res = await app.request('http://local/v1/reports');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.reports.length > 0);
    db.close();
  });

  it('creates a report', async () => {
    const db = openDb(rootDb);
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
    db.close();
  });
});
