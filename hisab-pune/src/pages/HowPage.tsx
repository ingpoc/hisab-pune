import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFreshness, type FreshnessResponse } from '../lib/api';
import './HowPage.css';

const steps = [
  {
    title: 'Pin the problem',
    body: 'Photo + place + category. We match the nearest locality and show it on the city ledger.',
  },
  {
    title: 'Read the ledger',
    body: 'Open and closed issues for that street first — counts and notes before any contact list.',
  },
  {
    title: 'Open the ladder when you need it',
    body: 'SWM desk → ward office → corporators → MLA → mayor → commissioner → MP. Names and handles stay collapsed until you expand.',
  },
  {
    title: 'Act on X (or CARE)',
    body: 'Escalate with a tagged draft, or file on PMC CARE yourself and paste the real ticket number back on Hisab.',
  },
];

function roleLabel(role: string) {
  return role.replaceAll('_', ' ');
}

export function HowPage() {
  const [freshness, setFreshness] = useState<FreshnessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFreshness()
      .then((data) => {
        if (!cancelled) setFreshness(data);
      })
      .catch(() => {
        if (!cancelled) setError('Roster freshness is unavailable.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

      <section className="how__note" data-freshness="api">
        <h2>Data freshness</h2>
        {!freshness && !error ? <p>Loading roster freshness from the API.</p> : null}
        {error ? <p>{error}</p> : null}
        {freshness ? (
          <>
            <p>
              Roster as of {freshness.seededAt?.slice(0, 10) ?? 'unknown'} · language{' '}
              {freshness.language}.
            </p>
            <ul className="how__roles">
              {freshness.roles.map((row) => (
                <li key={row.role}>
                  <strong>{roleLabel(row.role)}</strong>
                  <span>
                    {row.count} · {row.oldestSource ?? '—'} → {row.newestSource ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
            <h2>Sources</h2>
            <ul className="how__sources">
              {freshness.sources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                  </a>
                  <span>{s.usedFor}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p>
          New reports go to the live API (session + anonymous posting id). Roster
          rows stay sourced; this page reads GET /v1/freshness, not a static list.
        </p>
        <Link to="/map?report=1" className="btn btn--signal">
          Try a report
        </Link>
      </section>
    </main>
  );
}
