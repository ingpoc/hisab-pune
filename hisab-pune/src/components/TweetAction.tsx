import { useMemo, useState } from 'react';
import type { Locality, Official } from '../data/types';
import { buildEscalationTweet, xIntentUrl } from '../lib/twitter';
import './TweetAction.css';

interface Props {
  locality: Locality;
  officials: Official[];
  note?: string;
}

export function TweetAction({ locality, officials, note }: Props) {
  const [custom, setCustom] = useState(
    note ?? `Uncollected garbage / blackspot in ${locality.name}. Please act.`,
  );

  const tweet = useMemo(
    () =>
      buildEscalationTweet({
        locality,
        note: custom,
        officials,
      }),
    [locality, custom, officials],
  );

  return (
    <div className="tweet">
      <label className="tweet__label" htmlFor={`tweet-${locality.id}`}>
        Draft for X
      </label>
      <textarea
        id={`tweet-${locality.id}`}
        className="tweet__box"
        rows={3}
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
      />
      <div className="tweet__preview">{tweet}</div>
      <a
        className="btn btn--ink tweet__go"
        href={xIntentUrl(tweet)}
        target="_blank"
        rel="noreferrer"
      >
        Post on X with tags
      </a>
    </div>
  );
}
