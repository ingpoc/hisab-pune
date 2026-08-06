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
}

export function EscalationLadder({ locality, note }: Props) {
  const chain = escalationChain(locality);
  const ward = getElectoralWard(locality.electoralWardId);
  const mla = mlas[locality.assemblyId];
  const assemblyLabel = mla?.title.replace(/^MLA — /, '') ?? locality.assemblyId;
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.from('.ladder__head', {
        y: 12,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.out',
      });
      gsap.from('.ladder__list > li', {
        y: 18,
        opacity: 0,
        duration: 0.4,
        stagger: 0.06,
        ease: 'power2.out',
        delay: 0.08,
      });
    }, root);
    return () => ctx.revert();
  }, [locality.id]);

  return (
    <section className="ladder" ref={rootRef}>
      <header className="ladder__head">
        <div>
          <p className="ladder__eyebrow">Escalation route</p>
          <h2 className="ladder__title">{locality.name}</h2>
          <p className="ladder__meta">
            Electoral ward {locality.electoralWardId}
            {ward ? ` · ${ward.name}` : ''} · {locality.zone} · Assembly: {assemblyLabel}
          </p>
        </div>
        <TweetAction locality={locality} officials={chain} note={note} />
      </header>

      <ol className="ladder__list">
        {chain.map((official, i) => (
          <li key={official.id}>
            <OfficialCard official={official} step={i + 1} />
            {i < chain.length - 1 && <div className="ladder__connector" aria-hidden />}
          </li>
        ))}
      </ol>
    </section>
  );
}
