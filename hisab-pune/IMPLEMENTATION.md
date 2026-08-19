# Implementation plan (active)

Status owner: this file + `ARCHITECTURE.md`.
Language: **English only** for names, UI, and API payloads.

## Phase A — Backend v1
- [x] SQLite locally + Postgres when `DATABASE_URL` is set (same schema; `pg` driver)
- [x] Seed 2026 wards / corporators / offices / city leaders + GeoJSON (idempotent on Postgres)
- [x] `GET /v1/here?lat=&lng=`
- [x] `GET/POST /v1/reports` + moderation / SLA fields
- [x] `GET /v1/wards/:id` escalation
- [x] Automated API tests + curl checks

## Phase B — Web wiring
- [x] Vite proxy → API
- [x] Map/report flows use API (with local fallback)
- [x] GSAP motion (hero, scroll sections, escalation ladder, page enter)
- [x] Deterministic graders + Playwright smoke for browser-QA regressions
- [ ] Freshness page fully driven by `/v1/freshness` (How page still uses static sources list)

## Phase C — iOS scaffold
- [x] Shared `HereSnapshot` + WidgetKit medium widget stub
- [ ] Full Xcode project + significant-location writer (needs Mac)
- [ ] Travel-mode Live Activity

## Phase D — later
- SLA digest job + @HisabPune
- Photo object storage + moderation workers
- Election scorecards

## Environment note
Local/dev: **SQLite**. Render: **Neon Postgres** via `DATABASE_URL` (pooled URL; see repo-root `render.yaml`).
Schema and routes stay portable; PostGIS is still a later upgrade.
