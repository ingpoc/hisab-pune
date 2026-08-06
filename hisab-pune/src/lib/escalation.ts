import { cityOfficials, mlas, mp } from '../data/cityOfficials';
import { getElectoralWard } from '../data/electoralWards';
import { getWardOffice } from '../data/wardOffices';
import type { Locality, Official } from '../data/types';

/** Build the escalation ladder for a locality, bottom → top. */
export function escalationChain(locality: Locality): Official[] {
  const chain: Official[] = [];
  const office = getWardOffice(locality.wardOfficeId);
  const ward = getElectoralWard(locality.electoralWardId);

  const swm = cityOfficials.find((o) => o.role === 'sanitation');
  if (swm && office) {
    chain.push({
      ...swm,
      id: `san-${locality.id}`,
      title: `Solid Waste · ${office.name}`,
      phone: office.sanitationControlRoom ?? swm.phone,
      note: `Local control room ${office.sanitationControlRoom ?? 'via ward office'}. City SWM: ${swm.name}. Helpline 1800-103-0222.`,
    });
  } else if (swm) {
    chain.push(swm);
  }

  if (office) {
    chain.push({
      id: `wo-${office.id}`,
      name: office.amcName,
      role: 'ward_officer',
      title: `Assistant Municipal Commissioner · ${office.name}`,
      phone: office.phone,
      email: office.email,
      note: office.mobile ? `Mobile ${office.mobile}` : undefined,
      xHandle: 'PMCPune',
      source: 'PMC Ward Offices contact directory',
    });
  }

  if (ward) {
    for (const c of ward.corporators) {
      chain.push({
        id: `corp-${ward.id}-${c.seat}`,
        name: c.name,
        role: 'corporator',
        title: `PMC Corporator · Ward ${ward.id} (${ward.name}) · Seat ${c.seat}`,
        party: c.party,
        source: '2026 PMC election winners (Wikipedia / SEC gazette)',
      });
    }
  }

  const mla = mlas[locality.assemblyId];
  if (mla) chain.push(mla);

  const dyMayor = cityOfficials.find((o) => o.role === 'deputy_mayor');
  if (dyMayor) chain.push(dyMayor);

  const mayor = cityOfficials.find((o) => o.role === 'mayor');
  if (mayor) chain.push(mayor);

  const commissioner = cityOfficials.find((o) => o.role === 'commissioner');
  if (commissioner) chain.push(commissioner);

  chain.push(mp);

  return chain;
}

export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/\b(Shri|Smt|Dr|Adv|Sau)\.?\s*/gi, '')
    .split(/[\s,—-]+/)
    .filter(
      (p) =>
        p &&
        !/^(ias|ips|of|the|pmc|ward|office|deputy|municipal|commissioner)$/i.test(p),
    )
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function avatarHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % 360;
  return h;
}
