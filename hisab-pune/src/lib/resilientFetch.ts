/** Transient gateway statuses typical of a Render Free cold start. */
export const TRANSIENT_HTTP = new Set([502, 503, 504]);

export const RESILIENT_FETCH_DEFAULTS = {
  /** Per-attempt cap. Cold start can exceed this; retries cover the rest. */
  timeoutMs: 12_000,
  /** Total attempts (initial + retries). */
  retries: 4,
  /** Base delay; doubles after each failed attempt (1s, 2s, 4s). */
  backoffMs: 1_000,
} as const;

export type ResilientFetchInit = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

function mergeSignals(timeout: AbortSignal, user?: AbortSignal | null): AbortSignal {
  if (!user) return timeout;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([timeout, user]);
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (user.aborted || timeout.aborted) {
    ctrl.abort();
    return ctrl.signal;
  }
  user.addEventListener('abort', abort, { once: true });
  timeout.addEventListener('abort', abort, { once: true });
  return ctrl.signal;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientStatus(status: number): boolean {
  return TRANSIENT_HTTP.has(status);
}

export class ExhaustedFetchError extends Error {
  constructor(cause?: unknown) {
    super('Hisab is waking or unreachable. Try again in a moment.');
    this.name = 'ExhaustedFetchError';
    if (cause instanceof Error) this.cause = cause;
  }
}

/**
 * fetch() with a per-attempt timeout and retries on network errors / 502–504.
 * Non-transient HTTP statuses (4xx, 500) are returned immediately.
 */
export async function resilientFetch(
  input: string,
  init: ResilientFetchInit = {},
): Promise<Response> {
  const {
    timeoutMs = RESILIENT_FETCH_DEFAULTS.timeoutMs,
    retries = RESILIENT_FETCH_DEFAULTS.retries,
    backoffMs = RESILIENT_FETCH_DEFAULTS.backoffMs,
    fetchImpl = fetch,
    sleep = defaultSleep,
    ...requestInit
  } = init;

  const attempts = Math.max(1, retries);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (requestInit.signal?.aborted) {
      throw requestInit.signal.reason instanceof Error
        ? requestInit.signal.reason
        : new DOMException('Aborted', 'AbortError');
    }

    const timeoutCtrl = new AbortController();
    const timer = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(input, {
        ...requestInit,
        signal: mergeSignals(timeoutCtrl.signal, requestInit.signal),
      });
      if (isTransientStatus(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      lastError = err;
      if (requestInit.signal?.aborted) throw err;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < attempts - 1) {
      await sleep(backoffMs * 2 ** attempt);
    }
  }

  throw lastError instanceof ExhaustedFetchError
    ? lastError
    : new ExhaustedFetchError(lastError);
}
