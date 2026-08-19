# Hisab Pune

Greenfield MVP for Pune civic accountability (escalation routes + X action).

```bash
cd hisab-pune && npm install && npm run seed && npm run dev
```

CI: GitHub Actions on PRs/`main` (lint, API tests, build). See `hisab-pune/README.md`.

## Render (free tier)

Blueprint: [`render.yaml`](render.yaml) at this repo root (Render's default path). The Node app lives in `hisab-pune/`; the web service sets `rootDir: hisab-pune`.

- One **free** Node web service (`plan: free`, Singapore) + one **free** Postgres (`plan: free`, 1GB).
- Build: `npm ci && npm run build`. Start: `npm start` (Hono on `0.0.0.0:$PORT`, `/health`, `/v1`, Vite `dist` SPA).
- `DATABASE_URL` is wired from the Blueprint Postgres (internal URL on Render). Local/dev stays on SQLite unless `DATABASE_URL` is set.

Render workspaces allow **one free Postgres**. This workspace already has `agentguard-preprod-postgres` (Virginia). Applying this Blueprint may require replacing that instance.
