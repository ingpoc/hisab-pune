# Hisab — Pune civic accountability

Public transparency for who answers when a Pune street stays dirty.

**Language:** English only (UI + data).

## Run

```bash
cd hisab-pune
npm install
npm run seed          # SQLite + 2026 roster / wards (wipes local SQLite)
npm run dev           # web :5173 + API :8787
```

```bash
npm run test:api
npm run build
npm start             # production: API + Vite dist on 0.0.0.0:$PORT (default 8787)
```

## Render

Blueprint is **`render.yaml` at the repo root** (not in this folder). Render `rootDir` is `hisab-pune`.

| Script | What it does |
|--------|----------------|
| `npm run build` | `tsc -b && vite build` (CI + Render build) |
| `npm start` | Hono on `0.0.0.0` / `$PORT`; migrates; seeds empty Postgres; serves `/v1`, `/health`, and `dist` |
| `npm run seed` | Local: recreate SQLite. With `DATABASE_URL`: idempotent Postgres seed |
| `npm run dev` | Vite + API for local development (SQLite) |

When `DATABASE_URL` is set (Render → Neon), the server uses the `pg` driver with TLS. Without it, local SQLite at `server/data/hisab.sqlite` is unchanged.

**Render env:** set `DATABASE_URL` to the Neon **pooled** URL (hostname contains `-pooler`, e.g. `ep-….neon.tech` with `sslmode=require`). If `PGHOST` is the pooler host and `DATABASE_URL` is the direct endpoint, the server rewrites to the pooler.

Dummy / local Postgres (optional):

```bash
# Local Postgres without TLS (SQLite stays the default if this is unset)
DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/hisab?sslmode=disable' npm run seed
DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/hisab?sslmode=disable' npm start

# Neon (pooled) — same var Render should get
DATABASE_URL='postgresql://USER:PASS@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require' npm start
```

Free-tier limits: 512MB RAM, ephemeral disk, spin-down after 15 minutes idle. Do not attach a persistent disk. Postgres lives on Neon, not Render.

## CI/CD

GitHub Actions (Cursor-aligned: deterministic gates, least privilege):

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `CI` | PR + push to `main` | `lint` → **`grade`** → `seed` → `test:api` → `build` → **Playwright smoke** (desktop Chromium + mobile 390×844); cancels stale runs; uploads `dist` on `main` |
| `Deploy` | After green CI on `main` | Rebuilds web artifact. Also **force-updates** `cursor/render-free-tier-17a3` to the `main` SHA so Render Free auto-deploy goes live (the service branch cannot be changed to `main`). |
| Dependabot | Weekly | npm (`hisab-pune/`) + GitHub Actions |

**Cost posture:** known browser-QA failures are locked as deterministic graders (`npm run grade`) + a small Chromium smoke (`npm run test:e2e`). Cursor agent review stays **off** in CI unless you opt in with `CURSOR_API_KEY`.

Graders encode: English-only, roster 41/165/30, no stale AMCs, routes + `?report=1`, Vite `0.0.0.0` host, ward GeoJSON.

```bash
npm run grade          # static invariants (seconds)
npm run test:e2e       # DOM smoke (Playwright Chromium)
npm run ci             # lint + grade + api tests + build
```

Optional: add repo secret `CURSOR_API_KEY` and enable the `cursor-review` job in `.github/workflows/ci.yml` (restricted via `.cursor/cli.json`). Prefer [Bugbot](https://cursor.com/docs/bugbot) on PRs for review.

Branch protection on `main` requires the **Lint, test & build** check.

## Stack

- Web: Vite + React + TypeScript + MapLibre + **GSAP** (hero / ladder / page motion)
- API: Hono + SQLite locally; Postgres (`pg`) when `DATABASE_URL` is set — `GET /v1/here`, reports, freshness, SLA
- iOS: SwiftUI + WidgetKit scaffold under `ios/` (build on Mac/Xcode)

## Docs

- `ARCHITECTURE.md` — product + system design
- `IMPLEMENTATION.md` — phased build checklist
- `ios/README.md` — widget / App Group notes

## Brand

**Hisab** — reckoning. Who answers for your street?
