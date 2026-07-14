import type { ExpiryType } from '@/lib/database/models/inventory-item';

// DD/MM/YYYY — compiled once at module scope per e18e/prefer-static-regex
const DATE_GB_RE = /^(\d{1,2})\/?\s*(\d{1,2})\/?\s*(\d{2,4})$/;

/**
 * Parses a date string in DD/MM/YYYY format to a unix millisecond timestamp.
 * Returns null if the string is empty, malformed, or represents an invalid date.
 */
export function parseDateGB(value: string): number | null {
  const match = DATE_GB_RE.exec(value);
  if (!match)
    return null;
  const [, day, month, year] = match;
  const yr = Number(year) < 100 ? 2000 + Number(year) : Number(year);
  const d = new Date(yr, Number(month) - 1, Number(day));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

// ─── Expiry badge ────────────────────────────────────────────────────────────

export type ExpiryBadge = {
  label: string;
  note: string | null;
  /** Lower number = higher urgency = appears first in sorted list */
  sortPriority: number;
  urgency: 'amber' | 'grey' | 'red';
} | null;

// Days past the date after which we stop being polite about it
const LONG_PAST_DAYS = 14;

// Use-by is a SAFETY date (bacteria don't smell) — never suggest the sniff test here
const PAST_USE_BY_NOTE = 'Use-by is a safety date — if in doubt, chuck it out';
const LONG_PAST_USE_BY_NOTE = 'Well past its use-by — one for the bin';
// Best-before is a QUALITY date — the sniff test is fair game
const PAST_BEST_NOTE = 'Probably still fine — give it a sniff';
const LONG_PAST_BEST_NOTE = 'Long past its best — time to let it go';

/**
 * Derives the expiry badge state for an item. Returns null when no badge
 * should be shown (no expiry date, or expiry is comfortably in the future).
 */
export function getExpiryState(
  expiryDate: number | null,
  expiryType: ExpiryType | null,
): ExpiryBadge {
  if (expiryDate === null)
    return null;

  const days = (expiryDate - Date.now()) / 86400000; // positive = future

  if (expiryType === 'use_by') {
    if (days < 0) {
      const past = -days;
      if (past >= LONG_PAST_DAYS)
        return { label: 'You still have this?', note: LONG_PAST_USE_BY_NOTE, sortPriority: 3, urgency: 'grey' };
      return past >= 3
        ? { label: 'Past use-by', note: PAST_USE_BY_NOTE, sortPriority: 3, urgency: 'grey' }
        : { label: 'Past use-by', note: PAST_USE_BY_NOTE, sortPriority: 2, urgency: 'amber' };
    }
    if (days < 1)
      return { label: 'Use by today', note: null, sortPriority: 0, urgency: 'red' };
    if (days < 2)
      return { label: 'Use by tomorrow', note: null, sortPriority: 1, urgency: 'red' };
    return null;
  }

  if (expiryType === 'best_before') {
    if (days < 0) {
      const past = -days;
      if (past >= LONG_PAST_DAYS)
        return { label: 'You still have this?', note: LONG_PAST_BEST_NOTE, sortPriority: 4, urgency: 'grey' };
      return { label: 'Past its best', note: PAST_BEST_NOTE, sortPriority: 4, urgency: 'grey' };
    }
    if (days <= 3)
      return { label: 'Best before soon', note: null, sortPriority: 4, urgency: 'amber' };
  }

  return null;
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

type Expirable = { expiryDate: number | null; expiryType: ExpiryType | null };

/**
 * Sorts items by expiry urgency (most urgent first), then by date ascending
 * within the same urgency bucket. Items with no expiry date sort last.
 */
export function sortByExpiry<T extends Expirable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const prioA = getExpiryState(a.expiryDate, a.expiryType)?.sortPriority ?? 5;
    const prioB = getExpiryState(b.expiryDate, b.expiryType)?.sortPriority ?? 5;
    if (prioA !== prioB)
      return prioA - prioB;
    if (a.expiryDate === null && b.expiryDate === null)
      return 0;
    if (a.expiryDate === null)
      return 1;
    if (b.expiryDate === null)
      return -1;
    return a.expiryDate - b.expiryDate;
  });
}
