import type { Report, ReportStatus } from '../data/types';

const API = '';

export type HereResponse = {
  locality: { id: string; name: string; zone: string | null };
  ward: { id: number; name: string; matchedByPolygon: boolean };
  escalation: Array<{
    id: string;
    name: string;
    role: string;
    shortTitle: string;
    title: string | null;
    party: string | null;
    xHandle: string | null;
    phone: string | null;
  }>;
  widget: {
    localityName: string;
    wardId: number;
    people: Array<{ role: string; shortTitle: string; name: string }>;
  };
  resolvedAt: string;
  boundaryVersion: string;
};

export type ApiReport = {
  id: string;
  locality_id: string;
  ward_id: number | null;
  lat: number;
  lng: number;
  note: string;
  status: ReportStatus;
  moderation_state: string;
  created_at: string;
  sla_due_at: string | null;
  escalation_eligible_at: string | null;
};

export function toClientReport(r: ApiReport): Report {
  return {
    id: r.id,
    localityId: r.locality_id,
    lat: r.lat,
    lng: r.lng,
    note: r.note,
    status: r.status,
    createdAt: r.created_at,
    source: r.id.startsWith('seed-') ? 'seed' : 'user',
  };
}

export async function fetchHere(lat: number, lng: number): Promise<HereResponse> {
  const res = await fetch(`${API}/v1/here?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchReports(): Promise<Report[]> {
  const res = await fetch(`${API}/v1/reports`);
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { reports: ApiReport[] };
  return data.reports.map(toClientReport);
}

export async function createReport(input: {
  lat: number;
  lng: number;
  note: string;
  localityId?: string;
}): Promise<{ report: Report; here: HereResponse }> {
  const res = await fetch(`${API}/v1/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { report: ApiReport; here: HereResponse };
  return { report: toClientReport(data.report), here: data.here };
}

export type FreshnessSource = {
  id: string;
  title: string;
  url: string;
  usedFor: string;
};

export type Freshness = {
  language: string;
  seededAt: string | null;
  roles: Array<{
    role: string;
    count: number;
    oldestSource: string | null;
    newestSource: string | null;
  }>;
  sources: FreshnessSource[];
};

export async function fetchFreshness(): Promise<Freshness> {
  const res = await fetch(`${API}/v1/freshness`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Freshness>;
}
