import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Loader2, CreditCard, Calendar, Infinity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OPTIONS = [
  { code: 'per_release', name: 'Pay Per Release', price: 14, period: 'one-time', icon: CreditCard,
    perks: ['Submit 1 release', 'No subscription', 'Pay only when you release'] },
  { code: 'annual', name: 'Annual', price: 36, period: 'per year', icon: Calendar, highlight: true,
    perks: ['Unlimited releases for 1 year', 'All major DSPs', 'Priority support'] },
  { code: 'unlimited', name: 'Unlimited', price: 100, period: 'per year', icon: Infinity,
    perks: ['Unlimited releases', 'Highest priority', 'Lifetime distribution care'] },
];

const ReleaseSubmissionGateModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChoose = async (code: string) => {
    setLoadingCode(code);
    try {
      const { data, error } = await supabase.functions.invoke('flutterwave-initiate', {
        body: { plan_code: code, auto_renew: code !== 'per_release' },
      });
      if (error || !data?.link) throw new Error(error?.message || data?.error || 'Could not start checkout');
      window.location.href = data.link;
    } catch (e: any) {
      toast.error(e.message || 'Checkout failed');
      setLoadingCode(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Payment required to submit</DialogTitle>
          <DialogDescription>
            Choose how you'd like to unlock this release. All payments are processed securely by Flutterwave.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isLoading = loadingCode === opt.code;
            return (
              <div
                key={opt.code}
                className={`relative rounded-2xl border p-5 flex flex-col ${
                  opt.highlight ? 'border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-lg shadow-primary/10' : 'border-border bg-card'
                }`}
              >
                {opt.highlight && (
                  <span className="absolute -top-2 right-4 text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    BEST VALUE
                  </span>
                )}
                <Icon className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-lg">{opt.name}</h3>
                <div className="mt-1 mb-3">
                  <span className="text-3xl font-bold">${opt.price}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{opt.period}</span>
                </div>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {opt.perks.map((p) => (
                    <li key={p} className="flex items-start text-xs">
                      <Check className="h-3.5 w-3.5 text-emerald-500 mr-1.5 mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleChoose(opt.code)}
                  disabled={!!loadingCode}
                  className="w-full"
                  variant={opt.highlight ? 'default' : 'secondary'}
                >
                  {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting…</> : `Pay $${opt.price}`}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Card · Bank Transfer · USSD · Mobile Money
          </p>
          <Button variant="ghost" size="sm" onClick={() => { onOpenChange(false); navigate('/pricing'); }}>
            See full pricing →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReleaseSubmissionGateModal;
