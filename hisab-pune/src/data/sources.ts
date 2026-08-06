/**
 * Data provenance for Hisab Pune seed content.
 * Prefer primary/govt sources; news used where official pages lag.
 */

export const dataSources = [
  {
    id: 'pmc-wards-2026',
    title: '2026 PMC election — ward-wise winners',
    url: 'https://en.wikipedia.org/wiki/2026_Pune_Municipal_Corporation_election',
    usedFor: 'All 41 electoral wards · 165 corporators (names, seats, parties)',
  },
  {
    id: 'opencity-gazette',
    title: 'OpenCity — PMC Election Results 2026 (SEC gazette)',
    url: 'https://data.opencity.in/dataset/pmc-election-results-2026',
    usedFor: 'Cross-check of official gazette / CSV winners',
  },
  {
    id: 'pmc-contacts',
    title: 'PMC Contact Us / Ward Offices directory',
    url: 'https://www.pmc.gov.in/',
    usedFor: '15 ward offices · AMC names, phones, emails · SWM Deputy Commissioner',
  },
  {
    id: 'pmc-sanitation-rooms',
    title: 'PMC sanitation / emergency control rooms',
    url: 'https://www.mypunepulse.com/pune-municipal-corporation-establishes-control-rooms-across-city-for-emergency-and-sanitation-concerns/',
    usedFor: 'Ward-office sanitation control-room numbers',
  },
  {
    id: 'mla-2024',
    title: 'Maharashtra Assembly election 2024 — Pune winners',
    url: 'https://www.hindustantimes.com/india-news/pune-election-2024-results-ajit-pawar-baramati-chandrakant-patil-yugendra-pawar-sharad-pawar-live-updates-latest-news-101732316552705.html',
    usedFor: 'MLA names for Pune city assembly seats',
  },
  {
    id: 'mayor-2026',
    title: 'Mayor / Deputy Mayor election (Feb 2026)',
    url: 'https://www.business-standard.com/india-news/bjp-s-manjusha-nagpure-elected-as-pune-mayor-rpi-a-s-wadekar-dy-mayor-126020900436_1.html',
    usedFor: 'Manjusha Nagpure (Mayor), Parshuram Wadekar (Dy Mayor)',
  },
  {
    id: 'commissioner',
    title: 'PMC Municipal Commissioner (2026 reporting)',
    url: 'https://www.hindustantimes.com/cities/pune-news/pmc-proposes-13-995-crore-budget-with-focus-on-urban-mobility-101773082437226.html',
    usedFor: 'Naval Kishore Ram, IAS',
  },
  {
    id: 'x-handles',
    title: 'Public X accounts',
    url: 'https://x.com/PMCPune',
    usedFor:
      '@PMCPune, @mohol_murlidhar, @ChDadaPatil, @SidShirole, @MDNagpure, @IamBapuPathare, @madhurimisal, @SunilKambleBJP',
  },
] as const;
