import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Loader2, Music, Users, CheckCircle2, Clock, XCircle, AlertTriangle, Send } from 'lucide-react';

interface Track { id: string; title: string; primary_artist_id: string; }
interface Artist { id: string; name: string; email: string; }
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

const ArtistRoyaltySplits: React.FC = () => {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTrack, setSelectedTrack] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // New split form state
  const [newEntries, setNewEntries] = useState<{ artist_id: string; percentage: string }[]>([
    { artist_id: '', percentage: '' }
  ]);

  // Check if track already has income (prevent modifications to approved splits)
  const [trackHasIncome, setTrackHasIncome] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get tracks owned by this artist
      const { data: myTracks } = await supabase
        .from('tracks')
        .select('id, title, primary_artist_id')
        .eq('primary_artist_id', user.id);

      // Get all artists for collaborator selection
      const { data: allArtists } = await supabase
        .from('artists')
        .select('id, name, email');

      // Get all splits for my tracks
      const trackIds = (myTracks || []).map(t => t.id);
      let allSplits: Split[] = [];
      if (trackIds.length > 0) {
        const { data } = await supabase
          .from('royalty_splits')
          .select('*')
          .in('track_id', trackIds);
        allSplits = (data || []) as Split[];
      }

      setTracks(myTracks || []);
      setArtists(allArtists || []);
      setSplits(allSplits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Check if selected track has income
  useEffect(() => {
    if (!selectedTrack) { setTrackHasIncome(false); return; }
    supabase
      .from('incomes')
      .select('id')
      .eq('track_id', selectedTrack)
      .eq('workflow_status', 'processed')
      .limit(1)
      .then(({ data }) => setTrackHasIncome((data || []).length > 0));
  }, [selectedTrack]);

  const trackSplits = splits.filter(s => s.track_id === selectedTrack);
  const hasApprovedSplits = trackSplits.some(s => s.status === 'approved');
  const hasPendingSplits = trackSplits.some(s => s.status === 'pending');

  const canCreateNew = !hasPendingSplits && !(hasApprovedSplits && trackHasIncome);

  const getArtistName = (id: string) => artists.find(a => a.id === id)?.name || 'Unknown';

  const handleAddEntry = () => {
    setNewEntries(prev => [...prev, { artist_id: '', percentage: '' }]);
  };

  const handleRemoveEntry = (idx: number) => {
    setNewEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEntryChange = (idx: number, field: 'artist_id' | 'percentage', value: string) => {
    setNewEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const totalNewPct = newEntries.reduce((sum, e) => sum + (Number(e.percentage) || 0), 0);

  const handleSubmitSplits = async () => {
    if (!selectedTrack || !user) return;

    // Validate
    if (totalNewPct !== 100) {
      toast.error('Total split must equal 100 percent.');
      return;
    }

    for (const entry of newEntries) {
      if (!entry.artist_id || !entry.percentage || Number(entry.percentage) <= 0) {
        toast.error('All entries must have a valid artist and percentage.');
        return;
      }
    }

    // Check for duplicate artists
    const artistIds = newEntries.map(e => e.artist_id);
    if (new Set(artistIds).size !== artistIds.length) {
      toast.error('Cannot add the same artist twice.');
      return;
    }

    setSubmitting(true);
    try {
      const inserts = newEntries.map(e => ({
        track_id: selectedTrack,
        artist_id: e.artist_id,
        percentage: Number(e.percentage),
        status: 'pending',
        created_by: user.id,
      }));

      const { error } = await supabase.from('royalty_splits').insert(inserts);
      if (error) throw error;

      toast.success('Royalty splits submitted for admin approval.');
      setDialogOpen(false);
      setNewEntries([{ artist_id: '', percentage: '' }]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit splits');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePendingSplit = async (splitId: string) => {
    try {
      const { error } = await supabase.from('royalty_splits').delete().eq('id', splitId);
      if (error) throw error;
      toast.success('Pending split removed');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove split');
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

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Royalty Splits</h1>
        <p className="text-muted-foreground mt-1">Manage royalty splits for your tracks. Splits require admin approval before they are used for income distribution.</p>
      </div>

      {tracks.length === 0 ? (
        <Alert>
          <Music className="h-4 w-4" />
          <AlertDescription>You don't have any tracks yet. Tracks are created by the admin when adding income.</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Track Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Track</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Choose a track..." />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedTrack && (
            <>
              {/* Current Splits */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Current Splits</CardTitle>
                    <CardDescription>
                      {trackSplits.length === 0
                        ? 'No splits defined — 100% goes to you as primary artist.'
                        : `${trackSplits.length} split(s) configured`}
                    </CardDescription>
                  </div>

                  {canCreateNew && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => {
                          // Pre-populate with self
                          setNewEntries([{ artist_id: user?.id || '', percentage: '' }]);
                        }}>
                          <Plus className="h-4 w-4 mr-1" />Submit New Split
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Submit Royalty Split</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">Add all collaborators and their percentages. Total must equal exactly 100%.</p>

                          {newEntries.map((entry, idx) => (
                            <div key={idx} className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label className="text-xs">Artist</Label>
                                <Select value={entry.artist_id} onValueChange={v => handleEntryChange(idx, 'artist_id', v)}>
                                  <SelectTrigger><SelectValue placeholder="Select artist" /></SelectTrigger>
                                  <SelectContent>
                                    {artists.map(a => (
                                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-24">
                                <Label className="text-xs">%</Label>
                                <Input
                                  type="number"
                                  min="0.01"
                                  max="100"
                                  step="0.01"
                                  value={entry.percentage}
                                  onChange={e => handleEntryChange(idx, 'percentage', e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                              {newEntries.length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveEntry(idx)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}

                          <Button variant="outline" size="sm" onClick={handleAddEntry}>
                            <Plus className="h-3 w-3 mr-1" />Add Collaborator
                          </Button>

                          <div className={`text-sm font-medium ${totalNewPct === 100 ? 'text-green-600' : 'text-destructive'}`}>
                            Total: {totalNewPct}% {totalNewPct !== 100 && '(must be 100%)'}
                          </div>

                          {totalNewPct !== 100 && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>Total split must equal 100 percent.</AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <DialogFooter>
                          <Button onClick={handleSubmitSplits} disabled={submitting || totalNewPct !== 100}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                            Submit for Approval
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {hasPendingSplits && !canCreateNew && (
                    <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Awaiting Approval</Badge>
                  )}

                  {hasApprovedSplits && trackHasIncome && !canCreateNew && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 mr-1" />Locked (income exists)
                    </Badge>
                  )}
                </CardHeader>

                <CardContent>
                  {trackSplits.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artist</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trackSplits.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{getArtistName(s.artist_id)}</TableCell>
                            <TableCell>{s.percentage}%</TableCell>
                            <TableCell>{getStatusBadge(s.status)}</TableCell>
                            <TableCell>
                              {s.status === 'pending' && s.created_by === user?.id && (
                                <Button variant="ghost" size="sm" onClick={() => handleDeletePendingSplit(s.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No splits defined. Income will go 100% to the primary artist.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ArtistRoyaltySplits;
