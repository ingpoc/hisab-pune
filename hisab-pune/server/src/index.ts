import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { openDatabase, migrate, DB_PATH } from './db/schema.ts';
import { seedIfEmpty } from './db/seedData.ts';
import { mountSpa } from './spa.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function startingApp(): Hono {
  const app = new Hono();
  // Bind /health immediately so Render does not return x-render-routing: no-server
  // while migrate/seed (Neon cold start) is still running.
  app.get('/health', (c) =>
    c.json({
      ok: true,
      service: 'hisab-api',
      language: 'en',
      starting: true,
      time: new Date().toISOString(),
    }),
  );
  app.all('*', (c) => c.json({ error: 'starting' }, 503));
  return app;
}

async function main() {
  const port = Number(process.env.PORT ?? 8787);
  const hostname = process.env.HOST ?? '0.0.0.0';

  let app: Hono = startingApp();

  serve(
    {
      fetch: (req, env) => app.fetch(req, env),
      port,
      hostname,
    },
    (info) => {
      console.log(`Hisab listening on http://${hostname}:${info.port}`);
    },
  );

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

  const ready = createApp(db);
  const distDir = path.resolve(__dirname, '../../dist');
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    mountSpa(ready, distDir);
    console.log(`Serving frontend from ${distDir} (static root ${path.relative(process.cwd(), distDir) || '.'})`);
  }

  app = ready;
  console.log('Hisab ready');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
