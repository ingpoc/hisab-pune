import { seedReports } from '../data/seedReports';
import type { Report } from '../data/types';

const KEY = 'hisab-pune-reports-v1';

export function loadReports(): Report[] {
  try {
    const raw = localStorage.getItem(KEY);
    const user: Report[] = raw ? JSON.parse(raw) : [];
    const ids = new Set(user.map((r) => r.id));
    return [...user, ...seedReports.filter((s) => !ids.has(s.id))];
  } catch {
    return [...seedReports];
  }
}

export function saveUserReport(report: Report): void {
  const raw = localStorage.getItem(KEY);
  const user: Report[] = raw ? JSON.parse(raw) : [];
  user.unshift(report);
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function updateReportStatus(id: string, status: Report['status']): Report[] {
  const all = loadReports();
  const next = all.map((r) => (r.id === id ? { ...r, status } : r));
  const userOnly = next.filter((r) => r.source === 'user');
  localStorage.setItem(KEY, JSON.stringify(userOnly));
  // Persist status overrides for seed items too
  const overrides = next
    .filter((r) => r.source === 'seed')
    .map((r) => ({ id: r.id, status: r.status }));
  localStorage.setItem(`${KEY}-overrides`, JSON.stringify(overrides));
  return applyOverrides(next);
}

function applyOverrides(reports: Report[]): Report[] {
  try {
    const raw = localStorage.getItem(`${KEY}-overrides`);
    if (!raw) return reports;
    const overrides: { id: string; status: Report['status'] }[] = JSON.parse(raw);
    const map = new Map(overrides.map((o) => [o.id, o.status]));
    return reports.map((r) => (map.has(r.id) ? { ...r, status: map.get(r.id)! } : r));
  } catch {
    return reports;
  }
}

export function loadReportsWithOverrides(): Report[] {
  return applyOverrides(loadReports());
}
