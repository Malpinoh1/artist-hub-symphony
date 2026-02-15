
import { supabase } from "../../integrations/supabase/client";

export interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  account_name: string;
  account_number: string;
  bank_name: string;
  artist_id: string;
   rejection_reason?: string | null;
   approved_at?: string | null;
   naira_amount?: number | null;
  artists?: {
    id: string;
    name: string;
    email: string;
  };
}

// Fetch all withdrawals for admin dashboard
export async function fetchAdminWithdrawals() {
  try {
    const { data: withdrawalsData, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select(`
        id,
        amount,
        status,
        created_at,
        processed_at,
        account_name,
        account_number,
        bank_name,
        rejection_reason,
        approved_at,
        naira_amount,
        credit_deduction,
        final_amount,
        artists(id, name, email)
      `)
      .order('created_at', { ascending: false });
      
    if (withdrawalsError) throw withdrawalsError;
    return withdrawalsData || [];
  } catch (error) {
    console.error('Error fetching admin withdrawals:', error);
    return [];
  }
}

// Update withdrawal status
export async function updateWithdrawalStatus(id: string, status: string) {
  try {
     const updateData: Record<string, unknown> = { status };
     
     if (status === 'APPROVED') {
       updateData.approved_at = new Date().toISOString();
     } else if (status === 'COMPLETED' || status === 'REJECTED') {
       updateData.processed_at = new Date().toISOString();
     }
 
    const { data: updatedWithdrawal, error: updateError } = await supabase
      .from('withdrawals')
       .update(updateData)
      .eq('id', id)
      .select(`
        id,
        amount,
        status,
        created_at,
        processed_at,
        account_name,
        account_number,
        bank_name,
         rejection_reason,
         approved_at,
         naira_amount,
        artists(id, name, email)
      `)
      .single();
      
    if (updateError) {
      console.error('Error updating withdrawal status:', updateError);
      return { success: false, error: updateError };
    }

    if (!updatedWithdrawal) {
      console.error('No withdrawal returned after update');
      return { success: false, error: { message: 'No withdrawal returned after update' } };
    }
    
    console.log('Withdrawal status updated successfully:', updatedWithdrawal);
    return { success: true, data: updatedWithdrawal };
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    return { success: false, error };
  }
}
