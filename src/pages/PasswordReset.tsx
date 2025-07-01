
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      
      // Use the custom domain for redirect
      const resetUrl = `https://malpinohdistro.com.ng/reset-password`;
      
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
        const emailResult = await sendPasswordResetEmail(email, resetUrl);
        if (!emailResult.success) {
          console.error('Custom email error:', emailResult.error);
          // Don't fail completely if custom email fails
        }
      } catch (emailError) {
        console.error('Custom email error:', emailError);
        // Don't fail if custom email fails
      }

      setSent(true);
      toast({
        title: 'Reset email sent',
        description: 'Check your email (including spam folder) for password reset instructions'
      });

    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Could not send reset email. Please try again.');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md w-full p-8 bg-white border border-gray-200 rounded-xl shadow-lg">
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
                className={`border-gray-300 ${error ? 'border-red-500' : ''}`}
              />
              {error && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
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

            <div className="text-center text-sm text-gray-500 mt-4">
              <p>Check your spam folder if you don't see the email</p>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-black mb-2">
              Check Your Email
            </h2>
            <p className="text-gray-600 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Don't see the email?</strong> Check your spam or junk folder. 
                The email may take a few minutes to arrive.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSent(false);
                setError('');
              }}
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
