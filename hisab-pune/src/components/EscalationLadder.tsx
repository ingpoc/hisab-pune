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

  return (
    <section className="ladder">
      <header className="ladder__head">
        <div>
          <p className="ladder__eyebrow">Escalation route</p>
          <h2 className="ladder__title">
            {locality.name}
            <span>{locality.nameMr}</span>
          </h2>
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
