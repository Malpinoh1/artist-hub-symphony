import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Music, DollarSign, Users, Loader2, Trash2, AlertTriangle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Artist { id: string; name: string; email: string; }
interface Track { id: string; title: string; primary_artist_id: string; created_at: string; }
interface Platform { id: string; name: string; }
interface RoyaltySplit { id: string; track_id: string; artist_id: string; percentage: number; status?: string; }
interface Income { id: string; track_id: string; platform_id: string; amount: number; description: string; reference: string; date: string; created_at: string; workflow_status?: string; }

const IncomeManagementTab: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedArtist, setSelectedArtist] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);

  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('');
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);

  const [splitTrackId, setSplitTrackId] = useState('');
  const [splits, setSplits] = useState<RoyaltySplit[]>([]);
  const [newSplitArtist, setNewSplitArtist] = useState('');
  const [newSplitPercentage, setNewSplitPercentage] = useState('');
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);

  // Track split validation for selected track in Add Income form
  const [selectedTrackSplits, setSelectedTrackSplits] = useState<RoyaltySplit[]>([]);
  const [loadingSplitCheck, setLoadingSplitCheck] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [artistsRes, tracksRes, platformsRes, incomesRes] = await Promise.all([
        supabase.from('artists').select('id, name, email').order('name'),
        supabase.from('tracks').select('*').order('created_at', { ascending: false }),
        supabase.from('income_platforms').select('*').order('name'),
        supabase.from('incomes').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setArtists(artistsRes.data || []);
      setTracks(tracksRes.data || []);
      setPlatforms(platformsRes.data || []);
      setIncomes((incomesRes.data as Income[]) || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // When a track is selected in the Add Income form, check its splits
  const checkTrackSplits = useCallback(async (trackId: string) => {
    if (!trackId) {
      setSelectedTrackSplits([]);
      return;
    }
    setLoadingSplitCheck(true);
    try {
      const { data } = await supabase
        .from('royalty_splits')
        .select('*')
        .eq('track_id', trackId)
        .eq('status', 'approved');
      setSelectedTrackSplits(data || []);
    } catch {
      setSelectedTrackSplits([]);
    } finally {
      setLoadingSplitCheck(false);
    }
  }, []);

  useEffect(() => {
    checkTrackSplits(selectedTrack);
  }, [selectedTrack, checkTrackSplits]);

  const selectedTrackSplitTotal = selectedTrackSplits.reduce((sum, s) => sum + Number(s.percentage), 0);
  const hasSplitWarning = selectedTrackSplits.length > 0 && selectedTrackSplitTotal !== 100;
  const noTracksExist = tracks.length === 0;

  const filteredTracks = selectedArtist
    ? tracks.filter(t => t.primary_artist_id === selectedArtist)
    : tracks;

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (noTracksExist) {
      toast.error('You must create a track before adding income.');
      return;
    }
    if (!selectedTrack || !selectedPlatform || !amount || Number(amount) <= 0) {
      toast.error('Please fill all required fields with valid values');
      return;
    }
    if (hasSplitWarning) {
      toast.error('Royalty split must total 100 percent. Please fix splits before adding income.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('process_income', {
        p_track_id: selectedTrack,
        p_platform_id: selectedPlatform,
        p_amount: Number(amount),
        p_description: description || null,
        p_reference: reference || null,
        p_date: incomeDate,
      });

      if (error) throw error;

      // Send email notification only on success
      const track = tracks.find(t => t.id === selectedTrack);
      const platform = platforms.find(p => p.id === selectedPlatform);

      const { data: splitData } = await supabase
        .from('royalty_splits')
        .select('artist_id')
        .eq('track_id', selectedTrack);

      const artistIds = splitData && splitData.length > 0
        ? splitData.map(s => s.artist_id)
        : [track?.primary_artist_id].filter(Boolean);

      supabase.functions.invoke('send-income-notification', {
        body: {
          artist_ids: artistIds,
          track_title: track?.title,
          platform_name: platform?.name,
          income_id: data,
        },
      }).catch(err => console.error('Email notification failed:', err));

      toast.success('Income added and distributed successfully!');
      setAmount('');
      setDescription('');
      setReference('');
      fetchData();
    } catch (err: any) {
      console.error('Error adding income:', err);
      toast.error(err.message || 'Failed to add income');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTrack = async () => {
    if (!newTrackTitle.trim() || !newTrackArtist) {
      toast.error('Track title and artist are required');
      return;
    }
    try {
      const { error } = await supabase.from('tracks').insert({
        title: newTrackTitle.trim(),
        primary_artist_id: newTrackArtist,
      });
      if (error) throw error;
      toast.success('Track created');
      setNewTrackTitle('');
      setNewTrackArtist('');
      setTrackDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create track');
    }
  };

  const loadSplits = async (trackId: string) => {
    setSplitTrackId(trackId);
    const { data } = await supabase
      .from('royalty_splits')
      .select('*')
      .eq('track_id', trackId);
    setSplits(data || []);
    setSplitDialogOpen(true);
  };

  const handleAddSplit = async () => {
    if (!newSplitArtist || !newSplitPercentage || Number(newSplitPercentage) <= 0) {
      toast.error('Valid artist and percentage required');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('royalty_splits').insert({
        track_id: splitTrackId,
        artist_id: newSplitArtist,
        percentage: Number(newSplitPercentage),
        status: 'approved',
        created_by: user?.id,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Split added');
      setNewSplitArtist('');
      setNewSplitPercentage('');
      loadSplits(splitTrackId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add split');
    }
  };

  const handleDeleteSplit = async (splitId: string) => {
    try {
      const { error } = await supabase.from('royalty_splits').delete().eq('id', splitId);
      if (error) throw error;
      toast.success('Split removed');
      loadSplits(splitTrackId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove split');
    }
  };

  const getArtistName = (id: string) => artists.find(a => a.id === id)?.name || 'Unknown';
  const getTrackTitle = (id: string) => tracks.find(t => t.id === id)?.title || 'Unknown';
  const getPlatformName = (id: string) => platforms.find(p => p.id === id)?.name || 'Unknown';

  const totalSplitPct = splits.reduce((sum, s) => sum + Number(s.percentage), 0);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-green-600 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Processed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Workflow Guide Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
            <span className="text-primary">Required Workflow:</span>
            <Badge variant={tracks.length > 0 ? 'default' : 'secondary'} className="gap-1">
              <Music className="h-3 w-3" />1. Create Track
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />2. Set Royalty Split
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="gap-1">
              <DollarSign className="h-3 w-3" />3. Add Income
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="add-income" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add-income"><DollarSign className="w-4 h-4 mr-1" />Add Income</TabsTrigger>
          <TabsTrigger value="tracks"><Music className="w-4 h-4 mr-1" />Tracks</TabsTrigger>
          <TabsTrigger value="history"><DollarSign className="w-4 h-4 mr-1" />Income History</TabsTrigger>
        </TabsList>

        {/* ADD INCOME TAB */}
        <TabsContent value="add-income">
          <Card>
            <CardHeader><CardTitle>Add Track-Based Income</CardTitle></CardHeader>
            <CardContent>
              {noTracksExist ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You must create a track before adding income. Go to the <strong>Tracks</strong> tab first.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleAddIncome} className="space-y-4">
                  {/* Split warning */}
                  {hasSplitWarning && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Royalty split must total 100 percent. Current total: <strong>{selectedTrackSplitTotal}%</strong>. Fix splits before adding income.
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedTrack && selectedTrackSplits.length === 0 && !loadingSplitCheck && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        No royalty splits defined — 100% will go to the primary artist.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Select Artist</Label>
                      <Select value={selectedArtist} onValueChange={(v) => { setSelectedArtist(v); setSelectedTrack(''); }}>
                        <SelectTrigger><SelectValue placeholder="Filter by artist..." /></SelectTrigger>
                        <SelectContent>
                          {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Select Track *</Label>
                      <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                        <SelectTrigger><SelectValue placeholder="Select track..." /></SelectTrigger>
                        <SelectContent>
                          {filteredTracks.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.title} ({getArtistName(t.primary_artist_id)})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Platform *</Label>
                      <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                        <SelectTrigger><SelectValue placeholder="Select platform..." /></SelectTrigger>
                        <SelectContent>
                          {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount ($) *</Label>
                      <Input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>Date *</Label>
                      <Input type="date" value={incomeDate} onChange={e => setIncomeDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>Reference ID</Label>
                      <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional reference" />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
                  </div>
                  <Button type="submit" disabled={submitting || hasSplitWarning} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
                    Add Income
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRACKS TAB */}
        <TabsContent value="tracks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tracks & Royalty Splits</CardTitle>
              <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Track</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create New Track</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Track Title</Label>
                      <Input value={newTrackTitle} onChange={e => setNewTrackTitle(e.target.value)} placeholder="Enter track title" />
                    </div>
                    <div>
                      <Label>Primary Artist</Label>
                      <Select value={newTrackArtist} onValueChange={setNewTrackArtist}>
                        <SelectTrigger><SelectValue placeholder="Select artist..." /></SelectTrigger>
                        <SelectContent>
                          {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddTrack} className="w-full">Create Track</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Primary Artist</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tracks.map(track => (
                      <TableRow key={track.id}>
                        <TableCell className="font-medium">{track.title}</TableCell>
                        <TableCell>{getArtistName(track.primary_artist_id)}</TableCell>
                        <TableCell>{new Date(track.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => loadSplits(track.id)}>
                            <Users className="h-3 w-3 mr-1" />Splits
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tracks.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No tracks yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Royalty Splits Dialog */}
          <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Royalty Splits — {getTrackTitle(splitTrackId)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total allocated:</span>
                  <Badge variant={totalSplitPct === 100 ? 'default' : totalSplitPct > 100 ? 'destructive' : 'secondary'}>
                    {totalSplitPct}%
                  </Badge>
                </div>

                {totalSplitPct > 0 && totalSplitPct !== 100 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Splits must total exactly 100%. Currently {totalSplitPct}%.
                    </AlertDescription>
                  </Alert>
                )}

                {splits.map(split => (
                  <div key={split.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <span className="font-medium">{getArtistName(split.artist_id)}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{split.percentage}%</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteSplit(split.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {splits.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">No splits defined. 100% goes to primary artist.</p>
                )}

                <div className="border-t pt-4 space-y-3">
                  <Label>Add Split</Label>
                  <div className="flex gap-2">
                    <Select value={newSplitArtist} onValueChange={setNewSplitArtist}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select artist..." /></SelectTrigger>
                      <SelectContent>
                        {artists.filter(a => !splits.find(s => s.artist_id === a.id)).map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      className="w-24"
                      placeholder="%"
                      min="1"
                      max="100"
                      value={newSplitPercentage}
                      onChange={e => setNewSplitPercentage(e.target.value)}
                    />
                    <Button size="sm" onClick={handleAddSplit}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* INCOME HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Income History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomes.map(inc => (
                      <TableRow key={inc.id}>
                        <TableCell>{new Date(inc.date).toLocaleDateString()}</TableCell>
                        <TableCell>{getTrackTitle(inc.track_id)}</TableCell>
                        <TableCell>{getPlatformName(inc.platform_id)}</TableCell>
                        <TableCell className="font-medium text-green-600">${Number(inc.amount).toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(inc.workflow_status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{inc.description || '—'}</TableCell>
                        <TableCell>{inc.reference || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {incomes.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No income records yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IncomeManagementTab;
