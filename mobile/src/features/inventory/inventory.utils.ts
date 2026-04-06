import type { ExpiryType } from '@/lib/database/models/inventory-item';

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

// ─── Expiry badge ────────────────────────────────────────────────────────────

export type ExpiryBadge = {
  label: string;
  note: string | null;
  /** Lower number = higher urgency = appears first in sorted list */
  sortPriority: number;
  urgency: 'amber' | 'grey' | 'red';
} | null;

const PAST_NOTE = 'Past its use-by — worth a sniff, but probably fine';

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
      return past >= 3
        ? { label: 'Past use-by', note: PAST_NOTE, sortPriority: 3, urgency: 'grey' }
        : { label: 'Past use-by', note: PAST_NOTE, sortPriority: 2, urgency: 'amber' };
    }
    if (days < 1)
      return { label: 'Use by today', note: null, sortPriority: 0, urgency: 'red' };
    if (days < 2)
      return { label: 'Use by tomorrow', note: null, sortPriority: 1, urgency: 'red' };
    return null;
  }

  if (expiryType === 'best_before' && days > 0 && days <= 3)
    return { label: 'Best before soon', note: null, sortPriority: 4, urgency: 'amber' };

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
