
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from 'lucide-react';
import { manageStreamingLinks, StreamingLink } from '@/services/streamingLinksService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StreamingLinksEditorProps {
  releaseId: string;
  currentLinks: StreamingLink[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const PLATFORM_OPTIONS = [
  'Spotify',
  'Apple Music',
  'YouTube Music',
  'Amazon Music',
  'Deezer',
  'Tidal',
  'SoundCloud',
  'Pandora',
  'Other'
];

const StreamingLinksEditor = ({ 
  releaseId, 
  currentLinks, 
  isOpen, 
  onClose, 
  onUpdate 
}: StreamingLinksEditorProps) => {
  const [links, setLinks] = useState<StreamingLink[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Initialize form with current links if available
  useEffect(() => {
    setLinks(currentLinks.length > 0 
      ? [...currentLinks] 
      : [{ platform: 'Spotify', url: '' }]
    );
  }, [currentLinks, isOpen]);
  
  const handleAddLink = () => {
    setLinks([...links, { platform: 'Spotify', url: '' }]);
  };
  
  const handleRemoveLink = (index: number) => {
    const newLinks = [...links];
    newLinks.splice(index, 1);
    setLinks(newLinks);
  };
  
  const handleLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const invalidLinks = links.filter(link => !link.url || !link.platform);
    if (invalidLinks.length > 0) {
      toast.error("Please fill in all platform names and URLs");
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await manageStreamingLinks(releaseId, links);
      
      if (result.success) {
        toast.success("Streaming links updated successfully");
        onUpdate();
        onClose();
      } else {
        toast.error("Failed to update streaming links");
      }
    } catch (error) {
      console.error("Error updating streaming links:", error);
      toast.error("An error occurred while updating links");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Update Streaming Links</DialogTitle>
          <DialogDescription>
            Add or update streaming platform links for this release
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
            {links.map((link, index) => (
              <div key={index} className="grid grid-cols-[2fr_3fr_auto] gap-3 items-center">
                <div>
                  <Label htmlFor={`platform-${index}`} className="sr-only">
                    Platform
                  </Label>
                  <select
                    id={`platform-${index}`}
                    value={link.platform}
                    onChange={(e) => handleLinkChange(index, 'platform', e.target.value)}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {PLATFORM_OPTIONS.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor={`url-${index}`} className="sr-only">
                    URL
                  </Label>
                  <Input
                    id={`url-${index}`}
                    type="text"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                  />
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveLink(index)}
                  disabled={links.length === 1}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={handleAddLink}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Another Link
            </Button>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading}
            >
              {loading ? "Updating..." : "Save Links"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StreamingLinksEditor;
