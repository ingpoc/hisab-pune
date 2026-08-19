import type { Db } from './client.ts';

export { DATA_DIR, DB_PATH, openDatabase, type Db } from './client.ts';

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS boundary_versions (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      source_url TEXT,
      effective_from TEXT NOT NULL,
      effective_to TEXT
    )`,
  `CREATE TABLE IF NOT EXISTS wards (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      boundary_version_id TEXT NOT NULL,
      geometry_json TEXT NOT NULL,
      FOREIGN KEY (boundary_version_id) REFERENCES boundary_versions(id)
    )`,
  `CREATE TABLE IF NOT EXISTS offices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      zone INTEGER,
      phone TEXT,
      note TEXT
    )`,
  `CREATE TABLE IF NOT EXISTS office_wards (
      office_id TEXT NOT NULL,
      ward_id INTEGER NOT NULL,
      PRIMARY KEY (office_id, ward_id),
      FOREIGN KEY (office_id) REFERENCES offices(id),
      FOREIGN KEY (ward_id) REFERENCES wards(id)
    )`,
  `CREATE TABLE IF NOT EXISTS officials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS official_roles (
      id TEXT PRIMARY KEY,
      official_id TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT,
      party TEXT,
      x_handle TEXT,
      phone TEXT,
      email TEXT,
      note TEXT,
      ward_id INTEGER,
      seat TEXT,
      office_id TEXT,
      assembly_key TEXT,
      source_url TEXT,
      source_date TEXT,
      source_label TEXT,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      confidence TEXT NOT NULL DEFAULT 'high',
      FOREIGN KEY (official_id) REFERENCES officials(id)
    )`,
  `CREATE TABLE IF NOT EXISTS localities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ward_id INTEGER NOT NULL,
      office_id TEXT NOT NULL,
      assembly_key TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      zone TEXT,
      FOREIGN KEY (ward_id) REFERENCES wards(id),
      FOREIGN KEY (office_id) REFERENCES offices(id)
    )`,
  `CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      locality_id TEXT,
      ward_id INTEGER,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      note TEXT NOT NULL,
      photo_path TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      moderation_state TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sla_due_at TEXT,
      escalation_eligible_at TEXT,
      resolved_at TEXT
    )`,
  `CREATE TABLE IF NOT EXISTS report_events (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id)
    )`,
  `CREATE INDEX IF NOT EXISTS idx_roles_active ON official_roles(role, effective_to)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, moderation_state)`,
  `CREATE INDEX IF NOT EXISTS idx_localities_ward ON localities(ward_id)`,
];

/**
 * Portable DDL for SQLite (local/dev) and Postgres (Render).
 * Types used here are valid on both: TEXT, INTEGER, REAL, PRIMARY KEY.
 * SQLite-only PRAGMAs live in the SQLite opener, not here.
 */
export async function migrate(db: Db): Promise<void> {
  for (const sql of MIGRATIONS) {
    await db.exec(sql);
  }
}
