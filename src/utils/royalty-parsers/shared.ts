import type { NormalizedRoyaltyRow } from './types';

/**
 * Parse a "Net"/currency cell as a floating-point number.
 * Handles: scientific notation (5.1127E-05), parenthesized negatives,
 * currency symbols, both US (1,234.56) and EU (1.234,56 / 0,0158) formats.
 */
export function parseNumericCell(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  let s = String(raw).trim().replace(/^\uFEFF/, '');
  if (!s) return 0;

  const isNeg = /^\(.*\)$/.test(s);
  if (isNeg) s = s.slice(1, -1);

  const direct = Number(s.replace(/[$£€₦\s]/g, '').replace(/,/g, ''));
  if (Number.isFinite(direct)) return isNeg ? -direct : direct;

  s = s.replace(/[^\d.,\-eE]/g, '');
  if (!s) return 0;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    s = s.replace(/,/g, '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? (isNeg ? -n : n) : 0;
}

export function parseIntCell(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  const n = parseInt(String(raw).replace(/[^0-9\-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Look up a value in a row by trying multiple header-name candidates,
 * case-insensitive and whitespace-trimmed.
 */
export function pickField(row: Record<string, any>, candidates: string[]): any {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const k = keys.find((k) => k.toLowerCase().trim() === c.toLowerCase().trim());
    if (k !== undefined) return row[k];
  }
  return undefined;
}

/** Extract just the header list from a parsed CSV/XLSX row object. */
export function extractHeaders(row: Record<string, any>): string[] {
  return Object.keys(row).map((k) => k.trim().toLowerCase());
}

/** True if a normalized row is worth persisting (has any content). */
export function rowHasContent(r: NormalizedRoyaltyRow): boolean {
  return Boolean(r.track_title || r.raw_artists || r.isrc || r.upc);
}
