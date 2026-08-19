import { serve } from '@hono/node-server';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { openDatabase, migrate, DB_PATH } from './db/schema.ts';
import { seedIfEmpty } from './db/seedData.ts';
import { mountSpa } from './spa.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const usingPg = Boolean(process.env.DATABASE_URL);
  if (!usingPg && !fs.existsSync(DB_PATH)) {
    console.error(`Database missing at ${DB_PATH}. Run: npm run seed`);
    process.exit(1);
  }

  const db = await openDatabase();
  await migrate(db);
  if (usingPg) {
    const seeded = await seedIfEmpty(db);
    if (seeded) console.log('Seeded empty Postgres with 2026 roster/wards');
  }

  const app = createApp(db);
  const distDir = path.resolve(__dirname, '../../dist');
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    mountSpa(app, distDir);
    console.log(`Serving frontend from ${distDir}`);
  }

  const port = Number(process.env.PORT ?? 8787);
  const hostname = process.env.HOST ?? '0.0.0.0';

  serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.log(`Hisab listening on http://${hostname}:${info.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
