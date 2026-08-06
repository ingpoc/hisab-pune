# Hisab — product & system architecture

Guiding light: **transparency + accountability**, without harassment, spam, or reckless escalation.

This is the control document for how Hisab should evolve beyond the current static MVP.

---

## 1. What Hisab is (and is not)

| Is | Is not |
| --- | --- |
| A public ledger of civic failures mapped to **roles + names** | A pile-on / abuse channel |
| Evidence-first (photo + place + time) | Rumour or political campaigning |
| Escalation with **SLA and batching** | Auto-tagging every MLA on every report |
| Voter memory between elections | A substitute for RTI / courts / policing |

North star metrics:

1. **Resolution rate** by ward / MLA / corporator (with time-to-close)
2. **Roster freshness** (% officials with a cited source & effective date)
3. **Election scorecards** published from the same ledger (not separate spin)

---

## 2. Product loop

```text
Citizen reports evidence
        ↓
Moderation (auto + human)
        ↓
Public map + ward ledger (facts only)
        ↓
Private / official channel first (SLA clock starts)
        ↓
If unresolved past SLA → batched public digest (app X + optional citizen share)
        ↓
Close with proof OR mark stale / disputed
        ↓
Aggregate → election scorecard
```

**Principle:** the platform speaks in **aggregates and ledgers**. Individuals speak for themselves when they choose to post.

---

## 3. Who can upload / update what

### Citizens (default: no login for report; optional account later)

**Allowed**

- Live or recent photo of a blackspot (prefer camera capture)
- GPS / map pin
- Short factual note (length-capped)
- “Still there” / “Looks cleaned” follow-ups on an existing report
- Optional: suggest a roster correction **with a source URL**

**Forbidden**

- Abuse, caste/religion bait, threats
- Private home addresses of officials / family
- Personal phone numbers not published as official contact
- Uploading other people’s faces as the primary subject
- Fake “resolved” without photo when claiming cleanup

### Curators / trusted editors (small team + later RWAs)

- Approve / reject reports
- Merge duplicates (same spot within ~50 m)
- Update roster rows (with source + effective dates)
- Confirm resolutions
- Pause escalation for a ward during verified cleanup drives

### System (automated)

- Assign electoral ward from **current** boundary layer
- Attach escalation chain from versioned roster
- Deduplicate, virus/NSFW scan, EXIF sanity checks
- Emit digests on schedule (not per-report spam)

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

Core tables (simplified):

- `boundary_versions` — geo layers with effective dates  
- `wards` — electoral ward id, name, boundary_version_id  
- `offices` — regional ward offices ↔ wards (many-to-many)  
- `officials` — person records  
- `official_roles` — role, ward/office/assembly scope, party, handles, phones, `effective_from/to`, source fields  
- `reports` — geom, ward_id, status, moderation_state, photo_key, note, created_at  
- `report_events` — append-only: created / escalated / reminded / resolved / disputed  
- `escalation_batches` — digests posted to X (who tagged, which reports, text, url)  
- `scorecards` — materialized views by ward / role / election cycle  
- `users` — optional; prefer anonymous reports + separate curator accounts  

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
   “Ward 9 — 7 open blackspots, oldest 11 days. Corporators: … Regional office: …”
2. **SLA breach digests** only after private window expires.
3. **Resolution praise** when cleanup is verified (balance, not only blame).
4. **Election scorecards** (scheduled, sourced, downloadable CSV).

### Hard rate limits (non-negotiable)

- Cap tags per official per day / week (e.g. ≤1 digest mention / day, ≤3 / week).
- Batch many reports into one post.
- Quiet hours (e.g. 22:00–08:00 IST) — no digests.
- Language filter: factual Marathi/English templates only; block abuse terms.
- Prefer tagging **@PMCPune** + relevant role for service issues first; elected reps appear in digests after SLA, not on minute-one.

### Escalation ladder in product (not just UI copy)

1. **T0** Report published on map (public facts, no auto-tags).  
2. **T1 (0–48h)** Citizen can call / email ward office; app shows contacts.  
3. **T2 (48–72h)** Optional single polite template the citizen may send themselves.  
4. **T3 (after SLA, e.g. 7 days open)** Report enters next @HisabPune digest.  
5. **T4 (14–30 days / clusters)** Ward-level or MLA-level weekly scorecard mention.

This protects representatives from death-by-a-thousand-pings **and** protects the project from looking like a troll farm — which is how civic tools get crushed in India.

---

## 7. Safety & political reality

Assume some actors will try to intimidate reporters or the operators.

**Design responses**

- Optional anonymous reporting (no public identity).
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

1. **Incumbent cards** — open days, median time-to-resolve, repeat blackspots, digest count.
2. **Compare wards** under the same MLA / corporator panel.
3. **Downloadable dataset** (CC-BY) for journalists and NGOs — same as NammaKasa’s instinct.
4. Freeze campaigning features: no “vote for X” — only performance facts + sources.
5. Publish methodology weeks before code of conduct windows so it can’t be dismissed as last-minute smear.

Accountability without memory is noise. Memory without fairness is weaponisation. Hisab needs both: **versioned facts** and **bounded speech**.

---

## 9. Suggested build sequence

1. **Now (MVP)** — static roster (2026-verified only) + map + citizen local reports + citizen-owned X intent.  
2. **Backend v1** — Postgres/PostGIS, photo store, moderation queue, versioned roster + **`GET /v1/here`**.  
3. **SLA engine** — timers + curator dashboard.  
4. **@HisabPune digests** — batched, rate-limited, templated.  
5. **iOS app + Home Screen widget** — App Group + significant-location refresh.  
6. **Optional Live Activity “Travel mode”** — while moving across the city.  
7. **Scorecards + CSV** — public analytics.  
8. **Election pack** — incumbent cards, freeze rules, press kit.

---

## 10. Stack recommendation

- Web: Vite/React (current) or Next.js if SSR/SEO for ward pages matters  
- iOS: SwiftUI + WidgetKit (+ ActivityKit for travel mode)  
- DB: Postgres + PostGIS  
- Auth: magic link for curators; optional phone OTP for citizens later  
- Jobs: cron (digest, freshness flags)  
- Storage: R2/S3 + CDN  
- Moderation: Vision SafeSearch + human queue  
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
| Database | Postgres + PostGIS, append-only events, versioned roster |
| Freshness | Source + date on every official field; citizens propose, curators publish |
| User uploads | Evidence + follow-ups only; no private data; no abuse |
| App X account | @HisabPune digests only; never per-report spam |
| Accountability style | SLA → batch → scorecard; praise closures too |
| Election role | Performance memory for voters, not a campaign tool |
| iOS widget | Snapshot via App Group; significant-location refresh; Live Activity for travel mode |
| iOS location | Debounced ward resolve; no breadcrumb trail by default |