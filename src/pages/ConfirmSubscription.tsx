import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const ConfirmSubscription = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'already_confirmed' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmSubscription = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid confirmation link. No token provided.');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('confirm-email-subscription', {
          body: {},
          headers: {},
        });

        // Use fetch directly since we need to pass query params
        const response = await fetch(
          `https://hewyffhdykietximpfbu.supabase.co/functions/v1/confirm-email-subscription?token=${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          setStatus('error');
          setMessage(result.error || 'Failed to confirm subscription');
          return;
        }

        if (result.alreadyConfirmed) {
          setStatus('already_confirmed');
          setMessage('Your email subscription has already been confirmed.');
        } else {
          setStatus('success');
          setMessage('Your email subscription has been confirmed successfully!');
        }
      } catch (error: any) {
        console.error('Confirmation error:', error);
        setStatus('error');
        setMessage('An error occurred while confirming your subscription.');
      }
    };

    confirmSubscription();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">Confirming your subscription...</h1>
              <p className="text-muted-foreground">Please wait while we verify your email.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Subscription Confirmed!</h1>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">
                You'll now receive updates, news, and exclusive offers from MALPINOHdistro.
              </p>
              <Button onClick={() => navigate('/dashboard')} className="mt-4">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'already_confirmed' && (
            <div className="space-y-6">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
                <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Already Confirmed</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button onClick={() => navigate('/dashboard')} className="mt-4">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Confirmation Failed</h1>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">
                If you continue to have issues, please contact our support team.
              </p>
              <div className="flex gap-3 justify-center mt-4">
                <Button variant="outline" onClick={() => navigate('/')}>
                  Go Home
                </Button>
                <Button onClick={() => navigate('/contact')}>
                  Contact Support
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ConfirmSubscription;
