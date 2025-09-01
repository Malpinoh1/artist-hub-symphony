import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SiteNotice {
  id: string;
  title: string | null;
  message: string;
  level: string;
  dismissible: boolean;
  start_at: string;
  end_at: string | null;
}

const DISMISSED_NOTICES_KEY = 'dismissed_site_notices';

export function SiteNoticePopup() {
  const [notices, setNotices] = useState<SiteNotice[]>([]);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const getDismissedNotices = (): string[] => {
    try {
      const dismissed = localStorage.getItem(DISMISSED_NOTICES_KEY);
      return dismissed ? JSON.parse(dismissed) : [];
    } catch {
      return [];
    }
  };

  const markNoticeDismissed = (noticeId: string) => {
    const dismissed = getDismissedNotices();
    if (!dismissed.includes(noticeId)) {
      dismissed.push(noticeId);
      localStorage.setItem(DISMISSED_NOTICES_KEY, JSON.stringify(dismissed));
    }
  };

  const fetchActiveNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('site_notices')
        .select('*')
        .eq('is_active', true)
        .order('start_at', { ascending: false });

      if (error) {
        console.error('Error fetching site notices:', error);
        return;
      }

      if (data) {
        const dismissedNotices = getDismissedNotices();
        const activeNotices = data.filter(notice => {
          const now = new Date();
          const startTime = new Date(notice.start_at);
          const endTime = notice.end_at ? new Date(notice.end_at) : null;
          
          const isTimeValid = startTime <= now && (!endTime || endTime >= now);
          const isNotDismissed = !notice.dismissible || !dismissedNotices.includes(notice.id);
          
          return isTimeValid && isNotDismissed;
        });

        setNotices(activeNotices);
        if (activeNotices.length > 0) {
          setCurrentNoticeIndex(0);
          setIsOpen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  };

  useEffect(() => {
    fetchActiveNotices();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('site-notices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_notices'
        },
        () => {
          fetchActiveNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDismiss = () => {
    const currentNotice = notices[currentNoticeIndex];
    if (currentNotice?.dismissible) {
      markNoticeDismissed(currentNotice.id);
    }
    
    if (currentNoticeIndex < notices.length - 1) {
      setCurrentNoticeIndex(currentNoticeIndex + 1);
    } else {
      setIsOpen(false);
      setCurrentNoticeIndex(0);
    }
  };

  const handleNext = () => {
    if (currentNoticeIndex < notices.length - 1) {
      setCurrentNoticeIndex(currentNoticeIndex + 1);
    } else {
      setIsOpen(false);
      setCurrentNoticeIndex(0);
    }
  };

  const getNoticeIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNoticeColors = (level: string) => {
    switch (level) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  if (notices.length === 0 || !isOpen) {
    return null;
  }

  const currentNotice = notices[currentNoticeIndex];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {getNoticeIcon(currentNotice.level)}
              {currentNotice.title || 'Notice'}
            </DialogTitle>
            {currentNotice.dismissible && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className={cn(
          "rounded-lg border p-4",
          getNoticeColors(currentNotice.level)
        )}>
          <p className="text-sm leading-relaxed">
            {currentNotice.message}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {notices.length > 1 && (
              <span>{currentNoticeIndex + 1} of {notices.length}</span>
            )}
          </div>
          
          <div className="flex gap-2">
            {notices.length > 1 && currentNoticeIndex < notices.length - 1 && (
              <Button variant="outline" size="sm" onClick={handleNext}>
                Next
              </Button>
            )}
            {currentNotice.dismissible && (
              <Button size="sm" onClick={handleDismiss}>
                {currentNoticeIndex < notices.length - 1 ? 'Dismiss & Next' : 'Dismiss'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}