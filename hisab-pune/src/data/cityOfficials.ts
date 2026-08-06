import type { Official } from './types';

/**
 * City-wide PMC leadership + SWM desk.
 * Commissioner: Hindustan Times / Pune Pulse (Naval Kishore Ram, active 2026).
 * Mayor / Dy Mayor: PTI / Business Standard Feb 2026.
 * SWM Dy Commissioner: PMC Contact Us directory (Ajeet Deshmukh).
 */
export const cityOfficials: Official[] = [
  {
    id: 'swm-dc',
    name: 'Shri. Ajeet Deshmukh',
    role: 'sanitation',
    title: 'Deputy Commissioner — Solid Waste Management, PMC',
    phone: '9867797017',
    email: 'ajeet.deshmukh@punecorporation.org',
    note: 'City SWM desk. Helpline 1800-103-0222 · Dept 020-25501401 · swm@punecorporation.org',
    source: 'PMC Contact Us directory',
    xHandle: 'PMCPune',
  },
  {
    id: 'mayor-mn',
    name: 'Manjusha Deepak Nagpure',
    role: 'mayor',
    title: 'Mayor, Pune Municipal Corporation',
    party: 'BJP',
    xHandle: 'MDNagpure',
    note: 'Elected unopposed Feb 2026. Corporator, Ward 35 (Suncity–Manikbaug).',
    source: 'PTI / Business Standard, Feb 2026',
  },
  {
    id: 'dy-mayor-pw',
    name: 'Parshuram Balkrishna Wadekar',
    role: 'deputy_mayor',
    title: 'Deputy Mayor, Pune Municipal Corporation',
    party: 'RPI(A)',
    note: 'Elected Feb 2026. Corporator, Ward 8 (Aundh–Bopodi).',
    source: 'PTI / Business Standard, Feb 2026',
  },
  {
    id: 'comm-nk',
    name: 'Naval Kishore Ram, IAS',
    role: 'commissioner',
    title: 'Municipal Commissioner, PMC',
    xHandle: 'PMCPune',
    phone: '020-25501100',
    note: 'Executive head. Tag @PMCPune for official grievances.',
    source: 'Hindustan Times / Pune Pulse, 2026',
  },
];

export const mlas: Record<string, Official> = {
  'mla-kothrud': {
    id: 'mla-kothrud',
    name: 'Chandrakant (Dada) Bachhu Patil',
    role: 'mla',
    title: 'MLA — Kothrud',
    party: 'BJP',
    xHandle: 'ChDadaPatil',
    source: 'Maharashtra Assembly election 2024 · X @ChDadaPatil',
  },
  'mla-shivaji': {
    id: 'mla-shivaji',
    name: 'Siddharth Anil Shirole',
    role: 'mla',
    title: 'MLA — Shivajinagar',
    party: 'BJP',
    xHandle: 'SidShirole',
    source: 'Maharashtra Assembly election 2024 · X @SidShirole',
  },
  'mla-vadgaon': {
    id: 'mla-vadgaon',
    name: 'Bapusaheb Tukaram Pathare',
    role: 'mla',
    title: 'MLA — Vadgaon Sheri',
    party: 'NCP (SP)',
    xHandle: 'IamBapuPathare',
    source: 'Maharashtra Assembly election 2024 · X @IamBapuPathare',
  },
  'mla-parvati': {
    id: 'mla-parvati',
    name: 'Madhuri Satish Misal',
    role: 'mla',
    title: 'MLA — Parvati · MoS Urban Development',
    party: 'BJP',
    xHandle: 'madhurimisal',
    source: 'Maharashtra Assembly election 2024 · X @madhurimisal',
  },
  'mla-kasba': {
    id: 'mla-kasba',
    name: 'Hemant Narayan Rasane',
    role: 'mla',
    title: 'MLA — Kasba Peth',
    party: 'BJP',
    source: 'Maharashtra Assembly election 2024 (Indian Express winners list)',
  },
  'mla-cantonment': {
    id: 'mla-cantonment',
    name: 'Sunil Dyandev Kamble',
    role: 'mla',
    title: 'MLA — Pune Cantonment',
    party: 'BJP',
    xHandle: 'SunilKambleBJP',
    source: 'Maharashtra Assembly election 2024 · tagged as @SunilKambleBJP',
  },
  'mla-hadapsar': {
    id: 'mla-hadapsar',
    name: 'Chetan Vitthal Tupe',
    role: 'mla',
    title: 'MLA — Hadapsar',
    party: 'NCP',
    source: 'Maharashtra Assembly election 2024 (Hindustan Times)',
  },
  'mla-khadakwasla': {
    id: 'mla-khadakwasla',
    name: 'Bhimrao Dhondiba Tapkir',
    role: 'mla',
    title: 'MLA — Khadakwasla',
    party: 'BJP',
    source: 'Maharashtra Assembly election 2024 (Hindustan Times)',
  },
};

export const mp: Official = {
  id: 'mp-mm',
  name: 'Murlidhar Mohol',
  role: 'mp',
  title: 'Member of Parliament — Pune Lok Sabha',
  party: 'BJP',
  xHandle: 'mohol_murlidhar',
  source: 'Lok Sabha 2024 · X @mohol_murlidhar',
};

export const roleLabels: Record<Official['role'], string> = {
  sanitation: 'Solid waste desk',
  ward_officer: 'Ward officer (AMC)',
  corporator: 'Corporator',
  mla: 'MLA',
  mayor: 'Mayor',
  deputy_mayor: 'Deputy Mayor',
  commissioner: 'Commissioner',
  mp: 'MP',
};

export const roleOrder: Official['role'][] = [
  'sanitation',
  'ward_officer',
  'corporator',
  'mla',
  'deputy_mayor',
  'mayor',
  'commissioner',
  'mp',
];
