import Papa from 'papaparse';

export interface OnerpmRow {
  track_title: string;
  raw_artists: string;
  performer_names: string[];
  track_external_id: string;
  quantity: number;
  net_amount: number;
  currency: string;
  sales_type: string;
}

/**
 * Extracts performer names from ONErpm "Artists" column.
 * Format: "Liolizzy (performer), LAWAL IBRAHIM (writer), Producer X (producer)"
 * Returns ["Liolizzy"] (only performers).
 * Falls back to all comma-separated names if no role tags found.
 */
export function extractPerformers(raw: string): string[] {
  if (!raw) return [];
  const performerMatches = [...raw.matchAll(/([^,()]+?)\s*\(performer\)/gi)];
  if (performerMatches.length > 0) {
    return performerMatches.map((m) => m[1].trim()).filter(Boolean);
  }
  // Fallback: strip any (role) tags and split by comma
  return raw
    .split(',')
    .map((s) => s.replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
}

const pickKey = (row: Record<string, any>, candidates: string[]): string => {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const k = keys.find((k) => k.toLowerCase().trim() === c.toLowerCase());
    if (k) return k;
  }
  return '';
};

/**
 * Parse a "Net" cell as a floating-point number.
 * - Empty/null/invalid → 0
 * - Supports scientific notation exported by Excel/ONErpm (e.g. 5.1127E-05)
 * - Strips currency symbols and whitespace
 * - Handles both US (1,234.56) and EU (1.234,56 / 0,0158) decimal formats
 * - Never inflates values by stripping decimal separators
 */
export function parseNetValue(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  let s = String(raw).trim().replace(/^\uFEFF/, '');
  if (!s) return 0;

  const isParenthesizedNegative = /^\(.*\)$/.test(s);
  if (isParenthesizedNegative) s = s.slice(1, -1);

  const direct = Number(s.replace(/[$£€₦\s]/g, '').replace(/,/g, ''));
  if (Number.isFinite(direct)) return isParenthesizedNegative ? -direct : direct;

  // Remove everything except digits, separators, and sign
  s = s.replace(/[^\d.,\-]/g, '');
  if (!s) return 0;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // Assume the last-occurring separator is the decimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only commas: treat as decimal separator (EU format like "0,0158")
    s = s.replace(/,/g, '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? (isParenthesizedNegative ? -n : n) : 0;
}

export function parseOnerpmCsv(file: File): Promise<OnerpmRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows: OnerpmRow[] = [];
          for (const r of results.data) {
            const titleKey = pickKey(r, ['Title', 'Track Title', 'Song']);
            const artistsKey = pickKey(r, ['Artists', 'Artist']);
            const qtyKey = pickKey(r, ['Quantity', 'Streams', 'Plays']);
            const netKey = pickKey(r, ['Net']);
            const curKey = pickKey(r, ['Currency']);
            const salesKey = pickKey(r, ['Sales Type', 'Type']);
            const idKey = pickKey(r, ['ID', 'Track ID', 'ISRC']);

            if (!netKey) {
              throw new Error('CSV is missing the required Net column.');
            }

            const raw_artists = String(r[artistsKey] ?? '').trim();
            const net_amount = parseNetValue(r[netKey]);
            if (!raw_artists && !r[titleKey]) continue;

            rows.push({
              track_title: String(r[titleKey] ?? '').trim(),
              raw_artists,
              performer_names: extractPerformers(raw_artists),
              track_external_id: String(r[idKey] ?? '').trim(),
              quantity: parseInt(String(r[qtyKey] ?? '0').replace(/[^0-9\-]/g, ''), 10) || 0,
              net_amount,
              currency: String(r[curKey] ?? 'USD').trim() || 'USD',
              sales_type: String(r[salesKey] ?? '').trim(),
            });
          }
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}
