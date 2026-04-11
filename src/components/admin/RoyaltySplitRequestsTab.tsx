import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface Split {
  id: string;
  track_id: string;
  artist_id: string;
  percentage: number;
  status: string;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface Track { id: string; title: string; primary_artist_id: string; }
interface Artist { id: string; name: string; email: string; }

const RoyaltySplitRequestsTab: React.FC = () => {
  const { user } = useAuth();
  const [splits, setSplits] = useState<Split[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('pending');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [splitsRes, tracksRes, artistsRes] = await Promise.all([
        supabase.from('royalty_splits').select('*').order('created_at', { ascending: false }),
        supabase.from('tracks').select('id, title, primary_artist_id'),
        supabase.from('artists').select('id, name, email'),
      ]);
      setSplits((splitsRes.data || []) as Split[]);
      setTracks(tracksRes.data || []);
      setArtists(artistsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getArtistName = (id: string) => artists.find(a => a.id === id)?.name || 'Unknown';
  const getTrackTitle = (id: string) => tracks.find(t => t.id === id)?.title || 'Unknown';

  const handleApprove = async (splitId: string) => {
    if (!user) return;
    setProcessing(splitId);
    try {
      const { error } = await supabase
        .from('royalty_splits')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', splitId);
      if (error) throw error;
      toast.success('Split approved');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (splitId: string) => {
    if (!user) return;
    setProcessing(splitId);
    try {
      const { error } = await supabase
        .from('royalty_splits')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', splitId);
      if (error) throw error;
      toast.success('Split rejected');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApprove = async (trackId: string) => {
    if (!user) return;
    const pendingForTrack = filteredSplits.filter(s => s.track_id === trackId && s.status === 'pending');
    
    // Validate total = 100
    const totalPct = pendingForTrack.reduce((sum, s) => sum + s.percentage, 0);
    if (totalPct !== 100) {
      toast.error(`Cannot approve: splits for this track total ${totalPct}%, must be 100%.`);
      return;
    }

    setProcessing(trackId);
    try {
      const ids = pendingForTrack.map(s => s.id);
      const { error } = await supabase
        .from('royalty_splits')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .in('id', ids);
      if (error) throw error;
      toast.success(`All splits for track approved`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk approve');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    }
  };

  const filteredSplits = splits.filter(s => filter === 'all' || s.status === filter);

  // Group pending splits by track for bulk actions
  const pendingTrackIds = [...new Set(filteredSplits.filter(s => s.status === 'pending').map(s => s.track_id))];

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const pendingCount = splits.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Royalty Split Requests</h3>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground">{pendingCount} pending request(s)</p>
          )}
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk approve cards for pending tracks */}
      {filter === 'pending' && pendingTrackIds.length > 0 && (
        <div className="grid gap-3">
          {pendingTrackIds.map(trackId => {
            const trackPending = filteredSplits.filter(s => s.track_id === trackId && s.status === 'pending');
            const totalPct = trackPending.reduce((sum, s) => sum + s.percentage, 0);
            const isValid = totalPct === 100;
            return (
              <Card key={trackId} className={`border ${isValid ? 'border-green-200' : 'border-yellow-200'}`}>
                <CardContent className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{getTrackTitle(trackId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {trackPending.length} split(s) • Total: {totalPct}%
                        {!isValid && <span className="text-destructive ml-1">(must be 100%)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleBulkApprove(trackId)}
                      disabled={!isValid || processing === trackId}
                    >
                      {processing === trackId ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Approve All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredSplits.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No {filter !== 'all' ? filter : ''} split requests found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Track</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSplits.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{getTrackTitle(s.track_id)}</TableCell>
                <TableCell>{getArtistName(s.artist_id)}</TableCell>
                <TableCell>{s.percentage}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.created_by ? getArtistName(s.created_by) : 'Admin'}</TableCell>
                <TableCell>{getStatusBadge(s.status)}</TableCell>
                <TableCell>
                  {s.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(s.id)}
                        disabled={processing === s.id}
                      >
                        {processing === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(s.id)}
                        disabled={processing === s.id}
                      >
                        <XCircle className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default RoyaltySplitRequestsTab;
