import React from 'react';

/**
 * Official DSP / platform brand marks.
 * Served from the Simple Icons CDN, which hosts the official vector marks
 * in each brand's official colour. Falls back to a brand-coloured letter mark.
 */

type DspEntry = { slug: string; color: string; label: string };

const normalize = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

const DSPS: Record<string, DspEntry> = {
  spotify: { slug: 'spotify', color: '1DB954', label: 'Spotify' },
  applemusic: { slug: 'applemusic', color: 'FA5A5F', label: 'Apple Music' },
  applemusicitunes: { slug: 'applemusic', color: 'FA5A5F', label: 'Apple Music / iTunes' },
  itunes: { slug: 'itunes', color: 'FB5BC5', label: 'iTunes' },
  itunesringtones: { slug: 'itunes', color: 'FB5BC5', label: 'iTunes Ringtones' },
  youtubemusic: { slug: 'youtubemusic', color: 'FF0000', label: 'YouTube Music' },
  youtube: { slug: 'youtube', color: 'FF0000', label: 'YouTube' },
  deezer: { slug: 'deezer', color: 'A238FF', label: 'Deezer' },
  tidal: { slug: 'tidal', color: '000000', label: 'Tidal' },
  amazonmusic: { slug: 'amazonmusic', color: '46C3D0', label: 'Amazon Music' },
  amazon: { slug: 'amazon', color: 'FF9900', label: 'Amazon' },
  soundcloud: { slug: 'soundcloud', color: 'FF5500', label: 'SoundCloud' },
  facebook: { slug: 'facebook', color: '0866FF', label: 'Facebook' },
  instagram: { slug: 'instagram', color: 'E4405F', label: 'Instagram' },
  tiktok: { slug: 'tiktok', color: '000000', label: 'TikTok' },
  snapchat: { slug: 'snapchat', color: 'FFFC00', label: 'Snapchat' },
  boomplay: { slug: 'boomplaymusic', color: 'E6006D', label: 'Boomplay' },
  audiomack: { slug: 'audiomack', color: 'FFA200', label: 'Audiomack' },
  anghami: { slug: 'anghami', color: '9B4DFF', label: 'Anghami' },
  pandora: { slug: 'pandora', color: '224099', label: 'Pandora' },
  napster: { slug: 'napster', color: '0084C8', label: 'Napster' },
  iheartradio: { slug: 'iheartradio', color: 'C6002B', label: 'iHeartRadio' },
  shazam: { slug: 'shazam', color: '0088FF', label: 'Shazam' },
  beatport: { slug: 'beatport', color: '01FF95', label: 'Beatport' },
  qobuz: { slug: 'qobuz', color: '000000', label: 'Qobuz' },
  kkbox: { slug: 'kkbox', color: '00D8D8', label: 'KKBOX' },
  jiosaavn: { slug: 'jiosaavn', color: '2BC5B4', label: 'JioSaavn' },
  saavn: { slug: 'jiosaavn', color: '2BC5B4', label: 'Saavn' },
  netease: { slug: 'neteasecloudmusic', color: 'C20C0C', label: 'NetEase' },
  neteasecloudmusic: { slug: 'neteasecloudmusic', color: 'C20C0C', label: 'NetEase Cloud Music' },
  tencent: { slug: 'tencentqq', color: '12B7F5', label: 'Tencent' },
  qqmusic: { slug: 'tencentqq', color: '12B7F5', label: 'QQ Music' },
  joox: { slug: 'joox', color: '00D74B', label: 'JOOX' },
  triller: { slug: 'triller', color: 'FF0089', label: 'Triller' },
  twitter: { slug: 'x', color: '000000', label: 'X' },
  x: { slug: 'x', color: '000000', label: 'X' },
  audius: { slug: 'audius', color: '7E1BCC', label: 'Audius' },
  bandcamp: { slug: 'bandcamp', color: '408294', label: 'Bandcamp' },
};

export const getDspEntry = (name: string): DspEntry | undefined => DSPS[normalize(name)];

interface DspLogoProps {
  name: string;
  /** pixel size of the square logo */
  size?: number;
  className?: string;
  /** keep dark marks visible on dark backgrounds */
  invertOnDark?: boolean;
}

/** Brand-coloured letter mark used when a platform has no official vector mark. */
const LetterMark: React.FC<{ name: string; size: number; className?: string }> = ({
  name,
  size,
  className = '',
}) => (
  <span
    className={`inline-flex items-center justify-center rounded bg-muted text-muted-foreground font-bold shrink-0 ${className}`}
    style={{ width: size, height: size, fontSize: Math.max(9, size * 0.5) }}
    aria-hidden="true"
  >
    {name.charAt(0).toUpperCase()}
  </span>
);

export const DspLogo: React.FC<DspLogoProps> = ({
  name,
  size = 20,
  className = '',
  invertOnDark = true,
}) => {
  const entry = getDspEntry(name);
  const [failed, setFailed] = React.useState(false);

  if (!entry || failed) return <LetterMark name={name} size={size} className={className} />;

  const isDarkMark = entry.color === '000000';

  return (
    <img
      src={`https://cdn.simpleicons.org/${entry.slug}/${entry.color}`}
      alt={`${entry.label} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain ${isDarkMark && invertOnDark ? 'dark:invert' : ''} ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default DspLogo;
