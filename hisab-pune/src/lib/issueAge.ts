/** Unresolved age for L0 fact strips (DESIGN.md). */
export function unresolvedDayCount(
  createdAt: string,
  status: string,
): number | null {
  if (status === 'resolved') return null;
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

export function formatIssueAge(createdAt: string, status: string): string {
  const days = unresolvedDayCount(createdAt, status);
  if (days === null) {
    return new Date(createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  if (days === 0) return 'Opened today';
  if (days === 1) return '1 day open';
  return `${days} days open`;
}

/** Relative age for L1 comment rows. */
export function formatCommentAge(createdAt: string, nowMs = Date.now()): string {
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return '';
  const delta = Math.max(0, nowMs - start);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}
