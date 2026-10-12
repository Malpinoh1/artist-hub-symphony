import React from 'react';

export interface AdminSectionTab {
  id: string;
  label: string;
  badge?: number | null;
}

interface AdminSectionNavigationProps {
  tabs: AdminSectionTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

const AdminSectionNavigation: React.FC<AdminSectionNavigationProps> = ({
  tabs,
  activeTab,
  onChange,
}) => (
  <nav aria-label="Admin sections" className="mb-5 w-full min-w-0">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
            className={`flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              active
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/70 hover:text-foreground'
            }`}
          >
            <span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </nav>
);

export default AdminSectionNavigation;
