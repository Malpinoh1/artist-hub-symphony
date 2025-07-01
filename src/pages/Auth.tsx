
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import MarketingOptInPopup from '../components/MarketingOptInPopup';
import Notification from '../components/Notification';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { sendWelcomeEmail } from '../services/emailService';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMarketingPopup, setShowMarketingPopup] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({ show: false, type: 'info', title: '', message: '' });
  
  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    
    checkSession();
  }, [navigate]);

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  };
  
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) throw error;
      
    } catch (error: any) {
      console.error('Error with Google auth:', error);
      setError('Google authentication failed. Please try again.');
      showNotification('error', 'Authentication Failed', 'Google sign-in encountered an error. Please try again.');
      toast({
        title: "Google authentication failed",
        description: error.message || "An error occurred during Google authentication",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!email || !password || !fullName) {
      setError("Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    setLoading(true);
    
    try {
      // First check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', email)
        .maybeSingle();
        
      if (existingUser) {
        setError('An account with this email already exists. Please sign in instead.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });
      
      if (error) {
        // Handle specific Supabase errors
        if (error.message.includes('already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
          showNotification('info', 'Account Exists', 'Please use the sign in form instead.');
          return;
        } else if (error.message.includes('confirmation email')) {
          // Email confirmation error - still allow signup to complete
          console.warn('Email confirmation failed:', error);
          showNotification('info', 'Account Created', 'Your account was created successfully. You can sign in now.');
        } else {
          throw error;
        }
      }
      
      if (data.user) {
        // Send welcome email (don't fail signup if this fails)
        try {
          const emailResult = await sendWelcomeEmail(email, fullName);
          if (!emailResult.success) {
            console.error('Error sending welcome email:', emailResult.error);
          }
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
        }
        
        showNotification('success', 'Account Created!', 'Welcome to MALPINOHdistro! You can now sign in.');
        
        toast({
          title: "Account created successfully!",
          description: "Welcome to MALPINOHdistro! You can now sign in to your account.",
          variant: "default"
        });
        
        // Show marketing opt-in popup for new users
        setNewUserEmail(email);
        setShowMarketingPopup(true);
        
        // Switch to login mode after a short delay
        setTimeout(() => {
          setIsLogin(true);
          setError('');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error signing up:', error);
      setError(error.message || "An error occurred during sign up");
      showNotification('error', 'Sign Up Failed', error.message || 'Please try again.');
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
          showNotification('error', 'Login Failed', 'Please check your email and password.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
          showNotification('info', 'Email Verification Required', 'Please confirm your email address first.');
        } else {
          setError(error.message);
          showNotification('error', 'Login Error', error.message);
        }
        return;
      }
      
      // Check if user is admin
      if (data.user) {
        showNotification('success', 'Welcome Back!', 'Successfully signed in to your account.');
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .maybeSingle();
          
        if (roleData) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Error logging in:', error);
      setError(error.message || "An error occurred during login");
      showNotification('error', 'Login Failed', 'Please try again.');
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleMarketingPopupClose = () => {
    setShowMarketingPopup(false);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      <Navbar />
      
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-24 right-4 z-50 animate-in slide-in-from-right">
          <Notification
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={() => setNotification(prev => ({ ...prev, show: false }))}
          />
        </div>
      )}
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="max-w-md mx-auto">
              <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-semibold text-black mb-4">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p className="text-gray-600">
                  {isLogin 
                    ? 'Sign in to your MALPINOHdistro account' 
                    : 'Join MALPINOHdistro for music distribution'}
                </p>
              </div>
              
              <div className="p-8 bg-white border border-gray-200 rounded-xl shadow-lg">
                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {/* Google Auth Button */}
                <button
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 mb-6 bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {loading ? 'Please wait...' : `Continue with Google`}
                </button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>

                <form onSubmit={isLogin ? handleLogin : handleSignUp}>
                  {!isLogin && (
                    <div className="mb-6">
                      <label htmlFor="fullName" className="block text-sm font-medium text-black mb-1">Full Name *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          id="fullName"
                          type="text"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <label htmlFor="email" className="block text-sm font-medium text-black mb-1">Email Address *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="password" className="block text-sm font-medium text-black mb-1">Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={isLogin ? "Enter your password" : "Create a secure password (min 6 characters)"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {isLogin && (
                      <div className="mt-2 text-right">
                        <a href="/password-reset" className="text-sm text-blue-600 hover:text-blue-700">
                          Forgot password?
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : isLogin ? (
                        <>
                          <LogIn className="w-5 h-5" />
                          Sign In
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5" />
                          Create Account
                        </>
                      )}
                    </button>
                  </div>

                  {/* SSL Security Notice */}
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Your data is protected with SSL encryption</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      {isLogin ? "Don't have an account? " : "Already have an account? "}
                      <button
                        type="button"
                        className="text-blue-600 font-medium hover:text-blue-700"
                        onClick={() => {
                          setIsLogin(!isLogin);
                          setError('');
                        }}
                        disabled={loading}
                      >
                        {isLogin ? "Sign up" : "Sign in"}
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </main>
      
      <MarketingOptInPopup
        isOpen={showMarketingPopup}
        onClose={handleMarketingPopupClose}
        userEmail={newUserEmail}
      />
      
      <Footer />
    </div>
  );
};

export default Auth;
