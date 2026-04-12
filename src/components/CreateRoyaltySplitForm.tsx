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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Loader2, Send, AlertTriangle, Music, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Release {
  id: string;
  title: string;
  artist_name: string | null;
  release_date: string;
  status: string;
}

interface Track {
  id: string;
  title: string;
  track_number: number;
  release_id: string;
}

interface CollaboratorEntry {
  email: string;
  role: string;
  percentage: string;
}

interface CreateRoyaltySplitFormProps {
  preSelectedReleaseId?: string;
  onSuccess?: () => void;
}

const CreateRoyaltySplitForm: React.FC<CreateRoyaltySplitFormProps> = ({
  preSelectedReleaseId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedRelease, setSelectedRelease] = useState(preSelectedReleaseId || '');
  const [selectedTrack, setSelectedTrack] = useState('');

  // Owner entry (auto-filled)
  const [ownerPercentage, setOwnerPercentage] = useState('100');

  // Collaborators
  const [collaborators, setCollaborators] = useState<CollaboratorEntry[]>([]);

  // Fetch releases owned by artist
  const fetchReleases = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('releases')
        .select('id, title, artist_name, release_date, status')
        .eq('artist_id', user.id)
        .order('release_date', { ascending: false });
      setReleases(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchReleases(); }, [fetchReleases]);

  // Fetch tracks when release is selected
  useEffect(() => {
    if (!selectedRelease || selectedRelease === 'new') {
      setTracks([]);
      setSelectedTrack('');
      return;
    }
    supabase
      .from('release_tracks')
      .select('id, title, track_number, release_id')
      .eq('release_id', selectedRelease)
      .order('track_number')
      .then(({ data }) => {
        setTracks(data || []);
        setSelectedTrack('');
      });
  }, [selectedRelease]);

  const handleAddCollaborator = () => {
    setCollaborators(prev => [...prev, { email: '', role: 'collaborator', percentage: '' }]);
  };

  const handleRemoveCollaborator = (idx: number) => {
    setCollaborators(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCollaboratorChange = (idx: number, field: keyof CollaboratorEntry, value: string) => {
    setCollaborators(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const collabTotal = collaborators.reduce((sum, c) => sum + (Number(c.percentage) || 0), 0);
  const ownerPct = Number(ownerPercentage) || 0;
  const totalPct = ownerPct + collabTotal;

  // Auto-adjust owner percentage when collaborators change
  useEffect(() => {
    const remaining = 100 - collabTotal;
    if (remaining >= 0 && remaining <= 100) {
      setOwnerPercentage(String(remaining));
    }
  }, [collabTotal]);

  const handleSubmit = async () => {
    if (!user || !selectedTrack) return;

    if (totalPct !== 100) {
      toast.error('Total split must equal 100 percent.');
      return;
    }

    if (ownerPct <= 0) {
      toast.error('Your share must be greater than 0.');
      return;
    }

    // Check duplicate emails
    const emails = collaborators.map(c => c.email.toLowerCase().trim());
    if (new Set(emails).size !== emails.length) {
      toast.error('Cannot add the same email twice.');
      return;
    }

    // Check empty fields
    for (const c of collaborators) {
      if (!c.email.trim() || !c.percentage || Number(c.percentage) <= 0) {
        toast.error('All collaborators must have a valid email and percentage.');
        return;
      }
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(c.email.trim())) {
        toast.error(`Invalid email address: ${c.email}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Create owner's split record
      const { error: ownerError } = await supabase.from('royalty_splits').insert({
        track_id: selectedTrack,
        artist_id: user.id,
        percentage: ownerPct,
        status: 'pending',
        created_by: user.id,
        release_id: selectedRelease || null,
      });
      if (ownerError) throw ownerError;

      // 2. Create invitations for collaborators
      for (const collab of collaborators) {
        // Check if collaborator has an account
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id')
          .eq('email', collab.email.toLowerCase().trim())
          .maybeSingle();

        // Create royalty split record if artist exists
        if (existingArtist) {
          await supabase.from('royalty_splits').insert({
            track_id: selectedTrack,
            artist_id: existingArtist.id,
            percentage: Number(collab.percentage),
            status: 'pending',
            created_by: user.id,
            release_id: selectedRelease || null,
          });
        }

        // Create invitation
        const { error: invError } = await supabase.from('split_invitations').insert({
          track_id: selectedTrack,
          release_id: selectedRelease || null,
          invited_email: collab.email.toLowerCase().trim(),
          percentage: Number(collab.percentage),
          role: collab.role,
          invited_by: user.id,
        });
        if (invError) throw invError;

        // Send invitation email
        const releaseTitle = releases.find(r => r.id === selectedRelease)?.title || 'Unknown Release';
        const trackTitle = tracks.find(t => t.id === selectedTrack)?.title || 'Unknown Track';
        
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: collab.email.trim(),
              subject: "You've been invited to a royalty split",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #1a1a2e; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0;">MALPINOHdistro</h1>
                    <p style="color: #a0a0b0; font-size: 12px; margin: 4px 0 0;">GLOBAL MUSIC DISTRIBUTION SERVICE</p>
                  </div>
                  <div style="padding: 32px 24px;">
                    <h2 style="color: #1a1a2e; margin: 0 0 16px;">Royalty Split Invitation</h2>
                    <p style="color: #555;">You have been invited to receive royalties for:</p>
                    <div style="background: #f5f5f7; padding: 16px; border-radius: 8px; margin: 16px 0;">
                      <p style="margin: 4px 0; color: #333;"><strong>Track:</strong> ${trackTitle}</p>
                      <p style="margin: 4px 0; color: #333;"><strong>Release:</strong> ${releaseTitle}</p>
                      <p style="margin: 4px 0; color: #333;"><strong>Your Share:</strong> ${collab.percentage}%</p>
                      <p style="margin: 4px 0; color: #333;"><strong>Role:</strong> ${collab.role}</p>
                    </div>
                    <div style="text-align: center; margin: 24px 0;">
                      <a href="https://malpinohdistro.com/accept-split" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Accept Split</a>
                    </div>
                    <p style="color: #999; font-size: 12px;">This invitation expires in 7 days.</p>
                  </div>
                </div>
              `,
            },
          });
        } catch {
          console.error('Failed to send invitation email to', collab.email);
        }
      }

      toast.success('Royalty splits submitted for admin approval. Invitations sent!');
      setCollaborators([]);
      setOwnerPercentage('100');
      setSelectedTrack('');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit splits');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (releases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Music className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-lg">You don't have any releases yet.</h3>
            <p className="text-muted-foreground">Upload your first release to create royalty splits.</p>
          </div>
          <Button onClick={() => navigate('/release-form')}>
            <Upload className="h-4 w-4 mr-2" />Upload Release
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Release Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Release</CardTitle>
          <CardDescription>Choose the release you want to create a royalty split for.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRelease} onValueChange={(v) => {
            if (v === 'new') {
              navigate('/release-form');
              return;
            }
            setSelectedRelease(v);
          }}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Choose a release..." />
            </SelectTrigger>
            <SelectContent>
              {releases.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title} {r.artist_name ? `— ${r.artist_name}` : ''}
                </SelectItem>
              ))}
              <SelectItem value="new">
                <span className="flex items-center gap-1"><Plus className="h-3 w-3" />Create New Release</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Track Selector */}
      {selectedRelease && selectedRelease !== 'new' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Track</CardTitle>
          </CardHeader>
          <CardContent>
            {tracks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tracks found for this release.</p>
            ) : (
              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Choose a track..." />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.track_number}. {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Split Creation Form */}
      {selectedTrack && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Royalty Split</CardTitle>
            <CardDescription>Add collaborators and set percentage shares. Total must equal 100%.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Owner entry */}
            <div className="flex items-end gap-4 p-4 rounded-lg bg-muted/50 border">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Primary Artist (You)</Label>
                <p className="font-medium mt-1">{user?.email}</p>
              </div>
              <div className="w-20">
                <Label className="text-xs">%</Label>
                <Input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={ownerPercentage}
                  onChange={e => setOwnerPercentage(e.target.value)}
                />
              </div>
              <Badge variant="secondary" className="mb-1">Owner</Badge>
            </div>

            {/* Collaborators */}
            {collaborators.map((collab, idx) => (
              <div key={idx} className="flex items-end gap-3 p-4 rounded-lg border">
                <div className="flex-1">
                  <Label className="text-xs">Email Address</Label>
                  <Input
                    type="email"
                    value={collab.email}
                    onChange={e => handleCollaboratorChange(idx, 'email', e.target.value)}
                    placeholder="collaborator@email.com"
                  />
                </div>
                <div className="w-32">
                  <Label className="text-xs">Role</Label>
                  <Select value={collab.role} onValueChange={v => handleCollaboratorChange(idx, 'role', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                      <SelectItem value="producer">Producer</SelectItem>
                      <SelectItem value="songwriter">Songwriter</SelectItem>
                      <SelectItem value="featured">Featured Artist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20">
                  <Label className="text-xs">%</Label>
                  <Input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={collab.percentage}
                    onChange={e => handleCollaboratorChange(idx, 'percentage', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(idx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={handleAddCollaborator}>
              <Plus className="h-3 w-3 mr-1" />Add Collaborator
            </Button>

            {/* Summary */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className={`text-sm font-semibold ${totalPct === 100 ? 'text-green-600' : 'text-destructive'}`}>
                Total: {totalPct}% {totalPct !== 100 && '(must be 100%)'}
              </div>
              <div className="text-sm text-muted-foreground">
                {1 + collaborators.length} participant(s)
              </div>
            </div>

            {totalPct !== 100 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Total split must equal 100 percent.</AlertDescription>
              </Alert>
            )}

            {/* Existing splits table */}
            {collaborators.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{user?.email} (You)</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>{ownerPct}%</TableCell>
                    <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                  </TableRow>
                  {collaborators.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.email || '—'}</TableCell>
                      <TableCell className="capitalize">{c.role}</TableCell>
                      <TableCell>{c.percentage || 0}%</TableCell>
                      <TableCell><Badge variant="secondary">Invitation Pending</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || totalPct !== 100 || collaborators.length === 0}
              className="w-full"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Split & Send Invitations
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreateRoyaltySplitForm;
