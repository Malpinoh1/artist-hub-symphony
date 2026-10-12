import React from 'react';
import { ChevronDown } from 'lucide-react';

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
    {/* Consistent dropdown navigation across phone, tablet, and desktop. */}
    <div className="block">
      <label htmlFor="admin-section-select" className="mb-2 block text-sm font-medium text-foreground">
        Navigate to section
      </label>
      <div className="relative">
        <select
          id="admin-section-select"
          value={activeTab}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-12 w-full appearance-none rounded-xl border border-border bg-card py-3 pl-3 pr-10 text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}{tab.badge != null && tab.badge > 0 ? ` (${tab.badge})` : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>

    <div className="hidden">
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
