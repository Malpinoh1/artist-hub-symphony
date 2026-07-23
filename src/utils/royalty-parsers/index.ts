import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParseResult, DistributorCode } from './types';
import { parseOnerpmRows, looksLikeOnerpm } from './onerpm';
import { parseSoundonRows, looksLikeSoundon } from './soundon';

export type { NormalizedRoyaltyRow, ParseResult, DistributorCode, OnerpmRow } from './types';
export { parseNumericCell } from './shared';

/** Read a File as text (CSV) or parse XLSX and hand back records + header list. */
async function readFileToRecords(file: File): Promise<{ records: Record<string, any>[]; headers: string[] }> {
  const name = file.name.toLowerCase();
  const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls');
  if (isXlsx) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { records: [], headers: [] };
    const records = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    const headers = records[0] ? Object.keys(records[0]) : [];
    return { records, headers };
  }
  const text = await file.text();
  const parsed = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: true });
  const records = parsed.data;
  const headers = records[0] ? Object.keys(records[0]) : (parsed.meta?.fields ?? []);
  return { records, headers };
}

/**
 * Auto-detect distributor from headers and parse the file into a normalized
 * royalty row list. Throws if the format is unrecognized.
 */
export async function parseRoyaltyFile(file: File): Promise<ParseResult> {
  const { records, headers } = await readFileToRecords(file);
  if (!records.length) throw new Error('The uploaded file is empty or unreadable.');

  if (looksLikeSoundon(headers)) {
    const { rows, period } = parseSoundonRows(records);
    return { distributor_code: 'soundon', rows, detected_period: period };
  }
  if (looksLikeOnerpm(headers)) {
    return { distributor_code: 'onerpm', rows: parseOnerpmRows(records) };
  }

  throw new Error(
    `Unrecognized royalty statement format. Expected an ONErpm or SoundOn CSV/XLSX. ` +
      `Detected headers: ${headers.slice(0, 8).join(', ')}${headers.length > 8 ? '…' : ''}`
  );
}

export const DISTRIBUTOR_NAMES: Record<DistributorCode, string> = {
  onerpm: 'ONErpm',
  soundon: 'SoundOn',
};
