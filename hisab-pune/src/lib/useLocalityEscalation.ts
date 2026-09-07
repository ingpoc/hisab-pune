import { useEffect, useMemo, useState } from 'react';
import type { Locality, Official } from '../data/types';
import { fetchLocality, toOfficials } from './api';
import { useWakeStatus } from './apiWake';
import { escalationChain } from './escalation';

export const ESCALATION_FALLBACK_COPY =
  'Showing saved contacts — live roster unavailable.';

export function resolveLocalityOfficials(
  locality: Locality,
  live: Official[] | null,
): Official[] {
  return live && live.length > 0 ? live : escalationChain(locality);
}

type LiveEntry = { kind: 'ok'; officials: Official[] } | { kind: 'failed' };

/** Live GET /v1/localities/:id escalation, with static chain fallback. */
export function useLocalityEscalation(locality: Locality | null | undefined): {
  officials: Official[];
  usingFallback: boolean;
} {
  const { retryNonce } = useWakeStatus();
  const localityId = locality?.id ?? null;
  const [byId, setById] = useState<Record<string, LiveEntry>>({});

  useEffect(() => {
    if (!localityId) return;
    let cancelled = false;
    fetchLocality(localityId)
      .then((data) => {
        if (cancelled) return;
        const mapped = toOfficials(data.escalation);
        setById((prev) => ({
          ...prev,
          [localityId]:
            mapped.length > 0 ? { kind: 'ok', officials: mapped } : { kind: 'failed' },
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setById((prev) => ({ ...prev, [localityId]: { kind: 'failed' } }));
      });
    return () => {
      cancelled = true;
    };
  }, [localityId, retryNonce]);

  const entry = localityId ? byId[localityId] : undefined;
  const live = entry?.kind === 'ok' ? entry.officials : null;
  const officials = useMemo(
    () => (locality ? resolveLocalityOfficials(locality, live) : []),
    [locality, live],
  );

  return { officials, usingFallback: entry?.kind === 'failed' };
}
