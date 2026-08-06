/**
 * Data provenance — 2026-current sources only.
 * Stale PMC contact directories (pre-Naval Kishore Ram) are intentionally unused
 * for named AMC / SWM officers.
 */

export const dataSources = [
  {
    id: 'pmc-wards-2026',
    title: '2026 PMC election — ward-wise winners',
    url: 'https://en.wikipedia.org/wiki/2026_Pune_Municipal_Corporation_election',
    usedFor: '41 electoral wards · 165 corporators (Jan 2026)',
  },
  {
    id: 'opencity-gazette',
    title: 'OpenCity — PMC Election Results 2026 (SEC gazette)',
    url: 'https://data.opencity.in/dataset/pmc-election-results-2026',
    usedFor: 'Cross-check of official gazette winners',
  },
  {
    id: 'ward-boundaries-2025',
    title: 'OpenCity — PMC Electoral Wards 2025 (final_41wardboundary)',
    url: 'https://data.opencity.in/dataset/pune-wards-info',
    usedFor:
      'Ward polygons used for the Jan 2026 PMC general election (41 wards)',
  },
  {
    id: 'ward-offices-2026',
    title: 'PMC ward-committee / regional office order (post Jan 2026)',
    url: 'https://thekarbhari.com/pmc-ward-committee-ward-committees-circles-and-regional-offices-attached-to-them-established-as-per-ward-structure-order-issued-by-municipal-commissioner/',
    usedFor:
      '15 regional offices ↔ electoral wards (AMC name postings issued separately)',
  },
  {
    id: 'swm-2026',
    title: 'SWM head — Avinash Sakpal (Mar 2026 reporting)',
    url: 'https://timesofindia.indiatimes.com/city/pune/mechanised-waste-collection-new-segregation-rules-take-centre-stage-at-wadgaonsheri-civic-meet/articleshow/128923509.cms',
    usedFor: 'Deputy Commissioner & Head, Solid Waste Management',
  },
  {
    id: 'mla-sitting',
    title: 'Sitting MLAs — 15th Maharashtra Assembly (elected 2024)',
    url: 'https://www.hindustantimes.com/india-news/pune-election-2024-results-ajit-pawar-baramati-chandrakant-patil-yugendra-pawar-sharad-pawar-live-updates-latest-news-101732316552705.html',
    usedFor: 'Current MLAs for Pune city seats (term ongoing in 2026)',
  },
  {
    id: 'mayor-2026',
    title: 'Mayor / Deputy Mayor (Feb 2026)',
    url: 'https://www.business-standard.com/india-news/bjp-s-manjusha-nagpure-elected-as-pune-mayor-rpi-a-s-wadekar-dy-mayor-126020900436_1.html',
    usedFor: 'Manjusha Nagpure · Parshuram Wadekar',
  },
  {
    id: 'commissioner',
    title: 'Municipal Commissioner Naval Kishore Ram (2026)',
    url: 'https://www.hindustantimes.com/cities/pune-news/pmc-proposes-13-995-crore-budget-with-focus-on-urban-mobility-101773082437226.html',
    usedFor: 'PMC Municipal Commissioner',
  },
  {
    id: 'x-handles',
    title: 'Public X accounts',
    url: 'https://x.com/PMCPune',
    usedFor:
      '@PMCPune, @mohol_murlidhar, @ChDadaPatil, @SidShirole, @MDNagpure, @IamBapuPathare, @madhurimisal, @SunilKambleBJP',
  },
] as const;
