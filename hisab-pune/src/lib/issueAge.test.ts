import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCommentAge } from './issueAge.ts';

describe('formatCommentAge', () => {
  const now = Date.parse('2026-09-07T12:00:00.000Z');

  it('uses relative English ages', () => {
    assert.equal(formatCommentAge('2026-09-07T11:59:30.000Z', now), 'Just now');
    assert.equal(formatCommentAge('2026-09-07T11:58:00.000Z', now), '2 min ago');
    assert.equal(formatCommentAge('2026-09-07T10:00:00.000Z', now), '2 hours ago');
    assert.equal(formatCommentAge('2026-09-06T12:00:00.000Z', now), '1 day ago');
    assert.equal(formatCommentAge('2026-08-04T09:00:00.000Z', now), '34 days ago');
  });
});
