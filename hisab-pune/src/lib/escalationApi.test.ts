import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLocality } from '../data/localities.ts';
import type { ApiEscalationPerson } from './api.ts';
import { toOfficial, toOfficials } from './api.ts';
import { escalationChain } from './escalation.ts';
import { resolveLocalityOfficials } from './useLocalityEscalation.ts';

const mohol: ApiEscalationPerson = {
  id: 'role-mp-mm',
  name: 'Murlidhar Mohol',
  role: 'mp',
  shortTitle: 'MP',
  title: 'Member of Parliament — Pune Lok Sabha',
  party: 'BJP',
  xHandle: 'mohol_murlidhar',
  phone: null,
  email: null,
  note: null,
  sourceLabel: 'Lok Sabha 2024 (sitting) · X @mohol_murlidhar',
};

describe('API escalation adapter', () => {
  it('maps sourceLabel to Official.source and drops nulls', () => {
    const official = toOfficial(mohol);
    assert.ok(official);
    assert.equal(official.source, mohol.sourceLabel);
    assert.equal(official.xHandle, 'mohol_murlidhar');
    assert.equal(official.phone, undefined);
    assert.equal(official.email, undefined);
    assert.equal(official.note, undefined);
    assert.equal(official.role, 'mp');
    assert.equal(official.title, 'Member of Parliament — Pune Lok Sabha');
  });

  it('falls back to shortTitle when title is null', () => {
    const official = toOfficial({ ...mohol, title: null });
    assert.equal(official?.title, 'MP');
  });

  it('skips unknown roles and empty names', () => {
    assert.equal(toOfficial({ ...mohol, role: 'intern' }), null);
    assert.equal(toOfficial({ ...mohol, name: '' }), null);
    assert.deepEqual(toOfficials(null), []);
    assert.deepEqual(toOfficials([]), []);
  });

  it('preserves ladder order', () => {
    const rows: ApiEscalationPerson[] = [
      { ...mohol, id: 'san', name: 'Avinash Sakpal', role: 'sanitation', shortTitle: 'SWM' },
      mohol,
    ];
    assert.deepEqual(
      toOfficials(rows).map((o) => o.name),
      ['Avinash Sakpal', 'Murlidhar Mohol'],
    );
  });
});

describe('resolveLocalityOfficials', () => {
  it('uses live API rows when present', () => {
    const loc = getLocality('baner');
    assert.ok(loc);
    const live = toOfficials([mohol]);
    const resolved = resolveLocalityOfficials(loc, live);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0]?.name, 'Murlidhar Mohol');
    assert.equal(resolved[0]?.source, mohol.sourceLabel);
  });

  it('falls back to the static chain when live is missing or empty', () => {
    const loc = getLocality('baner');
    assert.ok(loc);
    const staticChain = escalationChain(loc);
    assert.equal(resolveLocalityOfficials(loc, null).at(-1)?.name, 'Murlidhar Mohol');
    assert.deepEqual(resolveLocalityOfficials(loc, []), staticChain);
    assert.ok(staticChain.length >= 4);
  });
});
