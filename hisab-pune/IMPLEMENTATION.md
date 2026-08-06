# Implementation plan (active)

Status owner: this file + `ARCHITECTURE.md`.
Language: **English only** for names, UI, and API payloads.
Do not add a third architecture surface (no `MULTI_ISSUE.md`).

## Phase A — Backend v1

- [x] SQLite DB with versioned roster + reports + events (Postgres-shaped schema)
- [x] Seed 2026 wards / corporators / offices / city leaders + GeoJSON
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
- [x] SwiftUI app sources (`ios/HisabPune/`) — Here / Report / anonymous session
- [x] XcodeGen `ios/project.yml` + generated `HisabPune.xcodeproj` (Simulator build)
- [ ] App Store signing / Team ID
- [ ] Travel-mode Live Activity

## Phase D — later

- SLA digest job + @HisabPune
- Photo object storage + moderation workers
- Election scorecards
- Real gov write adapters (only when a public/partner API exists)
- Phone OTP (replace session stub)

## Phase E — Multi-issue MVP (next product slice)

Control: `ARCHITECTURE.md` §§1–6b. Keep table/API name `reports`; public copy may say “issues”.

- [x] **Categories + report modal** — flat enum; category on create; dept tip in UI
- [x] **Locality feed** — issues on locality page; open item for detail
- [x] **Auth gate (MVP session)** — `POST /v1/auth/session`; stable `anonymous_posting_id`; default anonymous publish; never leak `author_user_id`
- [x] **Comments** — table + API + locality UI
- [x] **Gov path (honest)** — fail-closed CARE stub + WhatsApp/portal links + paste ticket # (no fake API write)
- [x] **City / crowd signal** — `GET /v1/signal/city`

## Environment note

No Docker/Postgres in this cloud VM → **SQLite + in-process PIP** for v1.
Schema and routes stay portable to PostGIS.
