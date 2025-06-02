
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { sendPasswordResetEmail } from '../services/emailService';

const PasswordReset = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Use the custom domain for redirect
      const resetUrl = `https://malpinohdistro.com.ng/reset-password?email=${encodeURIComponent(email)}`;
      
      // First check if user exists and send Supabase reset email
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl
      });

      if (supabaseError) {
        console.error('Supabase reset error:', supabaseError);
        // Continue anyway to send custom email
      }

      // Send custom password reset email
      try {
        await sendPasswordResetEmail(email, email.split('@')[0], resetUrl);
      } catch (emailError) {
        console.error('Custom email error:', emailError);
        // Don't fail if custom email fails
      }

      setSent(true);
      toast({
        title: 'Reset email sent',
        description: 'Check your email for password reset instructions'
      });

    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Reset failed',
        description: error.message || 'Could not send reset email',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="max-w-md w-full p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-black mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-black">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="border-gray-300"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-black mb-2">
              Check Your Email
            </h2>
            <p className="text-gray-600 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <Button
              variant="outline"
              onClick={() => setSent(false)}
              className="w-full border-gray-300 text-black hover:bg-gray-50"
            >
              Send Another Email
            </Button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
