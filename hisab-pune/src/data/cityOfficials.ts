import type { Official } from './types';

/**
 * City leadership verified in 2026 reporting only.
 * SWM: TOI / Punekar News (Mar 2026) — Avinash Sakpal heads SWM.
 * Mayor / Dy Mayor: PTI Feb 2026.
 * Commissioner: HT / Pune Pulse 2026 — Naval Kishore Ram.
 */
export const cityOfficials: Official[] = [
  {
    id: 'swm-dc',
    name: 'Avinash Sakpal',
    role: 'sanitation',
    title: 'Deputy Commissioner & Head — Solid Waste Management, PMC',
    phone: '1800-103-0222',
    email: 'swm@punecorporation.org',
    note: 'City SWM head (reported Mar 2026). Helpline 1800-103-0222 · Tag @PMCPune.',
    source: 'Times of India / Punekar News, Mar 2026',
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
    note: 'Executive head (active 2026). Tag @PMCPune for official grievances.',
    source: 'Hindustan Times / Pune Pulse, 2026',
  },
];

/** Sitting MLAs for Pune city seats (15th Maharashtra Assembly, elected 2024 — current as of 2026). */
export const mlas: Record<string, Official> = {
  'mla-kothrud': {
    id: 'mla-kothrud',
    name: 'Chandrakant (Dada) Bachhu Patil',
    role: 'mla',
    title: 'MLA — Kothrud',
    party: 'BJP',
    xHandle: 'ChDadaPatil',
    source: 'Maharashtra Assembly 2024 (sitting) · X @ChDadaPatil',
  },
  'mla-shivaji': {
    id: 'mla-shivaji',
    name: 'Siddharth Anil Shirole',
    role: 'mla',
    title: 'MLA — Shivajinagar',
    party: 'BJP',
    xHandle: 'SidShirole',
    source: 'Maharashtra Assembly 2024 (sitting) · X @SidShirole',
  },
  'mla-vadgaon': {
    id: 'mla-vadgaon',
    name: 'Bapusaheb Tukaram Pathare',
    role: 'mla',
    title: 'MLA — Vadgaon Sheri',
    party: 'NCP (SP)',
    xHandle: 'IamBapuPathare',
    source: 'Maharashtra Assembly 2024 (sitting) · X @IamBapuPathare',
  },
  'mla-parvati': {
    id: 'mla-parvati',
    name: 'Madhuri Satish Misal',
    role: 'mla',
    title: 'MLA — Parvati · MoS Urban Development',
    party: 'BJP',
    xHandle: 'madhurimisal',
    source: 'Maharashtra Assembly 2024 (sitting) · X @madhurimisal',
  },
  'mla-kasba': {
    id: 'mla-kasba',
    name: 'Hemant Narayan Rasane',
    role: 'mla',
    title: 'MLA — Kasba Peth',
    party: 'BJP',
    source: 'Maharashtra Assembly 2024 (sitting)',
  },
  'mla-cantonment': {
    id: 'mla-cantonment',
    name: 'Sunil Dyandev Kamble',
    role: 'mla',
    title: 'MLA — Pune Cantonment',
    party: 'BJP',
    xHandle: 'SunilKambleBJP',
    source: 'Maharashtra Assembly 2024 (sitting) · X @SunilKambleBJP',
  },
  'mla-hadapsar': {
    id: 'mla-hadapsar',
    name: 'Chetan Vitthal Tupe',
    role: 'mla',
    title: 'MLA — Hadapsar',
    party: 'NCP',
    source: 'Maharashtra Assembly 2024 (sitting)',
  },
  'mla-khadakwasla': {
    id: 'mla-khadakwasla',
    name: 'Bhimrao Dhondiba Tapkir',
    role: 'mla',
    title: 'MLA — Khadakwasla',
    party: 'BJP',
    source: 'Maharashtra Assembly 2024 (sitting)',
  },
};

export const mp: Official = {
  id: 'mp-mm',
  name: 'Murlidhar Mohol',
  role: 'mp',
  title: 'Member of Parliament — Pune Lok Sabha',
  party: 'BJP',
  xHandle: 'mohol_murlidhar',
  source: 'Lok Sabha 2024 (sitting) · X @mohol_murlidhar',
};

export const roleLabels: Record<Official['role'], string> = {
  sanitation: 'Solid waste desk',
  ward_officer: 'Regional ward office',
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
