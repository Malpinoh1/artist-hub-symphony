import React, { useState, useEffect } from 'react';
import GuidedTour from './GuidedTour';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Disc3, BarChart3, DollarSign,
  Wallet, Settings, LogOut, User, ChevronDown, Menu, X,
  Users, HelpCircle, Bell, History, GitBranch, CreditCard, BadgeCheck, Trophy, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ModernTeamSwitcher from './ModernTeamSwitcher';
import NotificationBell from './NotificationBell';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AccountNameMigrationModal from './AccountNameMigrationModal';
import { useAdminRole } from '@/hooks/useAdminRole';

const sidebarNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload Release', href: '/release-form', icon: Upload },
  { name: 'My Releases', href: '/releases', icon: Disc3 },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Royalties', href: '/earnings', icon: DollarSign },
  { name: 'Transactions', href: '/transactions', icon: History },
  { name: 'Royalty Splits', href: '/royalty-splits', icon: GitBranch },
  { name: 'Artist Hub', href: '/artist-hub', icon: BadgeCheck },
  { name: 'Achievements', href: '/achievements', icon: Trophy },
  { name: 'Collective', href: '/collective/center', icon: Sparkles },
  { name: 'Billing', href: '/billing', icon: CreditCard },

  { name: 'Settings', href: '/settings', icon: Settings },
];

// Staff roles (finance/distribution managers) only see the admin panel
const staffNav = [
  { name: 'Admin Panel', href: '/admin', icon: LayoutDashboard },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seenFeatures, setSeenFeatures] = useState<string[]>([]);
  const featureKey = user?.id ? 'malpinohdistro:new-features:v1:' + user.id : null;
  useEffect(() => {
    if (!featureKey) { setSeenFeatures([]); return; }
    try { setSeenFeatures(JSON.parse(localStorage.getItem(featureKey) || '[]')); } catch { setSeenFeatures([]); }
  }, [featureKey]);
  const markFeatureSeen = (feature: string) => {
    if (!featureKey) return;
    setSeenFeatures((current) => {
      const next = Array.from(new Set([...current, feature]));
      try { localStorage.setItem(featureKey, JSON.stringify(next)); } catch { /* no-op */ }
      return next;
    });
  };
  useEffect(() => {
    if (location.pathname.startsWith('/artist-hub')) markFeatureSeen('artist-hub');
    if (location.pathname.startsWith('/collective/center')) markFeatureSeen('collective');
    if (location.pathname.startsWith('/achievements')) markFeatureSeen('achievements');
  }, [location.pathname, featureKey]);
  const { isAdmin: isFullAdmin, hasAnyAdminRole } = useAdminRole();

  // finance_manager / distribution_manager without full admin → admin panel only
  const staffOnly = hasAnyAdminRole && !isFullAdmin;
  const nav = staffOnly ? staffNav : hasAnyAdminRole ? [...sidebarNav, { name: 'Admin Panel', href: '/admin', icon: LayoutDashboard }] : sidebarNav;

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('full_name, avatar_url, username')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setProfile(data));
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({ title: "Signed out successfully" });
    } catch {
      toast({ title: "Error signing out", variant: "destructive" });
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen w-full min-w-0 bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-card z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden group-hover:scale-105 transition-transform">
              <img
                src="/lovable-uploads/e567dcac-3939-45da-9177-42729283dcd9.png"
                alt="MALPINOHdistro"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-display font-bold text-foreground">MALPINOHdistro</span>
              <span className="text-[10px] text-muted-foreground tracking-wider">ARTIST PORTAL</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                data-tour={item.href === '/dashboard' ? 'dashboard' : item.href === '/releases' ? 'releases' : item.href === '/analytics' ? 'analytics' : item.href === '/earnings' ? 'earnings' : item.href === '/artist-hub' ? 'artist-hub' : item.href === '/collective/center' ? 'collective' : item.href === '/achievements' ? 'achievements' : item.href === '/settings' ? 'settings' : undefined}
                onClick={() => { if (item.href === '/artist-hub') markFeatureSeen('artist-hub'); if (item.href === '/collective/center') markFeatureSeen('collective'); if (item.href === '/achievements') markFeatureSeen('achievements'); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5", active && "text-primary")} />
                <span>{item.name}</span>
                {item.href === '/artist-hub' && !seenFeatures.includes('artist-hub') && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">NEW</span>}
                {item.href === '/collective/center' && !seenFeatures.includes('collective') && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">NEW</span>}
                {item.href === '/achievements' && !seenFeatures.includes('achievements') && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">NEW</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 border-t border-border">
          {!staffOnly && <ModernTeamSwitcher />}
          <div className="mt-3 flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-muted-foreground hover:text-destructive mt-1"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw_-_1.5rem)] flex-col overflow-y-auto overscroll-contain bg-card border-r border-border transform transition-transform lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <div className="w-8 h-8 rounded-xl overflow-hidden">
              <img src="/lovable-uploads/e567dcac-3939-45da-9177-42729283dcd9.png" alt="MALPINOHdistro Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-bold text-foreground">MALPINOHdistro</span>
          </Link>
          <Button variant="ghost" size="sm" aria-label="Close menu" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="px-3 pt-3">
          {!staffOnly && <ModernTeamSwitcher />}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                data-tour={item.href === '/dashboard' ? 'dashboard' : item.href === '/releases' ? 'releases' : item.href === '/analytics' ? 'analytics' : item.href === '/earnings' ? 'earnings' : item.href === '/artist-hub' ? 'artist-hub' : item.href === '/collective/center' ? 'collective' : item.href === '/achievements' ? 'achievements' : item.href === '/settings' ? 'settings' : undefined}
                onClick={() => { setSidebarOpen(false); if (item.href === '/artist-hub') markFeatureSeen('artist-hub'); if (item.href === '/collective/center') markFeatureSeen('collective'); if (item.href === '/achievements') markFeatureSeen('achievements'); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.name}</span>
                {item.href === '/artist-hub' && !seenFeatures.includes('artist-hub') && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">NEW</span>}
                {item.href === '/collective/center' && !seenFeatures.includes('collective') && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">NEW</span>}
                {item.href === '/achievements' && !seenFeatures.includes('achievements') && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">NEW</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto shrink-0 px-3 py-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="min-w-0 w-full flex-1 lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 w-full min-w-0 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur-xl sm:gap-4 sm:px-4 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Open menu"
            className="lg:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/dashboard" className="flex min-w-0 shrink items-center gap-2.5 group" aria-label="MALPINOHdistro artist portal home">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 p-1 shadow-sm transition-transform group-hover:scale-105">
              <img src="/lovable-uploads/e567dcac-3939-45da-9177-42729283dcd9.png" alt="MALPINOHdistro logo" className="h-full w-full object-contain" />
            </span>
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate font-display text-xs sm:text-sm font-extrabold tracking-[0.12em] text-foreground">MALPINOHdistro</span>
              <span className="mt-1 hidden sm:block text-[9px] font-semibold tracking-[0.2em] text-muted-foreground">ARTIST PORTAL</span>
            </span>
          </Link>

          <div className="flex-1" />

          {hasAnyAdminRole && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-purple-600/10 hover:from-primary/20 hover:to-purple-600/20 text-xs font-medium text-foreground transition-all"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Admin Panel
            </Link>
          )}

          <NotificationBell />



          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" aria-label="Open user profile menu" className="h-9 w-9 rounded-full p-0">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{profile?.full_name || user?.email}</p>
                  <p className="text-sm text-muted-foreground truncate w-[200px]">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/team"><Users className="mr-2 h-4 w-4" />Team</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new Event('malpinohdistro:replay-tour'))}>
                <Sparkles className="mr-2 h-4 w-4" />Replay guided tour
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/support"><HelpCircle className="mr-2 h-4 w-4" />Support</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="min-w-0 w-full max-w-full p-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:p-4 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      <AccountNameMigrationModal />
      <GuidedTour />
    </div>
  );
};

export default DashboardLayout;
