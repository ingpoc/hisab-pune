import { electoralWards } from '../src/data/electoralWards.ts';
import { localities } from '../src/data/localities.ts';
import { wardOffices } from '../src/data/wardOffices.ts';
import { EXPECT } from './expect.ts';
import { fail, pass, type GradeResult } from './lib.ts';

/** Browser QA: home/wards/localities showed 41 / 165 / 30 — lock the roster. */
export function gradeRoster(): GradeResult {
  const errors: string[] = [];
  const corps = electoralWards.reduce((n, w) => n + w.corporators.length, 0);
  const offices = Object.values(wardOffices);

  if (electoralWards.length !== EXPECT.wards) {
    errors.push(`wards ${electoralWards.length} !== ${EXPECT.wards}`);
  }
  if (corps !== EXPECT.corporators) {
    errors.push(`corporators ${corps} !== ${EXPECT.corporators}`);
  }
  if (localities.length !== EXPECT.localities) {
    errors.push(`localities ${localities.length} !== ${EXPECT.localities}`);
  }
  if (offices.length !== EXPECT.wardOffices) {
    errors.push(`wardOffices ${offices.length} !== ${EXPECT.wardOffices}`);
  }

  const wardIds = new Set(electoralWards.map((w) => w.id));
  if (wardIds.size !== electoralWards.length) errors.push('duplicate electoral ward ids');

  const locIds = new Set(localities.map((l) => l.id));
  if (locIds.size !== localities.length) errors.push('duplicate locality ids');

  for (const loc of localities) {
    if (!wardIds.has(loc.electoralWardId)) {
      errors.push(`locality ${loc.id} → missing ward ${loc.electoralWardId}`);
    }
    if (!wardOffices[loc.wardOfficeId]) {
      errors.push(`locality ${loc.id} → missing office ${loc.wardOfficeId}`);
    }
  }

  const covered = new Set(offices.flatMap((o) => o.electoralWardIds));
  for (const id of wardIds) {
    if (!covered.has(id)) errors.push(`ward ${id} not attached to any regional office`);
  }

  if (errors.length) return fail('roster', errors.slice(0, 15).join('; '));
  return pass(
    'roster',
    `${EXPECT.wards} wards · ${EXPECT.corporators} corporators · ${EXPECT.localities} localities · ${EXPECT.wardOffices} offices`,
  );
}
