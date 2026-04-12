
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, CheckCircle2, Clock, XCircle, GitBranch, Mail } from 'lucide-react';
import CreateRoyaltySplitForm from '@/components/CreateRoyaltySplitForm';

interface Split {
  id: string;
  track_id: string;
  artist_id: string;
  percentage: number;
  status: string;
  release_id: string | null;
  created_by: string;
  created_at: string;
}

interface Invitation {
  id: string;
  track_id: string;
  release_id: string | null;
  invited_email: string;
  percentage: number;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const ArtistRoyaltySplits: React.FC = () => {
  const { user } = useAuth();
  const [splits, setSplits] = useState<Split[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [releases, setReleases] = useState<Record<string, string>>({});
  const [tracks, setTracks] = useState<Record<string, string>>({});
  const [artists, setArtists] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get splits created by user or where user is the artist
      const { data: splitsData } = await supabase
        .from('royalty_splits')
        .select('*')
        .or(`created_by.eq.${user.id},artist_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // Get invitations sent by user
      const { data: invData } = await supabase
        .from('split_invitations')
        .select('*')
        .eq('invited_by', user.id)
        .order('created_at', { ascending: false });

      const allSplits = (splitsData || []) as Split[];
      const allInvitations = (invData || []) as Invitation[];

      // Collect unique IDs for lookups
      const releaseIds = [...new Set([...allSplits, ...allInvitations].map(s => s.release_id).filter(Boolean))] as string[];
      const trackIds = [...new Set([...allSplits, ...allInvitations].map(s => s.track_id))];
      const artistIds = [...new Set(allSplits.map(s => s.artist_id))];

      // Fetch release titles
      if (releaseIds.length > 0) {
        const { data: relData } = await supabase.from('releases').select('id, title').in('id', releaseIds);
        const map: Record<string, string> = {};
        (relData || []).forEach(r => { map[r.id] = r.title; });
        setReleases(map);
      }

      // Fetch track titles
      if (trackIds.length > 0) {
        const { data: trkData } = await supabase.from('release_tracks').select('id, title').in('id', trackIds);
        // Also check tracks table
        const { data: trkData2 } = await supabase.from('tracks').select('id, title').in('id', trackIds);
        const map: Record<string, string> = {};
        (trkData || []).forEach(t => { map[t.id] = t.title; });
        (trkData2 || []).forEach(t => { map[t.id] = t.title; });
        setTracks(map);
      }

      // Fetch artist names
      if (artistIds.length > 0) {
        const { data: artData } = await supabase.from('artists').select('id, name').in('id', artistIds);
        const map: Record<string, string> = {};
        (artData || []).forEach(a => { map[a.id] = a.name; });
        setArtists(map);
      }

      setSplits(allSplits);
      setInvitations(allInvitations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': case 'active':
        return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
      case 'rejected': case 'declined':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      case 'accepted':
        return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="gap-1 text-muted-foreground"><Clock className="h-3 w-3" />Expired</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />Royalty Splits
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage royalty splits for your releases. Splits require admin approval before income distribution.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Create Royalty Split</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Royalty Split</DialogTitle>
            </DialogHeader>
            <CreateRoyaltySplitForm onSuccess={() => { setDialogOpen(false); fetchData(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="splits">
        <TabsList>
          <TabsTrigger value="splits">My Splits ({splits.length})</TabsTrigger>
          <TabsTrigger value="invitations">Sent Invitations ({invitations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="splits" className="mt-4">
          {splits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GitBranch className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No royalty splits yet. Create one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Release</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {splits.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.release_id ? (releases[s.release_id] || '—') : '—'}</TableCell>
                        <TableCell>{tracks[s.track_id] || s.track_id.slice(0, 8)}</TableCell>
                        <TableCell>{artists[s.artist_id] || (s.artist_id === user?.id ? 'You' : s.artist_id.slice(0, 8))}</TableCell>
                        <TableCell>{s.percentage}%</TableCell>
                        <TableCell>{getStatusBadge(s.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No invitations sent yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invited_email}</TableCell>
                        <TableCell className="capitalize">{inv.role}</TableCell>
                        <TableCell>{inv.percentage}%</TableCell>
                        <TableCell>{tracks[inv.track_id] || inv.track_id.slice(0, 8)}</TableCell>
                        <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ArtistRoyaltySplits;
