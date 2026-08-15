# Hisab — product & system architecture

Guiding light: **transparency + accountability**, without harassment, spam, or reckless escalation.

This is the control document for how Hisab should evolve beyond the current static MVP.

---

## 1. What Hisab is (and is not)

| Is | Is not |
| --- | --- |
| A public ledger of **multi-category civic issues** (API/table: `reports`; public copy may say “issues”) mapped to **roles + names** | A pile-on / abuse channel or single-issue blackspot-only tool |
| Evidence-first (photo + place + time + category) | Rumour or political campaigning |
| Escalation with **SLA and batching** (Hisab ladder primary; optional gov ticket sidecar) | Auto-tagging every MLA on every report; fake “integrated” PMC CARE writes |
| Voter memory between elections | A substitute for RTI / courts / policing |

North star metrics:

1. **Resolution rate** by ward / MLA / corporator / category (with time-to-close)
2. **Roster freshness** (% officials with a cited source & effective date)
3. **Election scorecards** published from the same ledger (not separate spin)
4. **Crowd signal** as ward/category ledgers (counts, age, open/closed) — not vanity charts

---

## 2. Product loop

```text
Logged-in citizen reports evidence (category + photo + place)
        ↓
Moderation (auto + human)
        ↓
Public map + locality/ward ledger (facts; default author = anonymous_posting_id)
        ↓
Hisab SLA ladder (T0–T4); optional gov ticket sidecar if adapter supports
        ↓
If unresolved past SLA → batched public digest (app X + optional citizen share)
        ↓
Close with proof OR mark stale / disputed
        ↓
Aggregate → crowd signal ledgers + election scorecard
```

**Principle:** the platform speaks in **aggregates and ledgers**. Writes require login; **public authorship is anonymous by default** via a stable per-user anonymous posting id. Real/chosen identity appears only when the user opts in.

---

## 3. Who can upload / update what

### Citizens (login required to create or comment)

**Auth gate + public authorship**

- Login is required to **create** a report and to **comment**.
- At signup, each user is assigned a stable **`anonymous_posting_id`** (public pseudonym, e.g. `R-7K2M`). This is what the feed shows by default.
- **`publish_as` defaults to `anonymous`** → public author = `anonymous_posting_id`.
- **Opt-in only:** user may set `publish_as=identified` to show their chosen public id / handle instead. Never force real name.
- Never expose `author_user_id`, email, phone, or session identifiers on public APIs, map payloads, or UI.

**Allowed**

- Live or recent photo of a civic issue (prefer camera capture)
- Flat **category** (see §5)
- GPS / map pin
- Short factual note (length-capped)
- Comments and “Still there” / “Looks cleaned” follow-ups on an existing report
- Optional: suggest a roster correction **with a source URL**

**Forbidden**

- Abuse, caste/religion bait, threats
- Private home addresses of officials / family
- Personal phone numbers not published as official contact
- Uploading other people’s faces as the primary subject
- Fake “resolved” without photo when claiming cleanup
- Write without a logged-in account (login ≠ public identity; anonymity is the default *display*, not missing auth)

### Curators / trusted editors (small team + later RWAs)

- Approve / reject reports
- Merge duplicates (same spot within ~50 m)
- Update roster rows (with source + effective dates)
- Confirm resolutions
- Pause escalation for a ward during verified cleanup drives
- Process `manual_queue` gov-escalation stubs when adapters are unsupported

### System (automated)

- Assign electoral ward from **current** boundary layer
- Attach Hisab escalation chain from versioned roster
- Route category → department tip (hint only; not a hard gov write)
- Deduplicate, virus/NSFW scan, EXIF sanity checks
- Emit digests on schedule (not per-report spam)
- Call EscalationAdapter fail-closed (unsupported → `manual_queue`)

---

## 4. Keeping data always current

Separate **three clocks** — never mix them:

| Dataset | Cadence | Source of truth | Update method |
| --- | --- | --- | --- |
| Electoral boundaries | Per delimitation / election cycle | SEC / PMC gazette + OpenCity KML | Versioned GeoJSON; `effective_from` / `effective_to` |
| Corporators / Mayor | After each civic election (+ bypolls) | SEC gazette | Import + human confirm; never overwrite history |
| MLA / MP | After assembly / Lok Sabha polls | ECI results | Same versioned roster |
| Commissioner / SWM / AMCs | Continuous | PMC orders + **dated** news only if official page lags | Human confirm; mark `confidence` |
| Office phones / X handles | Continuous | Official sites / verified profiles | Suggest → review → publish |
| Reports | Continuous | Citizens | Append-only events |

**Rules**

1. Every roster field has `source_url`, `source_date`, `verified_at`, `verified_by`.
2. Stale official directories (e.g. pages still listing a past commissioner) are **never** trusted for names.
3. Citizens can *propose* roster edits; they cannot silently change them.
4. Nightly job: flag rows older than N days without re-verification (AMC postings especially).
5. Publish a public “Data freshness” page (what’s verified, what’s pending).

---

## 5. Database shape (recommended)

**Postgres + PostGIS** (Supabase or self-host). Object storage (S3/R2) for photos.

Keep the table/API name **`reports`** (public copy may say “issues”). Do not rename the resource.

Core tables (simplified):

- `boundary_versions` — geo layers with effective dates  
- `wards` — electoral ward id, name, boundary_version_id  
- `offices` — regional ward offices ↔ wards (many-to-many)  
- `officials` — person records  
- `official_roles` — role, ward/office/assembly scope, party, handles, phones, `effective_from/to`, source fields  
- `users` — required for create/comment; curator vs citizen; **`anonymous_posting_id`** (unique, assigned once); optional `public_display_id` / handle for opt-in identified posts  
- `reports` — geom, ward_id, **category**, status, moderation_state, note, `author_user_id` (internal), `publish_as` (`anonymous` default | `identified`), created_at  
- `attachments` — photo/file keys linked to a report (object storage)  
- `comments` — follow-ups; `author_user_id` internal; public author resolved from `publish_as` → `anonymous_posting_id` or opt-in display id  
- `report_events` — append-only: created / escalated / reminded / resolved / disputed / gov_ticket_*  
- `escalation_tickets` — optional gov sidecar (adapter status, external ref, `manual_queue` payload)  
- `escalation_batches` — digests posted to X (who tagged, which reports, text, url)  
- `scorecards` — materialized views by ward / role / category / election cycle  

**Category enum (flat):**

`solid_waste` · `drainage_flood` · `roads_footpath` · `streetlight` · `water_supply` · `encroachment` · `parks_trees` · `stray_animals` · `other`

**Privacy / public author DTO**

- Default: `{ publish_as: "anonymous", author_label: "<anonymous_posting_id>" }`
- Opt-in: `{ publish_as: "identified", author_label: "<public_display_id>" }`
- Never include `author_user_id`, email, or phone. Same user posting anonymously always shows the same `anonymous_posting_id` (continuity without revealing login identity).

**Important:** do not delete officials when they leave office — close the role row with `effective_to` so election scorecards stay honest.

---

## 6. X strategy — accountability without spam

### Accounts

| Account | Role |
| --- | --- |
| **@HisabPune** (app) | Only official voice. Digests, scorecards, method posts. |
| Citizen’s own X | Optional “Post this myself” intent URL — **their** speech, not the app’s |

Do **not** create fake “fan” accounts. Do **not** auto-DM officials.

### What @HisabPune posts

1. **Daily / weekly digest** (not each report):  
   “Ward 9 — 7 open issues (solid waste 4, drainage 2, …), oldest 11 days. Corporators: … Regional office: …”
2. **SLA breach digests** only after private window expires.
3. **Resolution praise** when cleanup is verified (balance, not only blame).
4. **Election scorecards** (scheduled, sourced, downloadable CSV).

### Hard rate limits (non-negotiable)

- Cap tags per official per day / week (e.g. ≤1 digest mention / day, ≤3 / week).
- Batch many reports into one post.
- Quiet hours (e.g. 22:00–08:00 IST) — no digests.
- Language filter: factual English templates only; block abuse terms.
- Prefer tagging **@PMCPune** + role suggested by **category → department tip** first; elected reps appear in digests after SLA, not on minute-one.

### Category → department tip (hint only)

Map each flat category to a PMC-style department label for UI tips and digest wording (e.g. `solid_waste` → SWM, `drainage_flood` → Drainage, `streetlight` → Electrical). This is **not** a guarantee of an automated gov ticket — see §6a.

### Dual escalation (Hisab primary + optional gov sidecar)

**Hisab ladder (always on):**

1. **T0** Report published on map (public facts, no auto-tags).  
2. **T1 (0–48h)** Citizen can call / email ward office; app shows contacts + dept tip.  
3. **T2 (48–72h)** Optional single polite template the citizen may send themselves.  
4. **T3 (after SLA, e.g. 7 days open)** Report enters next @HisabPune digest.  
5. **T4 (14–30 days / clusters)** Ward-level or MLA-level weekly scorecard mention.

**Gov ticket sidecar (optional):** `escalation_tickets` via EscalationAdapter when a channel is supported. Failure or unsupported → `manual_queue`. Hisab T0–T4 never depends on gov write success.

This protects representatives from death-by-a-thousand-pings **and** protects the project from looking like a troll farm — which is how civic tools get crushed in India.

---

## 6a. Government escalation adapters

**EscalationAdapter** is fail-closed: unknown channel, missing credentials, or HTTP failure must not invent success.

| Channel | Reality | MVP behaviour |
| --- | --- | --- |
| PMC CARE / similar | No public write API for third parties | `unsupported` stub → enqueue `manual_queue` for curator |
| Future portal / email bridge | Only when a real write path exists | Implement adapter; store external ref on `escalation_tickets` |

Hisab’s T0–T4 ladder and @HisabPune digests remain the **primary** accountability path. Gov tickets are a sidecar, never a blocking dependency for publish or SLA clocks.

## 6b. Crowd signal

Crowd signal is **ledgers and tables**, not chart junk:

- Open / closed counts by ward and category  
- Age of oldest open issue; median time-to-close  
- Locality feed sorted by recency / SLA breach  

Same underlying `reports` + events — no parallel analytics product surface.

## 7. Safety & political reality

Assume some actors will try to intimidate reporters or the operators.

**Design responses**

- Anonymous-by-default via stable `anonymous_posting_id`; identified display is opt-in only.
- Don’t publish reporter location beyond ward-level on the public map if risk flags rise.
- Log only what’s needed; short retention for raw EXIF if sensitive.
- Public method page: what we post, rate limits, appeal path for officials (“this was cleaned — upload proof”).
- Officials get a **right of reply**: submit resolution photo / work order → goes to curator queue.
- Legal: frame as public-interest documentation of civic performance; no defamation, no private life.
- Non-partisan tone in templates; parties appear only as attributed roster fields.
- Keep a small, known curator circle; no open admin.

---

## 8. Election-time product (the change lever)

Between elections Hisab is a **pressure + memory** system.  
Near elections it becomes a **voter information** system:

1. **Incumbent cards** — open days, median time-to-resolve, repeat issues by category, digest count.
2. **Compare wards** under the same MLA / corporator panel.
3. **Downloadable dataset** (CC-BY) for journalists and NGOs — same as NammaKasa’s instinct.
4. Freeze campaigning features: no “vote for X” — only performance facts + sources.
5. Publish methodology weeks before code of conduct windows so it can’t be dismissed as last-minute smear.

Accountability without memory is noise. Memory without fairness is weaponisation. Hisab needs both: **versioned facts** and **bounded speech**.

---

## 9. Suggested build sequence

1. **Shipped (Phases A–B core)** — roster + map + `GET /v1/here` + basic `reports` API.  
2. **Phase E (multi-issue MVP)** — categories + report modal, locality feed, auth gate for create/comment, comments, EscalationAdapter + `manual_queue`, city/crowd signal ledgers.  
3. **Backend harden** — Postgres/PostGIS port, photo store (`attachments`), moderation workers.  
4. **SLA engine** — timers + curator dashboard (incl. `manual_queue`).  
5. **@HisabPune digests** — batched, rate-limited, category-aware templates.  
6. **iOS app + Home Screen widget** — App Group + significant-location refresh.  
7. **Optional Live Activity “Travel mode”** — while moving across the city.  
8. **Scorecards + CSV** — public analytics from the same ledgers.  
9. **Election pack** — incumbent cards, freeze rules, press kit.  
10. **Gov adapters beyond stub** — only when a real write path exists.

---

## 10. Stack recommendation

- Web: Vite/React (current) or Next.js if SSR/SEO for ward pages matters  
- iOS: SwiftUI + WidgetKit (+ ActivityKit for travel mode)  
- DB: Postgres + PostGIS  
- Auth: magic link / phone OTP for citizens (required to create/comment); curator accounts separate  
- Jobs: cron (digest, freshness flags, manual_queue alerts)  
- Storage: R2/S3 + CDN  
- Moderation: Vision SafeSearch + human queue  
- Escalation: Hisab T0–T4 primary; EscalationAdapter fail-closed (`manual_queue` / unsupported stub for PMC CARE)  
- X: official API for @HisabPune only; citizens use intent URLs  

---

## 11. iOS app + location widget

Goal: while moving through Pune, glance at **current locality + who answers here** without opening the app.

### Hard iOS constraint (design around it)

Home Screen / Lock Screen **widgets do not get continuous GPS**.  
WidgetKit refreshes on a budget (often tens of minutes). Treating a widget like live Maps will fail App Review and drain battery.

So Hisab uses **two surfaces**:

| Surface | When | Update model |
| --- | --- | --- |
| **Home Screen widget** (default) | Always on | Shows *last resolved* locality + escalation; refreshes on significant location change / app open / timeline reload |
| **Live Activity “Travel mode”** (opt-in) | User starts “I’m travelling” | Updates more often while the session runs (Dynamic Island / Lock Screen) |

Do not promise second-by-second widget updates. Promise: **when your area changes meaningfully, the names update**.

### Architecture

```text
Core Location (app process)
  significant-change / visits  ──or──  Travel-mode updates
        ↓
Point-in-polygon → electoral ward (on-device cache of boundaries)
        ↓
GET /v1/here?lat=&lng=   →  locality, ward, escalation chain (CDN-cacheable)
        ↓
App Group container (shared UserDefaults / SQLite)
        ↓
WidgetKit timeline  reads snapshot
Live Activity        reads same snapshot
```

**API contract (minimal):**

```json
{
  "locality": { "id": "baner", "name": "Baner" },
  "ward": { "id": 9, "name": "Sus–Baner–Pashan" },
  "escalation": [
    { "role": "ward_officer", "name": "…", "shortTitle": "Ward office" },
    { "role": "corporator", "name": "…", "shortTitle": "Corporator A" },
    { "role": "mla", "name": "…", "shortTitle": "MLA" },
    { "role": "commissioner", "name": "…", "shortTitle": "Commissioner" }
  ],
  "resolvedAt": "2026-08-06T07:55:00Z",
  "boundaryVersion": "2025-final-41"
}
```

Widget UI shows **locality name** + **3–5 short names** (not the full 8-rung ladder — too dense for a medium widget). Tap opens the full ladder in-app.

### Location policy (privacy + battery)

- Permission: **When In Use** first; **Always** only if user enables Travel mode / background significant-change for the widget.
- Purpose string: civic accountability lookup only — not ads, not tracking trail.
- Default: do **not** upload a breadcrumb trail. Resolve ward, then forget precise coordinates (or keep last point only on-device).
- On-device boundary cache so `/v1/here` can be skipped when offline (stale roster OK for a few days; show “roster as of …”).
- Debounce: only re-resolve when moved ~300–500 m or crossed a ward polygon.

### Widget layouts

- **Small:** locality name + MLA (or top responsible role)
- **Medium:** locality + ward number + 3 names (Ward office · Corporator · MLA)
- **Large:** locality + compact ladder (5 rows) + “Open report” deep link
- **Lock Screen circular/inline:** locality short name only / MLA surname

### Why this fits accountability

The widget is **orientation**, not escalation.  
It answers “whose patch am I on?” while walking/driving.  
Reporting, X digests, and SLA pressure stay in the main app / web — so travelling does not become silent surveillance of the user or spam of officials.

---

## Decision summary

| Question | Decision |
| --- | --- |
| Scope | Multi-category civic issues; keep `reports` API/table name; public copy may say “issues” |
| Categories | Flat enum: solid_waste, drainage_flood, roads_footpath, streetlight, water_supply, encroachment, parks_trees, stray_animals, other |
| Database | Postgres + PostGIS; `reports` + `comments` + `users` + `attachments` + `escalation_tickets`; append-only events; versioned roster |
| Auth / privacy | Login required to create/comment; **anonymous by default** via assigned `anonymous_posting_id`; opt-in to show public display id; never leak author_user_id / email / phone |
| Freshness | Source + date on every official field; citizens propose, curators publish |
| User uploads | Evidence + category + follow-ups only; no private data; no abuse |
| Escalation | Hisab T0–T4 primary; optional gov ticket sidecar via fail-closed EscalationAdapter |
| Gov adapters (MVP) | PMC CARE unsupported stub → `manual_queue`; no fake public write API |
| Crowd signal | Ward/category ledgers and tables — not chart vanity |
| App X account | @HisabPune digests only; never per-report spam |
| Accountability style | SLA → batch → scorecard; praise closures too |
| Election role | Performance memory for voters, not a campaign tool |
| iOS widget | Snapshot via App Group; significant-location refresh; Live Activity for travel mode |
| iOS location | Debounced ward resolve; no breadcrumb trail by default |
| Doc surfaces | `.session/docs/ARCHITECTURE.md` for system; `.session/docs/DESIGN.md` for visual; `.session/checklist/checklist.json` for build status |
