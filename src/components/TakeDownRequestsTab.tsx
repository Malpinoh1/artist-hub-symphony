
import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, FileText, Calendar, ArrowRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const TakeDownRequestsTab = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState({});

  useEffect(() => {
    fetchTakeDownRequests();
  }, []);

  const fetchTakeDownRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('take_down_requests')
        .select(`
          *,
          releases(title, cover_art_url, artist_id),
          artists(name, email)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Initialize admin notes state for each request
      const notesState = {};
      data.forEach(request => {
        notesState[request.id] = request.admin_notes || '';
      });
      
      setAdminNotes(notesState);
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching take down requests:', error);
      toast.error('Failed to load take down requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, releaseId, action) => {
    try {
      // First update the take down request status
      const { error: requestError } = await supabase
        .from('take_down_requests')
        .update({ 
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes[requestId]
        })
        .eq('id', requestId);
        
      if (requestError) throw requestError;
      
      // If approved, update the release status
      if (action === 'approve') {
        const { error: releaseError } = await supabase
          .from('releases')
          .update({ status: 'TakeDown' })
          .eq('id', releaseId);
          
        if (releaseError) throw releaseError;
      } else {
        // If rejected, revert the release status to Approved
        const { error: releaseError } = await supabase
          .from('releases')
          .update({ status: 'Approved' })
          .eq('id', releaseId);
          
        if (releaseError) throw releaseError;
      }
      
      toast.success(`Take down request ${action === 'approve' ? 'approved' : 'rejected'}`);
      
      // Update the local state
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? { 
                ...request, 
                status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                processed_at: new Date().toISOString(),
                admin_notes: adminNotes[requestId] 
              } 
            : request
        )
      );
    } catch (error) {
      console.error('Error processing take down request:', error);
      toast.error('Failed to process take down request');
    }
  };
  
  const handleNotesChange = (requestId, value) => {
    setAdminNotes(prev => ({
      ...prev,
      [requestId]: value
    }));
  };
  
  if (loading) {
    return <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading take down requests...</div>;
  }
  
  if (requests.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">No take down requests</h3>
        <p className="text-gray-500 dark:text-gray-400">There are no take down requests at the moment.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {requests.map(request => (
        <div 
          key={request.id} 
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-md overflow-hidden mr-3">
                <img 
                  src={request.releases?.cover_art_url || 'https://via.placeholder.com/48'} 
                  alt={request.releases?.title} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">{request.releases?.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">By {request.artists?.name}</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                request.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                request.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {request.status}
              </span>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 mb-3">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              <span>Requested on: {new Date(request.created_at).toLocaleDateString()}</span>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason for take down:
              </label>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{request.reason}</p>
              </div>
            </div>
            
            {request.status === 'PENDING' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Admin notes:
                </label>
                <Textarea
                  value={adminNotes[request.id] || ''}
                  onChange={(e) => handleNotesChange(request.id, e.target.value)}
                  placeholder="Enter any notes about this take down request..."
                  className="bg-white dark:bg-slate-800"
                />
              </div>
            )}
            
            {request.status === 'PENDING' && (
              <div className="flex justify-end space-x-3">
                <Button
                  variant="destructive"
                  onClick={() => handleAction(request.id, request.release_id, 'approve')}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Approve Take Down
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction(request.id, request.release_id, 'reject')}
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Reject Request
                </Button>
              </div>
            )}
            
            {request.status !== 'PENDING' && request.processed_at && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Processed on: {new Date(request.processed_at).toLocaleString()}
              </div>
            )}
            
            {request.status !== 'PENDING' && request.admin_notes && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Admin notes:
                </label>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">{request.admin_notes}</p>
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="link"
                asChild
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0"
              >
                <a href={`/releases/${request.release_id}`} target="_blank" rel="noopener noreferrer">
                  View Release
                  <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TakeDownRequestsTab;
