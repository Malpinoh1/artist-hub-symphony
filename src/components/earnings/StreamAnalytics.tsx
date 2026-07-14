import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Music, Globe, Radio, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useArtistStreamSummary, useArtistMonthlyStreams } from '@/hooks/useStreamAnalytics';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#14B8A6', '#F97316'];

interface Props { artistId: string }

const fmtNum = (n: number) => new Intl.NumberFormat().format(Math.round(n || 0));
const fmt$ = (n: number) => `$${Number(n || 0).toFixed(2)}`;

const StatTile: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }> = ({ icon, label, value, sub, accent = 'text-primary' }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted ${accent}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-semibold truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const StreamAnalytics: React.FC<Props> = ({ artistId }) => {
  const summary = useArtistStreamSummary(artistId);
  const rows = useArtistMonthlyStreams(artistId);

  const { monthlyChart, dspChart, topTracks } = useMemo(() => {
    const data = rows.data || [];
    const byMonth = new Map<string, { label: string; y: number; m: number; streams: number; revenue: number }>();
    const byDsp = new Map<string, number>();
    const byTrack = new Map<string, { streams: number; revenue: number }>();

    for (const r of data as any[]) {
      const key = `${r.period_year}-${r.period_month}`;
      const entry = byMonth.get(key) || { label: `${MONTH_ABBR[r.period_month - 1]} ${String(r.period_year).slice(2)}`, y: r.period_year, m: r.period_month, streams: 0, revenue: 0 };
      entry.streams += Number(r.streams || 0);
      entry.revenue += Number(r.revenue || 0);
      byMonth.set(key, entry);

      if (r.dsp_name) byDsp.set(r.dsp_name, (byDsp.get(r.dsp_name) || 0) + Number(r.streams || 0));
      if (r.track_title) {
        const t = byTrack.get(r.track_title) || { streams: 0, revenue: 0 };
        t.streams += Number(r.streams || 0);
        t.revenue += Number(r.revenue || 0);
        byTrack.set(r.track_title, t);
      }
    }

    const monthlyChart = Array.from(byMonth.values()).sort((a, b) => a.y - b.y || a.m - b.m);
    const dspChart = Array.from(byDsp.entries()).map(([name, streams]) => ({ name, streams })).sort((a, b) => b.streams - a.streams).slice(0, 8);
    const topTracks = Array.from(byTrack.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.streams - a.streams).slice(0, 5);
    return { monthlyChart, dspChart, topTracks };
  }, [rows.data]);

  if (summary.isLoading || rows.isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />;
  }

  const s = summary.data || ({} as any);
  const growth = s.growth_pct;
  const growthUp = typeof growth === 'number' && growth >= 0;

  const hasData = (rows.data?.length || 0) > 0;
  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No streaming data yet. Once monthly royalty statements are imported, your streams will appear here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<Music className="h-4 w-4" />} label="Lifetime Streams" value={fmtNum(s.lifetime_streams)} sub={`Revenue ${fmt$(s.lifetime_revenue)}`} />
        <StatTile icon={<TrendingUp className="h-4 w-4" />} label="This Month" value={fmtNum(s.this_month_streams)} sub={`Prev ${fmtNum(s.previous_month_streams)}`} />
        <StatTile
          icon={growthUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          label="Monthly Growth"
          value={growth == null ? '—' : `${growthUp ? '+' : ''}${growth}%`}
          accent={growthUp ? 'text-emerald-500' : 'text-rose-500'}
        />
        <StatTile icon={<DollarSign className="h-4 w-4" />} label="Monthly Revenue" value={fmt$(s.monthly_revenue)} sub={`Avg/release ${fmtNum(s.avg_streams_per_release)}`} />
        <StatTile icon={<Music className="h-4 w-4" />} label="Top Song" value={s.top_track || '—'} />
        <StatTile icon={<Radio className="h-4 w-4" />} label="Top DSP" value={s.top_dsp || '—'} />
        <StatTile icon={<Globe className="h-4 w-4" />} label="Top Country" value={s.top_country || '—'} />
        <StatTile icon={<DollarSign className="h-4 w-4" />} label="Lifetime Revenue" value={fmt$(s.lifetime_revenue)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Streams by Month</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
                <Bar dataKey="streams" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Month</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: any) => fmt$(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Streams by Store</CardTitle></CardHeader>
          <CardContent>
            {dspChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Store data not available in imports</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={dspChart} dataKey="streams" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {dspChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Performing Tracks</CardTitle></CardHeader>
          <CardContent>
            {topTracks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tracks yet</p>
            ) : (
              <div className="space-y-2">
                {topTracks.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span className="truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="font-medium">{fmtNum(t.streams)} plays</span>
                      <span className="text-muted-foreground">{fmt$(t.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StreamAnalytics;
