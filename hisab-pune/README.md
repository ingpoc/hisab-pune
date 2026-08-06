# Hisab — Pune civic accountability

Public transparency for who answers when a Pune street stays dirty.

Inspired by [NammaKasa](https://www.nammakasa.in) (Bengaluru), Hisab focuses on:

1. **Locality → escalation ladder** — SWM desk, ward-office AMC, all corporators, MLA, dy mayor, mayor, commissioner, MP  
2. **Action on X** — one-tap drafts tagging public handles  
3. **Visible ledger** — open / escalated / resolved reports on a city map  

## Run

```bash
cd hisab-pune
npm install
npm run dev
```

## Data (filled from public sources)

| Layer | Count / detail | Primary source |
| --- | --- | --- |
| Electoral wards | 41 | Wikipedia 2026 PMC election |
| Corporators | 165 | Same (+ OpenCity SEC gazette) |
| Ward offices / AMCs | 15 | PMC Contact Us directory |
| Localities | 30 | Mapped to 2026 ward names |
| MLA / MP / Mayor | City seats | 2024 Assembly + Feb 2026 mayor polls |
| Commissioner | Naval Kishore Ram, IAS | HT / Pune Pulse 2026 |
| SWM | Dy Commissioner Ajeet Deshmukh | PMC Contact Us |
| X handles | Where publicly known | Linked from news / profiles |

See in-app **How it works → Sources** for URLs.

## Stack

Vite + React + TypeScript · MapLibre GL · Framer Motion · `localStorage` reports (MVP)

## Brand

**Hisab** — reckoning. Who answers for your street?
