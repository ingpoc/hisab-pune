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
