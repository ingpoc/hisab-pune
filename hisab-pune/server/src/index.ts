import { serve } from '@hono/node-server';
import fs from 'node:fs';
import { createApp } from './app.ts';
import { openDb, migrate, DB_PATH } from './db/schema.ts';

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database missing at ${DB_PATH}. Run: npm run seed`);
    process.exit(1);
  }
  const db = openDb();
  migrate(db);
  return db;
}

const db = ensureDb();
const app = createApp(db);
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Hisab API listening on http://127.0.0.1:${info.port}`);
});
