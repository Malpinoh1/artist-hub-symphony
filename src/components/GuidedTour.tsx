import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Grip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const steps = [
  { id: 'dashboard', title: 'Your dashboard', text: 'Start here for a snapshot of your music business and account activity.', href: '/dashboard' },
  { id: 'dashboard-actions', title: 'Quick actions', text: 'Start a release submission, open your release catalog, or jump straight to analytics from these shortcuts.', href: '/dashboard' },
  { id: 'dashboard-stats', title: 'Performance at a glance', text: 'These summary cards help you track releases, activity, streams, and earnings in one place.', href: '/dashboard' },
  { id: 'dashboard-performance', title: 'Reported performance', text: 'Explore performance figures processed from your reported royalty statements.', href: '/dashboard' },
  { id: 'dashboard-releases', title: 'Recent releases', text: 'Review your latest releases and their current status. Use View All to open the full catalog.', href: '/dashboard' },
  { id: 'releases', title: 'Your release catalog', text: 'Find submitted music and check its current distribution status.', href: '/releases' },
  { id: 'releases-create', title: 'Create a release', text: 'Use New Release to begin a submission. This action depends on your account permissions.', href: '/releases' },
  { id: 'release-wizard', title: 'Release submission wizard', text: 'Work through release setup one step at a time, from album information to final review.', href: '/release-form' },
  { id: 'release-details', title: 'Album information', text: 'Enter accurate release details and metadata so stores can identify and display your music correctly.', href: '/release-form' },
  { id: 'analytics', title: 'Analytics overview', text: 'Review streaming performance reported for platforms and releases available to your account.', href: '/analytics' },
  { id: 'analytics-tracks', title: 'Track performance', text: 'Compare your strongest releases and inspect available stream totals and trends.', href: '/analytics' },
  { id: 'earnings', title: 'Royalties and earnings', text: 'See your earnings summary and understand available, pending, and total balances.', href: '/earnings' },
  { id: 'earnings-tabs', title: 'Explore earnings tools', text: 'Switch between stream analytics, activity, statements, and withdrawal options.', href: '/earnings' },
  { id: 'artist-hub', title: 'Artist Hub', text: 'Explore the artist tools available in MALPINOHdistro.', href: '/artist-hub' },
  { id: 'collective', title: 'Collective', text: 'Open the Collective area available to your account.', href: '/collective/center' },
  { id: 'achievements', title: 'Achievements', text: 'Review available milestones and recognition.', href: '/achievements' },
  { id: 'settings', title: 'Settings', text: 'Manage your account preferences.', href: '/settings' },
];
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));

export default function GuidedTour() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const [dragged, setDragged] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const started = useRef(false);
  const key = user?.id ? 'malpinohdistro:tour:v2:' + user.id : null;
  const step = steps[index];

  const locate = (reset = false) => {
    if (!open) return;
    const el = Array.from(document.querySelectorAll<HTMLElement>('[data-tour="' + step.id + '"]')).find((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight;
    });
    const rect = el?.getBoundingClientRect() ?? null;
    setTarget(rect);
    if (!reset && dragged) {
      setPosition((p) => ({ x: clamp(p.x, 12, innerWidth - (panel.current?.offsetWidth || 340) - 12), y: clamp(p.y, 12, innerHeight - (panel.current?.offsetHeight || 260) - 12) }));
      return;
    }
    const width = Math.min(360, innerWidth - 24);
    const height = panel.current?.offsetHeight || 270;
    if (!rect) {
      setPosition({ x: clamp(innerWidth - width - 16, 12, innerWidth - width - 12), y: clamp(innerHeight - height - 24, 12, innerHeight - height - 12) });
      return;
    }
    let x = rect.right + 16;
    let y = rect.top;
    if (x + width > innerWidth - 12) x = rect.left - width - 16;
    if (x < 12) {
      x = clamp(rect.left + rect.width / 2 - width / 2, 12, innerWidth - width - 12);
      y = rect.bottom + 16;
      if (y + height > innerHeight - 12) y = rect.top - height - 16;
    }
    setPosition({ x: clamp(x, 12, innerWidth - width - 12), y: clamp(y, 12, innerHeight - Math.min(height, innerHeight - 24) - 12) });
  };

  useEffect(() => {
    if (!key) { setOpen(false); return; }
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (!saved.lastShownAt || Date.now() - saved.lastShownAt >= 3 * 24 * 60 * 60 * 1000) {
        setIndex(0); setDragged(false); started.current = false; setOpen(true);
      }
    } catch { setOpen(true); }
  }, [key]);

  useEffect(() => {
    if (!open || !key || started.current) return;
    started.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(key, JSON.stringify({ ...saved, lastShownAt: Date.now() }));
    } catch { /* Tour still works when storage is unavailable. */ }
  }, [open, key]);

  useEffect(() => {
    const replay = () => { setIndex(0); setDragged(false); started.current = false; setOpen(true); };
    window.addEventListener('malpinohdistro:replay-tour', replay);
    return () => window.removeEventListener('malpinohdistro:replay-tour', replay);
  }, []);

  useEffect(() => {
    if (open && window.innerWidth < 1024) window.dispatchEvent(new Event('malpinohdistro:open-mobile-menu'));
  }, [open, index]);

  // Wait for route content to mount, then scroll the active target into view.
  // Some pages load their content asynchronously, so a single short timeout is not enough.
  useEffect(() => {
    if (!open) return;
    let attempts = 0;
    let retryTimer = 0;
    let measureTimer = 0;
    let cancelled = false;

    const findTarget = () => Array.from(
      document.querySelectorAll<HTMLElement>('[data-tour="' + step.id + '"]')
    ).find((node) => {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' &&
        rect.width > 0 && rect.height > 0;
    });

    const seekAndScroll = () => {
      if (cancelled) return;
      const el = findTarget();
      if (!el && attempts++ < 20) {
        retryTimer = window.setTimeout(seekAndScroll, 150);
        return;
      }
      if (el) {
        // Native scrollIntoView scrolls the page and any nested overflow container.
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        measureTimer = window.setTimeout(() => {
          if (!cancelled) locate(true);
        }, 650);
      } else {
        locate(true);
      }
    };

    retryTimer = window.setTimeout(seekAndScroll, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.clearTimeout(measureTimer);
    };
  }, [open, index, location.pathname]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => locate(false), 150);
    const update = () => locate(false);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open, index, location.pathname, dragged]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      setDragged(true);
      setPosition({
        x: clamp(drag.current.x + event.clientX - drag.current.px, 12, innerWidth - (panel.current?.offsetWidth || 340) - 12),
        y: clamp(drag.current.y + event.clientY - drag.current.py, 12, innerHeight - (panel.current?.offsetHeight || 260) - 12),
      });
    };
    const up = () => { drag.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, []);

  const close = (completed = false) => {
    setOpen(false);
    window.dispatchEvent(new Event('malpinohdistro:close-mobile-menu'));
    if (!key) return;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(key, JSON.stringify({ ...saved, lastShownAt: Date.now(), ...(completed ? { completedAt: Date.now() } : {}) }));
    } catch { /* no-op */ }
  };
  const go = (next: number) => {
    if (next >= steps.length) { close(true); return; }
    if (next < 0) return;
    setIndex(next); setDragged(false);
    if (location.pathname !== steps[next].href) navigate(steps[next].href);
    window.setTimeout(() => locate(true), 200);
  };
  if (!open || !user || !step) return null;
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button') || !panel.current) return;
    event.preventDefault();
    drag.current = { px: event.clientX, py: event.clientY, x: panel.current.getBoundingClientRect().left, y: panel.current.getBoundingClientRect().top };
  };
  const width = Math.min(360, innerWidth - 24);
  return <div className="pointer-events-none fixed inset-0 z-[90]" aria-label="MALPINOHdistro guided tour">
    {target && <div aria-hidden="true" className="pointer-events-none fixed rounded-xl border-2 border-primary shadow-lg" style={{ left: Math.max(0, target.left - 4), top: Math.max(0, target.top - 4), width: target.width + 8, height: target.height + 8, zIndex: 91 }} />}
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="malpinoh-tour-title" className="pointer-events-auto fixed z-[92] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl" style={{ left: clamp(position.x, 12, innerWidth - width - 12), top: clamp(position.y, 12, innerHeight - Math.min(panel.current?.offsetHeight || 270, innerHeight - 24) - 12), width }}>
      <div onPointerDown={startDrag} className="flex cursor-move touch-none items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Grip className="h-4 w-4" /> MALPINOHdistro tour</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close tour" onClick={() => close()}><X className="h-4 w-4" /></Button>
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-2 text-xs font-medium text-primary">STEP {index + 1} OF {steps.length}</div>
        <h2 id="malpinoh-tour-title" className="text-lg font-semibold">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
        {!target && <p className="mt-3 rounded-lg bg-muted p-2 text-xs text-muted-foreground">This item may be inside the mobile menu. Open the menu to locate it, or continue.</p>}
        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
          <div className="flex items-center gap-1.5"><Button variant="outline" size="sm" onClick={() => close()}>Skip</Button><Button size="sm" onClick={() => go(index + 1)}>{index === steps.length - 1 ? <><Check className="mr-1 h-4 w-4" />Finish</> : <>Next<ChevronRight className="ml-1 h-4 w-4" /></>}</Button></div>
        </div>
      </div>
    </div>
  </div>;
}
