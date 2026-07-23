import Papa from 'papaparse';
import type { NormalizedRoyaltyRow, ParseResult } from './types';
import { parseNumericCell, parseIntCell, pickField } from './shared';

/**
 * Detects SoundOn's official monthly royalty statement.
 * Canonical headers include: Sales Period, Reporting Period, Track ID, Track Title,
 * ISRC, Track Artists, UPC Code, Album Title, Release Date, Royalty Type, Store Name,
 * Sales Region, Sales Type, Sales Sub Type, Units of Sold, Exchange rate, Currency,
 * Gross revenue, Artist Share, Royalty Split Percentage, Final Royalty.
 */
export function looksLikeSoundon(headers: string[]): boolean {
  const h = headers.map((s) => s.toLowerCase().trim());
  const hasFinal = h.includes('final royalty');
  const hasTrackArtists = h.includes('track artists');
  const hasUpc = h.includes('upc code');
  return hasFinal && (hasTrackArtists || hasUpc);
}

/** SoundOn "Track Artists" is a comma-separated list of names (no role tags). */
function extractSoundonPerformers(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse "2026-05" into { year, month }. */
function parseReportingPeriod(raw: string): { year: number; month: number } | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d{4})[-/](\d{1,2})/);
  if (!m) return undefined;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (!year || !month || month < 1 || month > 12) return undefined;
  return { year, month };
}

export function parseSoundonRows(records: Record<string, any>[]): { rows: NormalizedRoyaltyRow[]; period?: { year: number; month: number } } {
  const rows: NormalizedRoyaltyRow[] = [];
  let period: { year: number; month: number } | undefined;

  for (const r of records) {
    if (!period) {
      const rp = String(pickField(r, ['Reporting Period']) ?? '').trim();
      period = parseReportingPeriod(rp);
    }

    const title = String(pickField(r, ['Track Title', 'Title']) ?? '').trim();
    const artists = String(pickField(r, ['Track Artists', 'Artists', 'Artist']) ?? '').trim();
    const finalRoyalty = parseNumericCell(pickField(r, ['Final Royalty']));
    const gross = parseNumericCell(pickField(r, ['Gross revenue', 'Gross Revenue']));
    const artistShare = parseNumericCell(pickField(r, ['Artist Share']));
    const units = parseIntCell(pickField(r, ['Units of Sold', 'Units Sold', 'Quantity']));
    const isrc = String(pickField(r, ['ISRC']) ?? '').trim();
    const upc = String(pickField(r, ['UPC Code', 'UPC']) ?? '').trim();

    if (!title && !artists && !isrc && !upc) continue;

    rows.push({
      track_title: title,
      raw_artists: artists,
      performer_names: extractSoundonPerformers(artists),
      track_external_id: String(pickField(r, ['Track ID', 'ID']) ?? '').trim(),
      quantity: units,
      downloads: 0,
      // Credit wallets from Final Royalty. Gross/Artist Share stay informational.
      net_amount: finalRoyalty,
      currency: String(pickField(r, ['Currency']) ?? 'USD').trim() || 'USD',
      sales_type: [
        String(pickField(r, ['Sales Type']) ?? '').trim(),
        String(pickField(r, ['Sales Sub Type']) ?? '').trim(),
      ].filter(Boolean).join(' / '),
      dsp_name: String(pickField(r, ['Store Name', 'Store', 'DSP']) ?? '').trim(),
      country: String(pickField(r, ['Sales Region', 'Country', 'Territory']) ?? '').trim(),
      isrc: isrc || undefined,
      upc: upc || undefined,
      album_title: String(pickField(r, ['Album Title']) ?? '').trim() || undefined,
      royalty_type: String(pickField(r, ['Royalty Type']) ?? '').trim() || undefined,
      gross_revenue: Number.isFinite(gross) ? gross : undefined,
      artist_share: Number.isFinite(artistShare) ? artistShare : undefined,
      final_royalty: Number.isFinite(finalRoyalty) ? finalRoyalty : undefined,
    });
  }
  return { rows, period };
}

export function parseSoundonCsvString(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: true });
  const { rows, period } = parseSoundonRows(parsed.data);
  return { distributor_code: 'soundon', rows, detected_period: period };
}
