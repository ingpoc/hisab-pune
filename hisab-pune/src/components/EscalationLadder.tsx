import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Locality } from '../data/types';
import { getElectoralWard } from '../data/electoralWards';
import { mlas } from '../data/cityOfficials';
import { escalationChain } from '../lib/escalation';
import { OfficialCard } from './OfficialCard';
import { TweetAction } from './TweetAction';
import './EscalationLadder.css';

interface Props {
  locality: Locality;
  note?: string;
  /** `list` / `rail` = contacts only. `full` = title + optional tweet + list. */
  variant?: 'full' | 'list' | 'rail';
  /** L1 — draft compose is opt-in (DESIGN.md). Default off. */
  showTweet?: boolean;
  onClose?: () => void;
}

export function EscalationLadder({
  locality,
  note,
  variant = 'full',
  showTweet = false,
  onClose,
}: Props) {
  const chain = escalationChain(locality);
  const ward = getElectoralWard(locality.electoralWardId);
  const mla = mlas[locality.assemblyId];
  const assemblyLabel = mla?.title.replace(/^MLA — /, '') ?? locality.assemblyId;
  const rootRef = useRef<HTMLElement>(null);
  const progressive = variant === 'rail' || variant === 'list';

  useLayoutEffect(() => {
    if (variant === 'list') return;
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.ladder__head, .ladder__rail-head', {
          y: 10,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.out',
        });
        gsap.from('.ladder__list > li', {
          y: 14,
          opacity: 0,
          duration: 0.35,
          stagger: 0.05,
          ease: 'power2.out',
          delay: 0.06,
        });
      });
    }, root);
    return () => ctx.revert();
  }, [locality.id, variant]);

  const list = (
    <ol className="ladder__list">
      {chain.map((official, i) => (
        <li key={official.id}>
          <OfficialCard
            official={official}
            step={i + 1}
            disclosure={progressive ? 'progressive' : 'always'}
          />
          {i < chain.length - 1 && <div className="ladder__connector" aria-hidden />}
        </li>
      ))}
    </ol>
  );

  if (variant === 'rail') {
    return (
      <section className="ladder ladder--rail" ref={rootRef} aria-label="Escalation route">
        <header className="ladder__rail-head">
          <div>
            <p className="ladder__eyebrow">Escalation route</p>
            <h2 className="ladder__rail-title">{locality.name}</h2>
            <p className="ladder__meta">
              {chain.length} contacts · Ward {locality.electoralWardId}
              {ward ? ` · ${ward.name}` : ''}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              className="ladder__close"
              onClick={onClose}
              aria-label="Close escalation route"
            >
              ✕
            </button>
          )}
        </header>
        <p className="ladder__hint">
          Role + name + one contact. Open details when you need title, note, or source.
        </p>
        {list}
      </section>
    );
  }

  if (variant === 'list') {
    return (
      <section className="ladder ladder--list" aria-label="Escalation contacts">
        {list}
      </section>
    );
  }

  return (
    <section className="ladder" ref={rootRef}>
      <header className={`ladder__head${showTweet ? '' : ' ladder__head--solo'}`}>
        <div>
          <p className="ladder__eyebrow">Escalation route</p>
          <h2 className="ladder__title">{locality.name}</h2>
          <p className="ladder__meta">
            Electoral ward {locality.electoralWardId}
            {ward ? ` · ${ward.name}` : ''} · {locality.zone} · Assembly: {assemblyLabel}
          </p>
        </div>
        {showTweet && (
          <TweetAction locality={locality} officials={chain} note={note} />
        )}
      </header>

      {list}
    </section>
  );
}
