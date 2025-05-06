
import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

interface TakeDownRequestFormProps {
  releaseId: string;
  artistId: string;
  onRequestSubmitted: () => void;
}

const TakeDownRequestForm: React.FC<TakeDownRequestFormProps> = ({ 
  releaseId, 
  artistId,
  onRequestSubmitted 
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for your take down request');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // First, submit the take down request
      const { error: requestError } = await supabase
        .from('take_down_requests')
        .insert({
          release_id: releaseId,
          artist_id: artistId,
          reason: reason.trim(),
          status: 'PENDING'
        });
        
      if (requestError) throw requestError;
      
      // Then update the release status to "TakeDownRequested"
      const { error: releaseError } = await supabase
        .from('releases')
        .update({ status: 'TakeDownRequested' })
        .eq('id', releaseId);
        
      if (releaseError) throw releaseError;
      
      toast.success('Take down request submitted successfully');
      setReason('');
      onRequestSubmitted();
    } catch (error) {
      console.error('Error submitting take down request:', error);
      toast.error('Failed to submit take down request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="text-amber-600 dark:text-amber-500 w-5 h-5 mt-0.5" />
        <div>
          <h3 className="font-medium text-amber-800 dark:text-amber-400">Request Take Down</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Submit a request to remove this release from all platforms. This action is permanent 
            and may take several days to process.
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please provide a detailed reason for your take down request..."
          className="w-full bg-white dark:bg-slate-800 min-h-[100px] mb-3"
          required
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            variant="destructive"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Take Down Request'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TakeDownRequestForm;
