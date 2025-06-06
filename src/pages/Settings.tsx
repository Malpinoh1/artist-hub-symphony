import React, { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Shield, Bell, Palette, Key } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
}

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    website: '',
    email_notifications: true,
    marketing_emails: true, // Changed default to true
    dark_mode: false
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log("No user logged in");
        setLoading(false);
        return;
      }

      setCurrentUser(session.user);
      console.log("Current user:", session.user.id);

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
          marketing_emails: profileData.marketing_emails ?? true, // Default to true
          dark_mode: false
        });
      } else {
        console.log("No profile found, creating one...");
        // Create profile using upsert to avoid RLS issues
        const newProfileData = {
          id: session.user.id,
          username: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email || '',
          email_notifications: true,
          marketing_emails: true, // Auto opt-in for new users
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
          // If creation fails, set default form data anyway
          setFormData({
            full_name: session.user.user_metadata?.full_name || session.user.email || '',
            username: session.user.email || '',
            bio: '',
            website: '',
            email_notifications: true,
            marketing_emails: true,
            dark_mode: false
          });
        } else {
          console.log("Profile created:", newProfile);
          setUserProfile(newProfile);
          setFormData({
            full_name: newProfile.full_name || '',
            username: newProfile.username || '',
            bio: newProfile.bio || '',
            website: newProfile.website || '',
            email_notifications: newProfile.email_notifications ?? true,
            marketing_emails: newProfile.marketing_emails ?? true,
            dark_mode: false
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
      
      // Set loading to false and use default form data
      setLoading(false);
      if (currentUser) {
        setFormData({
          full_name: currentUser.user_metadata?.full_name || currentUser.email || '',
          username: currentUser.email || '',
          bio: '',
          website: '',
          email_notifications: true,
          marketing_emails: true,
          dark_mode: false
        });
      }
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
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
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

      toast({
        title: "Profile updated",
        description: "Your profile and preferences have been updated successfully."
      });

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

  const handleChangePassword = () => {
    toast({
      title: "Password Reset",
      description: "A password reset link will be sent to your email.",
    });
    
    // Send password reset email
    supabase.auth.resetPasswordForEmail(currentUser?.email || '', {
      redirectTo: `${window.location.origin}/reset-password`
    });
  };

  const handleEnable2FA = () => {
    toast({
      title: "Two-Factor Authentication",
      description: "2FA setup is coming soon. This feature will be available in a future update.",
    });
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
                </div>
              </div>
            </AnimatedCard>

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
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Add an extra layer of security</p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleEnable2FA}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Enable 2FA
                    </Button>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Settings;
