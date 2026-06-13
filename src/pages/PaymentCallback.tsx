import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';

const PaymentCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const status_q = params.get('status');
    const tx_ref = params.get('tx_ref');
    const transaction_id = params.get('transaction_id');

    if (status_q === 'cancelled') {
      setStatus('failed'); setMessage('Payment was cancelled.'); return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('flutterwave-verify', {
          body: { transaction_id, tx_ref },
        });
        if (error || !data?.ok) {
          setStatus('failed');
          setMessage(data?.error || 'Could not verify payment. If you were charged, contact support.');
          return;
        }
        setStatus('success');
        setMessage('Payment verified — your account is unlocked.');

        // Check for an in-progress release draft → if present, auto-resume.
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id;
        if (uid) {
          const { data: draft } = await supabase
            .from('release_drafts').select('id').eq('user_id', uid)
            .order('updated_at', { ascending: false }).limit(1).maybeSingle();
          if (draft) {
            setHasDraft(true);
            setTimeout(() => navigate('/release-form?resume=1', { replace: true }), 1500);
          }
        }
      } catch (e: any) {
        setStatus('failed'); setMessage(e.message || 'Verification error');
      }
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="glass-panel p-10 rounded-2xl">
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
                <h1 className="text-2xl font-semibold mt-6">Verifying payment…</h1>
                <p className="text-muted-foreground mt-2">Please wait while we confirm your transaction.</p>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
                <h1 className="text-2xl font-semibold mt-6">Payment Successful 🎉</h1>
                <p className="text-muted-foreground mt-2">{message}</p>
                {hasDraft && (
                  <p className="text-xs text-primary mt-3">Resuming your release draft…</p>
                )}
                <div className="flex flex-col gap-3 mt-8">
                  {hasDraft ? (
                    <Link to="/release-form?resume=1" className="bg-primary text-primary-foreground py-3 rounded-lg font-medium">Resume release</Link>
                  ) : (
                    <Link to="/dashboard" className="bg-primary text-primary-foreground py-3 rounded-lg font-medium">Go to Dashboard</Link>
                  )}
                  <Link to="/settings/payments" className="text-sm text-muted-foreground underline">View payment history</Link>
                </div>
              </>
            )}
            {status === 'failed' && (
              <>
                <XCircle className="h-16 w-16 text-destructive mx-auto" />
                <h1 className="text-2xl font-semibold mt-6">Payment Issue</h1>
                <p className="text-muted-foreground mt-2">{message}</p>
                <div className="flex flex-col gap-3 mt-8">
                  <Link to="/pricing" className="bg-primary text-primary-foreground py-3 rounded-lg font-medium">Try again</Link>
                  <Link to="/support" className="text-sm text-muted-foreground underline">Contact support</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentCallback;

