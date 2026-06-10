import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedCard from '../components/AnimatedCard';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_usd: number;
  duration_days: number;
  features: string[];
  sort_order: number;
}

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rate } = useExchangeRate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutCode, setCheckoutCode] = useState<string | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('plans').select('*').eq('is_active', true).order('sort_order');
      setPlans((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const handleUpgrade = async (code: string) => {
    if (!user) { navigate('/auth?redirect=/pricing'); return; }
    setCheckoutCode(code);
    try {
      const { data, error } = await supabase.functions.invoke('flutterwave-initiate', {
        body: { plan_code: code, auto_renew: autoRenew },
      });
      if (error || !data?.link) throw new Error(error?.message || data?.error || 'Failed');
      window.location.href = data.link;
    } catch (e: any) {
      toast.error(e.message || 'Could not start checkout');
      setCheckoutCode(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <AnimatedCard>
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-display font-semibold mb-3">Simple, Transparent Pricing</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Pay securely with card, bank transfer, USSD or mobile money. Prices in USD; local payments converted at live rates.
              </p>
              <div className="inline-flex items-center gap-3 mt-6 px-4 py-2 rounded-full border border-border bg-card">
                <Label htmlFor="auto-renew" className="text-sm cursor-pointer">Auto-renew subscription</Label>
                <Switch id="auto-renew" checked={autoRenew} onCheckedChange={setAutoRenew} />
              </div>
            </div>
          </AnimatedCard>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {plans.map((plan, i) => {
                const highlighted = plan.code === 'annual';
                const ngn = rate ? Math.round(plan.price_usd * rate).toLocaleString() : null;
                return (
                  <AnimatedCard key={plan.id} delay={i * 100}>
                    <div className={`rounded-2xl overflow-hidden h-full flex flex-col ${highlighted ? 'border-2 border-primary shadow-xl shadow-primary/20 bg-gradient-to-b from-primary/5 to-transparent' : 'border border-border bg-card'}`}>
                      {highlighted && (
                        <div className="bg-primary text-primary-foreground text-center py-2 font-medium text-xs tracking-wider">MOST POPULAR</div>
                      )}
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-xl font-semibold">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                        <div className="mt-4 mb-6">
                          <span className="text-4xl font-bold">${plan.price_usd}</span>
                          <span className="text-muted-foreground ml-1 text-sm">
                            / {plan.duration_days === 0 ? 'release' : plan.duration_days === 365 ? 'year' : `${plan.duration_days} days`}
                          </span>
                          {ngn && (
                            <div className="text-xs text-muted-foreground mt-1">≈ ₦{ngn} at today's rate</div>
                          )}
                        </div>
                        <ul className="space-y-2.5 mb-6 flex-1">
                          {(plan.features || []).map((f, idx) => (
                            <li key={idx} className="flex items-start text-sm">
                              <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          disabled={checkoutCode === plan.code}
                          onClick={() => handleUpgrade(plan.code)}
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${highlighted ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'} disabled:opacity-50`}
                        >
                          {checkoutCode === plan.code ? (
                            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Redirecting…</span>
                          ) : user ? 'Upgrade Now' : 'Sign in to Upgrade'}
                        </button>
                      </div>
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>
          )}

          <AnimatedCard>
            <div className="glass-panel p-8 mb-16 text-center">
              <h2 className="text-2xl font-semibold mb-2">Secure payments by Flutterwave</h2>
              <p className="text-muted-foreground">Card · Bank Transfer · USSD · Mobile Money · International cards accepted</p>
              <p className="text-xs text-muted-foreground mt-4">
                Questions? <Link className="text-primary underline" to="/contact">Contact support</Link>
              </p>
            </div>
          </AnimatedCard>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
