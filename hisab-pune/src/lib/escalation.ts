import { cityOfficials, officials } from '../data/officials';
import type { Locality, Official } from '../data/types';

/** Build the escalation ladder for a locality, bottom → top. */
export function escalationChain(locality: Locality): Official[] {
  const chain: Official[] = [];

  const sanitation = officials[locality.sanitationId];
  if (sanitation) chain.push(sanitation);

  const ward = officials[locality.wardOfficerId];
  if (ward) chain.push(ward);

  for (const id of locality.corporatorIds) {
    const c = officials[id];
    if (c) chain.push(c);
  }

  const mla = officials[locality.mlaId];
  if (mla) chain.push(mla);

  const mayor = cityOfficials.find((o: Official) => o.role === 'mayor');
  if (mayor) chain.push(mayor);

  const commissioner = cityOfficials.find((o: Official) => o.role === 'commissioner');
  if (commissioner) chain.push(commissioner);

  const mp = officials[locality.mpId];
  if (mp) chain.push(mp);

  return chain;
}

export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .split(/[\s,—-]+/)
    .filter((p) => p && !/^(ias|ips|dr|shri|smt|of|the|pmc|ward|office)$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Deterministic soft palette from id — no stock photos of real people. */
export function avatarHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % 360;
  return h;
}
