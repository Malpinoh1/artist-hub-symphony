import React, { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Shield, Bell, Palette, Key, CreditCard, Calendar, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import InviteNotifications from '../components/InviteNotifications';
import { TwoFactorSetup } from '../components/TwoFactorSetup';
import { AdminTwoFactorReset } from '../components/AdminTwoFactorReset';
import ArtistAccountsManager from '../components/admin/ArtistAccountsManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  email_notifications?: boolean;
  marketing_emails?: boolean;
  two_factor_enabled?: boolean;
}

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    website: '',
    email_notifications: true,
    marketing_emails: true,
    dark_mode: false,
    two_factor_enabled: false
  });

  useEffect(() => {
    fetchUserProfile();
    fetchSubscriptionData();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
        
      setIsAdmin(!!roleData);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log("No user logged in");
        setLoading(false);
        return;
      }

      setCurrentUser(session.user);
      console.log("Fetching profile for user:", session.user.id);

      // Try to fetch existing profile
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching profile:", fetchError);
        throw fetchError;
      }

      if (profileData) {
        console.log("Profile found:", profileData);
        setUserProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          username: profileData.username || '',
          bio: profileData.bio || '',
          website: profileData.website || '',
          email_notifications: profileData.email_notifications ?? true,
          marketing_emails: profileData.marketing_emails ?? true,
          dark_mode: false,
          two_factor_enabled: profileData.two_factor_enabled ?? false
        });
      } else {
        console.log("No profile found, creating one with default settings");
        // Create profile with proper defaults
        const newProfileData = {
          id: session.user.id,
          username: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
          email_notifications: true,
          marketing_emails: true, // Default to opted-in
          bio: '',
          website: '',
          avatar_url: null
        };

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert(newProfileData, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating profile:", createError);
          // Set default form data anyway
          setFormData({
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            username: session.user.email || '',
            bio: '',
            website: '',
            email_notifications: true,
            marketing_emails: true,
            dark_mode: false,
            two_factor_enabled: false
          });
        } else {
          console.log("Profile created successfully:", newProfile);
          setUserProfile(newProfile);
          setFormData({
            full_name: newProfile.full_name || '',
            username: newProfile.username || '',
            bio: newProfile.bio || '',
            website: newProfile.website || '',
            email_notifications: newProfile.email_notifications ?? true,
            marketing_emails: newProfile.marketing_emails ?? true,
            dark_mode: false,
            two_factor_enabled: newProfile.two_factor_enabled ?? false
          });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading user profile:", error);
      toast({
        title: "Failed to load profile",
        description: "There was an error loading your profile data. Using default values.",
        variant: "destructive"
      });
      
      setLoading(false);
      if (currentUser) {
        setFormData({
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '',
          username: currentUser.email || '',
          bio: '',
          website: '',
          email_notifications: true,
          marketing_emails: true,
          dark_mode: false,
          two_factor_enabled: false
        });
      }
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      setLoadingSubscription(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log("No user logged in for subscription check");
        setLoadingSubscription(false);
        return;
      }

      // First try to get from local database
      const { data: localSub } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (localSub) {
        setSubscriptionData({
          subscribed: localSub.subscribed,
          subscription_tier: localSub.subscription_tier,
          subscription_end: localSub.subscription_end
        });
      } else {
        // No local data, set default
        setSubscriptionData({
          subscribed: false,
          subscription_tier: null,
          subscription_end: null
        });
      }

      setLoadingSubscription(false);
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      setLoadingSubscription(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "Please log in to save your profile.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      console.log("Saving profile data:", formData);

      const profileData = {
        id: currentUser.id,
        full_name: formData.full_name.trim() || currentUser.email?.split('@')[0] || '',
        username: formData.username.trim() || currentUser.email || '',
        bio: formData.bio.trim(),
        website: formData.website.trim(),
        email_notifications: formData.email_notifications,
        marketing_emails: formData.marketing_emails
      };

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving profile:", error);
        throw error;
      }

      console.log("Profile saved successfully:", updatedProfile);
      setUserProfile(updatedProfile);

      // Show specific message for marketing email changes
      if (formData.marketing_emails !== userProfile?.marketing_emails) {
        toast({
          title: formData.marketing_emails ? "Marketing emails enabled" : "Marketing emails disabled",
          description: formData.marketing_emails 
            ? "You'll now receive marketing updates and exclusive opportunities." 
            : "You won't receive marketing emails, but will still get important notifications.",
        });
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile and preferences have been updated successfully."
        });
      }

    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: "Could not update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser?.email) {
      toast({
        title: "Error",
        description: "No email address found for your account.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for instructions to reset your password.",
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEnable2FA = () => {
    setShow2FASetup(true);
  };

  const handle2FAStatusChange = async (enabled: boolean) => {
    // Update local state immediately for UI
    setFormData(prev => ({ ...prev, two_factor_enabled: enabled }));
    if (userProfile) {
      setUserProfile({ ...userProfile, two_factor_enabled: enabled });
    }
    
    // Refetch from database to ensure consistency
    await fetchUserProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading settings...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <section className="container mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-slate-900 dark:text-white mb-2">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">Manage your account preferences and settings.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Settings */}
            <AnimatedCard className="lg:col-span-2">
              <div className="glass-panel p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Profile Information</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name" className="text-slate-700 dark:text-slate-300">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        placeholder="Enter your full name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        placeholder="Enter your username"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio" className="text-slate-700 dark:text-slate-300">Bio</Label>
                    <Input
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Tell us about yourself"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website" className="text-slate-700 dark:text-slate-300">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="mt-1"
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full md:w-auto"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </div>
            </AnimatedCard>

            {/* Subscription Status */}
            <AnimatedCard>
              <div className="glass-panel p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Subscription</h2>
                </div>

                {loadingSubscription ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500 mx-auto mb-2"></div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Loading subscription...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {subscriptionData?.subscribed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {subscriptionData?.subscribed ? 'Active' : 'Inactive'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Subscription Status
                        </p>
                      </div>
                    </div>

                    {subscriptionData?.subscription_tier && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">Plan:</span>
                        <Badge variant="secondary">
                          {subscriptionData.subscription_tier}
                        </Badge>
                      </div>
                    )}

                    {subscriptionData?.subscription_end && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            Next Billing
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(subscriptionData.subscription_end).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Subscription details are managed by administrators. 
                        Contact support if you have questions about your subscription.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedCard>

            {/* Communication Preferences */}
            <AnimatedCard>
              <div className="glass-panel p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Email Preferences</h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Email Notifications</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Receive updates about your releases</p>
                    </div>
                    <Switch
                      checked={formData.email_notifications}
                      onCheckedChange={(checked) => handleInputChange('email_notifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Marketing Emails</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Receive promotional content and updates</p>
                    </div>
                    <Switch
                      checked={formData.marketing_emails}
                      onCheckedChange={(checked) => handleInputChange('marketing_emails', checked)}
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Secure Email Delivery:</strong> All emails are delivered using SSL encryption and proper authentication to ensure they reach your inbox, not spam folder.
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Marketing Status: <strong>{formData.marketing_emails ? 'Opted In ✓' : 'Opted Out'}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedCard>

            {/* Team Invitations */}
            {currentUser && (
              <AnimatedCard className="lg:col-span-3">
                <InviteNotifications 
                  userEmail={currentUser.email}
                  onInvitationUpdate={fetchUserProfile}
                />
              </AnimatedCard>
            )}

            {/* Security Settings */}
            <AnimatedCard className="lg:col-span-3">
              <div className="glass-panel p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Security</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2 text-slate-900 dark:text-white">Change Password</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Update your account password</p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleChangePassword}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2 text-slate-900 dark:text-white">Two-Factor Authentication</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      {formData.two_factor_enabled ? 'Manage your 2FA settings' : 'Add an extra layer of security'}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={formData.two_factor_enabled ? "default" : "secondary"}>
                        {formData.two_factor_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleEnable2FA}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {formData.two_factor_enabled ? 'Manage 2FA' : 'Enable 2FA'}
                    </Button>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </section>

        {/* Artist Accounts Section */}
        <section className="container mx-auto px-4 py-8">
          <ArtistAccountsManager />
        </section>

        {/* Admin 2FA Reset Section */}
        {isAdmin && (
          <section className="container mx-auto px-4 py-8">
            <AdminTwoFactorReset />
          </section>
        )}
      </main>
      
      <TwoFactorSetup
        isOpen={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        currentlyEnabled={formData.two_factor_enabled}
        onStatusChange={handle2FAStatusChange}
      />
      
      <Footer />
    </div>
  );
};

export default Settings;
