# Hisab — Pune civic accountability

Public transparency for who answers when a Pune street stays dirty.

Inspired by [NammaKasa](https://www.nammakasa.in) (Bengaluru), Hisab focuses on:

1. **Locality → escalation ladder** — sanitation desk, ward officer, corporator, MLA, mayor, municipal commissioner, MP  
2. **Action on X** — one-tap drafts that tag public handles (`@PMCPune`, MLA/MP where known)  
3. **Visible ledger** — open / escalated / resolved reports on a city map  

## Run

```bash
cd hisab-pune
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Stack

- Vite + React + TypeScript  
- MapLibre GL + OSM tiles  
- Framer Motion (light entrance motion)  
- Browser `localStorage` for user reports (MVP; no backend yet)

## Data notes

- MLA / MP / Mayor / Commissioner names from public 2024–26 reporting  
- Corporator seats & sanitation supervisors are **placeholders** — replace with live PMC roster  
- Ward numbers / centroids are approximate; production needs official ward KML (e.g. OpenCity / PMC)  
- Official portraits use **initial avatars** (no scraped personal photos)

## Next build steps

- Supabase (or similar) for reports + moderation  
- Exact ward polygons + auto-assignment  
- Verified corporator + sanitation contact sheet  
- Optional community marshal / supervise views  

## Brand

**Hisab** (हिसाब) — reckoning. Who answers for your street?
