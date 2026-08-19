import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';

/** Serve Vite `dist` and fall back to index.html for client routes. */
export function mountSpa(app: Hono, distDir: string): void {
  app.use('/*', serveStatic({ root: distDir }));
  app.get('*', (c, next) => {
    if (c.req.path.startsWith('/v1') || c.req.path === '/health') {
      return c.json({ error: 'Not found' }, 404);
    }
    return serveStatic({ root: distDir, path: 'index.html' })(c, next);
  });
}
