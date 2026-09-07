import { useEffect } from 'react';
import {
  DOWN_COPY,
  WAKING_COPY,
  probeHealth,
  retryWake,
  useWakeStatus,
} from '../lib/apiWake';
import './WakeBanner.css';

export function WakeBanner() {
  const { banner } = useWakeStatus();

  useEffect(() => {
    void probeHealth();
  }, []);

  if (banner === 'hidden') return null;

  if (banner === 'waking') {
    return (
      <div className="wake-banner" role="status" aria-live="polite">
        <p>{WAKING_COPY}</p>
      </div>
    );
  }

  return (
    <div className="wake-banner wake-banner--down" role="alert">
      <p>{DOWN_COPY}</p>
      <button type="button" className="wake-banner__retry" onClick={() => retryWake()}>
        Retry
      </button>
    </div>
  );
}
