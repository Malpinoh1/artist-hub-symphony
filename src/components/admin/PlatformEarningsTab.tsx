import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download, FileText, DollarSign, Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  fetchAllPlatformEarnings,
  createPlatformEarning,
  updatePlatformEarning,
  deletePlatformEarning,
  generateRoyaltyStatement,
  PlatformEarning
} from '../../services/platformEarningsService';
import { fetchAdminArtists, fetchAdminReleases } from '../../services/adminService';

const PLATFORMS = ['Spotify', 'Apple Music', 'YouTube Music', 'Deezer', 'Amazon Music', 'Other'];

interface PlatformEarningsTabProps {
  onGenerateStatement?: () => void;
}

const PlatformEarningsTab: React.FC<PlatformEarningsTabProps> = ({ onGenerateStatement }) => {
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<PlatformEarning[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEarning, setEditingEarning] = useState<PlatformEarning | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const [formData, setFormData] = useState({
    artist_id: '',
    release_id: '',
    platform: '',
    streams: 0,
    earnings_amount: 0,
    currency: 'NGN',
    period_start: '',
    period_end: '',
    status: 'pending' as 'pending' | 'processed' | 'paid',
    admin_notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [earningsData, artistsData, releasesData] = await Promise.all([
        fetchAllPlatformEarnings(),
        fetchAdminArtists(),
        fetchAdminReleases()
      ]);
      
      setEarnings(earningsData);
      setArtists(artistsData);
      setReleases(releasesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load platform earnings data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      artist_id: '',
      release_id: '',
      platform: '',
      streams: 0,
      earnings_amount: 0,
      currency: 'NGN',
      period_start: '',
      period_end: '',
      status: 'pending',
      admin_notes: ''
    });
    setEditingEarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEarning) {
        await updatePlatformEarning(editingEarning.id, {
          ...formData,
          release_id: formData.release_id === 'none' ? null : formData.release_id
        });
        toast({
          title: "Success",
          description: "Platform earning updated successfully."
        });
      } else {
        await createPlatformEarning({
          ...formData,
          release_id: formData.release_id === 'none' ? null : formData.release_id
        });
        toast({
          title: "Success",
          description: "Platform earning created successfully."
        });
      }
      
      await loadData();
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving earning:', error);
      toast({
        title: "Error",
        description: "Failed to save platform earning.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (earning: PlatformEarning) => {
    setEditingEarning(earning);
    setFormData({
      artist_id: earning.artist_id,
      release_id: earning.release_id || 'none',
      platform: earning.platform,
      streams: earning.streams,
      earnings_amount: earning.earnings_amount,
      currency: earning.currency,
      period_start: earning.period_start,
      period_end: earning.period_end,
      status: earning.status,
      admin_notes: earning.admin_notes || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this earning record?')) return;
    
    try {
      await deletePlatformEarning(id);
      toast({
        title: "Success",
        description: "Platform earning deleted successfully."
      });
      await loadData();
    } catch (error) {
      console.error('Error deleting earning:', error);
      toast({
        title: "Error",
        description: "Failed to delete platform earning.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateStatement = async (artistId: string) => {
    try {
      const currentDate = new Date();
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      await generateRoyaltyStatement(
        artistId,
        firstDay.toISOString().split('T')[0],
        lastDay.toISOString().split('T')[0]
      );
      
      toast({
        title: "Success",
        description: "Royalty statement generated successfully."
      });
      
      onGenerateStatement?.();
    } catch (error) {
      console.error('Error generating statement:', error);
      toast({
        title: "Error",
        description: "Failed to generate royalty statement.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
      processed: { label: 'Processed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      paid: { label: 'Paid', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredEarnings = earnings.filter(earning => {
    const matchesSearch = !searchTerm || 
      earning.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      earning.release_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = !selectedPlatform || selectedPlatform === 'all' || earning.platform === selectedPlatform;
    const matchesStatus = !selectedStatus || selectedStatus === 'all' || earning.status === selectedStatus;
    
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const totalEarnings = filteredEarnings.reduce((sum, earning) => sum + Number(earning.earnings_amount), 0);
  const totalStreams = filteredEarnings.reduce((sum, earning) => sum + earning.streams, 0);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading platform earnings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Platform Earnings Management</h2>
          <p className="text-muted-foreground">Manage artist earnings from streaming platforms</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Earning
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEarning ? 'Edit' : 'Add'} Platform Earning</DialogTitle>
              <DialogDescription>
                {editingEarning ? 'Update' : 'Create'} earnings data for an artist's platform performance.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="artist">Artist *</Label>
                  <Select value={formData.artist_id} onValueChange={(value) => setFormData(prev => ({ ...prev, artist_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select artist" />
                    </SelectTrigger>
                    <SelectContent>
                      {artists.map(artist => (
                        <SelectItem key={artist.id} value={artist.id}>
                          {artist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="release">Release (Optional)</Label>
                  <Select value={formData.release_id} onValueChange={(value) => setFormData(prev => ({ ...prev, release_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select release" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific release</SelectItem>
                      {releases.filter(r => r.artist_id === formData.artist_id).map(release => (
                        <SelectItem key={release.id} value={release.id}>
                          {release.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platform">Platform *</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(platform => (
                        <SelectItem key={platform} value={platform}>
                          {platform}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="streams">Streams *</Label>
                  <Input
                    id="streams"
                    type="number"
                    min="0"
                    value={formData.streams}
                    onChange={(e) => setFormData(prev => ({ ...prev, streams: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="earnings">Earnings Amount (₦) *</Label>
                  <Input
                    id="earnings"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.earnings_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, earnings_amount: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="period_start">Period Start *</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="period_end">Period End *</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="admin_notes">Admin Notes</Label>
                <Textarea
                  id="admin_notes"
                  value={formData.admin_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                  placeholder="Optional notes about this earning record..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEarning ? 'Update' : 'Create'} Earning
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {filteredEarnings.length} records
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStreams.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Artists</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(filteredEarnings.map(e => e.artist_id)).size}</div>
            <p className="text-xs text-muted-foreground">
              With earnings data
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search artists or releases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="platform-filter">Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="All platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {PLATFORMS.map(platform => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedPlatform('');
                  setSelectedStatus('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Earnings ({filteredEarnings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEarnings.length === 0 ? (
            <Alert>
              <AlertDescription>
                No platform earnings found. Create your first earning record to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artist</TableHead>
                    <TableHead>Release</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Streams</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEarnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell className="font-medium">
                        {earning.artist_name}
                      </TableCell>
                      <TableCell>
                        {earning.release_title || 'General'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{earning.platform}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(earning.period_start).toLocaleDateString()} - {new Date(earning.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {earning.streams.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        ₦{earning.earnings_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(earning.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(earning)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateStatement(earning.artist_id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(earning.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformEarningsTab;