import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2, Square, RectangleVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { milestoneLabel, milestoneTier } from '@/hooks/useReportedStats';
import { loadCoverPalette } from '@/lib/coverPalette';

type Format = 'square' | 'story';

const SIZES: Record<Format, { w: number; h: number; label: string; hint: string }> = {
  square: { w: 1080, h: 1080, label: 'Square', hint: 'Instagram / Facebook post' },
  story: { w: 1080, h: 1920, label: 'Story', hint: 'WhatsApp status, IG & FB stories' },
};

const TIER_ACCENT: Record<string, [string, string]> = {
  Bronze: ['#D97706', '#F59E0B'],
  Silver: ['#94A3B8', '#E2E8F0'],
  Gold: ['#EAB308', '#FDE047'],
  Platinum: ['#22D3EE', '#A5F3FC'],
  Diamond: ['#8B5CF6', '#E879F9'],
};

const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));

// The same original transparent PNG used by the MALPINOHDISTRO site header/footer.
const BRAND_LOGO_URL = '/lovable-uploads/e567dcac-3939-45da-9177-42729283dcd9.png';

const DSP_LOGOS = [
  { name: 'Spotify', url: 'https://cdn.simpleicons.org/spotify/1DB954', color: '#1DB954', textW: 0.052 },
  { name: 'Apple Music', url: 'https://cdn.simpleicons.org/applemusic/FFFFFF', color: '#FFFFFF', textW: 0.074 },
  { name: 'Audiomack', url: 'https://cdn.simpleicons.org/audiomack/FFC400', color: '#FFC400', textW: 0.073 },
  { name: 'Boomplay', url: 'https://cdn.simpleicons.org/boomplay/FFC928', color: '#FFC928', textW: 0.068 },
  { name: 'TikTok', url: 'https://cdn.simpleicons.org/tiktok/FFFFFF', color: '#FFFFFF', textW: 0.05 },
  { name: 'YouTube', url: 'https://cdn.simpleicons.org/youtube/FF0033', color: '#FF0033', textW: 0.06 },
];

const drawStreamingPlatformLogos = async (ctx: CanvasRenderingContext2D, w: number, pad: number, stripY: number) => {
  const stripH = Math.round(w * 0.12);
  const areaW = w - pad * 2;
  const columns = DSP_LOGOS.length;
  const slotW = areaW / columns;
  const icon = Math.round(w * 0.027);
  const labelFont = Math.round(w * 0.014);
  const logos = await Promise.all(DSP_LOGOS.map(async (platform) => ({
    ...platform,
    image: await loadImage(platform.url),
  })));

  // A single compact row keeps every DSP mark clear of the stream totals below.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  logos.forEach((platform, index) => {
    const col = index % columns;
    const centerX = pad + slotW * (col + 0.5);
    const centerY = stripY + stripH * 0.43;
    if (platform.image) {
      ctx.drawImage(platform.image, centerX - icon / 2, centerY - icon * 0.58, icon, icon);
    } else {
      ctx.fillStyle = platform.color;
      ctx.beginPath();
      ctx.arc(centerX, centerY - icon * 0.34, icon * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.font = `800 ${labelFont}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText(platform.name, centerX, centerY + icon * 0.70);
  });
  ctx.restore();
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export interface MilestoneCardData {
  milestone: number;
  streamsAtAward: number;
  awardedAt: string;
  releaseTitle: string;
  coverUrl: string | null;
  artistName: string;
}

interface Props {
  data: MilestoneCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MilestonePromoCard: React.FC<Props> = ({ data, open, onOpenChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<Format>('square');
  const [rendering, setRendering] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const draw = useCallback(async () => {
    if (!data) return;
    const canvas = canvasRef.current;
    if (!canvas) {
      // Dialog content may not be mounted yet — retry on the next frame.
      requestAnimationFrame(() => void draw());
      return;
    }
    setRendering(true);

    const { w, h } = SIZES[format];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setRendering(false);
      return;
    }

    const logo = await loadImage(BRAND_LOGO_URL);

    const tier = milestoneTier(data.milestone);
    const fallbackAccent = TIER_ACCENT[tier] || TIER_ACCENT.Diamond;
    const [cover, palette] = await Promise.all([
      data.coverUrl ? loadImage(data.coverUrl) : Promise.resolve(null),
      loadCoverPalette(data.coverUrl),
    ]);
    const c1 = palette?.primary || fallbackAccent[0];
    const c2 = palette?.secondary || fallbackAccent[1];
    const isStory = format === 'story';

    // A completely new editorial / record-sleeve art direction.
    const ink = '#141414';
    const paper = '#F5F1E8';
    const mutedInk = '#59564F';
    const accent = c1;
    const accent2 = c2;
    const pad = Math.round(w * 0.075);
    const footerH = Math.round(w * (isStory ? 0.25 : 0.22));
    const footerY = h - footerH;

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, Math.round(w * 0.035), h);
    ctx.fillStyle = ink;
    ctx.fillRect(Math.round(w * 0.035), 0, w - Math.round(w * 0.035), Math.round(h * 0.105));

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const headerY = Math.round(h * 0.052);
    if (logo) {
      const logoW = Math.round(w * 0.12);
      const logoH = logoW * (logo.height / logo.width);
      ctx.drawImage(logo, pad, headerY - logoH / 2, logoW, logoH);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 ' + Math.round(w * 0.022) + "px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillText('MALPINOH DISTRO', pad + logoW + w * 0.018, headerY);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 ' + Math.round(w * 0.028) + "px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillText('MALPINOH DISTRO', pad, headerY);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = accent2;
    ctx.font = '900 ' + Math.round(w * 0.018) + 'px Inter, system-ui, sans-serif';
    ctx.fillText(tier.toUpperCase() + ' / NO. ' + String(data.milestone).padStart(2, '0'), w - pad, headerY);

    const drawCover = (x: number, y: number, size: number) => {
      ctx.save();
      ctx.shadowColor = 'rgba(20,20,20,0.18)';
      ctx.shadowBlur = Math.round(w * 0.025);
      ctx.shadowOffsetY = Math.round(w * 0.012);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - w * 0.008, y - w * 0.008, size + w * 0.016, size + w * 0.016);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, size, size);
      ctx.clip();
      if (cover) {
        const scale = Math.max(size / cover.width, size / cover.height);
        const dw = cover.width * scale;
        const dh = cover.height * scale;
        ctx.drawImage(cover, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
      } else {
        const grad = ctx.createLinearGradient(x, y, x + size, y + size);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, accent2);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = ink;
        ctx.font = '900 ' + Math.round(size * 0.48) + 'px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', x + size / 2, y + size / 2);
      }
      ctx.restore();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(2, Math.round(w * 0.003));
      ctx.strokeRect(x, y, size, size);
    };

    const drawFitted = (text: string, x: number, y: number, maxWidth: number, font: string) => {
      ctx.font = font;
      let fitted = text || '';
      while (ctx.measureText(fitted).width > maxWidth && fitted.length > 3) fitted = fitted.slice(0, -2);
      if (fitted !== text) fitted = fitted.replace(/\s+$/, '') + '…';
      ctx.fillText(fitted, x, y);
    };

    if (!isStory) {
      const artSize = Math.round(w * 0.405);
      const artX = pad;
      const artY = Math.round(h * 0.155);
      drawCover(artX, artY, artSize);
      const rightX = artX + artSize + Math.round(w * 0.055);
      const rightW = w - pad - rightX;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = mutedInk;
      ctx.font = '900 ' + Math.round(w * 0.021) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('THE STREAMING', rightX, artY + w * 0.035);
      ctx.fillText('MILESTONE', rightX, artY + w * 0.062);
      ctx.fillStyle = ink;
      ctx.font = '900 ' + Math.round(w * 0.12) + 'px Inter, system-ui, sans-serif';
      ctx.fillText(milestoneLabel(data.milestone), rightX, artY + w * 0.20);
      ctx.fillStyle = accent;
      ctx.fillRect(rightX, artY + w * 0.225, Math.min(rightW, w * 0.16), Math.max(8, w * 0.009));
      ctx.fillStyle = ink;
      ctx.font = '900 ' + Math.round(w * 0.043) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('STREAMS', rightX, artY + w * 0.285);
      ctx.fillStyle = mutedInk;
      drawFitted(data.releaseTitle, rightX, artY + w * 0.345, rightW, '700 ' + Math.round(w * 0.023) + 'px Inter, system-ui, sans-serif');
      drawFitted(data.artistName, rightX, artY + w * 0.382, rightW, '500 ' + Math.round(w * 0.021) + 'px Inter, system-ui, sans-serif');

      ctx.fillStyle = ink;
      ctx.fillRect(pad, Math.round(h * 0.625), w - pad * 2, Math.round(h * 0.20));
      ctx.fillStyle = accent2;
      ctx.fillRect(pad, Math.round(h * 0.625), Math.round(w * 0.012), Math.round(h * 0.20));
      ctx.textAlign = 'left';
      ctx.fillStyle = '#BDB8AE';
      ctx.font = '800 ' + Math.round(w * 0.018) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('TOTAL REPORTED STREAMS', pad + w * 0.04, h * 0.675);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 ' + Math.round(w * 0.052) + 'px Inter, system-ui, sans-serif';
      ctx.fillText(fmtNum(data.streamsAtAward), pad + w * 0.04, h * 0.745);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#BDB8AE';
      ctx.font = '800 ' + Math.round(w * 0.018) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('UNLOCKED ON', w - pad - w * 0.04, h * 0.675);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 ' + Math.round(w * 0.027) + 'px Inter, system-ui, sans-serif';
      ctx.fillText(new Date(data.awardedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), w - pad - w * 0.04, h * 0.735);

      const platformY = Math.round(h * 0.875);
      ctx.fillStyle = mutedInk;
      ctx.textAlign = 'left';
      ctx.font = '900 ' + Math.round(w * 0.016) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('AVAILABLE ACROSS', pad, platformY);
      await drawStreamingPlatformLogos(ctx, w, pad, platformY + w * 0.012);
      ctx.fillStyle = mutedInk;
      ctx.textAlign = 'center';
      ctx.font = '800 ' + Math.round(w * 0.014) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('MALPINOH DISTRO  •  MUSIC WITHOUT BORDERS', w / 2, h - w * 0.025);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = mutedInk;
      ctx.font = '900 ' + Math.round(w * 0.027) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('YOUR MUSIC. YOUR MOMENT.', w / 2, h * 0.155);
      const artSize = Math.round(w * 0.60);
      const artX = Math.round((w - artSize) / 2);
      const artY = Math.round(h * 0.185);
      drawCover(artX, artY, artSize);

      ctx.fillStyle = ink;
      ctx.font = '900 ' + Math.round(w * 0.18) + 'px Inter, system-ui, sans-serif';
      ctx.fillText(milestoneLabel(data.milestone), w / 2, h * 0.64);
      ctx.fillStyle = accent;
      ctx.fillRect(w * 0.25, h * 0.655, w * 0.50, w * 0.012);
      ctx.fillStyle = ink;
      ctx.font = '900 ' + Math.round(w * 0.047) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('STREAMS', w / 2, h * 0.70);
      ctx.fillStyle = mutedInk;
      drawFitted(data.releaseTitle, w / 2, h * 0.745, w * 0.82, '800 ' + Math.round(w * 0.034) + 'px Inter, system-ui, sans-serif');
      drawFitted(data.artistName, w / 2, h * 0.775, w * 0.82, '600 ' + Math.round(w * 0.028) + 'px Inter, system-ui, sans-serif');

      ctx.fillStyle = ink;
      ctx.fillRect(0, footerY, w, footerH);
      ctx.fillStyle = accent2;
      ctx.fillRect(0, footerY, w, Math.round(w * 0.012));
      ctx.textAlign = 'left';
      ctx.fillStyle = '#BDB8AE';
      ctx.font = '800 ' + Math.round(w * 0.022) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('TOTAL STREAMS', pad, footerY + footerH * 0.24);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 ' + Math.round(w * 0.052) + 'px Inter, system-ui, sans-serif';
      ctx.fillText(fmtNum(data.streamsAtAward), pad, footerY + footerH * 0.43);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#BDB8AE';
      ctx.font = '800 ' + Math.round(w * 0.022) + 'px Inter, system-ui, sans-serif';
      ctx.fillText(new Date(data.awardedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), w - pad, footerY + footerH * 0.24);
      await drawStreamingPlatformLogos(ctx, w, pad, footerY + footerH * 0.52);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 ' + Math.round(w * 0.018) + 'px Inter, system-ui, sans-serif';
      ctx.fillText('MALPINOH DISTRO  •  MUSIC WITHOUT BORDERS', w / 2, h - w * 0.025);
    }

    setPreview(canvas.toDataURL('image/png'));
    setRendering(false);
  }, [data, format]);

  useEffect(() => {
    if (open && data) void draw();
  }, [open, data, format, draw]);

  const fileName = data
    ? `${data.artistName}-${milestoneLabel(data.milestone)}-streams.png`
        .replace(/[^a-zA-Z0-9.\-]+/g, '-')
        .toLowerCase()
    : 'milestone.png';

  const getBlob = async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  };

  const handleDownload = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Promo card saved', description: 'Share it on WhatsApp, Instagram or Facebook.' });
  };

  const handleShare = async () => {
    const blob = await getBlob();
    if (!blob || !data) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    const text = `${milestoneLabel(data.milestone)} streams on "${data.releaseTitle}" 🎉 — via MALPINOHDISTRO`;

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Milestone unlocked', text });
        return;
      } catch {
        return; // user cancelled
      }
    }
    await handleDownload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[92vh] flex flex-col">
        <DialogHeader className="p-4 pb-3 sm:p-5 sm:pb-3 text-left">
          <DialogTitle className="text-base sm:text-lg">Share your milestone</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Download a promo card for WhatsApp status, Instagram or Facebook posts and stories.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-5 flex gap-2">
          {(Object.keys(SIZES) as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`flex-1 rounded-lg border p-2.5 text-left transition-colors ${
                format === f ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                {f === 'square' ? <Square className="h-3.5 w-3.5" /> : <RectangleVertical className="h-3.5 w-3.5" />}
                {SIZES[f].label}
              </span>
              <span className="block text-[10px] text-muted-foreground mt-0.5">{SIZES[f].hint}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="rounded-xl bg-[#E8E2D7] p-3 sm:p-4 flex items-center justify-center min-h-[220px]">
            {rendering || !preview ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <img
                src={preview}
                alt="Milestone promo card preview"
                className={`rounded-lg shadow-lg w-full ${format === 'story' ? 'max-w-[220px]' : 'max-w-[320px]'}`}
              />
            )}
          </div>
        </div>

        <div className="p-4 pt-0 sm:p-5 sm:pt-0 flex gap-2">
          <Button onClick={handleShare} className="flex-1" disabled={rendering}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button onClick={handleDownload} variant="outline" className="flex-1" disabled={rendering}>
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default MilestonePromoCard;
