import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attachTicketErrorMessage } from './careTicketError.ts';
import { ExhaustedFetchError } from './resilientFetch.ts';

describe('attachTicketErrorMessage', () => {
  it('surfaces a missing session plainly', () => {
    assert.equal(
      attachTicketErrorMessage(new Error(JSON.stringify({ error: 'Session required' }))),
      'A session is required to save a ticket. Try again in a moment.',
    );
  });

  it('explains invalid ticket body', () => {
    assert.equal(
      attachTicketErrorMessage(new Error(JSON.stringify({ error: 'Invalid body' }))),
      'Enter a CARE ticket number (at least 3 characters).',
    );
  });

  it('passes through exhausted fetch copy', () => {
    assert.equal(
      attachTicketErrorMessage(new ExhaustedFetchError()),
      'Hisab is waking or unreachable. Try again in a moment.',
    );
  });
});
