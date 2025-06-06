
import React, { useState, useEffect } from 'react';
import { X, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface MarketingOptInPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

const MarketingOptInPopup: React.FC<MarketingOptInPopupProps> = ({ 
  isOpen, 
  onClose, 
  userEmail 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleOptIn = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ marketing_emails: true })
        .eq('id', session.user.id);

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "You're now subscribed to our marketing updates. We'll keep you informed about the latest features and opportunities.",
      });
      
      onClose();
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

  const handleOptOut = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ marketing_emails: false })
        .eq('id', session.user.id);

      if (error) throw error;

      toast({
        title: "Preferences updated",
        description: "You can change this setting anytime in your profile.",
      });
      
      onClose();
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Stay Connected with MALPINOHdistro
          </h2>
          <p className="text-gray-600 text-sm">
            Get the latest updates about new features, industry insights, and exclusive opportunities for artists.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-blue-800 text-sm font-medium">
                Secure & Professional Delivery
              </p>
              <p className="text-blue-700 text-xs mt-1">
                All emails are delivered with SSL encryption and proper authentication to ensure they reach your inbox, not spam folder.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleOptIn}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Updating...' : 'Yes, keep me updated'}
          </Button>
          
          <Button 
            onClick={handleOptOut}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? 'Updating...' : 'No thanks, just notifications'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          You can change this preference anytime in your account settings.
        </p>
      </div>
    </div>
  );
};

export default MarketingOptInPopup;
