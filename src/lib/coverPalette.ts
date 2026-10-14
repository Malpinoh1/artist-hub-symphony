export interface CoverPalette {
  primary: string;
  secondary: string;
}

const FALLBACK_PALETTE: CoverPalette = { primary: '#8B5CF6', secondary: '#22D3EE' };

const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const luminance = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Samples a small, cross-origin-safe canvas and returns two stable, usable artwork accents. */
export const loadCoverPalette = (url: string | null | undefined): Promise<CoverPalette | null> =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(image, 0, 0, 32, 32);
        const pixels = ctx.getImageData(0, 0, 32, 32).data;
        const bins = new Map<string, { r: number; g: number; b: number; count: number; score: number }>();
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
          if (a < 180) continue;
          const lum = luminance(r, g, b);
          if (lum < 0.12 || lum > 0.91) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const qr = Math.round(r / 32) * 32, qg = Math.round(g / 32) * 32, qb = Math.round(b / 32) * 32;
          const key = [qr, qg, qb].join(',');
          const bin = bins.get(key) || { r: 0, g: 0, b: 0, count: 0, score: 0 };
          bin.r += r; bin.g += g; bin.b += b; bin.count += 1;
          bin.score += 0.55 + saturation * 1.8 + (lum > 0.2 && lum < 0.8 ? 0.35 : 0);
          bins.set(key, bin);
        }
        const ranked = [...bins.values()].sort((a, b) => (b.score * Math.sqrt(b.count)) - (a.score * Math.sqrt(a.count)));
        if (!ranked.length) return resolve(null);
        const toColor = (bin: typeof ranked[number]) =>
          rgbToHex(bin.r / bin.count, bin.g / bin.count, bin.b / bin.count);
        const primary = ranked[0];
        const secondary = ranked.find((bin) => {
          const dr = bin.r / bin.count - primary.r / primary.count;
          const dg = bin.g / bin.count - primary.g / primary.count;
          const db = bin.b / bin.count - primary.b / primary.count;
          return Math.sqrt(dr * dr + dg * dg + db * db) > 65;
        }) || ranked[Math.min(1, ranked.length - 1)];
        resolve({ primary: toColor(primary), secondary: toColor(secondary) });
      } catch {
        // Canvas access can be blocked by a remote host's CORS policy.
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });

export const fallbackCoverPalette = FALLBACK_PALETTE;
