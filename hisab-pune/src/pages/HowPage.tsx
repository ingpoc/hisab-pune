import { Link } from 'react-router-dom';
import { dataSources } from '../data/sources';
import { electoralWards } from '../data/electoralWards';
import { localities } from '../data/localities';
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

export function HowPage() {
  const corporatorCount = electoralWards.reduce((n, w) => n + w.corporators.length, 0);

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
        <h2>Sources</h2>
        <ul className="how__sources">
          {dataSources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
              <span>{s.usedFor}</span>
            </li>
          ))}
        </ul>
        <p>
          New reports go to the live API (session + anonymous posting id). Roster
          data stays sourced; ward polygons and continuous PMC/SEC refresh keep
          improving.
        </p>
        <Link to="/map?report=1" className="btn btn--signal">
          Try a report
        </Link>
      </section>
    </main>
  );
}
