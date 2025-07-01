
import React, { useState, useEffect } from 'react';
import { X, Mail, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

const MarketingOptInBanner: React.FC = () => {
  const { toast } = useToast();
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    checkMarketingStatus();
  }, []);

  const checkMarketingStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      console.log('Checking marketing status for user:', session.user.id);

      // First try to get existing profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('marketing_emails, full_name, username')
        .eq('id', session.user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
        return;
      }

      if (profile) {
        console.log('Found profile:', profile);
        setUserProfile(profile);
        // Show banner only if marketing_emails is explicitly false or null
        // Don't show if it's already true
        if (profile.marketing_emails === false || profile.marketing_emails === null) {
          setShowBanner(true);
        }
      } else {
        console.log('No profile found, creating one with default opt-in');
        // Create profile with marketing_emails = true by default
        const newProfileData = {
          id: session.user.id,
          username: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email || '',
          marketing_emails: true, // Default to opted-in
          email_notifications: true
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
          console.error('Error creating profile:', createError);
        } else {
          console.log('Profile created with marketing opt-in:', newProfile);
          setUserProfile(newProfile);
          // Don't show banner since user is already opted-in by default
        }
      }
    } catch (error) {
      console.error('Error checking marketing status:', error);
    }
  };

  const handleOptIn = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      console.log('Opting user into marketing emails:', session.user.id);

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: session.user.id,
          marketing_emails: true,
          username: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email || ''
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error updating marketing preference:', error);
        throw error;
      }

      console.log('Successfully opted into marketing emails');
      toast({
        title: "Welcome to our updates!",
        description: "You'll now receive our latest news, features, and exclusive artist opportunities.",
      });
      
      setShowBanner(false);
    } catch (error) {
      console.error('Error updating marketing preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      console.log('User dismissing marketing banner (opting out):', session.user.id);

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: session.user.id,
          marketing_emails: false,
          username: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email || ''
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error updating marketing preference:', error);
        throw error;
      }

      console.log('Successfully opted out of marketing emails');
      setShowBanner(false);
    } catch (error) {
      console.error('Error updating marketing preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-white/20 rounded-full p-2">
              <Gift className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">
                🎵 Stay in the loop with MALPINOHdistro!
              </p>
              <p className="text-xs text-blue-100 mt-1">
                Get exclusive updates, new features, and music industry insights delivered to your inbox.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button
              onClick={handleOptIn}
              disabled={loading}
              size="sm"
              className="bg-white text-blue-600 hover:bg-blue-50 font-medium"
            >
              <Mail className="w-4 h-4 mr-1" />
              {loading ? 'Updating...' : 'Yes, Keep Me Updated'}
            </Button>
            
            <button
              onClick={handleDismiss}
              disabled={loading}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingOptInBanner;
