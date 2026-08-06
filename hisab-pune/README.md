# Hisab — Pune civic accountability

Public transparency for who answers when a Pune street stays dirty.

**Language:** English only (UI + data).

## Run

```bash
cd hisab-pune
npm install
npm run seed          # SQLite + 2026 roster / wards
npm run dev           # web :5173 + API :8787
```

```bash
npm run test:api
npm run build
```

## CI/CD

GitHub Actions (Cursor-aligned: deterministic gates, least privilege):

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `CI` | PR + push to `main` | `lint` → `seed` → `test:api` → `build`; cancels stale runs; uploads `dist` on `main` |
| `Deploy` | After green CI on `main` | Rebuilds web artifact for the `production` environment (host step is a placeholder until secrets exist) |
| Dependabot | Weekly | npm (`hisab-pune/`) + GitHub Actions |

Optional: add repo secret `CURSOR_API_KEY` and enable the `cursor-review` job in `.github/workflows/ci.yml` (restricted via `.cursor/cli.json`). Prefer [Bugbot](https://cursor.com/docs/bugbot) on PRs for review.

Branch protection on `main` requires the **Lint, test & build** check.

## Stack

- Web: Vite + React + TypeScript + MapLibre + **GSAP** (hero / ladder / page motion)
- API: Hono + SQLite (Postgres-ready schema) — `GET /v1/here`, reports, freshness, SLA
- iOS: SwiftUI + WidgetKit scaffold under `ios/` (build on Mac/Xcode)

## Docs

- `ARCHITECTURE.md` — product + system design
- `IMPLEMENTATION.md` — phased build checklist
- `ios/README.md` — widget / App Group notes

## Brand

**Hisab** — reckoning. Who answers for your street?
