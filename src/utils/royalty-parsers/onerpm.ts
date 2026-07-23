import Papa from 'papaparse';
import type { NormalizedRoyaltyRow, ParseResult } from './types';
import { parseNumericCell, parseIntCell, pickField } from './shared';

/**
 * Extract performer names from ONErpm "Artists" column:
 * "Liolizzy (performer), LAWAL IBRAHIM (writer)" → ["Liolizzy"]
 * Falls back to all comma-separated names if no role tags.
 */
export function extractOnerpmPerformers(raw: string): string[] {
  if (!raw) return [];
  const performers = [...raw.matchAll(/([^,()]+?)\s*\(performer\)/gi)];
  if (performers.length > 0) return performers.map((m) => m[1].trim()).filter(Boolean);
  return raw
    .split(',')
    .map((s) => s.replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
}

/** Header signature indicating this is an ONErpm export. */
export function looksLikeOnerpm(headers: string[]): boolean {
  const h = headers.map((s) => s.toLowerCase().trim());
  const hasNet = h.includes('net');
  const hasArtists = h.includes('artists') || h.includes('artist');
  // ONErpm has "Net" (not "Final Royalty") and typically no "Track Artists" column
  const hasFinalRoyalty = h.includes('final royalty');
  return hasNet && hasArtists && !hasFinalRoyalty;
}

export function parseOnerpmRows(records: Record<string, any>[]): NormalizedRoyaltyRow[] {
  const rows: NormalizedRoyaltyRow[] = [];
  for (const r of records) {
    const title = String(pickField(r, ['Title', 'Track Title', 'Song']) ?? '').trim();
    const artists = String(pickField(r, ['Artists', 'Artist']) ?? '').trim();
    const net = parseNumericCell(pickField(r, ['Net']));
    if (!title && !artists) continue;

    rows.push({
      track_title: title,
      raw_artists: artists,
      performer_names: extractOnerpmPerformers(artists),
      track_external_id: String(pickField(r, ['ID', 'Track ID', 'ISRC']) ?? '').trim(),
      quantity: parseIntCell(pickField(r, ['Quantity', 'Streams', 'Plays'])),
      downloads: parseIntCell(pickField(r, ['Downloads', 'Download'])),
      net_amount: net,
      currency: String(pickField(r, ['Currency']) ?? 'USD').trim() || 'USD',
      sales_type: String(pickField(r, ['Sales Type', 'Type']) ?? '').trim(),
      dsp_name: String(pickField(r, ['Store', 'DSP', 'Retailer', 'Platform', 'Shop']) ?? '').trim(),
      country: String(pickField(r, ['Country', 'Territory', 'Region']) ?? '').trim(),
      isrc: (() => {
        const v = String(pickField(r, ['ISRC']) ?? '').trim();
        return v || undefined;
      })(),
    });
  }
  return rows;
}

export function parseOnerpmCsvString(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: true });
  const rows = parseOnerpmRows(parsed.data);
  return { distributor_code: 'onerpm', rows };
}
