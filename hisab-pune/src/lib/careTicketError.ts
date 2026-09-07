import { ExhaustedFetchError } from './resilientFetch';

export function readCareErrorText(err: unknown): string {
  if (err instanceof ExhaustedFetchError) return err.message;
  return err instanceof Error ? err.message : '';
}

function parseApiError(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

export function attachTicketErrorMessage(err: unknown): string {
  const raw = readCareErrorText(err);
  const code = parseApiError(raw) ?? raw;
  if (/session required/i.test(code) || (/session/i.test(code) && /required/i.test(code))) {
    return 'A session is required to save a ticket. Try again in a moment.';
  }
  if (/invalid body/i.test(code)) {
    return 'Enter a CARE ticket number (at least 3 characters).';
  }
  return parseApiError(raw) ?? (raw || 'Could not save ticket.');
}
