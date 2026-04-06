// DD/MM/YYYY — compiled once at module scope per e18e/prefer-static-regex
const DATE_GB_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Parses a date string in DD/MM/YYYY format to a unix millisecond timestamp.
 * Returns null if the string is empty, malformed, or represents an invalid date.
 */
export function parseDateGB(value: string): number | null {
  const match = DATE_GB_RE.exec(value);
  if (!match)
    return null;
  const [, day, month, year] = match;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}
