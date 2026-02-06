
import React from 'react';
 import { Check, Clock, XCircle, Loader2, AlertCircle, Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
 import { Badge } from '@/components/ui/badge';
 import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
 } from '@/components/ui/tooltip';
 import { Alert, AlertDescription } from '@/components/ui/alert';

export interface WithdrawalData {
  id: string;
  amount: number;
  created_at: string;
  processed_at: string | null;
  status: string;
  account_name: string;
  account_number: string;
  bank_name: string | null;
   rejection_reason?: string | null;
   approved_at?: string | null;
   naira_amount?: number | null;
}

interface WithdrawalsTableProps {
  withdrawals: WithdrawalData[];
}
 
 const EXCHANGE_RATE = 1250;
 
 // Progress step component
 const WithdrawalProgress: React.FC<{ status: string }> = ({ status }) => {
   const steps = [
     { key: 'PENDING', label: 'Pending', icon: Clock },
     { key: 'APPROVED', label: 'Approved', icon: Check },
     { key: 'PROCESSING', label: 'Processing', icon: Loader2 },
     { key: 'COMPLETED', label: 'Completed', icon: Check },
   ];
 
   const currentIndex = steps.findIndex(s => s.key === status);
   const isRejected = status === 'REJECTED';
 
   if (isRejected) {
     return (
       <div className="flex items-center gap-2">
         <XCircle className="h-4 w-4 text-destructive" />
         <span className="text-sm text-destructive font-medium">Rejected</span>
       </div>
     );
   }
 
   return (
     <div className="flex items-center gap-1">
       {steps.map((step, index) => {
         const isActive = index === currentIndex;
         const isCompleted = index < currentIndex;
         const Icon = step.icon;
 
         return (
           <React.Fragment key={step.key}>
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger>
                   <div
                     className={`flex items-center justify-center w-6 h-6 rounded-full ${
                       isCompleted
                         ? 'bg-green-500 text-white'
                         : isActive
                         ? 'bg-primary text-primary-foreground'
                         : 'bg-muted text-muted-foreground'
                     }`}
                   >
                     <Icon className={`h-3 w-3 ${isActive && step.key === 'PROCESSING' ? 'animate-spin' : ''}`} />
                   </div>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>{step.label}</p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>
             {index < steps.length - 1 && (
               <div
                 className={`w-4 h-0.5 ${
                   index < currentIndex ? 'bg-green-500' : 'bg-muted'
                 }`}
               />
             )}
           </React.Fragment>
         );
       })}
     </div>
   );
 };

const WithdrawalsTable: React.FC<WithdrawalsTableProps> = ({ withdrawals }) => {
  if (withdrawals.length === 0) {
    return (
       <div className="mb-8 text-center py-8 text-muted-foreground">
        No withdrawal requests found
      </div>
    );
  }
 
   // Check if there's an active withdrawal (pending, approved, or processing)
   const activeWithdrawal = withdrawals.find(w => 
     ['PENDING', 'APPROVED', 'PROCESSING'].includes(w.status)
   );

  return (
     <div className="space-y-4 mb-8">
       {/* Active withdrawal message */}
       {activeWithdrawal && activeWithdrawal.status !== 'PENDING' && (
         <Alert>
           <Info className="h-4 w-4" />
           <AlertDescription className="text-sm">
             {activeWithdrawal.status === 'APPROVED' || activeWithdrawal.status === 'PROCESSING' 
               ? 'Withdrawals usually take up to 7 days to complete after approval.'
               : 'Your withdrawal is being reviewed.'}
           </AlertDescription>
         </Alert>
       )}

       {/* Mobile Card View */}
       <div className="block sm:hidden space-y-3">
         {withdrawals.map((withdrawal) => (
           <div key={withdrawal.id} className="bg-card border rounded-lg p-4 space-y-3">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-xs text-muted-foreground">
                   {new Date(withdrawal.created_at).toLocaleDateString()}
                 </p>
                 <p className="font-semibold text-lg">${withdrawal.amount.toLocaleString()}</p>
                 <p className="text-sm text-muted-foreground">
                   ₦{(withdrawal.naira_amount || withdrawal.amount * EXCHANGE_RATE).toLocaleString()}
                 </p>
               </div>
               <WithdrawalProgress status={withdrawal.status} />
             </div>
             <div className="text-sm">
               <p className="text-muted-foreground">Account: {withdrawal.account_name}</p>
               {withdrawal.bank_name && (
                 <p className="text-muted-foreground">{withdrawal.bank_name}</p>
               )}
             </div>
             {withdrawal.status === 'REJECTED' && withdrawal.rejection_reason && (
               <div className="flex items-start gap-1 text-xs text-destructive bg-destructive/10 p-2 rounded">
                 <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                 <span>{withdrawal.rejection_reason}</span>
               </div>
             )}
           </div>
         ))}
       </div>

       {/* Desktop Table View */}
       <div className="hidden sm:block overflow-x-auto">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Date</TableHead>
               <TableHead>Amount (USD)</TableHead>
               <TableHead>Amount (NGN)</TableHead>
               <TableHead>Account</TableHead>
               <TableHead>Status</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {withdrawals.map((withdrawal) => (
               <TableRow key={withdrawal.id}>
                 <TableCell className="whitespace-nowrap">
                   {new Date(withdrawal.created_at).toLocaleDateString()}
                 </TableCell>
                 <TableCell className="whitespace-nowrap font-medium">
                   ${withdrawal.amount.toLocaleString()}
                 </TableCell>
                 <TableCell className="whitespace-nowrap font-medium">
                   ₦{(withdrawal.naira_amount || withdrawal.amount * EXCHANGE_RATE).toLocaleString()}
                 </TableCell>
                 <TableCell className="whitespace-nowrap">
                   {withdrawal.account_name}
                 </TableCell>
                 <TableCell>
                   <div className="space-y-2">
                     <WithdrawalProgress status={withdrawal.status} />
                     {withdrawal.status === 'REJECTED' && withdrawal.rejection_reason && (
                       <div className="flex items-start gap-1 text-xs text-destructive">
                         <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                         <span>{withdrawal.rejection_reason}</span>
                       </div>
                     )}
                   </div>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </div>
    </div>
  );
};

export default WithdrawalsTable;
