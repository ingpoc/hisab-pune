import { Link } from 'react-router-dom';
import { localities } from '../data/localities';
import { officials } from '../data/officials';
import './LocalitiesPage.css';

export function LocalitiesPage() {
  return (
    <main className="locs">
      <header className="locs__head">
        <p className="eyebrow">Directory</p>
        <h1>Every locality has a face and a ladder</h1>
        <p>
          Tap through to see sanitation desk → ward officer → corporator → MLA →
          mayor → commissioner → MP, with X handles where public.
        </p>
      </header>

      <ul className="locs__list">
        {localities.map((loc) => {
          const mla = officials[loc.mlaId];
          return (
            <li key={loc.id}>
              <Link to={`/locality/${loc.id}`}>
                <div>
                  <strong>{loc.name}</strong>
                  <span className="locs__mr">{loc.nameMr}</span>
                </div>
                <p>
                  Ward {loc.wardNo} · {loc.zone}
                </p>
                <p className="locs__mla">
                  MLA: {mla?.name ?? '—'}
                  {mla?.xHandle ? ` · @${mla.xHandle}` : ''}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
