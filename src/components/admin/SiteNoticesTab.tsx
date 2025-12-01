import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SiteNotice {
  id: string;
  title: string | null;
  message: string;
  level: string;
  is_active: boolean;
  start_at: string;
  end_at: string | null;
  dismissible: boolean;
  created_at: string;
}

export function SiteNoticesTab() {
  const [notices, setNotices] = useState<SiteNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotice, setEditingNotice] = useState<SiteNotice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    level: 'info',
    is_active: true,
    start_at: '',
    end_at: '',
    dismissible: true
  });

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('site_notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch site notices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      level: 'info',
      is_active: true,
      start_at: '',
      end_at: '',
      dismissible: true
    });
    setEditingNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.message.trim()) {
      toast({
        title: "Error",
        description: "Message is required",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if user is admin
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive"
        });
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (roleError || !roleData) {
        toast({
          title: "Error",
          description: "You do not have permission to manage site notices",
          variant: "destructive"
        });
        return;
      }

      const noticeData = {
        title: formData.title.trim() || null,
        message: formData.message.trim(),
        level: formData.level,
        is_active: formData.is_active,
        start_at: formData.start_at || new Date().toISOString(),
        end_at: formData.end_at || null,
        dismissible: formData.dismissible,
        created_by: session.user.id
      };

      if (editingNotice) {
        const { error } = await supabase
          .from('site_notices')
          .update(noticeData)
          .eq('id', editingNotice.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        
        toast({
          title: "Success",
          description: "Notice updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('site_notices')
          .insert([noticeData]);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        
        toast({
          title: "Success",
          description: "Notice created successfully"
        });
      }

      resetForm();
      fetchNotices();
    } catch (error: any) {
      console.error('Error saving notice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save notice. Please check your permissions.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (notice: SiteNotice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title || '',
      message: notice.message,
      level: notice.level,
      is_active: notice.is_active,
      start_at: notice.start_at ? new Date(notice.start_at).toISOString().slice(0, 16) : '',
      end_at: notice.end_at ? new Date(notice.end_at).toISOString().slice(0, 16) : '',
      dismissible: notice.dismissible
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
      const { error } = await supabase
        .from('site_notices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Notice deleted successfully"
      });
      
      fetchNotices();
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast({
        title: "Error",
        description: "Failed to delete notice",
        variant: "destructive"
      });
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const isNoticeActive = (notice: SiteNotice) => {
    const now = new Date();
    const startTime = new Date(notice.start_at);
    const endTime = notice.end_at ? new Date(notice.end_at) : null;
    
    return notice.is_active && startTime <= now && (!endTime || endTime >= now);
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingNotice ? 'Edit Site Notice' : 'Create Site Notice'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Notice title"
                />
              </div>
              
              <div>
                <Label htmlFor="level">Level</Label>
                <Select value={formData.level} onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter your notice message"
                rows={3}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="start_at">Start Time</Label>
                <Input
                  id="start_at"
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_at: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="end_at">End Time (Optional)</Label>
                <Input
                  id="end_at"
                  type="datetime-local"
                  value={formData.end_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="dismissible"
                  checked={formData.dismissible}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dismissible: checked }))}
                />
                <Label htmlFor="dismissible">Dismissible</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingNotice ? 'Update Notice' : 'Create Notice'}
              </Button>
              {editingNotice && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Notices ({notices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <p className="text-muted-foreground">No notices created yet.</p>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => (
                <div key={notice.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {notice.title && (
                          <h4 className="font-medium">{notice.title}</h4>
                        )}
                        <Badge className={getLevelBadgeColor(notice.level)}>
                          {notice.level}
                        </Badge>
                        {isNoticeActive(notice) && (
                          <Badge className="bg-green-100 text-green-800">Live</Badge>
                        )}
                        {!notice.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notice.message}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <p>Start: {new Date(notice.start_at).toLocaleString()}</p>
                        {notice.end_at && (
                          <p>End: {new Date(notice.end_at).toLocaleString()}</p>
                        )}
                        <p>Dismissible: {notice.dismissible ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(notice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(notice.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}