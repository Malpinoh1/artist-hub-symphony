/**
 * Normalized royalty row shape emitted by every distributor parser.
 * This is the single input format consumed by the royalty ingestion pipeline
 * (`royalty_upload_rows` inserts + `process_royalty_upload` RPC).
 *
 * Distributor-specific quirks are handled inside each parser. Downstream code
 * only ever sees this shape.
 */
export interface NormalizedRoyaltyRow {
  track_title: string;
  raw_artists: string;
  performer_names: string[];
  track_external_id: string;
  quantity: number;   // Streams / units of sold
  downloads: number;
  net_amount: number; // Amount used to credit the artist wallet (Final Royalty for SoundOn, Net for ONErpm)
  currency: string;
  sales_type: string;
  dsp_name: string;
  country: string;

  // Extended identifiers/breakdown (nullable — not every distributor exports these)
  isrc?: string;
  upc?: string;
  album_title?: string;
  royalty_type?: string;
  gross_revenue?: number;
  artist_share?: number;
  final_royalty?: number;
}

export type DistributorCode = 'onerpm' | 'soundon';

export interface ParseResult {
  distributor_code: DistributorCode;
  rows: NormalizedRoyaltyRow[];
  /** Period auto-detected from the file itself (e.g. SoundOn "Reporting Period"). */
  detected_period?: { year: number; month: number };
}

// Backward-compat alias — some older code imports the old ONErpm type name.
export type OnerpmRow = NormalizedRoyaltyRow;
