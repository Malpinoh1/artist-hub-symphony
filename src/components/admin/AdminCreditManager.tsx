
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, Plus, History } from 'lucide-react';

interface ArtistCredit {
  id: string;
  name: string;
  email: string;
  credit_balance: number;
  available_balance: number;
}

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

const AdminCreditManager: React.FC = () => {
  const [artists, setArtists] = useState<ArtistCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<ArtistCredit | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, email, credit_balance, available_balance')
        .order('name');
      if (error) throw error;
      setArtists((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredit = (artist: ArtistCredit) => {
    setSelectedArtist(artist);
    setCreditAmount('');
    setCreditDescription('');
    setAddDialogOpen(true);
  };

  const handleViewHistory = async (artist: ArtistCredit) => {
    setSelectedArtist(artist);
    setHistoryDialogOpen(true);
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, description, created_at')
        .eq('artist_id', artist.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  const handleSubmitCredit = async () => {
    if (!selectedArtist || !creditAmount) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setProcessing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Update artist credit balance
      const newBalance = (selectedArtist.credit_balance || 0) + amount;
      const { error: updateError } = await supabase
        .from('artists')
        .update({ credit_balance: newBalance })
        .eq('id', selectedArtist.id);
      if (updateError) throw updateError;

      // Log credit transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          artist_id: selectedArtist.id,
          amount,
          type: 'credit_added',
          description: creditDescription.trim() || `Admin added credit of $${amount.toLocaleString()}`,
          created_by: userData?.user?.id
        });
      if (txError) throw txError;

      // Log activity
      await supabase.from('activity_logs').insert({
        artist_id: selectedArtist.id,
        user_id: userData?.user?.id || selectedArtist.id,
        activity_type: 'credit_added',
        title: 'Credit Balance Added',
        description: `$${amount.toLocaleString()} credit added by admin. ${creditDescription.trim() || ''}`,
        metadata: { amount, new_balance: newBalance }
      });

      toast.success(`$${amount.toLocaleString()} credit added to ${selectedArtist.name}`);
      setAddDialogOpen(false);
      fetchArtists();
    } catch (error) {
      console.error('Error adding credit:', error);
      toast.error('Failed to add credit');
    } finally {
      setProcessing(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'credit_added': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'withdrawal_deduction': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'credit_deducted': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4">Credit Balance Management</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Add outstanding subscription/credit balances to artist accounts. Credits are automatically deducted from withdrawals.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-3">
            {artists.map((artist) => (
              <div key={artist.id} className="border rounded-lg p-4 bg-card space-y-3">
                <div>
                  <p className="font-medium">{artist.name}</p>
                  <p className="text-xs text-muted-foreground">{artist.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Available Balance</p>
                    <p className="font-semibold">${(artist.available_balance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Credit Balance</p>
                    <p className={`font-semibold ${(artist.credit_balance || 0) > 0 ? 'text-red-600' : ''}`}>
                      ${(artist.credit_balance || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" className="flex-1" onClick={() => handleAddCredit(artist)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Credit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleViewHistory(artist)}>
                    <History className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Available Balance</TableHead>
                  <TableHead>Credit Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artists.map((artist) => (
                  <TableRow key={artist.id}>
                    <TableCell className="font-medium">{artist.name}</TableCell>
                    <TableCell>{artist.email}</TableCell>
                    <TableCell>${(artist.available_balance || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${(artist.credit_balance || 0) > 0 ? 'text-red-600' : ''}`}>
                        ${(artist.credit_balance || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => handleAddCredit(artist)}>
                          <Plus className="h-3 w-3 mr-1" /> Add Credit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleViewHistory(artist)}>
                          <History className="h-3 w-3 mr-1" /> History
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Add Credit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit Balance</DialogTitle>
            <DialogDescription>
              Add an outstanding subscription/credit amount to {selectedArtist?.name}'s account.
              This amount will be automatically deducted from future withdrawals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Credit Balance</p>
              <p className="font-semibold">${(selectedArtist?.credit_balance || 0).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Credit Amount (USD)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="e.g., Outstanding subscription fee for Q1 2026"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={processing}>Cancel</Button>
            <Button onClick={handleSubmitCredit} disabled={processing || !creditAmount}>
              {processing ? 'Adding...' : 'Add Credit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Credit History — {selectedArtist?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No credit transactions found.</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <Badge className={getTypeColor(tx.type)}>
                        {tx.type === 'credit_added' ? 'Credit Added' : tx.type === 'withdrawal_deduction' ? 'Withdrawal Deduction' : tx.type}
                      </Badge>
                      <span className={`font-semibold ${tx.type === 'withdrawal_deduction' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'withdrawal_deduction' ? '-' : '+'}${tx.amount.toLocaleString()}
                      </span>
                    </div>
                    {tx.description && <p className="text-sm text-muted-foreground">{tx.description}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCreditManager;
