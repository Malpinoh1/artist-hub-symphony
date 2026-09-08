import React, { useEffect, useState } from 'react';
import { Loader2, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  published_at: string | null;
  created_at: string;
  featured_image_url: string | null;
}

const AnnouncementsPanel = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('collective_announcements')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setItems((data as Announcement[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-2xl border border-border bg-card/60 p-8 text-center">
        No announcements yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <article key={a.id} className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5">
          {a.featured_image_url && (
            <img
              src={a.featured_image_url}
              alt={a.title}
              loading="lazy"
              className="w-full h-40 object-cover rounded-xl mb-4"
            />
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Megaphone className="h-3.5 w-3.5 text-primary" />
            <span className="capitalize">{a.category.replace(/_/g, ' ')}</span>
            <span>·</span>
            <span>{new Date(a.published_at ?? a.created_at).toLocaleDateString()}</span>
          </div>
          <h3 className="mt-2 font-semibold">{a.title}</h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{a.content}</p>
        </article>
      ))}
    </div>
  );
};

export default AnnouncementsPanel;
