import type { Db } from '../db/client.ts';

export type EscalationPerson = {
  id: string;
  name: string;
  role: string;
  shortTitle: string;
  title: string | null;
  party: string | null;
  xHandle: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  sourceLabel: string | null;
  seat?: string | null;
};

const ROLE_ORDER = [
  'sanitation',
  'ward_officer',
  'corporator',
  'mla',
  'deputy_mayor',
  'mayor',
  'commissioner',
  'mp',
] as const;

const SHORT: Record<string, string> = {
  sanitation: 'SWM',
  ward_officer: 'Ward office',
  corporator: 'Corporator',
  mla: 'MLA',
  deputy_mayor: 'Dy Mayor',
  mayor: 'Mayor',
  commissioner: 'Commissioner',
  mp: 'MP',
};

type RoleRow = {
  id: string;
  official_id: string;
  name: string;
  role: string;
  title: string | null;
  party: string | null;
  x_handle: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  source_label: string | null;
  seat: string | null;
  ward_id: number | null;
  office_id: string | null;
  assembly_key: string | null;
};

function mapRow(r: RoleRow): EscalationPerson {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    shortTitle: SHORT[r.role] ?? r.role,
    title: r.title,
    party: r.party,
    xHandle: r.x_handle,
    phone: r.phone,
    email: r.email,
    note: r.note,
    sourceLabel: r.source_label,
    seat: r.seat,
  };
}

/** Active roles only (effective_to IS NULL). */
export async function buildEscalation(
  db: Db,
  opts: { wardId: number; officeId: string; assemblyKey: string },
): Promise<EscalationPerson[]> {
  const active = await db.all<RoleRow>(
    `SELECT r.*, o.name AS name
     FROM official_roles r
     JOIN officials o ON o.id = r.official_id
     WHERE r.effective_to IS NULL`,
  );

  const out: EscalationPerson[] = [];

  const san = active.find((r) => r.role === 'sanitation');
  if (san) out.push(mapRow(san));

  const wo = active.find((r) => r.role === 'ward_officer' && r.office_id === opts.officeId);
  if (wo) out.push(mapRow(wo));

  const corps = active
    .filter((r) => r.role === 'corporator' && r.ward_id === opts.wardId)
    .sort((a, b) => String(a.seat).localeCompare(String(b.seat)));
  for (const c of corps) out.push(mapRow(c));

  const mla = active.find((r) => r.role === 'mla' && r.assembly_key === opts.assemblyKey);
  if (mla) out.push(mapRow(mla));

  for (const role of ['deputy_mayor', 'mayor', 'commissioner', 'mp'] as const) {
    const row = active.find((r) => r.role === role);
    if (row) out.push(mapRow(row));
  }

  out.sort(
    (a, b) =>
      ROLE_ORDER.indexOf(a.role as (typeof ROLE_ORDER)[number]) -
      ROLE_ORDER.indexOf(b.role as (typeof ROLE_ORDER)[number]),
  );
  return out;
}

export function widgetEscalation(full: EscalationPerson[]): EscalationPerson[] {
  const pickRoles = new Set(['ward_officer', 'corporator', 'mla', 'commissioner']);
  const picked: EscalationPerson[] = [];
  for (const p of full) {
    if (!pickRoles.has(p.role)) continue;
    if (p.role === 'corporator' && picked.some((x) => x.role === 'corporator')) continue;
    picked.push(p);
    if (picked.length >= 4) break;
  }
  return picked;
}
