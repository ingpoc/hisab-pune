import { Link } from 'react-router-dom';
import { localities } from '../data/localities';
import { getElectoralWard } from '../data/electoralWards';
import { mlas } from '../data/cityOfficials';
import './LocalitiesPage.css';

export function LocalitiesPage() {
  return (
    <main className="locs">
      <header className="locs__head">
        <p className="eyebrow">Directory</p>
        <h1>Every locality has a face and a ladder</h1>
        <p>
          Mapped to the 2026 PMC electoral ward, ward-office AMC, all corporators
          for that ward, MLA, mayor, commissioner, and MP — with phones and X
          handles where public.
        </p>
      </header>

      <ul className="locs__list">
        {localities.map((loc) => {
          const mla = mlas[loc.assemblyId];
          const ward = getElectoralWard(loc.electoralWardId);
          return (
            <li key={loc.id}>
              <Link to={`/locality/${loc.id}`}>
                <div>
                  <strong>{loc.name}</strong>
                </div>
                <p>
                  Ward {loc.electoralWardId}
                  {ward ? ` · ${ward.name}` : ''} · {loc.zone}
                </p>
                <p className="locs__mla">
                  MLA: {mla?.name ?? '—'}
                  {mla?.xHandle ? ` · @${mla.xHandle}` : ''}
                </p>
                {ward && (
                  <p>
                    {ward.corporators.length} corporators · {ward.corporators.map((c) => c.party).filter((p, i, a) => a.indexOf(p) === i).join('/')}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
