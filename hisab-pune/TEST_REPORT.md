# Hisab Pune — local QA report

Tested `main` at `757d96e` (after `git fetch origin main`). No product code was changed.

Environment: Cloud Agent VM, `cd hisab-pune`, `npm ci`, `npm run seed`, `npm run dev` (web `:5173`, API `:8787`). Vite is already started by the environment `start` script; after `npm ci` the running Vite process served **504 Outdated Optimize Dep** and a blank `#root`. That is an environment stale-cache issue, not an app bug. Servers were restarted by PID; all findings below are from the healthy process.

Screenshots: `hisab-pune/test-artifacts/`.

## Gates

| Command | Result |
|---|---|
| `npm run lint` | **PASS** (oxlint, exit 0) |
| `npm run grade` | **PASS** (6/6: english-only, roster 41/165/30/15, no-stale-amc, routes, vite-host, geojson) |
| `npm run test:api` | **PASS** (3/3) |
| `npm run test:e2e` | **PASS** (6/6) after Vite restart. First run was 1/6: Playwright saw an empty `#root` because Vite returned 504 for optimized React deps. Not a product failure. |
| `npm run build` | **PASS** (`tsc -b && vite build`). Chunk-size warning only (`index-*.js` ~1.3 MB). |

## API (direct)

All against `http://127.0.0.1:8787` (and the same paths via the Vite proxy on `:5173`).

| Request | Result |
|---|---|
| `GET /health` | `200` `{ ok: true, service: "hisab-api", language: "en" }` |
| `GET /v1/here?lat=18.5204&lng=73.8567` | `200`. Nearest-locality fallback: Shaniwar Peth / ward 25, `matchedByPolygon: false`. That coordinate is **outside** every 2026 polygon (bbox contains it; point-in-polygon misses). Nearby Baner `18.559,73.7867` and Aundh `18.558,73.8075` return `matchedByPolygon: true`. |
| `GET /v1/here?lat=19&lng=73` | `400` (outside Pune bounds) |
| `GET /v1/wards/8` | `200`. Ward Aundh–Bopodi, Aundh–Baner office, locality `aundh`, full escalation (SWM → office → 4 corporators → MLA → dy mayor → mayor → commissioner → MP). |
| `GET /v1/wards/99` | `404` |
| `GET /v1/freshness` | `200`. `language: "en"`, 165 corporators, 15 ward officers, 8 MLAs, sources JSON present. |
| `GET /v1/reports` | `200`, 12 seeded approved reports (then 13 after the in-browser test POST). |

Vite proxy: `GET http://127.0.0.1:5173/health` and `GET /v1/here?...` both `200`.

Known context checked: `.github/workflows/deploy.yml` is still a placeholder (echo + upload `dist`, no host). Testing local `npm run dev` is the right path.

## Browser

Playwright Chromium at **1440×900** and **390×844**, plus a real desktop Chrome click-through (video). English-only on every route (no Devanagari). No page crash, no blank screen after Vite was healthy. Console: WebGL “GPU stall due to ReadPixels” warnings on the map only — not user-facing.

| Route | Desktop | Mobile ~390px |
|---|---|---|
| `/` Home | Loads. Hero, CTAs, nav. Proof stats / “The problem” start at `opacity: 0` until scroll (GSAP ScrollTrigger); they become `opacity: 1` after scrolling. | Same. **Primary nav links are `display: none`.** Visible chrome is brand + “Report garbage”. |
| `/map` | MapLibre + OSM tiles, 30 locality markers, 12 report pins. Pan works. Sidebar report click opens Baner/Aundh ladder. | Map + list stack vertically. Markers exist; some are outside the short map pane (click the sidebar list instead). |
| `/map?report=1` | Dialog “Report a blackspot”. “Use my location” (geolocation granted → Aundh, ward 8). Submit pins the report and shows the ladder. | Dialog opens and is usable. |
| `/localities` | 30 cards, links to `/locality/:id`. | Same, stacked. |
| `/locality/aundh` | Full ladder (11 rungs) + reports + “Report in Aundh”. `tel:`, `mailto:`, `https://x.com/…`, tweet intent all present. | Same. Nav still only brand + Report. |
| `/how` | Static method + sources. **Zero `GET /v1/*` requests** (fresh page). Copy still says localStorage-only / “Next: live backend”. | Same. |
| `/wards` | 41 cards, 165 corporators, eyebrow “PMC 2026”. **14 cards** show “No named locality pin yet — add centroid mapping next.” | Same. **Not reachable from visible mobile nav.** |

Escalation (Aundh / ward 8), verified in UI + API:

- SWM: Avinash Sakpal · `@PMCPune` · `tel:1800-103-0222` · `mailto:swm@punecorporation.org`
- Ward office: Aundh–Baner Regional Office (named AMC still “verify on pmc.gov.in”)
- Corporators: Wadekar, Gaikwad, Chhajed, Nimhan (no X handles)
- MLA Siddharth Anil Shirole `@SidShirole`
- Mayor Manjusha Deepak Nagpure `@MDNagpure`
- Commissioner Naval Kishore Ram · `tel:020-25501100`
- MP Murlidhar Mohol `@mohol_murlidhar`
- “Post on X with tags” → `https://twitter.com/intent/tweet?text=…` with those handles

How-page freshness: **IMPLEMENTATION.md is still true.** `fetchFreshness()` exists in `src/lib/api.ts` and is unused. `/how` never calls `GET /v1/freshness`.

## Bugs that need a code fix

Nothing blocking. App boots, every route renders, report → ladder works, APIs respond, gates are green.

### 1. Mobile primary nav is hidden — Wards (and most IA) unreachable

- **Where:** `src/components/Nav.tsx`, `src/components/Nav.css` (`@media (max-width: 720px) { .nav__links { display: none; } }`). There is no menu/overflow control.
- **Repro:** Open `/` at ~390px. Only “Hisab” and “Report garbage” are visible. `nav.nav__links` computes `display: none`. There is no home CTA to `/wards`. `/how` is only reachable after scrolling to the GSAP-revealed “How escalation works →” link. `/map` without `?report=1` is not in the visible chrome.
- **Why it matters:** Street reporting is a phone task. The Wards directory is a primary route in `App.tsx` and is a dead end on a phone-sized viewport.

### 2. How page is stale: static sources, false “localStorage-only / no backend” copy

- **Where:** `src/pages/HowPage.tsx` (static `dataSources` + leftover MVP paragraph). `src/lib/api.ts` `fetchFreshness()` is dead. Confirmed: a fresh load of `/how` issues **no** `/v1` requests; `GET /v1/freshness` works on the API.
- **Repro:** Open `/how`. Read “What's loaded now” / Sources. Watch the network tab. Compare with `GET /v1/freshness` and a successful `POST /v1/reports` from the map modal.
- **Why it matters:** The live app already has SQLite + `/v1/reports` + ward GeoJSON. The How page tells users the opposite, and it cannot show roster freshness even though the endpoint exists. Matches the open checkbox in `IMPLEMENTATION.md`.

### 3. Clicking a ward polygon with no locality pin does nothing

- **Where:** `src/components/MapView.tsx` (`click` on `wards-fill` → `allLocalities.find((l) => l.electoralWardId === wardId)`; if missing, return). `src/pages/WardsPage.tsx` already labels the gap.
- **Repro:** `/wards` — 14 of 41 cards say “No named locality pin yet”. On `/map`, click a polygon for one of those ward ids (e.g. ward 2). No ladder, no error, no URL change.
- **Why it matters:** The map legend advertises “41 ward polygons”. For a third of wards, the advertised click-through is a silent no-op. (Filling the 14 centroids is data; the silent no-op is the code bug.)

## Not bugs (checked and discarded)

- Blank Playwright home on the first `test:e2e` run — Vite 504 after `npm ci` against a live server. Restart → 6/6 pass.
- `matchedByPolygon: false` at `18.5204,73.8567` — that tourist/centre point is not inside any polygon; Baner/Aundh centroids match. Fallback is intentional.
- Home proof stats invisible on first paint — GSAP `from` + ScrollTrigger; they appear after scroll (`opacity: 1` measured).
- English-only — graders + rendered DOM.
- Deploy workflow placeholder — still true, out of scope for local QA.
- Draft PR #9 (checklist-framework) — not tested; this report is `main` only.
