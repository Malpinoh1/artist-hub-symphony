import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarClock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useReleaseMonthlyStreams } from '@/hooks/useStreamAnalytics';
import { useReleaseReportedStats, MONTH_ABBR, formatPeriod } from '@/hooks/useReportedStats';

const fmtNum = (n: number) => new Intl.NumberFormat().format(Math.round(n || 0));
const fmt$ = (n: number) => `$${Number(n || 0).toFixed(2)}`;

const ReleaseMonthlyStreams: React.FC<{ releaseId: string }> = ({ releaseId }) => {
  const { data: reported, isLoading } = useReleaseReportedStats(releaseId);
  const { data: rows } = useReleaseMonthlyStreams(releaseId);

  const chart = useMemo(
    () =>
      (reported?.monthly || []).map((m) => ({
        label: `${MONTH_ABBR[m.period_month - 1]} ${String(m.period_year).slice(2)}`,
        streams: Number(m.streams || 0),
        plays: Number(m.plays || 0),
      })),
    [reported?.monthly],
  );

  const dsp = useMemo(() => {
    const byDsp = new Map<string, number>();
    for (const r of (rows || []) as any[]) {
      if (r.dsp_name) byDsp.set(r.dsp_name, (byDsp.get(r.dsp_name) || 0) + Number(r.streams || 0));
    }
    return Array.from(byDsp.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rows]);

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (!reported || (!reported.lifetime_streams && !(reported.monthly || []).length)) return null;

  const rps = reported.lifetime_streams > 0
    ? (Number(reported.lifetime_earnings) / Number(reported.lifetime_streams)).toFixed(4)
    : '0.0000';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Reported Streaming Performance</CardTitle>
        <CardDescription className="text-xs flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" /> Reporting period
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {formatPeriod(reported.period_year, reported.period_month)}
          </Badge>
          <span>
            Last updated{' '}
            {reported.last_updated
              ? new Date(reported.last_updated).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Plays (period)</p><p className="font-semibold">{fmtNum(reported.period_plays)}</p></div>
          <div><p className="text-xs text-muted-foreground">Streams (period)</p><p className="font-semibold">{fmtNum(reported.period_streams)}</p></div>
          <div><p className="text-xs text-muted-foreground">Earnings (period)</p><p className="font-semibold">{fmt$(reported.period_earnings)}</p></div>
          <div><p className="text-xs text-muted-foreground">Lifetime Plays</p><p className="font-semibold">{fmtNum(reported.lifetime_plays)}</p></div>
          <div><p className="text-xs text-muted-foreground">Lifetime Streams</p><p className="font-semibold">{fmtNum(reported.lifetime_streams)}</p></div>
          <div><p className="text-xs text-muted-foreground">Lifetime Earnings</p><p className="font-semibold">{fmt$(reported.lifetime_earnings)}</p></div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Revenue per stream ${rps}. Figures are aggregated from your latest processed royalty statements.
        </p>

        {chart.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">Historical Trend</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
                <Line type="monotone" dataKey="streams" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="plays" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {dsp.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">DSP Performance</p>
            <div className="space-y-1 text-sm">
              {dsp.map(([name, streams]) => (
                <div key={name} className="flex justify-between">
                  <span className="truncate">{name}</span>
                  <span className="text-muted-foreground">{fmtNum(streams)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReleaseMonthlyStreams;
