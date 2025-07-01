
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { sendPasswordResetEmail } from '../services/emailService';
import Notification from '../components/Notification';

const PasswordReset = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({ show: false, type: 'info', title: '', message: '' });

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 8000);
  };

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
      const resetUrl = `${window.location.origin}/reset-password`;
      
      // First send Supabase reset email
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl
      });

      if (supabaseError) {
        console.error('Supabase reset error:', supabaseError);
        // Don't fail completely - we'll still try to send custom email
      }

      // Send custom password reset email
      try {
        const emailResult = await sendPasswordResetEmail(email, resetUrl);
        if (!emailResult.success) {
          console.error('Custom email error:', emailResult.error);
          // If both fail, show error
          if (supabaseError) {
            throw new Error(emailResult.error || 'Failed to send reset email');
          }
        }
      } catch (emailError) {
        console.error('Custom email error:', emailError);
        // If Supabase also failed, throw error
        if (supabaseError) {
          throw new Error('Failed to send reset email. Please try again.');
        }
      }

      setSent(true);
      showNotification('success', 'Reset Email Sent', 'Please check your inbox and spam folder for reset instructions.');
      toast({
        title: 'Reset email sent',
        description: 'Check your email (including spam folder) for password reset instructions'
      });

    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = error.message || 'Could not send reset email. Please try again.';
      setError(errorMessage);
      showNotification('error', 'Reset Failed', errorMessage);
      toast({
        title: 'Reset failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <Notification
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={() => setNotification(prev => ({ ...prev, show: false }))}
          />
        </div>
      )}
      
      <div className="max-w-md w-full p-8 bg-white border border-gray-200 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-black mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600">
            Enter your email address and we'll send you a secure link to reset your password
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
                disabled={loading}
                className={`border-gray-300 ${error ? 'border-red-500' : ''}`}
              />
              {error && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <div className="text-center text-sm text-gray-500 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800">
                  <strong>Security Notice:</strong> Reset links are valid for 24 hours and are sent securely with SSL encryption.
                </p>
              </div>
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
              We've sent a password reset link to <strong className="text-black">{email}</strong>
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="text-blue-800 text-sm space-y-2">
                <p><strong>Don't see the email?</strong></p>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email</li>
                  <li>Wait a few minutes - emails can be delayed</li>
                  <li>Check all your email folders</li>
                </ul>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                setSent(false);
                setError('');
                setEmail('');
              }}
              className="w-full border-gray-300 text-black hover:bg-gray-50 mb-4"
            >
              Send Another Email
            </Button>
            
            <div className="text-sm text-gray-500">
              <p>Still having trouble? Contact support at <strong>support@malpinohdistro.com.ng</strong></p>
            </div>
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
