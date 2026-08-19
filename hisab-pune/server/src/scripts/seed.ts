/**
 * Seed SQLite (local wipe+reload) or Postgres (idempotent) from 2026-verified modules.
 * Run: npm run seed
 * Postgres: DATABASE_URL=postgres://… npm run seed
 */
import fs from 'node:fs';
import { openDatabase, migrate, DB_PATH, DATA_DIR } from '../db/schema.ts';
import { seedRoster, seedSummary } from '../db/seedData.ts';

async function main() {
  const usingPg = Boolean(process.env.DATABASE_URL);
  if (!usingPg && fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  const db = await openDatabase();
  await migrate(db);
  await seedRoster(db);
  const counts = await seedSummary(db);
  console.log(usingPg ? 'Seeded Postgres (idempotent)' : `Seeded ${DB_PATH}`);
  console.log(counts);
  if (!usingPg) console.log('DATA_DIR', DATA_DIR);
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
