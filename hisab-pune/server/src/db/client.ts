import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, '../../data');
export const DB_PATH = path.join(DATA_DIR, 'hisab.sqlite');

export type Dialect = 'sqlite' | 'postgres';

export type Db = {
  dialect: Dialect;
  exec(sql: string): Promise<void>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  close(): Promise<void>;
};

/** Convert `?` placeholders to `$1`, `$2`, … for node-postgres. */
export function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export function isPoolerHost(host: string): boolean {
  return host.includes('-pooler');
}

/**
 * Prefer a Neon pooled endpoint when present.
 * - `DATABASE_URL` whose hostname contains `-pooler` is used as-is.
 * - Else if `PGHOST` contains `-pooler`, rewrite the URL hostname to `PGHOST`.
 */
export function resolveDatabaseUrl(raw?: string | null): string | undefined {
  if (raw === null) return undefined;
  const url = raw ?? process.env.DATABASE_URL;
  if (!url) return undefined;
  const pghost = process.env.PGHOST;
  if (pghost && isPoolerHost(pghost)) {
    try {
      const u = new URL(url);
      if (!isPoolerHost(u.hostname)) {
        u.hostname = pghost;
        return u.toString();
      }
    } catch {
      // Keep the original string if it is not a parseable URL.
    }
  }
  return url;
}

export function sslFor(connectionString: string): boolean | { rejectUnauthorized: false } {
  try {
    const u = new URL(connectionString);
    const mode = (u.searchParams.get('sslmode') ?? '').toLowerCase();
    if (mode === 'disable') return false;
    if (mode === 'require' || mode === 'verify-ca' || mode === 'verify-full' || mode === 'prefer') {
      return { rejectUnauthorized: false };
    }
    const host = u.hostname.toLowerCase();
    // Neon requires TLS even when sslmode is omitted from the URL.
    if (host.endsWith('.neon.tech') || isPoolerHost(host) || host.endsWith('.render.com')) {
      return { rejectUnauthorized: false };
    }
  } catch {
    // Fall through — Pool will parse the raw string.
  }
  return false;
}

class SqliteDb implements Db {
  dialect = 'sqlite' as const;
  constructor(private readonly raw: import('better-sqlite3').Database) {}

  async exec(sql: string): Promise<void> {
    this.raw.exec(sql);
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.raw.prepare(sql).all(...params) as T[];
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.raw.prepare(sql).get(...params) as T | undefined;
  }

  async run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const info = this.raw.prepare(sql).run(...params);
    return { changes: info.changes };
  }

  async close(): Promise<void> {
    this.raw.close();
  }
}

class PostgresDb implements Db {
  dialect = 'postgres' as const;
  constructor(private readonly pool: pg.Pool) {}

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query(toPgPlaceholders(sql), params);
    return res.rows as T[];
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const res = await this.pool.query(toPgPlaceholders(sql), params);
    return { changes: res.rowCount ?? 0 };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export type OpenDatabaseOptions = {
  /** Force SQLite at this path (ignores DATABASE_URL). Used by tests. */
  sqlitePath?: string;
  /** Override DATABASE_URL. Pass null to force SQLite default path. */
  databaseUrl?: string | null;
};

export async function openDatabase(opts: OpenDatabaseOptions = {}): Promise<Db> {
  if (opts.sqlitePath) return openSqlite(opts.sqlitePath);

  const url = resolveDatabaseUrl(opts.databaseUrl);
  if (url) return openPostgres(url);
  return openSqlite(DB_PATH);
}

async function openSqlite(filename: string): Promise<Db> {
  const { default: Database } = await import('better-sqlite3');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const raw = new Database(filename);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  return new SqliteDb(raw);
}

function openPostgres(connectionString: string): Db {
  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    ssl: sslFor(connectionString),
  });
  return new PostgresDb(pool);
}

export async function withTransaction(db: Db, fn: () => Promise<void>): Promise<void> {
  await db.exec('BEGIN');
  try {
    await fn();
    await db.exec('COMMIT');
  } catch (err) {
    try {
      await db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors so the original failure surfaces.
    }
    throw err;
  }
}
