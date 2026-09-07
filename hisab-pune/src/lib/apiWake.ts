import { useSyncExternalStore } from 'react';
import { resilientFetch } from './resilientFetch';

export const WAKING_COPY = 'Waking Hisab — free hosting may take up to a minute.';
export const DOWN_COPY =
  'Could not reach Hisab. Retry — free hosting may still be starting.';
export const REPORTS_LOAD_ERROR = 'Could not load live reports.';

/** Wait this long before showing the waking banner so a fast /health never flashes. */
export const WAKING_BANNER_DELAY_MS = 800;

export type WakeBannerKind = 'hidden' | 'waking' | 'down';

export type WakeSnapshot = {
  phase: 'idle' | 'waking' | 'ready' | 'down';
  banner: WakeBannerKind;
  retryNonce: number;
};

let snapshot: WakeSnapshot = { phase: 'idle', banner: 'hidden', retryNonce: 0 };
const listeners = new Set<() => void>();
let probeSeq = 0;
let slowTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function setSnapshot(partial: Partial<WakeSnapshot>) {
  snapshot = { ...snapshot, ...partial };
  emit();
}

export function subscribeWake(onStore: () => void): () => void {
  listeners.add(onStore);
  return () => {
    listeners.delete(onStore);
  };
}

export function getWakeSnapshot(): WakeSnapshot {
  return snapshot;
}

export function useWakeStatus(): WakeSnapshot {
  return useSyncExternalStore(subscribeWake, getWakeSnapshot, getWakeSnapshot);
}

export async function probeHealth(): Promise<void> {
  const seq = ++probeSeq;
  if (slowTimer) {
    clearTimeout(slowTimer);
    slowTimer = null;
  }
  const showImmediately = snapshot.phase === 'down';
  setSnapshot({
    phase: 'waking',
    banner: showImmediately ? 'waking' : snapshot.banner,
  });
  slowTimer = setTimeout(() => {
    if (probeSeq === seq && snapshot.phase === 'waking') {
      setSnapshot({ banner: 'waking' });
    }
  }, WAKING_BANNER_DELAY_MS);

  try {
    const res = await resilientFetch('/health');
    if (!res.ok) throw new Error('Health check failed');
    const data = (await res.json()) as { ok?: boolean };
    if (data.ok !== true) throw new Error('Health check failed');
    if (probeSeq !== seq) return;
    if (slowTimer) clearTimeout(slowTimer);
    slowTimer = null;
    setSnapshot({ phase: 'ready', banner: 'hidden' });
  } catch {
    if (probeSeq !== seq) return;
    if (slowTimer) clearTimeout(slowTimer);
    slowTimer = null;
    setSnapshot({ phase: 'down', banner: 'down' });
  }
}

/** Re-probe /health and bump retryNonce so pages refetch live data. */
export function retryWake(): void {
  setSnapshot({ retryNonce: snapshot.retryNonce + 1 });
  void probeHealth();
}
