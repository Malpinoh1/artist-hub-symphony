
import React from 'react';
 import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Withdrawal, updateWithdrawalStatus } from '@/services/adminService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog"
 import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
 import { Textarea } from "@/components/ui/textarea"
 import { MoreHorizontal, Check, X, Eye } from 'lucide-react';
 import { sendWithdrawalNotificationEmail } from '@/utils/email';
 import { supabase } from '@/integrations/supabase/client';
 
 const EXCHANGE_RATE = 1250;
 
interface ExtendedWithdrawal extends Withdrawal {
  rejection_reason?: string | null;
  approved_at?: string | null;
  naira_amount?: number | null;
  credit_deduction?: number | null;
  final_amount?: number | null;
}

interface WithdrawalsTabProps {
   withdrawals: ExtendedWithdrawal[];
  loading: boolean;
  onWithdrawalUpdate: (id: string, status: string) => void;
}

const WithdrawalsTab: React.FC<WithdrawalsTabProps> = ({ withdrawals, loading, onWithdrawalUpdate }) => {
   const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
   const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
   const [selectedWithdrawal, setSelectedWithdrawal] = useState<ExtendedWithdrawal | null>(null);
   const [rejectionReason, setRejectionReason] = useState('');
   const [processing, setProcessing] = useState(false);
 
  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
       case 'APPROVED':
         return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
       case 'PROCESSING':
         return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'REJECTED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };
  
   const handleApprove = async (withdrawal: ExtendedWithdrawal) => {
     setProcessing(true);
    try {
       const result = await updateWithdrawalStatus(withdrawal.id, 'APPROVED');
      
      if (result.success) {
         // Send email notification
         if (withdrawal.artists?.email) {
           await sendWithdrawalNotificationEmail(
             withdrawal.artists.email,
             'approved',
             withdrawal.amount,
             withdrawal.naira_amount || withdrawal.amount * EXCHANGE_RATE
           );
         }
        toast.success('Withdrawal status updated successfully');
         onWithdrawalUpdate(withdrawal.id, 'APPROVED');
      } else {
        toast.error('Failed to update withdrawal status');
      }
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      toast.error('An error occurred while updating status');
     } finally {
       setProcessing(false);
    }
  };
 
  const handleRejectClick = (withdrawal: ExtendedWithdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };
 
   const handleViewDetails = (withdrawal: ExtendedWithdrawal) => {
     setSelectedWithdrawal(withdrawal);
     setDetailsDialogOpen(true);
   };
 
  const handleMarkAsProcessing = async (withdrawal: ExtendedWithdrawal) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'PROCESSING'
        })
        .eq('id', withdrawal.id);

      if (error) throw error;

      toast.success('Withdrawal marked as processing');
      onWithdrawalUpdate(withdrawal.id, 'PROCESSING');
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      toast.error('An error occurred while updating status');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteWithdrawal = async (withdrawal: ExtendedWithdrawal) => {
    setProcessing(true);
    try {
      // Update withdrawal status (balance already deducted on request)
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'COMPLETED',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);

      if (withdrawalError) throw withdrawalError;

      // Log activity
      await supabase.from('activity_logs').insert({
        artist_id: withdrawal.artist_id,
        user_id: withdrawal.artist_id,
        activity_type: 'withdrawal_completed',
        title: 'Withdrawal Completed',
        description: `$${withdrawal.amount.toLocaleString()} withdrawal completed. Payout: $${(withdrawal.final_amount ?? withdrawal.amount).toLocaleString()}`,
        metadata: { withdrawal_id: withdrawal.id, amount: withdrawal.amount, credit_deduction: withdrawal.credit_deduction, final_amount: withdrawal.final_amount }
      });

      // Send email notification
      if (withdrawal.artists?.email) {
        await sendWithdrawalNotificationEmail(
          withdrawal.artists.email,
          'completed',
          withdrawal.final_amount ?? withdrawal.amount,
          (withdrawal.final_amount ?? withdrawal.amount) * EXCHANGE_RATE
        );
      }

      toast.success('Withdrawal completed');
      onWithdrawalUpdate(withdrawal.id, 'COMPLETED');
    } catch (error) {
      console.error('Error completing withdrawal:', error);
      toast.error('An error occurred while completing withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectWithRefund = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      // Refund the balance back since it was deducted on request
      const { data: artistData, error: fetchError } = await supabase
        .from('artists')
        .select('available_balance, credit_balance')
        .eq('id', selectedWithdrawal.artist_id)
        .single();

      if (fetchError) throw fetchError;

      const refundAmount = selectedWithdrawal.amount;
      const creditRefund = selectedWithdrawal.credit_deduction || 0;

      await supabase
        .from('artists')
        .update({ 
          available_balance: (artistData?.available_balance || 0) + refundAmount,
          credit_balance: (artistData?.credit_balance || 0) + creditRefund
        })
        .eq('id', selectedWithdrawal.artist_id);

      // Update withdrawal status
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'REJECTED',
          rejection_reason: rejectionReason.trim(),
          processed_at: new Date().toISOString()
        })
        .eq('id', selectedWithdrawal.id);

      if (error) throw error;

      // Log refund activity
      await supabase.from('activity_logs').insert({
        artist_id: selectedWithdrawal.artist_id,
        user_id: selectedWithdrawal.artist_id,
        activity_type: 'withdrawal_rejected',
        title: 'Withdrawal Rejected — Balance Refunded',
        description: `$${refundAmount.toLocaleString()} refunded to available balance. Reason: ${rejectionReason.trim()}`,
        metadata: { withdrawal_id: selectedWithdrawal.id, refund_amount: refundAmount }
      });

      // Send email notification
      if (selectedWithdrawal.artists?.email) {
        await sendWithdrawalNotificationEmail(
          selectedWithdrawal.artists.email,
          'rejected',
          selectedWithdrawal.amount,
          selectedWithdrawal.naira_amount || selectedWithdrawal.amount * EXCHANGE_RATE,
          rejectionReason.trim()
        );
      }

      toast.success('Withdrawal rejected and balance refunded');
      onWithdrawalUpdate(selectedWithdrawal.id, 'REJECTED');
      setRejectDialogOpen(false);
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast.error('An error occurred while rejecting withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 dark:text-white">Withdrawals</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-3">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="border rounded-lg p-4 bg-card space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{withdrawal.artists?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{withdrawal.artists?.email}</p>
                  </div>
                  <Badge className={getStatusColor(withdrawal.status)}>
                    {withdrawal.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">USD</p>
                    <p className="font-semibold">${withdrawal.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">NGN</p>
                    <p className="font-semibold">₦{(withdrawal.naira_amount || withdrawal.amount * EXCHANGE_RATE).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>{withdrawal.account_name}</p>
                  <p>{withdrawal.bank_name} - {withdrawal.account_number}</p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Requested: {new Date(withdrawal.created_at).toLocaleDateString()}
                </div>
                
                {withdrawal.status === 'REJECTED' && withdrawal.rejection_reason && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                    {withdrawal.rejection_reason}
                  </p>
                )}
                
                <div className="flex gap-2 pt-2 border-t">
                  {withdrawal.status === 'PENDING' && (
                    <>
                      <Button size="sm" className="flex-1" onClick={() => handleApprove(withdrawal)} disabled={processing}>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleRejectClick(withdrawal)} disabled={processing}>
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {withdrawal.status === 'APPROVED' && (
                    <Button size="sm" className="flex-1" onClick={() => handleMarkAsProcessing(withdrawal)} disabled={processing}>
                      <Check className="h-3 w-3 mr-1" /> Mark Processing
                    </Button>
                  )}
                  {withdrawal.status === 'PROCESSING' && (
                    <Button size="sm" className="flex-1" onClick={() => handleCompleteWithdrawal(withdrawal)} disabled={processing}>
                      <Check className="h-3 w-3 mr-1" /> Mark Completed
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleViewDetails(withdrawal)}>
                    <Eye className="h-3 w-3" />
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
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Amount (USD)</TableHead>
                  <TableHead>Amount (NGN)</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Processed At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium font-mono text-xs">
                      {withdrawal.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{withdrawal.artists?.name || withdrawal.artist_id}</TableCell>
                    <TableCell>${withdrawal.amount}</TableCell>
                    <TableCell>₦{(withdrawal.naira_amount || withdrawal.amount * EXCHANGE_RATE).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">
                      <div>{withdrawal.account_name}</div>
                      <div className="text-muted-foreground">{withdrawal.bank_name} - {withdrawal.account_number}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(withdrawal.status)}>
                        {withdrawal.status}
                      </Badge>
                      {withdrawal.status === 'REJECTED' && withdrawal.rejection_reason && (
                        <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={withdrawal.rejection_reason}>
                          {withdrawal.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {withdrawal.processed_at ? new Date(withdrawal.processed_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={processing}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {withdrawal.status === 'PENDING' && (
                            <>
                              <DropdownMenuItem onClick={() => handleApprove(withdrawal)}>
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleRejectClick(withdrawal)}
                                className="text-destructive"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {withdrawal.status === 'APPROVED' && (
                            <DropdownMenuItem onClick={() => handleMarkAsProcessing(withdrawal)}>
                              <Check className="h-4 w-4 mr-2" />
                              Mark as Processing
                            </DropdownMenuItem>
                          )}
                          {withdrawal.status === 'PROCESSING' && (
                            <DropdownMenuItem onClick={() => handleCompleteWithdrawal(withdrawal)}>
                              <Check className="h-4 w-4 mr-2" />
                              Mark as Completed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(withdrawal)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
 
       {/* Reject Dialog */}
       <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Reject Withdrawal</DialogTitle>
             <DialogDescription>
               Please provide a reason for rejecting this withdrawal request. This will be shown to the user.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <p className="text-sm text-muted-foreground mb-2">
                 Amount: ${selectedWithdrawal?.amount} (₦{((selectedWithdrawal?.naira_amount || (selectedWithdrawal?.amount || 0) * EXCHANGE_RATE)).toLocaleString()})
               </p>
               <p className="text-sm text-muted-foreground">
                 Artist: {selectedWithdrawal?.artists?.name}
               </p>
             </div>
             <Textarea
               placeholder="Enter rejection reason..."
               value={rejectionReason}
               onChange={(e) => setRejectionReason(e.target.value)}
               rows={3}
             />
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={processing}>
               Cancel
             </Button>
             <Button variant="destructive" onClick={handleRejectWithRefund} disabled={processing || !rejectionReason.trim()}>
               {processing ? 'Rejecting...' : 'Reject Withdrawal'}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Details Dialog */}
       <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Withdrawal Details</DialogTitle>
           </DialogHeader>
           {selectedWithdrawal && (
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-sm text-muted-foreground">Artist</p>
                   <p className="font-medium">{selectedWithdrawal.artists?.name}</p>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Email</p>
                   <p className="font-medium">{selectedWithdrawal.artists?.email}</p>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Amount (USD)</p>
                   <p className="font-medium">${selectedWithdrawal.amount.toLocaleString()}</p>
                 </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount (NGN)</p>
                    <p className="font-medium">₦{(selectedWithdrawal.naira_amount || selectedWithdrawal.amount * EXCHANGE_RATE).toLocaleString()}</p>
                  </div>
                  {(selectedWithdrawal.credit_deduction || 0) > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Deduction</p>
                      <p className="font-medium text-amber-600">-${(selectedWithdrawal.credit_deduction || 0).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Final Payout</p>
                    <p className="font-medium text-green-600">${(selectedWithdrawal.final_amount ?? selectedWithdrawal.amount).toLocaleString()}</p>
                  </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Bank Name</p>
                   <p className="font-medium">{selectedWithdrawal.bank_name}</p>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Account Number</p>
                   <p className="font-medium">{selectedWithdrawal.account_number}</p>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Account Name</p>
                   <p className="font-medium">{selectedWithdrawal.account_name}</p>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Status</p>
                   <Badge className={getStatusColor(selectedWithdrawal.status)}>
                     {selectedWithdrawal.status}
                   </Badge>
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Requested At</p>
                   <p className="font-medium">{new Date(selectedWithdrawal.created_at).toLocaleString()}</p>
                 </div>
                 {selectedWithdrawal.processed_at && (
                   <div>
                     <p className="text-sm text-muted-foreground">Processed At</p>
                     <p className="font-medium">{new Date(selectedWithdrawal.processed_at).toLocaleString()}</p>
                   </div>
                 )}
               </div>
               {selectedWithdrawal.rejection_reason && (
                 <div className="p-3 bg-destructive/10 rounded-md">
                   <p className="text-sm text-muted-foreground">Rejection Reason</p>
                   <p className="text-destructive">{selectedWithdrawal.rejection_reason}</p>
                 </div>
               )}
             </div>
           )}
           <DialogFooter>
             <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
               Close
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </div>
  );
};

export default WithdrawalsTab;
