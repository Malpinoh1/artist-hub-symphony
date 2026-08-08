import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2, Square, RectangleVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { milestoneLabel, milestoneTier } from '@/hooks/useReportedStats';

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



    const tier = milestoneTier(data.milestone);
    const [c1, c2] = TIER_ACCENT[tier] || TIER_ACCENT.Diamond;
    const isStory = format === 'story';

    // Background — deep black/purple base
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0A0710');
    bg.addColorStop(0.55, '#140E24');
    bg.addColorStop(1, '#080610');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Accent glows
    const glow = (cx: number, cy: number, r: number, color: string, alpha: number) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    };
    glow(w * 0.15, h * 0.12, w * 0.75, c1, 0.35);
    glow(w * 0.9, h * 0.85, w * 0.8, c2, 0.22);

    // Fine grid texture
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const pad = Math.round(w * 0.085);

    // Brand line
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = `600 ${Math.round(w * 0.028)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.letterSpacing = '4px';
    ctx.fillText('MALPINOHDISTRO', pad, pad + w * 0.02);
    ctx.letterSpacing = '0px';

    // Tier pill (top-right)
    const pillText = `${tier.toUpperCase()} MILESTONE`;
    ctx.font = `800 ${Math.round(w * 0.024)}px Inter, system-ui, sans-serif`;
    const pillW = ctx.measureText(pillText).width + w * 0.06;
    const pillH = Math.round(w * 0.058);
    const pillX = w - pad - pillW;
    const pillY = pad - pillH * 0.55;
    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    pillGrad.addColorStop(0, c1);
    pillGrad.addColorStop(1, c2);
    ctx.fillStyle = pillGrad;
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#0A0710';
    ctx.textAlign = 'center';
    ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH * 0.66);

    // Artwork
    const artSize = Math.round(w * (isStory ? 0.56 : 0.24));
    const artX = isStory ? Math.round((w - artSize) / 2) : pad;
    const artY = Math.round(h * (isStory ? 0.185 : 0.16));

    const cover = data.coverUrl ? await loadImage(data.coverUrl) : null;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 24;
    roundRect(ctx, artX, artY, artSize, artSize, Math.round(artSize * 0.07));
    ctx.fillStyle = '#1A1428';
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRect(ctx, artX, artY, artSize, artSize, Math.round(artSize * 0.07));
    ctx.clip();
    if (cover) {
      const scale = Math.max(artSize / cover.width, artSize / cover.height);
      const dw = cover.width * scale;
      const dh = cover.height * scale;
      ctx.drawImage(cover, artX + (artSize - dw) / 2, artY + (artSize - dh) / 2, dw, dh);
    } else {
      const ph = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
      ph.addColorStop(0, c1);
      ph.addColorStop(1, '#1A1428');
      ctx.fillStyle = ph;
      ctx.fillRect(artX, artY, artSize, artSize);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round(artSize * 0.28)}px Inter, system-ui, sans-serif`;
      ctx.fillText('♪', artX + artSize / 2, artY + artSize * 0.64);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    roundRect(ctx, artX, artY, artSize, artSize, Math.round(artSize * 0.07));
    ctx.stroke();

    // Text block — baselines measured from the bottom of the artwork
    const textX = isStory ? w / 2 : pad;
    ctx.textAlign = isStory ? 'center' : 'left';
    const bigSize = Math.round(w * (isStory ? 0.26 : 0.19));
    const gap = Math.round(h * (isStory ? 0.038 : 0.028));

    let ty = artY + artSize + gap + Math.round(bigSize * 0.78);

    const numGrad = ctx.createLinearGradient(
      isStory ? w * 0.15 : pad,
      ty - bigSize,
      isStory ? w * 0.85 : w - pad,
      ty,
    );
    numGrad.addColorStop(0, '#FFFFFF');
    numGrad.addColorStop(1, c2);
    ctx.fillStyle = numGrad;
    ctx.font = `900 ${bigSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(milestoneLabel(data.milestone), textX, ty);

    ty += Math.round(w * 0.055);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = `700 ${Math.round(w * 0.036)}px Inter, system-ui, sans-serif`;
    ctx.letterSpacing = '8px';
    ctx.fillText('STREAMS', isStory ? textX - 4 : textX, ty);
    ctx.letterSpacing = '0px';


    // Release title (truncate to fit)
    ty += Math.round(w * (isStory ? 0.085 : 0.08));
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(w * 0.048)}px Inter, system-ui, sans-serif`;
    const maxTextW = w - pad * 2;
    let title = data.releaseTitle;
    while (ctx.measureText(title).width > maxTextW && title.length > 4) {
      title = title.slice(0, -2);
    }
    if (title !== data.releaseTitle) title = title.replace(/\s+$/, '') + '…';
    ctx.fillText(title, textX, ty);

    ty += Math.round(w * 0.045);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `500 ${Math.round(w * 0.032)}px Inter, system-ui, sans-serif`;
    let artist = data.artistName;
    while (ctx.measureText(artist).width > maxTextW && artist.length > 4) {
      artist = artist.slice(0, -2);
    }
    ctx.fillText(artist, textX, ty);

    // Footer stat strip
    const stripH = Math.round(w * 0.13);

    const stripY = h - pad - stripH;
    roundRect(ctx, pad, stripY, w - pad * 2, stripH, Math.round(stripH * 0.28));
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    roundRect(ctx, pad, stripY, w - pad * 2, stripH, Math.round(stripH * 0.28));
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 ${Math.round(w * 0.023)}px Inter, system-ui, sans-serif`;
    ctx.fillText('TOTAL STREAMS', pad + w * 0.045, stripY + stripH * 0.42);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${Math.round(w * 0.038)}px Inter, system-ui, sans-serif`;
    ctx.fillText(fmtNum(data.streamsAtAward), pad + w * 0.045, stripY + stripH * 0.8);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 ${Math.round(w * 0.023)}px Inter, system-ui, sans-serif`;
    ctx.fillText('UNLOCKED', w - pad - w * 0.045, stripY + stripH * 0.42);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${Math.round(w * 0.038)}px Inter, system-ui, sans-serif`;
    ctx.fillText(
      new Date(data.awardedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      w - pad - w * 0.045,
      stripY + stripH * 0.8,
    );

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
          <div className="rounded-xl bg-muted/40 p-3 flex items-center justify-center min-h-[220px]">
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
