import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Lock, Disc3, Sparkles } from 'lucide-react';
import AnimatedCard from '@/components/AnimatedCard';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamPermissions } from '@/hooks/useTeamPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
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

const Achievements: React.FC = () => {
  const { user } = useAuth();
  const { getEffectiveAccountId } = useTeamPermissions();
  const artistId = getEffectiveAccountId() || user?.id;

  const { data: achievements = [], isLoading } = useArtistAchievements(artistId);
  const { data: snapshot } = useArtistReportedSnapshot(artistId);

  const { data: releases = [] } = useQuery({
    queryKey: ['achievement-releases', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, title, cover_art_url')
        .eq('artist_id', artistId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!artistId,
  });

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
  const unlockedKeys = new Set(unlocked.map((a) => `${a.release_id}:${a.milestone}`));

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
              Awarded automatically when a release passes a milestone in a processed report.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading achievements…</p>
            ) : unlocked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No milestones yet. Your first badge unlocks at 100 lifetime streams.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {unlocked.map((a) => {
                  const rel: any = a.release_id ? releaseMap.get(a.release_id) : null;
                  const tier = milestoneTier(Number(a.milestone));
                  return (
                    <div key={a.id} className={`rounded-xl border bg-gradient-to-br p-3 flex items-center gap-3 ${tierStyles[tier]}`}>
                      {rel?.cover_art_url ? (
                        <img src={rel.cover_art_url} alt={`${rel.title} cover art`} loading="lazy"
                          className="h-14 w-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Disc3 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold">{milestoneLabel(Number(a.milestone))} streams</p>
                        <p className="text-xs text-foreground/80 truncate">{rel?.title || 'Catalogue'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(a.awarded_at).toLocaleDateString()} · {fmtNum(Number(a.streams_at_award))} streams
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">{tier}</Badge>
                    </div>
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
    </div>
  );
};

export default Achievements;
