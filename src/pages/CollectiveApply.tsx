import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, Users, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/seo/Seo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Role {
  slug: string;
  label: string;
}

const CollectiveApply = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCode = (searchParams.get('ref') || '').toLowerCase().trim();

  const [roles, setRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    other_role: '',
    social_links: '',
    why_join: '',
    contribution: '',
  });

  useEffect(() => {
    supabase
      .from('collective_roles')
      .select('slug, label')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setRoles(data ?? []));
  }, []);

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, email: user.email as string }));
  }, [user]);

  useEffect(() => {
    if (!referralCode) return;
    supabase
      .rpc('get_collective_public_profile', { p_handle: referralCode })
      .then(({ data }) => {
        const profile = data as { display_name?: string } | null;
        if (profile?.display_name) setReferrerName(profile.display_name);
      });
  }, [referralCode]);

  const toggleRole = (slug: string) =>
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const otherSelected = useMemo(() => selected.includes('other'), [selected]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (selected.length === 0) {
      toast.error('Select at least one role that describes you');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('collective-apply', {
        body: {
          ...form,
          roles: selected,
          other_role: otherSelected ? form.other_role : null,
          social_links: form.social_links
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
          referral_code: referralCode || null,
        },
      });

      if (error) {
        const message = (data as any)?.error || error.message || 'Could not submit your application';
        throw new Error(message);
      }
      if ((data as any)?.error) throw new Error((data as any).error);

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not submit your application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Join the MDISTRO Collective | MALPINOHdistro"
        description="Apply to the MDISTRO Collective — a community of artists, DJs, producers, promoters and music professionals growing African music together."
        path="/collective"
        keywords="music collective, artist community, MDISTRO Collective, MALPINOHdistro"
      />
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <header className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> MDISTRO COLLECTIVE
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-display font-bold">
              Join the MDISTRO Collective
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              A community for artists, fans, DJs, producers, promoters and music professionals. Get
              early access to opportunities, share your referral link and grow with us.
            </p>
            {referrerName && (
              <p className="mt-4 text-sm text-primary">
                Invited by <strong>{referrerName}</strong>
              </p>
            )}
          </header>

          {submitted ? (
            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
              <h2 className="mt-4 text-xl font-semibold">Application received</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We've emailed you a confirmation. Our team reviews applications and will let you know
                as soon as a decision is made.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link to="/">Back to home</Link>
                </Button>
                {user && (
                  <Button asChild>
                    <Link to="/collective/center">Go to Collective Center</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6 sm:p-8 space-y-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name *</Label>
                  <Input id="full_name" required value={form.full_name} onChange={set('full_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={set('email')}
                    disabled={!!user?.email}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" value={form.phone} onChange={set('phone')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" required value={form.country} onChange={set('country')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="city">City (optional)</Label>
                  <Input id="city" value={form.city} onChange={set('city')} />
                </div>
              </div>

              <div className="space-y-3">
                <Label>What describes you? * (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const active = selected.includes(role.slug);
                    return (
                      <button
                        key={role.slug}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleRole(role.slug)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                          active
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                        )}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>
                {otherSelected && (
                  <Input
                    placeholder="Tell us your role"
                    value={form.other_role}
                    onChange={set('other_role')}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="social_links">Social / music links (one per line)</Label>
                <Textarea
                  id="social_links"
                  rows={3}
                  placeholder="https://instagram.com/yourhandle&#10;https://open.spotify.com/artist/..."
                  value={form.social_links}
                  onChange={set('social_links')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="why_join">Why do you want to join? *</Label>
                <Textarea id="why_join" rows={4} required value={form.why_join} onChange={set('why_join')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contribution">How will you contribute to the collective? *</Label>
                <Textarea
                  id="contribution"
                  rows={4}
                  required
                  value={form.contribution}
                  onChange={set('contribution')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" /> Submit application
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <Share2 className="h-3.5 w-3.5" />
                Approved members get a personal referral link to invite others.
              </p>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CollectiveApply;
