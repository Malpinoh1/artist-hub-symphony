
import React, { useState } from 'react';
import { toast } from 'sonner';
import { manageStreamingLinks } from '../services/releaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { themeClass } from '@/lib/utils';
import { Trash2, Plus } from 'lucide-react';

interface StreamingLinksFormProps {
  releaseId: string;
  existingLinks: { platform: string, url: string }[] | undefined;
  onClose: () => void;
  onSubmitted: () => void;
}

const StreamingLinksForm: React.FC<StreamingLinksFormProps> = ({
  releaseId,
  existingLinks = [],
  onClose,
  onSubmitted
}) => {
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<{ platform: string, url: string }[]>(
    existingLinks.length > 0 ? existingLinks : [{ platform: '', url: '' }]
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate links
    const validLinks = links.filter(link => link.platform.trim() !== '' && link.url.trim() !== '');
    
    if (validLinks.length === 0) {
      toast.error('Please add at least one valid streaming link');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await manageStreamingLinks(releaseId, validLinks);
      
      if (result.success) {
        toast.success('Streaming links updated successfully');
        onSubmitted();
      } else {
        toast.error('Failed to update streaming links');
      }
    } catch (error) {
      console.error('Error updating streaming links:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (index: number, field: 'platform' | 'url', value: string) => {
    const updatedLinks = [...links];
    updatedLinks[index][field] = value;
    setLinks(updatedLinks);
  };
  
  const addLink = () => {
    setLinks([...links, { platform: '', url: '' }]);
  };
  
  const removeLink = (index: number) => {
    if (links.length === 1) {
      // Don't remove the last link, just clear it
      setLinks([{ platform: '', url: '' }]);
    } else {
      const updatedLinks = links.filter((_, i) => i !== index);
      setLinks(updatedLinks);
    }
  };
  
  const platformSuggestions = ['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Deezer', 'Tidal', 'Pandora'];
  
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={themeClass(
        "bg-white border border-slate-200 shadow-xl",
        "bg-slate-900 border-slate-700"
      ) + " w-full max-w-lg rounded-lg p-6 max-h-[90vh] overflow-auto"}>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Manage Streaming Links</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {links.map((link, index) => (
              <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex justify-between mb-2">
                  <h3 className="font-medium dark:text-slate-200">Streaming Link {index + 1}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLink(index)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor={`platform-${index}`}>Platform</Label>
                    <div className="relative">
                      <Input
                        id={`platform-${index}`}
                        value={link.platform}
                        onChange={(e) => handleChange(index, 'platform', e.target.value)}
                        list={`platforms-${index}`}
                        placeholder="e.g., Spotify"
                        required
                      />
                      <datalist id={`platforms-${index}`}>
                        {platformSuggestions.map((platform) => (
                          <option key={platform} value={platform} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor={`url-${index}`}>URL</Label>
                    <Input
                      id={`url-${index}`}
                      value={link.url}
                      onChange={(e) => handleChange(index, 'url', e.target.value)}
                      placeholder="https://..."
                      type="url"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addLink}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Platform
            </Button>
          </div>
          
          <div className="mt-6 flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Links'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StreamingLinksForm;
