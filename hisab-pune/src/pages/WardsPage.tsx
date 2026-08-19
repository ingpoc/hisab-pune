import { Link } from 'react-router-dom';
import { electoralWards } from '../data/electoralWards';
import { localities } from '../data/localities';
import './WardsPage.css';

export function WardsPage() {
  return (
    <main className="wards">
      <header className="wards__head">
        <p className="eyebrow">PMC 2026</p>
        <h1>All 41 electoral wards · 165 corporators</h1>
        <p>
          Winners from the January 2026 civic election. Tap a mapped locality to
          see the full escalation ladder for that area.
        </p>
      </header>

      <ol className="wards__list">
        {electoralWards.map((ward) => {
          const linked = localities.filter((l) => l.electoralWardId === ward.id);
          return (
            <li key={ward.id} className="wards__card">
              <h2>
                <span>Ward {ward.id}</span>
                {ward.name}
              </h2>
              <ul className="wards__corps">
                {ward.corporators.map((c) => (
                  <li key={`${ward.id}-${c.seat}`}>
                    <strong>
                      {c.seat}. {c.name}
                    </strong>
                    <span>{c.party}</span>
                  </li>
                ))}
              </ul>
              {linked.length > 0 ? (
                <p className="wards__links">
                  Localities:{' '}
                  {linked.map((l, i) => (
                    <span key={l.id}>
                      {i > 0 && ', '}
                      <Link to={`/map?loc=${l.id}`}>{l.name}</Link>
                    </span>
                  ))}
                </p>
              ) : (
                <p className="wards__links wards__links--muted">
                  No named locality pin yet — add centroid mapping next.
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
