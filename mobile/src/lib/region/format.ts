import { getActiveRegion } from './store';

/**
 * Formats a timestamp (ms) or Date as a short date in the active region's
 * locale. Replaces hardcoded `toLocaleDateString('en-GB')` calls so dates
 * follow the user's region.
 *
 * Note: en-GB, en-IE, en-AU and en-NZ all render short dates as DD/MM/YYYY,
 * so existing UK users see no change.
 */
export function formatDate(
  value: number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'number' ? new Date(value) : value;
  return date.toLocaleDateString(getActiveRegion().locale, options);
}
