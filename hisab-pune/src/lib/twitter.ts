import type { Official } from '../data/types';
import type { Locality } from '../data/types';

export function buildEscalationTweet(opts: {
  locality: Locality;
  note: string;
  officials: Official[];
  reportUrl?: string;
}): string {
  const preferred = ['commissioner', 'mayor', 'mla', 'mp', 'ward_officer', 'sanitation'] as const;
  const ranked = [...opts.officials].sort((a, b) => {
    const ai = preferred.indexOf(a.role as (typeof preferred)[number]);
    const bi = preferred.indexOf(b.role as (typeof preferred)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const handles = ranked
    .map((o) => o.xHandle)
    .filter((h): h is string => Boolean(h))
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 5)
    .map((h) => `@${h}`)
    .join(' ');

  const body = [
    `Garbage issue in ${opts.locality.name}, Pune (Ward ${opts.locality.electoralWardId}).`,
    opts.note.trim().slice(0, 110),
    '',
    `Escalation ladder is public on Hisab. ${handles}`,
    '#HisabPune #PuneGarbage',
    opts.reportUrl ?? '',
  ]
    .filter(Boolean)
    .join('\n');

  return body.slice(0, 270);
}

export function xIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function xProfileUrl(handle: string): string {
  return `https://x.com/${handle.replace(/^@/, '')}`;
}
