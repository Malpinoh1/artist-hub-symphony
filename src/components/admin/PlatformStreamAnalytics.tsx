import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, BarChart3, TrendingUp, Radio, Music } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { fetchPlatformStreamAnalytics } from '@/services/royaltyIngestionService';

const MONTHS = ['All','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#14B8A6', '#F97316'];

const fmtNum = (n: number | string) => new Intl.NumberFormat().format(Math.round(Number(n) || 0));
const fmt$ = (n: number | string) => `$${Number(n || 0).toFixed(2)}`;

const PlatformStreamAnalytics: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<number | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['platform-stream-analytics', year, month],
    queryFn: () => fetchPlatformStreamAnalytics(year, month),
    staleTime: 60_000,
  });

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const monthlyChart = (data?.by_month || []).map((r) => ({
    label: `${MONTHS[r.period_month]} ${String(r.period_year).slice(2)}`,
    streams: Number(r.streams),
    revenue: Number(r.revenue),
  }));
  const dspChart = (data?.by_dsp || []).slice(0, 8).map((r) => ({ name: r.dsp_name, streams: Number(r.streams) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Platform Stream Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label>Year</Label>
            <Select value={year ? String(year) : 'all'} onValueChange={(v) => setYear(v === 'all' ? undefined : parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Month</Label>
            <Select value={month ? String(month) : 'all'} onValueChange={(v) => setMonth(v === 'all' ? undefined : parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTHS.slice(1).map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3 w-3" /> Total Streams</div>
                <p className="text-2xl font-semibold">{fmtNum(data?.total_streams || 0)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3 w-3" /> Total Revenue</div>
                <p className="text-2xl font-semibold">{fmt$(data?.total_revenue || 0)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Music className="h-3 w-3" /> Top Tracks</div>
                <p className="text-2xl font-semibold">{data?.top_tracks?.length || 0}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Radio className="h-3 w-3" /> DSPs</div>
                <p className="text-2xl font-semibold">{data?.by_dsp?.length || 0}</p>
              </CardContent></Card>
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
                      <Tooltip formatter={(v: any) => fmtNum(v)} />
                      <Bar dataKey="streams" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
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
                      <Tooltip formatter={(v: any) => fmt$(v)} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Streams by DSP</CardTitle></CardHeader>
                <CardContent>
                  {dspChart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No DSP data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={dspChart} dataKey="streams" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {dspChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtNum(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Top 100 Artists</CardTitle></CardHeader>
                <CardContent className="max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Artist</TableHead><TableHead className="text-right">Streams</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(data?.top_artists || []).map((a, i) => (
                        <TableRow key={a.artist_id + i}>
                          <TableCell>{i+1}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{a.account_name || a.name || '—'}</TableCell>
                          <TableCell className="text-right">{fmtNum(a.streams)}</TableCell>
                          <TableCell className="text-right">{fmt$(a.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Top 100 Tracks</CardTitle></CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Track</TableHead><TableHead className="text-right">Streams</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(data?.top_tracks || []).map((t, i) => (
                      <TableRow key={t.track_title + i}>
                        <TableCell>{i+1}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{t.track_title}</TableCell>
                        <TableCell className="text-right">{fmtNum(t.streams)}</TableCell>
                        <TableCell className="text-right">{fmt$(t.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformStreamAnalytics;
