import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPoolerHost, resolveDatabaseUrl, sslFor, toPgPlaceholders } from './client.ts';

describe('pg helpers (Neon)', () => {
  it('rewrites ? placeholders to $n', () => {
    assert.equal(toPgPlaceholders('SELECT * FROM t WHERE a = ? AND b = ?'), 'SELECT * FROM t WHERE a = $1 AND b = $2');
  });

  it('detects Neon pooler hosts', () => {
    assert.equal(isPoolerHost('ep-cool-darkness-a1b2c3d4-pooler.us-east-2.aws.neon.tech'), true);
    assert.equal(isPoolerHost('ep-cool-darkness-a1b2c3d4.us-east-2.aws.neon.tech'), false);
  });

  it('prefers PGHOST when it is a pooler and DATABASE_URL is direct', () => {
    const prev = process.env.PGHOST;
    process.env.PGHOST = 'ep-cool-darkness-a1b2c3d4-pooler.us-east-2.aws.neon.tech';
    try {
      const resolved = resolveDatabaseUrl(
        'postgresql://user:pass@ep-cool-darkness-a1b2c3d4.us-east-2.aws.neon.tech/neondb?sslmode=require',
      );
      assert.ok(resolved);
      assert.equal(new URL(resolved).hostname, process.env.PGHOST);
    } finally {
      if (prev === undefined) delete process.env.PGHOST;
      else process.env.PGHOST = prev;
    }
  });

  it('keeps an already-pooled DATABASE_URL', () => {
    const pooled =
      'postgresql://user:pass@ep-cool-darkness-a1b2c3d4-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
    assert.equal(resolveDatabaseUrl(pooled), pooled);
  });

  it('enables TLS for Neon even without sslmode', () => {
    const neon = 'postgresql://user:pass@ep-cool-darkness-a1b2c3d4-pooler.us-east-2.aws.neon.tech/neondb';
    assert.deepEqual(sslFor(neon), { rejectUnauthorized: false });
  });

  it('honours sslmode=require and sslmode=disable', () => {
    assert.deepEqual(
      sslFor('postgresql://user:pass@localhost/db?sslmode=require'),
      { rejectUnauthorized: false },
    );
    assert.equal(sslFor('postgresql://user:pass@localhost/db?sslmode=disable'), false);
  });

  it('leaves local unadorned URLs without TLS', () => {
    assert.equal(sslFor('postgresql://user:pass@127.0.0.1:5432/hisab'), false);
  });
});
