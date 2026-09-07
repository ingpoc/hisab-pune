import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExhaustedFetchError, resilientFetch } from './resilientFetch.ts';

function jsonOk(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function status(code: number): Response {
  return new Response(`HTTP ${code}`, { status: code });
}

const noSleep = async () => {};

describe('resilientFetch', () => {
  it('returns a successful response on the first attempt', async () => {
    let calls = 0;
    const res = await resilientFetch('/health', {
      fetchImpl: async () => {
        calls += 1;
        return jsonOk();
      },
      sleep: noSleep,
    });
    assert.equal(res.status, 200);
    assert.equal(calls, 1);
  });

  it('retries 503 then succeeds', async () => {
    let calls = 0;
    const delays: number[] = [];
    const res = await resilientFetch('/v1/reports', {
      fetchImpl: async () => {
        calls += 1;
        if (calls < 3) return status(503);
        return jsonOk();
      },
      retries: 4,
      backoffMs: 10,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    assert.equal(res.status, 200);
    assert.equal(calls, 3);
    assert.deepEqual(delays, [10, 20]);
  });

  it('retries 502 and 504', async () => {
    const codes = [502, 504];
    let i = 0;
    const res = await resilientFetch('/health', {
      fetchImpl: async () => {
        const code = codes[i];
        i += 1;
        if (code) return status(code);
        return jsonOk();
      },
      sleep: noSleep,
    });
    assert.equal(res.status, 200);
    assert.equal(i, 3);
  });

  it('retries network failures then succeeds', async () => {
    let calls = 0;
    const res = await resilientFetch('/health', {
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) throw new TypeError('Failed to fetch');
        return jsonOk();
      },
      sleep: noSleep,
    });
    assert.equal(res.ok, true);
    assert.equal(calls, 2);
  });

  it('retries when the attempt times out', async () => {
    let calls = 0;
    const res = await resilientFetch('/health', {
      timeoutMs: 30,
      retries: 2,
      fetchImpl: async (_input, init) => {
        calls += 1;
        if (calls === 1) {
          await new Promise<never>((_, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            });
          });
        }
        return jsonOk();
      },
      sleep: noSleep,
    });
    assert.equal(res.ok, true);
    assert.equal(calls, 2);
  });

  it('does not retry 400', async () => {
    let calls = 0;
    const res = await resilientFetch('/v1/here', {
      fetchImpl: async () => {
        calls += 1;
        return status(400);
      },
      sleep: noSleep,
    });
    assert.equal(res.status, 400);
    assert.equal(calls, 1);
  });

  it('throws after exhausting transient failures', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        resilientFetch('/health', {
          retries: 3,
          fetchImpl: async () => {
            calls += 1;
            return status(503);
          },
          sleep: noSleep,
        }),
      (err: unknown) => err instanceof ExhaustedFetchError,
    );
    assert.equal(calls, 3);
  });

  it('does not retry when the caller aborts', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    let calls = 0;
    await assert.rejects(
      () =>
        resilientFetch('/health', {
          signal: ctrl.signal,
          fetchImpl: async () => {
            calls += 1;
            return jsonOk();
          },
          sleep: noSleep,
        }),
    );
    assert.equal(calls, 0);
  });
});
