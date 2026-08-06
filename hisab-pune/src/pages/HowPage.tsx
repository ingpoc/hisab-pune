import { Link } from 'react-router-dom';
import './HowPage.css';

const steps = [
  {
    title: 'Pin the problem',
    body: 'Take a photo of the blackspot and share your location. We snap it to the nearest mapped locality.',
  },
  {
    title: 'See the ladder',
    body: 'Sanitation desk → ward officer → corporator → MLA → mayor → municipal commissioner → MP. Names and roles, not anonymous departments.',
  },
  {
    title: 'Act on X',
    body: 'One tap opens a draft that tags public handles (@PMCPune, MLA, MP where known). Visibility is the enforcement layer.',
  },
  {
    title: 'Keep the ledger',
    body: 'Open, escalated, resolved — public status so the city can see which areas are ignored.',
  },
];

export function HowPage() {
  return (
    <main className="how">
      <header>
        <p className="eyebrow">Method</p>
        <h1>Transparency first. Pressure second.</h1>
        <p>
          Inspired by Bengaluru&apos;s NammaKasa — rebuilt for Pune with a sharper
          focus: the full escalation route, and actionable tagging on X.
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
        <h2>About the data</h2>
        <p>
          MLA / MP / commissioner / mayor names use publicly reported 2024–26
          results. Ward corporator seats and sanitation supervisors are seeded
          as placeholders — replace with the live PMC roster and ward KML before
          a public launch. X handles are included only where publicly known.
        </p>
        <p>
          This MVP stores new reports in your browser (localStorage). Next step:
          Supabase + MapLibre ward polygons + moderated photo pipeline, same
          shape as NammaKasa.
        </p>
        <Link to="/map?report=1" className="btn btn--signal">
          Try a report
        </Link>
      </section>
    </main>
  );
}
