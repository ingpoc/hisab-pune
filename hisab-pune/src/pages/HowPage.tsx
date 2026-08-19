import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dataSources } from '../data/sources';
import { electoralWards } from '../data/electoralWards';
import { localities } from '../data/localities';
import { fetchFreshness, type Freshness } from '../lib/api';
import './HowPage.css';

const steps = [
  {
    title: 'Pin the problem',
    body: 'Share your location (required) and optionally a photo. We match it to the 2026 electoral ward polygon, then the nearest mapped locality.',
  },
  {
    title: 'See the ladder',
    body: 'Solid-waste desk → Assistant Municipal Commissioner (ward office) → every corporator for that electoral ward → MLA → deputy mayor → mayor → municipal commissioner → MP.',
  },
  {
    title: 'Act on X',
    body: 'One tap opens a draft that tags public handles (@PMCPune, MLA, MP, Mayor where known). Visibility is the enforcement layer.',
  },
  {
    title: 'Keep the ledger',
    body: 'Open, escalated, resolved — public status so the city can see which areas are ignored. New reports go to the live API (`POST /v1/reports`).',
  },
];

function roleLine(roles: Freshness['roles']): string {
  return roles
    .map((r) => `${r.count} ${r.role.replaceAll('_', ' ')}`)
    .join(' · ');
}

export function HowPage() {
  const corporatorCount = electoralWards.reduce((n, w) => n + w.corporators.length, 0);
  const [freshness, setFreshness] = useState<Freshness | null>(null);
  const [freshnessError, setFreshnessError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchFreshness()
      .then((data) => {
        if (!cancelled) setFreshness(data);
      })
      .catch(() => {
        if (!cancelled) setFreshnessError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sources =
    freshness?.sources && freshness.sources.length > 0 ? freshness.sources : dataSources;
  const seededDay = freshness?.seededAt ? freshness.seededAt.slice(0, 10) : null;

  return (
    <main className="how">
      <header>
        <p className="eyebrow">Method</p>
        <h1>Transparency first. Pressure second.</h1>
        <p>
          Inspired by Bengaluru&apos;s NammaKasa — rebuilt for Pune with a sharper
          focus: the full escalation route from reliable public records, and
          actionable tagging on X.
        </p>
      </header>

      <ol className="how__steps">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="how__note">
        <h2>What&apos;s loaded now</h2>
        <p>
          {electoralWards.length} electoral wards · {corporatorCount} corporators ·{' '}
          {localities.length} localities with ward-office AMC phones. Initial
          avatars only — no scraped personal photos.
        </p>
        {freshness && (
          <p>
            Live backend roster
            {seededDay ? ` (seeded ${seededDay})` : ''}: {roleLine(freshness.roles)}.
            Reports are stored on the API; your browser keeps a copy if the network
            drops. Ward polygons are the 2026 electoral boundaries.
          </p>
        )}
        {freshnessError && (
          <p>
            Live backend is unreachable right now — showing bundled sources. Reports
            still save in your browser until the reports API is back.
          </p>
        )}
        <h2>Sources</h2>
        <ul className="how__sources">
          {sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
              <span>{s.usedFor}</span>
            </li>
          ))}
        </ul>
        <Link to="/map?report=1" className="btn btn--signal">
          Try a report
        </Link>
      </section>
    </main>
  );
}
