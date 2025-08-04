import React, { useState, useEffect } from 'react';
import { Search, Edit, Calendar, CreditCard, CheckCircle, XCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [editingSubscription, setEditingSubscription] = useState<Subscriber | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    subscribed: false,
    subscription_tier: '',
    subscription_end: ''
  });

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      
      // Fetch all subscribers
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('subscribers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (subscribersError) throw subscribersError;

      setSubscribers(subscribersData || []);

      // Fetch user profiles for display names
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
      toast({
        title: 'Error loading subscribers',
        description: 'Failed to load subscription data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubscription = (subscriber: Subscriber) => {
    setEditingSubscription(subscriber);
    setFormData({
      subscribed: subscriber.subscribed,
      subscription_tier: subscriber.subscription_tier || '',
      subscription_end: subscriber.subscription_end ? 
        new Date(subscriber.subscription_end).toISOString().split('T')[0] : ''
    });
  };

  const handleSaveSubscription = async () => {
    if (!editingSubscription) return;

    try {
      setSaving(true);
      
      const subscriptionEnd = formData.subscription_end ? 
        new Date(formData.subscription_end + 'T23:59:59.999Z').toISOString() : null;

      const { data, error } = await supabase.functions.invoke('admin-update-subscription', {
        body: {
          target_user_email: editingSubscription.email,
          subscribed: formData.subscribed,
          subscription_tier: formData.subscription_tier || null,
          subscription_end: subscriptionEnd
        }
      });

      if (error) throw error;

      toast({
        title: 'Subscription updated',
        description: `Successfully updated subscription for ${editingSubscription.email}`
      });

      setEditingSubscription(null);
      fetchSubscribers();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update subscription. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredSubscribers = subscribers.filter(subscriber => 
    subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profiles[subscriber.user_id]?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profiles[subscriber.user_id]?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (subscribed: boolean) => {
    return subscribed ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
        <XCircle className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const getTierBadge = (tier: string | null) => {
    if (!tier) return <Badge variant="outline">None</Badge>;
    
    const tierColors = {
      Basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      Premium: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      Enterprise: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    };
    
    return (
      <Badge className={tierColors[tier as keyof typeof tierColors] || 'bg-gray-100 text-gray-800'}>
        {tier}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Subscription Management</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Manage user subscriptions and billing information
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-slate-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {subscribers.length} total subscribers
          </span>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Subscribers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Subscribers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscribers</CardTitle>
          <CardDescription>
            {filteredSubscribers.length} subscribers found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading subscribers...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                        <div>
                          <div className="font-medium">
                            {profiles[subscriber.user_id]?.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-slate-500">
                            {subscriber.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(subscriber.subscribed)}
                      </TableCell>
                      <TableCell>
                        {getTierBadge(subscriber.subscription_tier)}
                      </TableCell>
                      <TableCell>
                        {subscriber.subscription_end ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="text-sm">
                              {new Date(subscriber.subscription_end).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(subscriber.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSubscription(subscriber)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Subscription</DialogTitle>
                              <DialogDescription>
                                Update subscription details for {subscriber.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="subscribed">Active Subscription</Label>
                                <Switch
                                  id="subscribed"
                                  checked={formData.subscribed}
                                  onCheckedChange={(checked) => 
                                    setFormData(prev => ({ ...prev, subscribed: checked }))
                                  }
                                />
                              </div>

                              <div>
                                <Label htmlFor="tier">Subscription Tier</Label>
                                <Select
                                  value={formData.subscription_tier}
                                  onValueChange={(value) => 
                                    setFormData(prev => ({ ...prev, subscription_tier: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select tier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="Basic">Basic</SelectItem>
                                    <SelectItem value="Premium">Premium</SelectItem>
                                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="end_date">Subscription End Date</Label>
                                <Input
                                  id="end_date"
                                  type="date"
                                  value={formData.subscription_end}
                                  onChange={(e) => 
                                    setFormData(prev => ({ ...prev, subscription_end: e.target.value }))
                                  }
                                />
                              </div>

                              <div className="flex gap-3 pt-4">
                                <Button
                                  onClick={handleSaveSubscription}
                                  disabled={saving}
                                  className="flex-1"
                                >
                                  {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingSubscription(null)}
                                  disabled={saving}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSubscribers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No subscribers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManagement;