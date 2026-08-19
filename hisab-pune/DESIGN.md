# Hisab — DESIGN.md

Owner of **product design language** for web (and the iOS scaffold when it shares surfaces).  
`ARCHITECTURE.md` owns product/system rules. This file owns what people see, when, and why.

**Language:** English only.

---

## 1. Theses

**Design thesis:** Hisab is a **daylight civic reckoning ledger** — streets as proof, ink on paper, one vermillion for action, status never competing with brand.

**Experience thesis:** Show every visitor the same **orientation facts** immediately; reveal **pressure tools** (contacts, drafts, CARE) only when they ask. Different people hunt different depths; nobody should drown in the ladder on first glance.

**Visual axes:** restrained · clinical-warm lean · utilitarian with editorial place names · medium density · serious · familiar map+panel with novel ledger voice.

**Concept mockups (acceptance reference):** `.review/uiux-019b7c3/mockups/` (web) and `…/mockups/ios/` (iOS).

---

## 2. Inspiration boundary (NammaKasa)

Studied: [NammaKasa report detail](https://www.nammakasa.in/report/1480b7d1-4800-434e-b383-ae88501718dd) (map + report sheet + accountability + tap-for-contact).

| Take as pattern (not look) | Do not copy |
| --- | --- |
| Evidence + place + status before contacts | Soft rounded “consumer app” chrome, blue action chips, logo lockups |
| Accountability as a **named block** with roles; **contacts on demand** | Dumping full phone/email/X for every rung at once |
| Map stays **context** while a report is in focus | Garbage-only product framing and severity taxonomy we don’t own |
| Compact **fact strip** (age / category / crowd signal) | Leaderboard / gamification as primary UI |
| Clear citizen verbs near the focus (verify / escalate / flag) | Centered modal as the only detail pattern |

Hisab’s differentiators that the UI must express: **multi-category civic issues**, **anonymous-by-default authorship**, **sourced Pune roster ladder**, **open/closed ledger**, fail-closed CARE (no fake write API).

---

## 3. Disclosure model (law)

Every surface classifies content into exactly one of three layers.

### L0 — Always visible (orientation)

Must be readable without tap/expand for the current place or report. Same for every visitor.

| Fact | Why |
| --- | --- |
| **Where** — locality name + ward cue | Orientation |
| **Ledger pulse** — open count · closed count (or single-issue status pill) | Truth of the street |
| **What** — category + short note (when a report is selected) | Evidence without opening tools |
| **Age / unresolved duration** (when a report is selected) | Urgency without chart junk |
| **Brand + primary path** — Hisab mark; Report / escalate entry | Action is never hidden behind nav archaeology |

Photo: show thumbnail or hero **when present**; do not invent empty media chrome.

### L1 — Progressive disclosure (pressure tools)

Collapsed by default; one clear affordance to open. Mount heavy UI only when open.

| Content | Default | Open when |
| --- | --- | --- |
| Full **escalation contacts** | Right ledger: one summary button. Open → **left rail** (map shrinks). Per contact: role + name + one phone/X; title, note, source behind “More details” | User needs who to pressure |
| **Draft for X** / compose | Hidden behind “Edit draft” or escalate | User is acting |
| **PMC CARE** links + paste ticket | Behind “Get CARE links” / ticket field | User is filing gov ticket |
| **Comments** thread | Collapsed or locality-page deep link | User is following up |
| Roster **sources** / footnotes | Secondary text or expand | User is auditing trust |
| Ward polygons / map legend detail | Map chrome, not sidebar essay | Spatial curiosity |

### L2 — Deep / elsewhere

How it works, wards directory, scorecards — linked from nav, not stuffed into the map sidebar. Place drill-in stays on **map + side ledger** (`/map?loc=`).

**Rule:** If removing a block would still leave a stranger knowing *where*, *how bad*, and *what happened*, that block was L1/L2 — not L0.

---

## 4. Surface contracts

### 4.1 Map + locality selected (`/map?loc=`)

**Job:** Ledger of this place, with map as spatial proof.

| Zone | Layer | Budget |
| --- | --- | --- |
| Compact locality head (name, ward meta, open·closed) | L0 | ~15% sidebar |
| Open / Closed issue list | L0 | Primary; height capped — short lists stay short |
| Selected issue strip (note, status, Escalate) | L0 when selected; absent otherwise | ~15% |
| Escalation route (opens left rail) | L1 | One button in right ledger when closed; left rail + compressed map when open |
| Edit draft / CARE | L1 | Only under selected issue |
| **Report in {locality}** | L0 action | Opens report modal for this place |

Do **not** auto-expand the ladder on locality select. Do **not** show Tweet compose until escalate or explicit edit. Do **not** send people to a separate full locality page — map ledger is the place surface.

### 4.2 Single report in focus (map pin or list select)

**Job:** One issue’s truth, then optional pressure.

L0: status · category · note · age · author label (anonymous id) · Escalate CTA.  
L1: draft, CARE, full ladder, comments.  
Photo if any sits in L0 (proof).

### 4.3 Locality URLs (`/locality/:id`)

**Redirect only** → `/map?loc=:id`. Kept so old links and graders still resolve. Directory and wards link straight to the map ledger.

### 4.4 Home

**Job:** Brand-first, one search, one report path. No stats strips, no ladder, no issue lists in the first viewport.

### 4.5 Report modal

**Job:** Capture only. Category chips → location (prefer map locality) → note → photo optional → **Publish report**. Escalation happens **after** pin, on the map/locality surface — not inside the modal.

### 4.6 iOS (daylight parity)

Tabs: **Here** · **Map** · **Report** · **Localities** · **About**.

| Screen | L0 | L1 |
| --- | --- | --- |
| Here | Place, open·closed, issue list, who-answers preview | Full escalation, issue detail |
| Map | Search + locality sheet | Issue detail, escalation |
| Report | Capture form | Success confirm |
| Localities | Directory + open counts | Locality ledger |
| Issue detail | Note, status, age, Escalate | Escalation, CARE sheet |
| Widget | Locality + ward (+ open on placeholder) | — |
| Live Activity | Deferred (About toggle remembers intent) | ActivityKit next |

Same tokens/philosophy as web §5.

---

## 5. Visual system (Hisab, not NammaKasa)

Daylight ledger tokens — treat as frozen unless this file changes:

| Token | Role |
| --- | --- |
| `--ink` `#0E1C18` / `--paper` `#F4F6F4` | Text and daylight ground — not dark hero, not cream terracotta |
| `--brand` / `--alert` `#C62828` | Brand mark + **primary action only** (Report, Escalate) |
| `--signal` | Escalated **outline** cue only — never a second CTA fill competing with brand |
| `--ok` | Resolved / closed outline |
| `--font-display` (Bricolage Grotesque) | Place names, brand, section titles |
| `--font-body` (IBM Plex Sans) | UI, notes, meta |
| `--radius: 6px` | Sharp civic, not pill-soft |

**Composition**

- **Daylight first:** home and app chrome stay paper/ink; map uses a light basemap.
- Map + **side ledger** is the default drill-in (not a floating soft modal clone).
- Cards only when they bound a selectable issue or an official contact — not decorative wrappers.
- Status via **outline pills** (`open` / `escalated` / `resolved`) — not solid red fills that fight the brand.
- **One Report path** in the chrome (nav / tab). No floating map FAB duplicate.
- Motion: short GSAP enters for hierarchy; never delay L0 facts behind animation.

**Anti-patterns (reject in review)**

- Dark-mode hero voids; purple / cream / broadsheet clichés; glow stacks; emoji as UI.
- Dual accent CTAs (orange + red) or solid-red status + solid-red Report everywhere.
- Full ladder + tweet preview + CARE + comments all expanded on locality open.
- Nav CTA that says “garbage” when the product is multi-issue.
- Fake “integrated CARE” success states.

---

## 6. Interaction rules

1. **Select place → see ledger.** Selecting a locality clears report focus so Open/Closed list is primary.
2. **Select issue → add L0 strip;** do not auto-open L1.
3. **Escalate** may open X immediately; draft editor stays L1.
4. **One expand at a time** preferred in the sidebar (ladder *or* draft), not both fighting for height.
5. Dense lists scroll inside a **capped** region; the page/sidebar does not grow without bound.
6. Empty states are one line (“No open issues here yet”) — not illustrations.

---

## 7. Trust & accessibility

- Anonymous posting id is the default public author; never leak account identifiers in UI.
- Official contacts must remain attributable (source on locality/full ladder surfaces).
- Keyboard: tabs for Open/Closed; disclosure controls expose `aria-expanded`; map is supplementary to the list.
- Contrast: alert/signal text on paper meets readable contrast; don’t put red text on red pills.

---

## 8. Decision status

| Decision | Status | Note |
| --- | --- | --- |
| Ledger-first disclosure model (L0/L1/L2) | **confirmed** | This request + shipped map panel direction |
| Visual tokens (daylight ink/paper/brand) | **confirmed** | Mockup round `uiux-019b7c3`; shipping `global.css` + iOS AccentColor |
| Map side ledger (not NammaKasa modal clone) | **confirmed** | Fits Hisab map IA |
| Multi-category + anonymous default | **confirmed** | `ARCHITECTURE.md` |
| Crowd “I’ve seen this” / severity | **deferred** | Not in current product scope |
| Exact mobile stacking (map above vs sheet) | **inferred** | Map then ledger stack under 960px; revisit if field tests fail |

---

## 9. Acceptance checks (agents)

Before calling a UI “done”:

1. Stranger test: with L1 closed, can they answer *where / open vs closed / what issue* if one is selected?
2. Overwhelm test: on locality open, is the ladder collapsed and draft hidden?
3. Brand test: first viewport still reads Hisab, not a generic civic dashboard.
4. Differentiation test: would a screenshot be mistaken for NammaKasa after swapping the logo? If yes, fail.
5. Capture proof for visual claims — build alone is not enough.

---

## 10. Handoff map

| Journey | L0 | L1 |
| --- | --- | --- |
| Find place | Search → map locality head + counts | — |
| Scan issues | Open/Closed list | — |
| Act on one issue | Note, status, Escalate | Draft, CARE, ladder contacts |
| Understand who | Summary “N contacts” | Expanded ladder |
| Learn product | How link | How page |

When implementing or regressing UI, load this file first and treat §3–§5 as blocking.
