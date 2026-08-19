import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono, MiddlewareHandler } from 'hono';
import path from 'node:path';

export function isApiPath(pathname: string): boolean {
  return pathname === '/health' || pathname.startsWith('/v1');
}

/**
 * `@hono/node-server/serve-static` resolves `root` from `process.cwd()`,
 * and some versions mishandle an absolute `root`. Prefer a cwd-relative path.
 */
export function staticRootFrom(absDir: string, cwd = process.cwd()): string {
  const resolved = path.resolve(absDir);
  const rel = path.relative(cwd, resolved);
  if (!rel) return '.';
  return rel;
}

function stripLeadingSlash(p: string): string {
  return p.replace(/^\//, '');
}

function serveDist(root: string, file?: string): MiddlewareHandler {
  return serveStatic({
    root,
    path: file,
    rewriteRequestPath: stripLeadingSlash,
  });
}

/** Serve Vite `dist` and fall back to index.html for client routes. */
export function mountSpa(app: Hono, distDir: string): void {
  const root = staticRootFrom(distDir);
  const files = serveDist(root);
  const index = serveDist(root, 'index.html');

  app.get('/', (c, next) => index(c, next));

  app.use('/*', async (c, next) => {
    if (isApiPath(c.req.path)) return next();
    return files(c, next);
  });

  app.get('*', async (c, next) => {
    if (isApiPath(c.req.path)) return next();
    // Missing hashed assets must 404 — do not return SPA HTML as JS/CSS.
    if (c.req.path.startsWith('/assets/')) {
      return c.text('Not Found', 404);
    }
    return index(c, next);
  });
}
