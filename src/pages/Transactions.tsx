import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/contexts/AccountContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ArrowUpRight, ArrowDownRight, Loader2, TrendingUp, Wallet, Receipt, History } from 'lucide-react';
import AnimatedCard from '@/components/AnimatedCard';

interface Transaction {
  id: string;
  artist_id: string;
  track_id: string | null;
  platform_id: string | null;
  income_id: string | null;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface Track { id: string; title: string; }
interface Platform { id: string; name: string; }

const Transactions = () => {
  const { user } = useAuth();
  const { activeAccount } = useAccount();
  const artistId = activeAccount?.id || user?.id;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterTrack, setFilterTrack] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    if (!artistId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [txRes, tracksRes, platformsRes] = await Promise.all([
          supabase
            .from('income_transactions')
            .select('*')
            .eq('artist_id', artistId)
            .order('created_at', { ascending: false })
            .limit(500),
          supabase.from('tracks').select('id, title'),
          supabase.from('income_platforms').select('id, name'),
        ]);
        setTransactions(txRes.data || []);
        setTracks(tracksRes.data || []);
        setPlatforms(platformsRes.data || []);
      } catch (err) {
        console.error('Error loading transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [artistId]);

  const getTrackTitle = (id: string | null) => id ? (tracks.find(t => t.id === id)?.title || '—') : '—';
  const getPlatformName = (id: string | null) => id ? (platforms.find(p => p.id === id)?.name || '—') : '—';

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'income': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Income</Badge>;
      case 'royalty_share_in': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Royalty In</Badge>;
      case 'royalty_share_out': return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Royalty Out</Badge>;
      case 'withdrawal': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Withdrawal</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  // Apply filters
  const filtered = transactions.filter(tx => {
    if (filterTrack !== 'all' && tx.track_id !== filterTrack) return false;
    if (filterPlatform !== 'all' && tx.platform_id !== filterPlatform) return false;
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterDateFrom && new Date(tx.created_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(tx.created_at) > new Date(filterDateTo + 'T23:59:59')) return false;
    return true;
  });

  // Dashboard totals
  const totalEarnings = transactions
    .filter(t => t.type === 'income' || t.type === 'royalty_share_in')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalWithdrawn = transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const currentBalance = transactions.length > 0 ? Number(transactions[0].balance_after) : 0;
  const pendingBalance = totalEarnings - totalWithdrawn;
  const txCount = transactions.length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">View all your income and transaction records</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AnimatedCard>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Balance</span>
              </div>
              <p className="text-lg font-bold">${currentBalance.toFixed(2)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Total Earned</span>
              </div>
              <p className="text-lg font-bold text-green-600">${totalEarnings.toFixed(2)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownRight className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Withdrawn</span>
              </div>
              <p className="text-lg font-bold text-red-600">${totalWithdrawn.toFixed(2)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-lg font-bold">${pendingBalance.toFixed(2)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Transactions</span>
              </div>
              <p className="text-lg font-bold">{txCount}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Select value={filterTrack} onValueChange={setFilterTrack}>
              <SelectTrigger><SelectValue placeholder="All Tracks" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tracks</SelectItem>
                {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger><SelectValue placeholder="All Platforms" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="royalty_share_in">Royalty In</SelectItem>
                <SelectItem value="royalty_share_out">Royalty Out</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} placeholder="From" />
            <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} placeholder="To" />
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transactions ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{getTrackTitle(tx.track_id)}</TableCell>
                    <TableCell>{getPlatformName(tx.platform_id)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{tx.description || '—'}</TableCell>
                    <TableCell>{getTypeBadge(tx.type)}</TableCell>
                    <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}${Number(tx.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">${Number(tx.balance_after).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;
