import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchMonthlyEarnings } from '@/services/royaltyIngestionService';
import { Loader2 } from 'lucide-react';

interface Props { artistId: string }

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MonthlyTrendChart: React.FC<Props> = ({ artistId }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchMonthlyEarnings(artistId);
        setData(rows.map((r: any) => ({
          label: `${MONTH_ABBR[r.period_month - 1]} ${String(r.period_year).slice(2)}`,
          earnings: Number(r.total_earnings),
          streams: r.total_streams,
        })));
      } finally {
        setLoading(false);
      }
    })();
  }, [artistId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Earnings Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No royalty data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
              <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyTrendChart;
