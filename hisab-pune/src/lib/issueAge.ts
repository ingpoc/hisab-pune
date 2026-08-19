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
