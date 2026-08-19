import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, migrate } from './db/schema.ts';
import { toPgPlaceholders } from './db/client.ts';
import { createApp } from './app.ts';
import { mountSpa, staticRootFrom } from './spa.ts';

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
    assert.equal('author_user_id' in body.reports[0], false);
    await db.close();
  });

  it('creates a report without a session', async () => {
    const db = await openDatabase({ sqlitePath: rootDb });
    await migrate(db);
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

  it('creates a report with session and category', async () => {
    const db = await openDatabase({ sqlitePath: rootDb });
    await migrate(db);
    const app = createApp(db);
    const session = await app.request('http://local/v1/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(session.status, 201);
    const { sessionToken, anonymousPostingId } = (await session.json()) as {
      sessionToken: string;
      anonymousPostingId: string;
    };
    assert.ok(anonymousPostingId.startsWith('R-'));
    const res = await app.request('http://local/v1/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hisab-Session': sessionToken,
      },
      body: JSON.stringify({
        lat: 18.5074,
        lng: 73.8077,
        note: 'Session report near Kothrud for API validation.',
        categoryId: 'solid_waste',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.report.category_id, 'solid_waste');
    assert.ok(body.report.author_label?.startsWith('R-'));
    assert.equal(body.report.publish_as, 'anonymous');
    assert.equal('author_user_id' in body.report, false);
    await db.close();
  });

  it('lists locality reports and city signal', async () => {
    const db = await openDatabase({ sqlitePath: rootDb });
    await migrate(db);
    const app = createApp(db);
    const cats = await app.request('http://local/v1/categories');
    assert.equal(cats.status, 200);
    const loc = await app.request('http://local/v1/localities/baner/reports');
    assert.equal(loc.status, 200);
    const locBody = await loc.json();
    assert.ok(Array.isArray(locBody.reports));
    const signal = await app.request('http://local/v1/signal/city');
    assert.equal(signal.status, 200);
    const signalBody = await signal.json();
    assert.ok(Array.isArray(signalBody.byCategory));
    await db.close();
  });

  it('maps an absolute dist dir to a cwd-relative serveStatic root', () => {
    assert.equal(staticRootFrom('/app/dist', '/app'), 'dist');
    assert.equal(staticRootFrom('/app', '/app'), '.');
  });

  it('SPA fallback serves index.html for client routes', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hisab-spa-'));
    fs.writeFileSync(path.join(tmp, 'index.html'), '<!doctype html><title>Hisab</title>');
    fs.mkdirSync(path.join(tmp, 'assets'));
    fs.writeFileSync(path.join(tmp, 'assets', 'app.js'), 'console.log(1)');
    fs.writeFileSync(path.join(tmp, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    const db = await openDatabase({ sqlitePath: rootDb });
    const app = createApp(db);
    mountSpa(app, tmp);

    const home = await app.request('http://local/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Hisab/);

    const res = await app.request('http://local/wards');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Hisab/);

    const asset = await app.request('http://local/assets/app.js');
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), 'console.log(1)');

    const missingAsset = await app.request('http://local/assets/missing.js');
    assert.equal(missingAsset.status, 404);
    assert.equal(missingAsset.headers.get('content-type')?.includes('text/html'), false);
    assert.doesNotMatch(await missingAsset.text(), /<!doctype html>/i);

    const favicon = await app.request('http://local/favicon.svg');
    assert.equal(favicon.status, 200);

    const health = await app.request('http://local/health');
    assert.equal(health.status, 200);
    const healthBody = (await health.json()) as { ok: boolean };
    assert.equal(healthBody.ok, true);

    const here = await app.request('http://local/v1/here?lat=18.559&lng=73.7867');
    assert.equal(here.status, 200);

    const api404 = await app.request('http://local/v1/does-not-exist');
    assert.equal(api404.status, 404);
    const apiBody = await api404.text();
    assert.doesNotMatch(apiBody, /<!doctype html>/i);

    await db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
