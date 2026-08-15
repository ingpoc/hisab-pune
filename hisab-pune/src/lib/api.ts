import type { CategoryId } from '../data/categories';
import type { PublishAs, Report, ReportStatus } from '../data/types';
import { ensureSession, sessionHeaders } from './session';

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
  category_id?: string;
  author_label?: string | null;
  publish_as?: PublishAs;
  gov_ticket_id?: string | null;
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
    categoryId: r.category_id ?? 'solid_waste',
    authorLabel: r.author_label ?? undefined,
    publishAs: r.publish_as ?? 'anonymous',
    govTicketId: r.gov_ticket_id,
  };
}

export async function fetchHere(lat: number, lng: number): Promise<HereResponse> {
  const res = await fetch(`${API}/v1/here?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchReports(opts?: {
  localityId?: string;
  category?: string;
}): Promise<Report[]> {
  const q = new URLSearchParams();
  if (opts?.localityId) q.set('localityId', opts.localityId);
  if (opts?.category) q.set('category', opts.category);
  const qs = q.toString();
  const res = await fetch(`${API}/v1/reports${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { reports: ApiReport[] };
  return data.reports.map(toClientReport);
}

export async function fetchLocalityReports(localityId: string): Promise<Report[]> {
  const res = await fetch(`${API}/v1/localities/${localityId}/reports`);
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { reports: ApiReport[] };
  return data.reports.map(toClientReport);
}

export async function createReport(input: {
  lat: number;
  lng: number;
  note: string;
  localityId?: string;
  categoryId?: CategoryId;
  publishAs?: PublishAs;
}): Promise<{ report: Report; here: HereResponse }> {
  await ensureSession();
  const res = await fetch(`${API}/v1/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...sessionHeaders(),
    },
    body: JSON.stringify({
      ...input,
      categoryId: input.categoryId ?? 'solid_waste',
      publishAs: input.publishAs ?? 'anonymous',
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { report: ApiReport; here: HereResponse };
  return { report: toClientReport(data.report), here: data.here };
}

export type ApiComment = {
  id: string;
  body: string;
  publish_as: PublishAs;
  author_label: string;
  created_at: string;
};

export async function fetchComments(reportId: string): Promise<ApiComment[]> {
  const res = await fetch(`${API}/v1/reports/${reportId}/comments`);
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { comments: ApiComment[] };
  return data.comments;
}

export async function postComment(
  reportId: string,
  body: string,
  publishAs: PublishAs = 'anonymous',
): Promise<ApiComment> {
  await ensureSession();
  const res = await fetch(`${API}/v1/reports/${reportId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...sessionHeaders(),
    },
    body: JSON.stringify({ body, publishAs }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { comment: ApiComment };
  return data.comment;
}

export async function fetchCitySignal() {
  const res = await fetch(`${API}/v1/signal/city`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    byCategory: Array<{
      categoryId: string;
      openCount: number;
      resolvedCount: number;
      total: number;
    }>;
    hotLocalities: Array<{
      localityId: string;
      openCount: number;
      oldestOpen: string;
    }>;
  }>;
}

export async function fetchCareLinks(reportId: string) {
  const res = await fetch(`${API}/v1/reports/${reportId}/escalate-gov`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    result: { ok: false; reason: string; message: string };
    care: { portal: string; whatsapp: string };
  }>;
}

export async function attachGovTicket(reportId: string, externalId: string) {
  await ensureSession();
  const res = await fetch(`${API}/v1/reports/${reportId}/gov-ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...sessionHeaders(),
    },
    body: JSON.stringify({ externalId, channel: 'pmc_care' }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type FreshnessSource = {
  id: string;
  title: string;
  url: string;
  usedFor: string;
};

export type FreshnessRole = {
  role: string;
  count: number;
  oldestSource: string | null;
  newestSource: string | null;
};

export type FreshnessResponse = {
  language: string;
  seededAt: string | null;
  roles: FreshnessRole[];
  sources: FreshnessSource[];
};

export async function fetchFreshness(): Promise<FreshnessResponse> {
  const res = await fetch(`${API}/v1/freshness`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
