import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Music, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ArtistAccount {
  id: string;
  owner_id: string;
  artist_name: string;
  artist_email: string | null;
  bio: string | null;
  genre: string | null;
  created_at: string;
}

interface ArtistAccountsManagerProps {
  onArtistSelect?: (artistId: string, artistName: string) => void;
}

const ArtistAccountsManager: React.FC<ArtistAccountsManagerProps> = ({ onArtistSelect }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [artists, setArtists] = useState<ArtistAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<ArtistAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    artist_name: '',
    artist_email: '',
    bio: '',
    genre: ''
  });

  useEffect(() => {
    if (user) {
      fetchArtists();
    }
  }, [user]);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('artist_accounts')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artist accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load artist accounts.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (artist?: ArtistAccount) => {
    if (artist) {
      setEditingArtist(artist);
      setFormData({
        artist_name: artist.artist_name,
        artist_email: artist.artist_email || '',
        bio: artist.bio || '',
        genre: artist.genre || ''
      });
    } else {
      setEditingArtist(null);
      setFormData({ artist_name: '', artist_email: '', bio: '', genre: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.artist_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Artist name is required.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingArtist) {
        const { error } = await supabase
          .from('artist_accounts')
          .update({
            artist_name: formData.artist_name.trim(),
            artist_email: formData.artist_email.trim() || null,
            bio: formData.bio.trim() || null,
            genre: formData.genre.trim() || null
          })
          .eq('id', editingArtist.id);

        if (error) throw error;
        toast({ title: 'Artist Updated', description: 'Artist account updated successfully.' });
      } else {
        const { error } = await supabase
          .from('artist_accounts')
          .insert({
            owner_id: user?.id,
            artist_name: formData.artist_name.trim(),
            artist_email: formData.artist_email.trim() || null,
            bio: formData.bio.trim() || null,
            genre: formData.genre.trim() || null
          });

        if (error) throw error;
        toast({ title: 'Artist Created', description: 'New artist account created successfully.' });
      }

      setIsDialogOpen(false);
      fetchArtists();
    } catch (error) {
      console.error('Error saving artist:', error);
      toast({
        title: 'Error',
        description: 'Failed to save artist account.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (artistId: string) => {
    if (!confirm('Are you sure you want to delete this artist account?')) return;

    try {
      const { error } = await supabase
        .from('artist_accounts')
        .delete()
        .eq('id', artistId);

      if (error) throw error;
      toast({ title: 'Artist Deleted', description: 'Artist account deleted successfully.' });
      fetchArtists();
    } catch (error) {
      console.error('Error deleting artist:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete artist account.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Artist Accounts
            </CardTitle>
            <CardDescription>
              Manage multiple artists under your account for music distribution
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Artist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingArtist ? 'Edit Artist' : 'Add New Artist'}</DialogTitle>
                <DialogDescription>
                  {editingArtist ? 'Update artist information.' : 'Create a new artist profile for distribution.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="artist_name">Artist Name *</Label>
                  <Input
                    id="artist_name"
                    value={formData.artist_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, artist_name: e.target.value }))}
                    placeholder="Enter artist name"
                  />
                </div>
                <div>
                  <Label htmlFor="artist_email">Artist Email</Label>
                  <Input
                    id="artist_email"
                    type="email"
                    value={formData.artist_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, artist_email: e.target.value }))}
                    placeholder="artist@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={formData.genre}
                    onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                    placeholder="e.g., Hip Hop, R&B, Pop"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Brief artist biography..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                  {submitting ? 'Saving...' : editingArtist ? 'Update Artist' : 'Create Artist'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
            <p>Loading artists...</p>
          </div>
        ) : artists.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-4">No artist accounts yet.</p>
            <Button onClick={() => handleOpenDialog()}>Add Your First Artist</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artist Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artists.map((artist) => (
                <TableRow 
                  key={artist.id}
                  className={onArtistSelect ? 'cursor-pointer hover:bg-slate-50' : ''}
                  onClick={() => onArtistSelect?.(artist.id, artist.artist_name)}
                >
                  <TableCell className="font-medium">{artist.artist_name}</TableCell>
                  <TableCell>{artist.artist_email || '-'}</TableCell>
                  <TableCell>{artist.genre || '-'}</TableCell>
                  <TableCell>{new Date(artist.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(artist);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(artist.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ArtistAccountsManager;
