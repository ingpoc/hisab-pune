import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, migrate } from './schema.ts';
import { seedIfEmpty, seedRoster, seedSummary } from './seedData.ts';
import { createApp } from '../app.ts';
import { invalidateWardCache } from '../lib/here.ts';

const url = process.env.HISAB_TEST_DATABASE_URL;

describe('Postgres (HISAB_TEST_DATABASE_URL)', { skip: !url }, () => {
  it('migrates, seeds idempotently, and serves /health + /v1/here', async () => {
    invalidateWardCache();
    const db = await openDatabase({ databaseUrl: url });
    await migrate(db);
    await seedIfEmpty(db);
    const first = await seedSummary(db);
    assert.ok(first.wards >= 41, `expected ≥41 wards, got ${first.wards}`);
    await seedRoster(db);
    const second = await seedSummary(db);
    assert.equal(second.wards, first.wards);
    assert.equal(second.roles, first.roles);

    const app = createApp(db);
    const health = await app.request('http://local/health');
    assert.equal(health.status, 200);
    const here = await app.request('http://local/v1/here?lat=18.559&lng=73.7867');
    assert.equal(here.status, 200);
    const body = await here.json();
    assert.ok(body.ward?.id);
    await db.close();
  });
});
