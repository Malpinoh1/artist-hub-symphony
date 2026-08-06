import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music, PlayCircle, Radio, DollarSign, CalendarClock, TrendingUp, TrendingDown, Disc3 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useArtistReportedSnapshot, MONTH_ABBR, formatPeriod } from '@/hooks/useReportedStats';

const fmtNum = (n: number) => new Intl.NumberFormat().format(Math.round(n || 0));
const fmt$ = (n: number) => `$${Number(n || 0).toFixed(2)}`;

const Tile: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub?: string; trend?: number | null;
}> = ({ icon, label, value, sub, trend }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        {typeof trend === 'number' && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
            trend >= 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-destructive/15 text-destructive'
          }`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xl sm:text-2xl font-semibold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card>
    <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
      <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-2 sm:p-4">
      <div className="h-56">{children}</div>
    </CardContent>
  </Card>
);

const ReportedPerformance: React.FC<{ artistId: string }> = ({ artistId }) => {
  const { data, isLoading } = useArtistReportedSnapshot(artistId);

  const chart = useMemo(
    () =>
      (data?.monthly || []).map((m) => ({
        label: `${MONTH_ABBR[m.period_month - 1]} ${String(m.period_year).slice(2)}`,
        plays: Number(m.plays || 0),
        streams: Number(m.streams || 0),
        earnings: Number(m.earnings || 0),
      })),
    [data?.monthly],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-4">
            <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
            <div className="h-6 w-20 bg-muted rounded animate-pulse mt-3" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse mt-2" />
          </CardContent></Card>
        ))}
      </div>
    );
  }

  const s = data;
  const hasReport = !!(s?.period_year && s?.period_month);

  return (
    <div className="space-y-5">
      {/* Reporting period banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Reporting period</span>
            <Badge variant="secondary">{formatPeriod(s?.period_year, s?.period_month)}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated{' '}
            {s?.last_updated ? new Date(s.last_updated).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </div>
          <p className="text-[11px] text-muted-foreground w-full">
            Figures come from your latest processed royalty statements across all of our delivery partners. If a new month
            hasn't been reported yet, the most recent available report stays on screen.
          </p>
        </CardContent>
      </Card>

      {/* Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Tile
          icon={<PlayCircle className="h-5 w-5" />}
          label="Plays (reported period)"
          value={fmtNum(s?.period_plays || 0)}
          sub={`Lifetime ${fmtNum(s?.lifetime_plays || 0)}`}
          trend={s?.growth_pct ?? null}
        />
        <Tile
          icon={<Radio className="h-5 w-5" />}
          label="Streams (reported period)"
          value={fmtNum(s?.period_streams || 0)}
          sub={`Lifetime ${fmtNum(s?.lifetime_streams || 0)}`}
        />
        <Tile
          icon={<DollarSign className="h-5 w-5" />}
          label="Earnings (reported period)"
          value={fmt$(s?.period_earnings || 0)}
          sub={`Lifetime ${fmt$(s?.lifetime_earnings || 0)}`}
        />
        <Tile
          icon={<Music className="h-5 w-5" />}
          label="Reported months"
          value={String((s?.monthly || []).length)}
          sub={hasReport ? 'Statements processed' : 'Awaiting first report'}
        />
      </div>

      {/* Charts */}
      {chart.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Monthly Plays">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="playsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
                <Area type="monotone" dataKey="plays" stroke="hsl(var(--primary))" fill="url(#playsFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly Streams">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
                <Bar dataKey="streams" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly Earnings (USD)">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmt$(Number(v))} />
                <Area type="monotone" dataKey="earnings" stroke="#10B981" fill="url(#earnFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top tracks */}
          <Card>
            <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
              <CardTitle className="text-sm sm:text-base">Top Tracks</CardTitle>
              <CardDescription className="text-xs">Lifetime reported streams</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-2">
              {(s?.top_tracks || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No track data reported yet.</p>
              )}
              {(s?.top_tracks || []).slice(0, 5).map((t, i) => (
                <div key={t.title + i} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                  <span className="w-6 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">{fmt$(t.earnings)} earned</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{fmtNum(t.streams)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top releases */}
      <Card>
        <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
          <CardTitle className="text-sm sm:text-base">Top Releases</CardTitle>
          <CardDescription className="text-xs">Lifetime reported plays, streams and earnings</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {(s?.top_releases || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No release data reported yet.</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(s?.top_releases || []).slice(0, 6).map((r, i) => (
                <Link
                  key={r.release_id}
                  to={`/releases/${r.release_id}`}
                  className="flex items-center gap-3 rounded-xl border border-border p-2.5 hover:border-primary/40 transition-colors"
                >
                  {r.cover_art_url ? (
                    <img src={r.cover_art_url} alt={`${r.title} cover art`} loading="lazy"
                      className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Disc3 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtNum(r.plays)} plays · {fmtNum(r.streams)} streams · {fmt$(r.earnings)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">#{i + 1}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportedPerformance;
