import type { Official } from '../data/types';
import { avatarHue, initials } from '../lib/escalation';
import { roleLabels } from '../data/cityOfficials';
import { xProfileUrl } from '../lib/twitter';
import './OfficialCard.css';

interface Props {
  official: Official;
  step?: number;
  compact?: boolean;
}

export function OfficialCard({ official, step, compact }: Props) {
  const hue = avatarHue(official.id);
  return (
    <article className={`official ${compact ? 'official--compact' : ''}`}>
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
        <p className="official__title">{official.title}</p>
        <div className="official__meta">
          {official.party && <span>{official.party}</span>}
          {official.xHandle && (
            <a href={xProfileUrl(official.xHandle)} target="_blank" rel="noreferrer">
              @{official.xHandle}
            </a>
          )}
          {official.phone && (
            <a href={`tel:${official.phone.replace(/\s/g, '')}`}>{official.phone}</a>
          )}
          {official.email && (
            <a href={`mailto:${official.email}`}>{official.email}</a>
          )}
        </div>
        {official.note && !compact && (
          <p className="official__note">{official.note}</p>
        )}
        {official.source && !compact && (
          <p className="official__source">Source: {official.source}</p>
        )}
      </div>
    </article>
  );
}
