import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Edit, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ReleaseEditRequestProps {
  release: any;
  onRequestSubmitted?: () => void;
}

export function ReleaseEditRequest({ release, onRequestSubmitted }: ReleaseEditRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: release?.title || '',
    genre: release?.genre || '',
    description: release?.description || '',
    release_date: release?.release_date || '',
    explicit_content: release?.explicit_content || false,
    primary_language: release?.primary_language || 'English',
    artwork_credits: release?.artwork_credits || '',
    producer_credits: release?.producer_credits || '',
    songwriter_credits: release?.songwriter_credits || '',
    copyright_info: release?.copyright_info || '',
    reason: ''
  });

  const isApproved = release?.status === 'Approved';
  const canEdit = release?.status === 'Pending';

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the edit request",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (canEdit) {
        // Direct update for pending releases
        const updateData = { ...formData };
        delete updateData.reason;

        const { error } = await supabase
          .from('releases')
          .update(updateData)
          .eq('id', release.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Release updated successfully"
        });
      } else {
        // Create edit request for approved releases
        const requestedChanges = { ...formData };
        delete requestedChanges.reason;

        const { error } = await supabase
          .from('release_edit_requests')
          .insert([{
            release_id: release.id,
            artist_id: release.artist_id,
            requested_changes: requestedChanges,
            reason: formData.reason,
            request_type: 'edit'
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Edit request submitted successfully. Admin will review your request."
        });
      }

      setIsOpen(false);
      onRequestSubmitted?.();
    } catch (error) {
      console.error('Error submitting edit request:', error);
      toast({
        title: "Error",
        description: "Failed to submit edit request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          {canEdit ? 'Edit Release' : 'Request Edit'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            {canEdit ? 'Edit Release' : 'Request Release Edit'}
          </DialogTitle>
          {isApproved && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
              <AlertCircle className="h-4 w-4" />
              This release is approved. Changes require admin approval.
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                value={formData.genre}
                onChange={(e) => handleInputChange('genre', e.target.value)}
                placeholder="e.g., Pop, Hip-Hop, Rock"
              />
            </div>

            <div>
              <Label htmlFor="release_date">Release Date</Label>
              <Input
                id="release_date"
                type="date"
                value={formData.release_date}
                onChange={(e) => handleInputChange('release_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="primary_language">Primary Language</Label>
              <Select value={formData.primary_language} onValueChange={(value) => handleInputChange('primary_language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                  <SelectItem value="Italian">Italian</SelectItem>
                  <SelectItem value="Portuguese">Portuguese</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of your release"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="artwork_credits">Artwork Credits</Label>
              <Input
                id="artwork_credits"
                value={formData.artwork_credits}
                onChange={(e) => handleInputChange('artwork_credits', e.target.value)}
                placeholder="Artist/photographer who created the artwork"
              />
            </div>

            <div>
              <Label htmlFor="producer_credits">Producer Credits</Label>
              <Input
                id="producer_credits"
                value={formData.producer_credits}
                onChange={(e) => handleInputChange('producer_credits', e.target.value)}
                placeholder="Producer(s) of this release"
              />
            </div>

            <div>
              <Label htmlFor="songwriter_credits">Songwriter Credits</Label>
              <Input
                id="songwriter_credits"
                value={formData.songwriter_credits}
                onChange={(e) => handleInputChange('songwriter_credits', e.target.value)}
                placeholder="Songwriter(s) and composers"
              />
            </div>

            <div>
              <Label htmlFor="copyright_info">Copyright Information</Label>
              <Input
                id="copyright_info"
                value={formData.copyright_info}
                onChange={(e) => handleInputChange('copyright_info', e.target.value)}
                placeholder="e.g., ℗ 2024 Your Name"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="explicit_content"
              checked={formData.explicit_content}
              onCheckedChange={(checked) => handleInputChange('explicit_content', checked)}
            />
            <Label htmlFor="explicit_content">Explicit Content</Label>
          </div>

          <div>
            <Label htmlFor="reason">Reason for {canEdit ? 'Edit' : 'Edit Request'} *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder={canEdit ? "Describe what you're changing and why" : "Explain why you need to edit this approved release"}
              rows={3}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : (canEdit ? 'Update Release' : 'Submit Request')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}