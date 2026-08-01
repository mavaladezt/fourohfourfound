/**
 * Renders a date as MM/DD/YYYY.
 *
 * Uses the UTC accessors on purpose: frontmatter dates like `2026-08-01` are
 * parsed as UTC midnight, so reading them with local accessors would show the
 * previous day for anyone west of Greenwich.
 */
export function formatDate(date: Date): string {
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${mm}/${dd}/${date.getUTCFullYear()}`;
}

/** The `datetime` attribute for <time>, which must be ISO 8601. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function year(date: Date): number {
  return date.getUTCFullYear();
}
