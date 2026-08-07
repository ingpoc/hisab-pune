import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LocalitySearch } from '../components/LocalitySearch';
import { localities, searchLocalities } from '../data/localities';
import { getElectoralWard } from '../data/electoralWards';
import { mlas } from '../data/cityOfficials';
import './LocalitiesPage.css';

export function LocalitiesPage() {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim();
    if (!q) return localities;
    return searchLocalities(q, localities.length);
  }, [query]);

  return (
    <main className="locs">
      <header className="locs__head">
        <p className="eyebrow">Directory</p>
        <h1>Every locality has a face and a ladder</h1>
        <p>
          Mapped to the 2026 PMC electoral ward, ward-office AMC, corporators,
          MLA, mayor, commissioner, and MP — phones and X handles where public.
        </p>
        <LocalitySearch
          variant="page"
          placeholder="Search or jump to a locality…"
          onQueryChange={setQuery}
        />
      </header>

      <p className="locs__count" aria-live="polite">
        {shown.length} of {localities.length}
      </p>

      <ul className="locs__list">
        {shown.map((loc) => {
          const mla = mlas[loc.assemblyId];
          const ward = getElectoralWard(loc.electoralWardId);
          return (
            <li key={loc.id}>
              <Link to={`/map?loc=${loc.id}`}>
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
                    {ward.corporators.length} corporators ·{' '}
                    {ward.corporators
                      .map((c) => c.party)
                      .filter((p, i, a) => a.indexOf(p) === i)
                      .join('/')}
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
