import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Trophy, BadgeCheck, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const iconFor = (type: string) => {
  if (type === 'achievement') return <Trophy className="h-4 w-4 text-primary" />;
  if (type === 'oac_status') return <BadgeCheck className="h-4 w-4 text-primary" />;
  return <Inbox className="h-4 w-4 text-muted-foreground" />;
};

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as NotificationRow[];
    },
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from('notifications' as any).update({ read: true }).in('id', ids);
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
  };

  const open = async (n: NotificationRow) => {
    if (!n.read) {
      await supabase.from('notifications' as any).update({ read: true }).eq('id', n.id);
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
    if (n.link) navigate(n.link);
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Open notifications" className="relative h-9 w-9 p-0">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={cn(
                  'w-full text-left flex gap-2.5 px-3 py-2.5 border-b border-border/60 hover:bg-muted transition-colors',
                  !n.read && 'bg-primary/5',
                )}
              >
                <span className="mt-0.5 shrink-0">{iconFor(n.type)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{n.title}</span>
                  {n.message && (
                    <span className="block text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                  )}
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </span>
                {!n.read && <Badge variant="secondary" className="h-fit text-[9px] shrink-0">New</Badge>}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
