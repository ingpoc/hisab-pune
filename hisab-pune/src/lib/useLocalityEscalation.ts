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

/** Live GET /v1/localities/:id escalation, with static chain fallback. */
export function useLocalityEscalation(locality: Locality | null | undefined): {
  officials: Official[];
  usingFallback: boolean;
} {
  const { retryNonce } = useWakeStatus();
  const localityId = locality?.id ?? null;
  const [live, setLive] = useState<Official[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!localityId) {
      setLive(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setLive(null);
    setFailed(false);
    fetchLocality(localityId)
      .then((data) => {
        if (cancelled) return;
        const mapped = toOfficials(data.escalation);
        if (mapped.length === 0) {
          setFailed(true);
          return;
        }
        setLive(mapped);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [localityId, retryNonce]);

  const officials = useMemo(
    () => (locality ? resolveLocalityOfficials(locality, live) : []),
    [locality, live],
  );

  return { officials, usingFallback: failed };
}
