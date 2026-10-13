import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ExternalLink, Loader2, LockKeyhole, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface CollectivePublicProfile {
  handle: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  roles?: string[] | null;
  country?: string | null;
  city?: string | null;
  contribution_areas?: string[] | null;
  social_links?: Record<string, unknown> | null;
  member_since?: string | null;
  private?: boolean;
  members_only?: boolean;
}

const safeExternalUrl = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const CollectiveMemberProfile = () => {
  const { handle = "" } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<CollectivePublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setFailed(false);
      const { data, error } = await supabase.rpc("get_collective_public_profile", {
        p_handle: handle.toLowerCase().trim(),
      });
      if (cancelled) return;
      if (error) {
        setFailed(true);
        setProfile(null);
      } else {
        setProfile((data as unknown as CollectivePublicProfile | null) ?? null);
      }
      setLoading(false);
    };
    if (handle) void load();
    else {
      setProfile(null);
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [handle]);

  const restricted = profile?.private || profile?.members_only;
  const location = [profile?.city, profile?.country].filter(Boolean).join(", ");
  const socialLinks = Object.entries(profile?.social_links ?? {})
    .map(([label, value]) => ({ label, url: safeExternalUrl(value) }))
    .filter((item): item is { label: string; url: string } => Boolean(item.url));

  return (
    <>
      <Navbar />
      <main className="min-h-[65vh] px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/collective"><ArrowLeft className="mr-2 h-4 w-4" /> MDISTRO Collective</Link>
          </Button>

          {loading ? (
            <div className="flex justify-center py-20" role="status" aria-label="Loading member profile">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : failed ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <h1 className="mt-4 text-xl font-semibold">We couldn't load this profile</h1>
              <p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
              <Button className="mt-5" onClick={() => window.location.reload()}>Try again</Button>
            </div>
          ) : !profile ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <h1 className="mt-4 text-xl font-semibold">Member not found</h1>
              <p className="mt-2 text-sm text-muted-foreground">This profile may have been removed or is no longer active.</p>
            </div>
          ) : restricted ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <LockKeyhole className="mx-auto h-9 w-9 text-muted-foreground" />
              <h1 className="mt-4 text-xl font-semibold">{profile.display_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">@{profile.handle}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                {profile.private ? "This member has chosen to keep their profile private." : "This profile is available to active Collective members."}
              </p>
              <Button asChild className="mt-5"><Link to="/auth">Sign in</Link></Button>
            </div>
          ) : (
            <article className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="h-2 bg-primary" />
              <div className="p-6 sm:p-10">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  {profile.avatar_url && safeExternalUrl(profile.avatar_url) ? (
                    <img src={safeExternalUrl(profile.avatar_url) ?? undefined} alt="" className="h-24 w-24 rounded-2xl border border-border object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-muted text-2xl font-semibold text-muted-foreground">
                      {(profile.display_name || profile.handle).slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 className="break-words text-2xl font-bold sm:text-3xl">{profile.display_name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">@{profile.handle}</p>
                    {location && <p className="mt-2 text-sm text-muted-foreground">{location}</p>}
                    {(profile.roles ?? []).length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {profile.roles?.map((role) => (
                          <span key={role} className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{role.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {profile.bio && <section className="mt-8"><h2 className="text-sm font-semibold">About</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{profile.bio}</p></section>}

                {(profile.contribution_areas ?? []).length > 0 && (
                  <section className="mt-7">
                    <h2 className="text-sm font-semibold">Collaboration interests</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.contribution_areas?.map((area) => <span key={area} className="rounded-full border border-border px-3 py-1.5 text-xs capitalize">{area.replace(/_/g, " ")}</span>)}
                    </div>
                  </section>
                )}

                {socialLinks.length > 0 && (
                  <section className="mt-7">
                    <h2 className="text-sm font-semibold">Links and portfolio</h2>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {socialLinks.map((item) => <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/50"><span className="truncate capitalize">{item.label.replace(/_/g, " ")}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></a>)}
                    </div>
                  </section>
                )}

                {profile.member_since && <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">Collective member since {new Date(profile.member_since).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</p>}
              </div>
            </article>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CollectiveMemberProfile;
