import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, MapPin, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface DirectoryMember {
  handle: string;
  display_name: string;
  avatar_url: string | null;
  roles: string[];
  country: string | null;
  city: string | null;
  contribution_areas: string[] | null;
  bio: string | null;
}

const PAGE = 24;

const DirectoryPanel = () => {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (reset: boolean, q: string, off: number) => {
    setLoading(true);
    const { data } = await supabase.rpc('list_collective_directory', {
      p_search: q || undefined,
      p_limit: PAGE,
      p_offset: off,
    });
    const result = (data as unknown as { total: number; members: DirectoryMember[] }) ?? { total: 0, members: [] };
    setTotal(result.total ?? 0);
    setMembers((prev) => (reset ? result.members ?? [] : [...prev, ...(result.members ?? [])]));
    setLoading(false);
  }, []);

  useEffect(() => {
    load(true, query, 0);
    setOffset(0);
  }, [load, query]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search members by name, handle or city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search Collective members"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {loading && members.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-2xl border border-border bg-card/60 p-8 text-center">
          No members found.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{total} member{total === 1 ? '' : 's'}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <Link
                key={m.handle}
                to={`/collective/member/${m.handle}`}
                className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.display_name}
                      loading="lazy"
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{m.handle}</p>
                  </div>
                </div>
                {(m.city || m.country) && (
                  <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[m.city, m.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {m.bio && <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{m.bio}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(m.roles ?? []).slice(0, 3).map((r) => (
                    <span key={r} className="px-2 py-0.5 rounded-full bg-muted text-[11px] capitalize">
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
          {members.length < total && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  const next = offset + PAGE;
                  setOffset(next);
                  load(false, query, next);
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DirectoryPanel;
