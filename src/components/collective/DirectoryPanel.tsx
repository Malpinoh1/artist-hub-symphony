import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Search, MapPin, Users, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [loadError, setLoadError] = useState(false);
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);

  const load = useCallback(async (reset: boolean, q: string, off: number) => {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase.rpc('list_collective_directory', {
      p_search: q || undefined,
      p_limit: PAGE,
      p_offset: off,
    });
    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
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
        className="flex min-w-0 gap-2"
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

      {loadError ? (
        <div className="py-14 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm font-medium">We couldn't load the member directory.</p>
          <Button variant="outline" className="mt-4" onClick={() => load(true, query, 0)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </div>
      ) : loading && members.length === 0 ? (
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
              <Button
                key={m.handle}
                type="button"
                variant="outline"
                onClick={() => setSelectedMember(m)}
                className="h-auto min-w-0 justify-start whitespace-normal rounded-2xl bg-card/60 p-4 text-left backdrop-blur-xl hover:border-primary/40 hover:bg-card/80"
              >
                <div className="min-w-0 w-full">
                <div className="flex min-w-0 items-center gap-3">
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
                    <p className="truncate font-medium">{m.display_name}</p>
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
                {(m.contribution_areas ?? []).length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Contributes to {(m.contribution_areas ?? []).slice(0, 3).map((area) => area.replace(/_/g, ' ')).join(', ')}
                  </p>
                )}
                </div>
              </Button>
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

      <Dialog open={selectedMember !== null} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {selectedMember && (
            <>
              <DialogHeader className="pr-6 text-left">
                <div className="flex min-w-0 items-center gap-3">
                  {selectedMember.avatar_url ? (
                    <img
                      src={selectedMember.avatar_url}
                      alt={selectedMember.display_name}
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <DialogTitle className="break-words leading-snug">{selectedMember.display_name}</DialogTitle>
                    <DialogDescription className="break-all">@{selectedMember.handle}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              {(selectedMember.city || selectedMember.country) && (
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {[selectedMember.city, selectedMember.country].filter(Boolean).join(', ')}
                </p>
              )}
              {selectedMember.bio && <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedMember.bio}</p>}
              <div className="space-y-3">
                {(selectedMember.roles ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Roles</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedMember.roles.map((role) => (
                        <span key={role} className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
                          {role.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(selectedMember.contribution_areas ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Contribution areas</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(selectedMember.contribution_areas ?? []).map((area) => (
                        <span key={area} className="rounded-full border border-border px-2.5 py-1 text-xs capitalize">
                          {area.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DirectoryPanel;
