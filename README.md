# Hisab Pune

Greenfield MVP for Pune civic accountability (escalation routes + X action).

```bash
cd hisab-pune && npm install && npm run seed && npm run dev
```

CI: GitHub Actions on PRs/`main` (lint, API tests, build). See `hisab-pune/README.md`.

## Render (free tier) + Neon Postgres

Blueprint: [`render.yaml`](render.yaml) at this repo root (Render's default path). The Node app lives in `hisab-pune/`; the web service sets `rootDir: hisab-pune`.

- One **free** Node web service (`plan: free`, Singapore). No Render Postgres, disks, Key Value, or paid add-ons.
- Build: `npm ci && npm run build`. Start: `npm start` (Hono on `0.0.0.0:$PORT`, `/health`, `/v1`, Vite `dist` SPA).
- Set `DATABASE_URL` in the Render Dashboard to the **Neon pooled** connection string (hostname contains `-pooler`, typically `sslmode=require`). Local/dev stays on SQLite unless `DATABASE_URL` is set.
