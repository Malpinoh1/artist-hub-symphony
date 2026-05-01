import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchMonthlyEarnings } from '@/services/royaltyIngestionService';

interface Props {
  artistId: string;
}

const MONTHS = [
  'January','February','March','April','May','June','July','August','September','October','November','December',
];

const StatementGeneratorCard: React.FC<Props> = ({ artistId }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [available, setAvailable] = useState<{ year: number; month: number }[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMonthlyEarnings(artistId);
        setAvailable(data.map((d: any) => ({ year: d.period_year, month: d.period_month })));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [artistId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-statement', {
        body: { artistId, year, month },
      });
      if (error) throw error;
      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
        toast.success('Statement ready');
      } else {
        toast.error('No earnings found for that period');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate statement');
    } finally {
      setGenerating(false);
    }
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const hasAvailable = (y: number, m: number) => available.some((a) => a.year === y && a.month === m);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Royalty Statement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download a PDF of your earnings for any month.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Month</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {m} {hasAvailable(year, i + 1) ? '✓' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={generate} disabled={generating} className="w-full">
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Generate & Download PDF
        </Button>
      </CardContent>
    </Card>
  );
};

export default StatementGeneratorCard;
