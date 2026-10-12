import React, { useState } from 'react';
import {
  Activity,
  Banknote,
  Bell,
  ChevronDown,
  CircleHelp,
  Disc3,
  FileSpreadsheet,
  LayoutDashboard,
  Mail,
  Megaphone,
  Music,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Split,
  Users,
  Wallet,
  Youtube,
} from 'lucide-react';

export interface AdminSectionTab {
  id: string;
  label: string;
  badge?: number | null;
}

interface AdminSectionNavigationProps {
  tabs: AdminSectionTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  children: React.ReactNode;
}

const TAB_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  releases: Disc3,
  withdrawals: Wallet,
  artists: Users,
  earnings: Banknote,
  'platform-earnings': Activity,
  'royalty-statements': FileSpreadsheet,
  analytics: LayoutDashboard,
  subscriptions: Settings,
  'manual-payment': Banknote,
  payments: Banknote,
  marketing: Megaphone,
  'direct-email': Mail,
  'site-notices': Bell,
  support: CircleHelp,
  'credit-balance': Wallet,
  'income-management': Banknote,
  'split-requests': Split,
  oac: Youtube,
  collective: Music,
  'royalty-upload': FileSpreadsheet,
  takedown: ShieldCheck,
  'stream-analytics': Activity,
};

const AdminSectionNavigation: React.FC<AdminSectionNavigationProps> = ({
  tabs,
  activeTab,
  onChange,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  const selectTab = (tabId: string) => {
    onChange(tabId);
    setMobileOpen(false);
  };

  const renderTab = (tab: AdminSectionTab, mobile = false) => {
    const active = activeTab === tab.id;
    const Icon = TAB_ICONS[tab.id] ?? LayoutDashboard;

    return (
      <button
        key={tab.id}
        type="button"
        aria-current={active ? 'page' : undefined}
        title={!mobile && collapsed ? tab.label : undefined}
        onClick={() => selectTab(tab.id)}
        className={`group flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        } ${!mobile && collapsed ? 'justify-center px-2' : ''}`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        {(mobile || !collapsed) && (
          <span className="min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]">{tab.label}</span>
        )}
        {tab.badge != null && tab.badge > 0 && (
          <span
            className={`shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive ${!mobile && collapsed ? 'absolute ml-5 -mt-7' : ''}`}
            aria-label={`${tab.badge} pending`}
          >
            {tab.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-6">
      <aside
        aria-label="Dashboard navigation"
        className={`hidden lg:block lg:sticky lg:top-4 lg:self-start ${collapsed ? 'lg:w-[4.5rem]' : 'lg:w-60'}`}
      >
        <div className="rounded-2xl border border-border bg-card/80 p-2 shadow-sm">
          <div className={`mb-2 flex items-center ${collapsed ? 'justify-center' : 'justify-end'}`}>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <nav aria-label="Dashboard sections" className="flex max-h-[calc(100vh-8rem)] flex-col gap-1 overflow-y-auto">
            {tabs.map((tab) => renderTab(tab))}
          </nav>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="relative mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-section-menu"
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold shadow-sm transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex min-w-0 items-center gap-3">
              {activeItem && React.createElement(TAB_ICONS[activeItem.id] ?? LayoutDashboard, {
                className: 'h-[18px] w-[18px] shrink-0 text-primary',
                'aria-hidden': true,
              })}
              <span className="truncate">{activeItem?.label ?? 'Choose a section'}</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileOpen && (
            <div
              id="admin-mobile-section-menu"
              className="absolute inset-x-0 top-full z-40 mt-2 max-h-[65vh] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl"
            >
              <nav aria-label="Dashboard sections" className="flex flex-col gap-1">
                {tabs.map((tab) => renderTab(tab, true))}
              </nav>
            </div>
          )}
        </div>
        {children}
      </section>
    </div>
  );
};

export default AdminSectionNavigation;
