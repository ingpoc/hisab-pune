import { useEffect, useState } from 'react';
import { fetchComments, postComment, type ApiComment } from '../lib/api';
import { loadCommentsErrorMessage, postCommentErrorMessage } from '../lib/commentError';
import { formatCommentAge } from '../lib/issueAge';
import './IssueComments.css';

const BODY_MIN = 2;
const BODY_MAX = 400;

interface Props {
  reportId: string;
}

export function IssueComments({ reportId }: Props) {
  const [comments, setComments] = useState<ApiComment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchComments(reportId)
      .then((rows) => {
        if (cancelled) return;
        setComments(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setComments(null);
        setLoadError(loadCommentsErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId, reloadToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (body.length < BODY_MIN || body.length > BODY_MAX) {
      setPostError('Write a comment (2–400 characters).');
      return;
    }
    setSubmitting(true);
    setPostError(null);
    try {
      const comment = await postComment(reportId, body, 'anonymous');
      setComments((prev) => [...(prev ?? []), comment]);
      setDraft('');
    } catch (err) {
      setPostError(postCommentErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="issue-comments">
      {loading && (
        <p className="issue-comments__status" role="status">
          Loading comments…
        </p>
      )}
      {loadError && (
        <div className="issue-comments__banner" role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            className="issue-comments__retry"
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              setReloadToken((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !loadError && comments?.length === 0 && (
        <p className="issue-comments__empty">No comments yet.</p>
      )}
      {!loading && !loadError && comments && comments.length > 0 && (
        <ul className="issue-comments__list">
          {comments.map((c) => (
            <li key={c.id}>
              <p className="issue-comments__body">{c.body}</p>
              <p className="issue-comments__meta">
                <span>{c.author_label}</span>
                <span>{formatCommentAge(c.created_at)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      {!loading && !loadError && (
        <form className="issue-comments__form" onSubmit={onSubmit}>
          <label htmlFor={`issue-comment-${reportId}`}>
            Comment
            <textarea
              id={`issue-comment-${reportId}`}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (postError) setPostError(null);
              }}
              maxLength={BODY_MAX}
              rows={3}
              disabled={submitting}
              placeholder="Write a short follow-up"
            />
          </label>
          <button type="submit" className="issue-comments__post" disabled={submitting}>
            {submitting ? 'Posting…' : postError ? 'Retry' : 'Post comment'}
          </button>
        </form>
      )}
      {postError && (
        <p className="issue-comments__error" role="alert">
          {postError}
        </p>
      )}
    </div>
  );
}
