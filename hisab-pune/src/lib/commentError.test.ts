import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadCommentsErrorMessage, postCommentErrorMessage } from './commentError.ts';
import { ExhaustedFetchError } from './resilientFetch.ts';

describe('comment errors', () => {
  it('keeps load failures honest and generic', () => {
    assert.equal(
      loadCommentsErrorMessage(new Error(JSON.stringify({ error: 'Report not found' }))),
      'Could not load comments. Try again.',
    );
  });

  it('surfaces a missing session without Sign-in copy', () => {
    assert.equal(
      postCommentErrorMessage(new Error(JSON.stringify({ error: 'Session required' }))),
      'Could not start a session. Try again in a moment.',
    );
  });

  it('explains invalid comment body', () => {
    assert.equal(
      postCommentErrorMessage(new Error(JSON.stringify({ error: 'Invalid body' }))),
      'Write a comment (2–400 characters).',
    );
  });

  it('passes through exhausted fetch copy', () => {
    assert.equal(
      postCommentErrorMessage(new ExhaustedFetchError()),
      'Hisab is waking or unreachable. Try again in a moment.',
    );
    assert.equal(
      loadCommentsErrorMessage(new ExhaustedFetchError()),
      'Hisab is waking or unreachable. Try again in a moment.',
    );
  });
});
