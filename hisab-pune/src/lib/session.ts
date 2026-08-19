const SESSION_KEY = 'hisab.session';

export type HisabSession = {
  sessionToken: string;
  anonymousPostingId: string;
  publicDisplayId: string | null;
};

export function loadSession(): HisabSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HisabSession;
  } catch {
    return null;
  }
}

export function saveSession(session: HisabSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Ensure a resident session exists (anonymous posting id assigned server-side). */
export async function ensureSession(): Promise<HisabSession> {
  const existing = loadSession();
  if (existing?.sessionToken) return existing;
  const res = await fetch('/v1/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as {
    sessionToken: string;
    anonymousPostingId: string;
    publicDisplayId: string | null;
  };
  const session: HisabSession = {
    sessionToken: data.sessionToken,
    anonymousPostingId: data.anonymousPostingId,
    publicDisplayId: data.publicDisplayId,
  };
  saveSession(session);
  return session;
}

export function sessionHeaders(): HeadersInit {
  const s = loadSession();
  return s ? { 'X-Hisab-Session': s.sessionToken } : {};
}
