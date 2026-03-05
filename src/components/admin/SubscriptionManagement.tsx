import React, { useState, useEffect } from 'react';
import { Search, Edit, Calendar, CheckCircle, XCircle, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';

interface Subscriber {
  id: string;
  email: string;
  user_id: string;
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  updated_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
}

const SubscriptionManagement = () => {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscriber | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    subscribed: false,
    subscription_tier: '',
    subscription_end: ''
  });
  const [activateForm, setActivateForm] = useState({
    email: '',
    subscription_tier: 'Basic',
    subscription_end: ''
  });

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('subscribers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (subscribersError) throw subscribersError;
      setSubscribers(subscribersData || []);

      const userIds = (subscribersData || []).map(sub => sub.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);

        const profilesMap: Record<string, UserProfile> = {};
        (profilesData || []).forEach(profile => {
          profilesMap[profile.id] = profile;
        });
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast({ title: 'Error loading subscribers', description: 'Failed to load subscription data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubscription = (subscriber: Subscriber) => {
    setEditingSubscription(subscriber);
    setFormData({
      subscribed: subscriber.subscribed,
      subscription_tier: subscriber.subscription_tier || '',
      subscription_end: subscriber.subscription_end
        ? new Date(subscriber.subscription_end).toISOString().split('T')[0]
        : ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!editingSubscription) return;
    try {
      setSaving(true);
      const subscriptionEnd = formData.subscription_end
        ? new Date(formData.subscription_end + 'T23:59:59.999Z').toISOString()
        : null;

      const { error } = await supabase.functions.invoke('admin-update-subscription', {
        body: {
          target_user_email: editingSubscription.email,
          subscribed: formData.subscribed,
          subscription_tier: formData.subscription_tier || null,
          subscription_end: subscriptionEnd
        }
      });
      if (error) throw error;

      toast({ title: 'Subscription updated', description: `Updated subscription for ${editingSubscription.email}` });
      setEditDialogOpen(false);
      setEditingSubscription(null);
      fetchSubscribers();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({ title: 'Update failed', description: 'Failed to update subscription.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleActivateSubscription = async () => {
    if (!activateForm.email.trim()) {
      toast({ title: 'Email required', description: 'Please enter the user email address.', variant: 'destructive' });
      return;
    }
    if (!activateForm.subscription_end) {
      toast({ title: 'End date required', description: 'Please set a subscription end date.', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const subscriptionEnd = new Date(activateForm.subscription_end + 'T23:59:59.999Z').toISOString();

      const { error } = await supabase.functions.invoke('admin-update-subscription', {
        body: {
          target_user_email: activateForm.email.trim(),
          subscribed: true,
          subscription_tier: activateForm.subscription_tier || 'Basic',
          subscription_end: subscriptionEnd
        }
      });
      if (error) throw error;

      toast({ title: 'Subscription activated', description: `Activated subscription for ${activateForm.email}` });
      setActivateDialogOpen(false);
      setActivateForm({ email: '', subscription_tier: 'Basic', subscription_end: '' });
      fetchSubscribers();
    } catch (error: any) {
      console.error('Error activating subscription:', error);
      toast({ title: 'Activation failed', description: error?.message || 'Failed to activate subscription.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredSubscribers = subscribers.filter(subscriber =>
    subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profiles[subscriber.user_id]?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profiles[subscriber.user_id]?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (subscribed: boolean) => (
    <Badge className={subscribed
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }>
      {subscribed ? <><CheckCircle className="w-3 h-3 mr-1" /> Active</> : <><XCircle className="w-3 h-3 mr-1" /> Inactive</>}
    </Badge>
  );

  const getTierBadge = (tier: string | null) => {
    if (!tier) return <Badge variant="outline">None</Badge>;
    const tierColors: Record<string, string> = {
      Basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      Premium: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      Enterprise: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    };
    return <Badge className={tierColors[tier] || 'bg-gray-100 text-gray-800'}>{tier}</Badge>;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-semibold text-foreground">Subscription Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage user subscriptions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{subscribers.length} total</span>
          </div>
          <Button size="sm" onClick={() => setActivateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Activate
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by email or name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {/* Subscribers List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading subscribers...</p>
        </div>
      ) : filteredSubscribers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No subscribers found</div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-3">
            {filteredSubscribers.map((subscriber) => (
              <div key={subscriber.id} className="border rounded-lg p-4 bg-card space-y-3">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {profiles[subscriber.user_id]?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{subscriber.email}</p>
                  </div>
                  {getStatusBadge(subscriber.subscribed)}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getTierBadge(subscriber.subscription_tier)}
                  {subscriber.subscription_end && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(subscriber.subscription_end).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleEditSubscription(subscriber)}>
                  <Edit className="w-3 h-3 mr-1" /> Edit Subscription
                </Button>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Next Billing</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell>
                      <div className="font-medium">{profiles[subscriber.user_id]?.full_name || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground">{subscriber.email}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(subscriber.subscribed)}</TableCell>
                    <TableCell>{getTierBadge(subscriber.subscription_tier)}</TableCell>
                    <TableCell>
                      {subscriber.subscription_end ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(subscriber.subscription_end).toLocaleDateString()}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(subscriber.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEditSubscription(subscriber)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription for {editingSubscription?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Active Subscription</Label>
              <Switch checked={formData.subscribed} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, subscribed: checked }))} />
            </div>
            <div>
              <Label>Subscription Tier</Label>
              <Select value={formData.subscription_tier} onValueChange={(value) => setFormData(prev => ({ ...prev, subscription_tier: value }))}>
                <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subscription End Date</Label>
              <Input type="date" value={formData.subscription_end} onChange={(e) => setFormData(prev => ({ ...prev, subscription_end: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveSubscription} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activate New Subscription Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate Subscription</DialogTitle>
            <DialogDescription>
              Manually activate a subscription for any registered user by email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={activateForm.email}
                onChange={(e) => setActivateForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Subscription Tier</Label>
              <Select value={activateForm.subscription_tier} onValueChange={(value) => setActivateForm(prev => ({ ...prev, subscription_tier: value }))}>
                <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subscription End Date</Label>
              <Input
                type="date"
                value={activateForm.subscription_end}
                onChange={(e) => setActivateForm(prev => ({ ...prev, subscription_end: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleActivateSubscription} disabled={saving} className="flex-1">
                {saving ? 'Activating...' : 'Activate Subscription'}
              </Button>
              <Button variant="outline" onClick={() => setActivateDialogOpen(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement;
