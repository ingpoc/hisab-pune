import { ExhaustedFetchError } from './resilientFetch';

function parseApiError(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

function rawErrorText(err: unknown): string {
  if (err instanceof ExhaustedFetchError) return err.message;
  return err instanceof Error ? err.message : '';
}

export function loadCommentsErrorMessage(err: unknown): string {
  if (err instanceof ExhaustedFetchError) return err.message;
  return 'Could not load comments. Try again.';
}

export function postCommentErrorMessage(err: unknown): string {
  if (err instanceof ExhaustedFetchError) return err.message;
  const raw = rawErrorText(err);
  const code = parseApiError(raw) ?? raw;
  if (/session required/i.test(code) || (/session/i.test(code) && /required/i.test(code))) {
    return 'Could not start a session. Try again in a moment.';
  }
  if (/invalid body/i.test(code)) {
    return 'Write a comment (2–400 characters).';
  }
  return 'Could not post comment. Try again.';
}
