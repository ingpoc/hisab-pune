import type { WardOffice } from './types';

/**
 * 15 regional ward offices after the Jan 2026 PMC election ward-committee order
 * (Commissioner Naval Kishore Ram). Source: TheKarbhari report of the order —
 * maps each office to electoral wards. Named AMC postings were ordered to be
 * issued separately; do not invent officer names from stale directories.
 */
export const wardOffices: Record<string, WardOffice> = {
  'nagar-road-kalas': {
    id: 'nagar-road-kalas',
    name: 'Nagar Road–Kalas–Lohegaon Regional Office',
    electoralWardIds: [1, 2, 3],
    zone: 1,
    phone: '1800-103-0222',
    note: 'Circle 1. AMC name: verify current posting on pmc.gov.in',
  },
  'yerwada-viman-wagholi': {
    id: 'yerwada-viman-wagholi',
    name: 'Yerwada–Viman Nagar–Wagholi Regional Office',
    electoralWardIds: [4, 5, 6],
    zone: 1,
    phone: '1800-103-0222',
    note: 'Circle 1. AMC name: verify current posting on pmc.gov.in',
  },
  'dhole-patil': {
    id: 'dhole-patil',
    name: 'Dhole Patil Road Regional Office',
    electoralWardIds: [13, 14],
    zone: 1,
    phone: '1800-103-0222',
    note: 'Circle 1. AMC name: verify current posting on pmc.gov.in',
  },
  'ghole-road': {
    id: 'ghole-road',
    name: 'Chhatrapati Shivajinagar–Ghole Road Regional Office',
    electoralWardIds: [7, 12, 29],
    zone: 2,
    phone: '1800-103-0222',
    note: 'Circle 2. AMC name: verify current posting on pmc.gov.in',
  },
  'aundh-baner': {
    id: 'aundh-baner',
    name: 'Aundh–Baner Regional Office',
    electoralWardIds: [8, 9],
    zone: 2,
    phone: '1800-103-0222',
    note: 'Circle 2. AMC name: verify current posting on pmc.gov.in',
  },
  'kothrud-bavdhan': {
    id: 'kothrud-bavdhan',
    name: 'Kothrud–Bavdhan Regional Office',
    electoralWardIds: [10, 11, 31],
    zone: 2,
    phone: '1800-103-0222',
    note: 'Circle 2. AMC name: verify current posting on pmc.gov.in',
  },
  'warje-karvenagar': {
    id: 'warje-karvenagar',
    name: 'Warje–Karvenagar Regional Office',
    electoralWardIds: [30, 32],
    zone: 3,
    phone: '1800-103-0222',
    note: 'Circle 3. AMC name: verify current posting on pmc.gov.in',
  },
  sinhgad: {
    id: 'sinhgad',
    name: 'Sinhgad Road Regional Office',
    electoralWardIds: [28, 33, 34, 35],
    zone: 3,
    phone: '1800-103-0222',
    note: 'Circle 3. AMC name: verify current posting on pmc.gov.in',
  },
  'dhankawadi-ambegaon': {
    id: 'dhankawadi-ambegaon',
    name: 'Dhankawadi–Ambegaon Regional Office',
    electoralWardIds: [36, 37, 38],
    zone: 3,
    phone: '1800-103-0222',
    note: 'Circle 3. AMC name: verify current posting on pmc.gov.in',
  },
  'kondhwa-undri': {
    id: 'kondhwa-undri',
    name: 'Kondhwa–Undri Regional Office',
    electoralWardIds: [39, 40, 41],
    zone: 4,
    phone: '1800-103-0222',
    note: 'Circle 4. AMC name: verify current posting on pmc.gov.in',
  },
  'hadapsar-manjari': {
    id: 'hadapsar-manjari',
    name: 'Hadapsar–Manjari Regional Office',
    electoralWardIds: [15, 16, 17],
    zone: 4,
    phone: '1800-103-0222',
    note: 'Circle 4. AMC name: verify current posting on pmc.gov.in',
  },
  'wanawadi-ramtekdi': {
    id: 'wanawadi-ramtekdi',
    name: 'Wanawadi–Ramtekdi Regional Office',
    electoralWardIds: [18, 19],
    zone: 4,
    phone: '1800-103-0222',
    note: 'Circle 4. AMC name: verify current posting on pmc.gov.in',
  },
  bibwewadi: {
    id: 'bibwewadi',
    name: 'Bibwewadi Regional Office',
    electoralWardIds: [20, 21, 22],
    zone: 5,
    phone: '1800-103-0222',
    note: 'Circle 5. AMC name: verify current posting on pmc.gov.in',
  },
  'kasba-peth': {
    id: 'kasba-peth',
    name: 'Kasba Peth Regional Office',
    electoralWardIds: [23, 24],
    zone: 5,
    phone: '1800-103-0222',
    note: 'Circle 5. AMC name: verify current posting on pmc.gov.in',
  },
  vishrambagwada: {
    id: 'vishrambagwada',
    name: 'Vishrambagwada Regional Office',
    electoralWardIds: [25, 26, 27],
    zone: 5,
    phone: '1800-103-0222',
    note: 'Circle 5. AMC name: verify current posting on pmc.gov.in',
  },
};

export function getWardOffice(id: string): WardOffice | undefined {
  return wardOffices[id];
}

export function wardOfficeForElectoralWard(wardId: number): WardOffice | undefined {
  return Object.values(wardOffices).find((o) => o.electoralWardIds.includes(wardId));
}
