import { useState } from 'react';
import type { Official } from '../data/types';
import { avatarHue, initials } from '../lib/escalation';
import { roleLabels } from '../data/cityOfficials';
import { xProfileUrl } from '../lib/twitter';
import './OfficialCard.css';

interface Props {
  official: Official;
  step?: number;
  /** Always show every field (rare). Default: progressive. */
  disclosure?: 'progressive' | 'always';
}

export function OfficialCard({
  official,
  step,
  disclosure = 'progressive',
}: Props) {
  const [open, setOpen] = useState(disclosure === 'always');
  const hue = avatarHue(official.id);
  const hasMore = Boolean(
    official.title ||
      official.party ||
      official.note ||
      official.source ||
      (official.phone && official.xHandle) ||
      (official.email && (official.phone || official.xHandle)),
  );

  const showAll = disclosure === 'always' || open;
  const primary = official.phone
    ? ({ kind: 'phone' as const, value: official.phone })
    : official.xHandle
      ? ({ kind: 'x' as const, value: official.xHandle })
      : official.email
        ? ({ kind: 'email' as const, value: official.email })
        : null;
  const secondaryX =
    primary?.kind === 'phone' && official.xHandle ? official.xHandle : null;
  const secondaryEmail =
    primary && primary.kind !== 'email' && official.email ? official.email : null;

  return (
    <article className={`official${showAll ? ' is-open' : ''}`}>
      <div className="official__main">
        {typeof step === 'number' && (
          <div className="official__step">{String(step).padStart(2, '0')}</div>
        )}
        <div
          className="official__avatar"
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 42% 32%), hsl(${(hue + 40) % 360} 35% 22%))`,
          }}
          aria-hidden
        >
          {initials(official.name)}
        </div>
        <div className="official__body">
          <p className="official__role">{roleLabels[official.role]}</p>
          <h3 className="official__name">{official.name}</h3>

          {primary && (
            <div className="official__actions">
              {primary.kind === 'phone' && (
                <a href={`tel:${primary.value.replace(/\s/g, '')}`}>{primary.value}</a>
              )}
              {primary.kind === 'x' && (
                <a href={xProfileUrl(primary.value)} target="_blank" rel="noreferrer">
                  @{primary.value}
                </a>
              )}
              {primary.kind === 'email' && (
                <a href={`mailto:${primary.value}`}>{primary.value}</a>
              )}
            </div>
          )}

          {hasMore && disclosure === 'progressive' && (
            <button
              type="button"
              className="official__more"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? 'Less' : 'More details'}
            </button>
          )}
        </div>
      </div>

      {showAll && (
        <div className="official__extra">
          {official.title && <p className="official__title">{official.title}</p>}
          <div className="official__meta">
            {official.party && <span>{official.party}</span>}
            {secondaryX && (
              <a href={xProfileUrl(secondaryX)} target="_blank" rel="noreferrer">
                @{secondaryX}
              </a>
            )}
            {secondaryEmail && (
              <a href={`mailto:${secondaryEmail}`}>{secondaryEmail}</a>
            )}
          </div>
          {official.note && <p className="official__note">{official.note}</p>}
          {official.source && (
            <p className="official__source">Source: {official.source}</p>
          )}
        </div>
      )}
    </article>
  );
}
