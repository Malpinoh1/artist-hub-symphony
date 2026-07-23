/**
 * Backward-compatible shim. The parser architecture lives in
 * `src/utils/royalty-parsers/`. New code should import from there.
 */
export { parseNumericCell as parseNetValue } from './royalty-parsers/shared';
export type { NormalizedRoyaltyRow as OnerpmRow } from './royalty-parsers/types';
export { extractOnerpmPerformers as extractPerformers } from './royalty-parsers/onerpm';

import { parseOnerpmRows } from './royalty-parsers/onerpm';
import Papa from 'papaparse';
import type { NormalizedRoyaltyRow } from './royalty-parsers/types';

/**
 * @deprecated Use `parseRoyaltyFile` from `@/utils/royalty-parsers` instead —
 * it auto-detects ONErpm vs SoundOn.
 */
export function parseOnerpmCsv(file: File): Promise<NormalizedRoyaltyRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          resolve(parseOnerpmRows(results.data));
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}
