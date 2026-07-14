import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useReleaseMonthlyStreams } from '@/hooks/useStreamAnalytics';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtNum = (n: number) => new Intl.NumberFormat().format(Math.round(n || 0));
const fmt$ = (n: number) => `$${Number(n || 0).toFixed(2)}`;

const ReleaseMonthlyStreams: React.FC<{ releaseId: string }> = ({ releaseId }) => {
  const { data, isLoading } = useReleaseMonthlyStreams(releaseId);

  const { chart, lifetime, lifetimeRev, thisMonth, prevMonth, dsp } = useMemo(() => {
    const rows = (data || []) as any[];
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const prev = new Date(y, m - 2, 1);
    const py = prev.getFullYear();
    const pm = prev.getMonth() + 1;
    const byMonth = new Map<string, { label: string; y: number; m: number; streams: number; revenue: number }>();
    const byDsp = new Map<string, number>();
    let lifetime = 0, lifetimeRev = 0, thisMonth = 0, prevMonth = 0;
    for (const r of rows) {
      lifetime += Number(r.streams || 0);
      lifetimeRev += Number(r.revenue || 0);
      if (r.period_year === y && r.period_month === m) thisMonth += Number(r.streams || 0);
      if (r.period_year === py && r.period_month === pm) prevMonth += Number(r.streams || 0);
      const key = `${r.period_year}-${r.period_month}`;
      const e = byMonth.get(key) || { label: `${MONTH_ABBR[r.period_month - 1]} ${String(r.period_year).slice(2)}`, y: r.period_year, m: r.period_month, streams: 0, revenue: 0 };
      e.streams += Number(r.streams || 0);
      e.revenue += Number(r.revenue || 0);
      byMonth.set(key, e);
      if (r.dsp_name) byDsp.set(r.dsp_name, (byDsp.get(r.dsp_name) || 0) + Number(r.streams || 0));
    }
    return {
      chart: Array.from(byMonth.values()).sort((a, b) => a.y - b.y || a.m - b.m),
      lifetime, lifetimeRev, thisMonth, prevMonth,
      dsp: Array.from(byDsp.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [data]);

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (!data || data.length === 0) return null;

  const growth = prevMonth > 0 ? (((thisMonth - prevMonth) / prevMonth) * 100).toFixed(1) : null;
  const rps = lifetime > 0 ? (lifetimeRev / lifetime).toFixed(4) : '0.0000';

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Monthly Streaming Analytics</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Lifetime Streams</p><p className="font-semibold">{fmtNum(lifetime)}</p></div>
          <div><p className="text-xs text-muted-foreground">This Month</p><p className="font-semibold">{fmtNum(thisMonth)}</p></div>
          <div><p className="text-xs text-muted-foreground">Previous Month</p><p className="font-semibold">{fmtNum(prevMonth)}</p></div>
          <div><p className="text-xs text-muted-foreground">Monthly Growth</p><p className="font-semibold">{growth == null ? '—' : `${growth}%`}</p></div>
          <div><p className="text-xs text-muted-foreground">Lifetime Revenue</p><p className="font-semibold">{fmt$(lifetimeRev)}</p></div>
          <div><p className="text-xs text-muted-foreground">Revenue / Stream</p><p className="font-semibold">${rps}</p></div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2">Historical Trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
              <Line type="monotone" dataKey="streams" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

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
