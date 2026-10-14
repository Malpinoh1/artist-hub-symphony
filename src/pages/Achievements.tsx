import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Lock, Disc3, Sparkles, Share2 } from 'lucide-react';
import AnimatedCard from '@/components/AnimatedCard';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamPermissions } from '@/hooks/useTeamPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import MilestonePromoCard, { MilestoneCardData } from '@/components/achievements/MilestonePromoCard';
import { loadCoverPalette } from '@/lib/coverPalette';
import {
  useArtistAchievements, useArtistReportedSnapshot,
  MILESTONES, milestoneLabel, milestoneTier,
} from '@/hooks/useReportedStats';


const fmtNum = (n: number) => new Intl.NumberFormat().format(Math.round(n || 0));

const tierStyles: Record<string, string> = {
  Bronze: 'from-amber-700/30 to-amber-500/10 text-amber-500 border-amber-500/30',
  Silver: 'from-slate-400/30 to-slate-300/10 text-slate-300 border-slate-400/30',
  Gold: 'from-yellow-500/30 to-yellow-400/10 text-yellow-400 border-yellow-500/30',
  Platinum: 'from-cyan-400/30 to-cyan-300/10 text-cyan-300 border-cyan-400/30',
  Diamond: 'from-primary/40 to-fuchsia-500/10 text-primary border-primary/40',
};


interface UnlockedMilestoneTileProps {
  achievement: any;
  release: any;
  tier: string;
  title: string;
  streamsLabel: string;
  artistName: string;
  onShare: () => void;
}

const UnlockedMilestoneTile: React.FC<UnlockedMilestoneTileProps> = ({
  achievement, release, tier, title, streamsLabel, onShare,
}) => {
  const [palette, setPalette] = useState<{ primary: string; secondary: string } | null>(null);
  useEffect(() => {
    let active = true;
    loadCoverPalette(release?.cover_art_url).then((value) => {
      if (active) setPalette(value);
    });
    return () => { active = false; };
  }, [release?.cover_art_url]);

  const primary = palette?.primary || '#8B5CF6';
  const secondary = palette?.secondary || '#22D3EE';
  return (
    <article className="group relative isolate overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-52 overflow-hidden bg-neutral-950">
        {release?.cover_art_url ? (
          <img
            src={release.cover_art_url}
            alt={release.title ? release.title + ' cover art' : 'Release cover art'}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, ' + primary + ', ' + secondary + ')' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full border border-white/25 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            {tier} award
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">Milestone unlocked</p>
          <p className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">{streamsLabel}</p>
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.22em] text-white/90">streams</p>
        </div>
        <div className="absolute bottom-0 left-0 h-1.5 w-full" style={{ background: 'linear-gradient(90deg, ' + primary + ', ' + secondary + ')' }} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Unlocked {new Date(achievement.awarded_at).toLocaleDateString()}
            </p>
          </div>
          <div className="shrink-0 rounded-xl px-3 py-2 text-right" style={{ backgroundColor: primary + '18', color: primary }}>
            <p className="text-[9px] font-black uppercase tracking-wider">Total</p>
            <p className="text-sm font-black tabular-nums">{fmtNum(Number(achievement.streams_at_award))}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">MALPINOH DISTRO</span>
          <Button size="sm" onClick={onShare} className="h-8 rounded-full px-4 text-xs">
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Create promo
          </Button>
        </div>
      </div>
    </article>
  );
};

const Achievements: React.FC = () => {
  const { user } = useAuth();
  const { getEffectiveAccountId } = useTeamPermissions();
  const artistId = getEffectiveAccountId() || user?.id;

  const { data: achievements = [], isLoading, isError: achievementsError } = useArtistAchievements(artistId);
  const { data: snapshot } = useArtistReportedSnapshot(artistId);

  const { data: releases = [] } = useQuery({
    queryKey: ['achievement-releases', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, title, artist_name, artist_account_id, cover_art_url')
        .eq('artist_id', artistId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!artistId,
  });

  const { data: artist } = useQuery({
    queryKey: ['achievement-artist-name', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('name, account_type')
        .eq('id', artistId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  // For label accounts, use the registered signed artist name when the release
  // metadata merely repeats the label/account name. Never label the performer
  // with the label name just because a release has incomplete artist metadata.
  const { data: signedArtists = [] } = useQuery({
    queryKey: ['achievement-signed-artists', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artist_accounts')
        .select('id, artist_name, signing_status')
        .eq('owner_id', artistId!)
        .eq('signing_status', 'signed')
        .order('artist_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!artistId && artist?.account_type === 'label',
  });

  const resolvePromoArtistName = (releaseArtistName?: string | null, artistAccountId?: string | null) => {
    const releaseName = releaseArtistName?.trim();
    const accountName = artist?.name?.trim();
    const isLabel = artist?.account_type === 'label';
    const linkedArtist = artistAccountId
      ? signedArtists.find((signedArtist: any) => signedArtist.id === artistAccountId)
      : null;
    if (linkedArtist?.artist_name?.trim()) return linkedArtist.artist_name.trim();
    if (releaseName && (!isLabel || !accountName || releaseName.localeCompare(accountName, undefined, { sensitivity: 'accent' }) !== 0)) {
      return releaseName;
    }
    if (isLabel && signedArtists.length === 1) return signedArtists[0].artist_name;
    if (isLabel) return 'Artist name needs linking';
    return releaseName || accountName || 'MALPINOHDISTRO Artist';
  };

  const [shareCard, setShareCard] = useState<MilestoneCardData | null>(null);



  const releaseMap = useMemo(
    () => new Map(releases.map((r: any) => [r.id, r])),
    [releases],
  );

  const releaseStreams = useMemo(() => {
    const m = new Map<string, number>();
    (snapshot?.top_releases || []).forEach((r) => m.set(r.release_id, Number(r.streams || 0)));
    return m;
  }, [snapshot?.top_releases]);

  const unlocked = achievements;
  const unlockedKeys = new Set(unlocked.map((a) => `${a.release_id || `track:${(a.track_title || '').trim().toLowerCase()}`}:${a.milestone}`));

  // Upcoming: next unreached milestone per release that already has streams
  const upcoming = useMemo(() => {
    const items: Array<{ release_id: string; title: string; cover: string | null; streams: number; milestone: number }> = [];
    releaseStreams.forEach((streams, releaseId) => {
      const next = MILESTONES.find((m) => !unlockedKeys.has(`${releaseId}:${m}`) && streams < m);
      if (next) {
        const rel: any = releaseMap.get(releaseId);
        items.push({
          release_id: releaseId,
          title: rel?.title || 'Release',
          cover: rel?.cover_art_url || null,
          streams,
          milestone: next,
        });
      }
    });
    return items.sort((a, b) => b.streams / b.milestone - a.streams / a.milestone).slice(0, 8);
  }, [releaseStreams, releaseMap, unlockedKeys]);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8 max-w-5xl pb-24 md:pb-8">
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-1.5 flex items-center gap-2">
          <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          Achievements
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Streaming milestones unlocked from your processed royalty statements. Every badge is awarded once, for life.
        </p>
      </div>

      <AnimatedCard>
        <Card className="mb-5 sm:mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Badges unlocked</p>
              <p className="text-xl font-semibold">{unlocked.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lifetime streams</p>
              <p className="text-xl font-semibold">{fmtNum(snapshot?.lifetime_streams || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lifetime plays</p>
              <p className="text-xl font-semibold">{fmtNum(snapshot?.lifetime_plays || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Releases tracked</p>
              <p className="text-xl font-semibold">{releaseStreams.size}</p>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Unlocked */}
      <AnimatedCard delay={80}>
        <Card className="mb-5 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-xl flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Unlocked milestones
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Awarded automatically when a release or a royalty-reported track reaches a milestone.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading achievements…</p>
            ) : achievementsError ? (
              <p role="alert" className="text-sm text-destructive py-4">Achievements could not be loaded. Please try again shortly; your recorded milestones have not been changed.</p>
            ) : unlocked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No milestones yet. Your first badge unlocks at 100 lifetime streams.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {unlocked.map((a) => {
                  const rel: any = a.release_id ? releaseMap.get(a.release_id) : null;
                  const tier = milestoneTier(Number(a.milestone));
                  const achievementTitle = a.track_title || rel?.title || 'Catalogue';
                  return (
                    <UnlockedMilestoneTile
                      key={a.id}
                      achievement={a}
                      release={rel}
                      tier={tier}
                      title={achievementTitle}
                      streamsLabel={milestoneLabel(Number(a.milestone))}
                      artistName={resolvePromoArtistName(rel?.artist_name, rel?.artist_account_id)}
                      onShare={() => setShareCard({
                        milestone: Number(a.milestone),
                        streamsAtAward: Number(a.streams_at_award),
                        awardedAt: a.awarded_at,
                        releaseTitle: achievementTitle,
                        coverUrl: rel?.cover_art_url || null,
                        artistName: resolvePromoArtistName(rel?.artist_name, rel?.artist_account_id),
                      })}
                    />

                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Upcoming */}
      <AnimatedCard delay={160}>
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-xl flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" /> Upcoming milestones
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">How close each release is to its next badge.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing in progress yet — upload and promote a release to start climbing.
              </p>
            ) : (
              upcoming.map((u) => {
                const pct = Math.min(100, (u.streams / u.milestone) * 100);
                return (
                  <Link key={`${u.release_id}-${u.milestone}`} to={`/releases/${u.release_id}`} className="block">
                    <div className="rounded-xl border border-border p-3 hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-medium truncate">{u.title}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Next: {milestoneLabel(u.milestone)}
                        </Badge>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {fmtNum(u.streams)} / {fmtNum(u.milestone)} streams ({pct.toFixed(1)}%)
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </AnimatedCard>

      <MilestonePromoCard
        data={shareCard}
        open={!!shareCard}
        onOpenChange={(o) => !o && setShareCard(null)}
      />
    </div>

  );
};

export default Achievements;
