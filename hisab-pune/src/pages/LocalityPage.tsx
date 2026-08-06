import { Link, useParams } from 'react-router-dom';
import { EscalationLadder } from '../components/EscalationLadder';
import { getLocality } from '../data/localities';
import { loadReportsWithOverrides } from '../lib/storage';
import './LocalityPage.css';

export function LocalityPage() {
  const { id } = useParams();
  const locality = id ? getLocality(id) : undefined;
  const reports = locality
    ? loadReportsWithOverrides().filter((r) => r.localityId === locality.id)
    : [];

  if (!locality) {
    return (
      <main className="loc-page">
        <h1>Locality not found</h1>
        <Link to="/localities">Back to directory</Link>
      </main>
    );
  }

  return (
    <main className="loc-page">
      <EscalationLadder locality={locality} />

      <section className="loc-page__reports">
        <h2>Reports here</h2>
        {reports.length === 0 ? (
          <p>No reports yet. Be the first.</p>
        ) : (
          <ul>
            {reports.map((r) => (
              <li key={r.id}>
                <span className={`pill pill--${r.status}`}>{r.status}</span>
                <p>{r.note}</p>
                <time dateTime={r.createdAt}>
                  {new Date(r.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
        <Link to={`/map?loc=${locality.id}&report=1`} className="btn btn--alert">
          Report in {locality.name}
        </Link>
      </section>
    </main>
  );
}
