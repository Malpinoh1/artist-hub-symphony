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
            const netKey = pickKey(r, ['Net', 'Net Amount', 'Earnings', 'Amount']);
            const curKey = pickKey(r, ['Currency']);
            const salesKey = pickKey(r, ['Sales Type', 'Type']);
            const idKey = pickKey(r, ['ID', 'Track ID', 'ISRC']);

            const raw_artists = String(r[artistsKey] ?? '').trim();
            const net_amount = parseFloat(String(r[netKey] ?? '0').replace(/[^0-9.\-]/g, '')) || 0;
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
