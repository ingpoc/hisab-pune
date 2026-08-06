import type { Official } from '../data/types';
import type { Locality } from '../data/types';

export function buildEscalationTweet(opts: {
  locality: Locality;
  note: string;
  officials: Official[];
  reportUrl?: string;
}): string {
  const handles = opts.officials
    .map((o) => o.xHandle)
    .filter((h): h is string => Boolean(h))
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 4)
    .map((h) => `@${h}`)
    .join(' ');

  const body = [
    `Garbage issue in ${opts.locality.name}, Pune (${opts.locality.nameMr}).`,
    opts.note.trim().slice(0, 120),
    '',
    `Responsible ladder is public on Hisab. ${handles}`,
    '#HisabPune #PuneGarbage',
    opts.reportUrl ?? 'https://hisab.pune',
  ]
    .filter(Boolean)
    .join('\n');

  return body.slice(0, 260);
}

export function xIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function xProfileUrl(handle: string): string {
  return `https://x.com/${handle.replace(/^@/, '')}`;
}
