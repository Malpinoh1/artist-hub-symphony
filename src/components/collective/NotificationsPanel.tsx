import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Bell, CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface MemberNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const NotificationsPanel = () => {
  const [items, setItems] = useState<MemberNotification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setUserId(auth.user.id);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, link, read, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setFailed(true);
      setItems([]);
    } else {
      setItems((data as MemberNotification[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: string) => {
    if (!userId) return;
    setSavingId(id);
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', userId);
    setSavingId(null);
    if (error) return;
    setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  };

  const markAllRead = async () => {
    if (!userId) return;
    setSavingId('all');
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    setSavingId(null);
    if (error) return;
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  };

  if (loading) return <div className="flex justify-center py-12" role="status"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (failed) return (
    <div className="py-12 text-center">
      <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
      <p className="mt-3 text-sm">We couldn't load your notifications.</p>
      <Button variant="outline" className="mt-4" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
    </div>
  );

  const unread = items.filter((item) => !item.read).length;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">{unread} unread · showing up to 100 recent notifications</p>
        </div>
        {unread > 0 && <Button variant="outline" size="sm" disabled={savingId === 'all'} onClick={() => void markAllRead()}><CheckCheck className="mr-2 h-4 w-4" />Mark all read</Button>}
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">You're all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">Important Collective updates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const safeLink = item.link?.startsWith('/') && !item.link.startsWith('//') ? item.link : null;
            const content = (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  {!item.read && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Unread</span>}
                </div>
                {item.message && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.message}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
              </>
            );
            return (
              <article key={item.id} className={`rounded-xl border border-border p-4 ${item.read ? 'bg-card/50' : 'bg-primary/5'}`}>
                {safeLink ? <Link to={safeLink} onClick={() => { if (!item.read) void markRead(item.id); }} className="block">{content}</Link> : content}
                {!item.read && <div className="mt-3"><Button size="sm" variant="outline" disabled={savingId === item.id} onClick={() => void markRead(item.id)}>Mark as read</Button></div>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default NotificationsPanel;
