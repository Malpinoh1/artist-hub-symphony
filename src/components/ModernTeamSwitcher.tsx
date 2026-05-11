import React, { useState } from 'react';
import { Building, Users, Check, ChevronsUpDown, Crown, Shield, Eye, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAccount } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';

const roleMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  account_admin: { label: 'Admin', icon: Shield, className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
  manager: { label: 'Manager', icon: UserCog, className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  viewer: { label: 'Viewer', icon: Eye, className: 'bg-muted text-muted-foreground border-border' },
};

const ModernTeamSwitcher: React.FC = () => {
  const { currentUser, currentAccountId, teamAccounts, switchAccount, isLoading } = useAccount();
  const [open, setOpen] = useState(false);

  const currentUserId = currentUser?.id;
  if (isLoading || !currentUserId) return null;

  const isPersonal = currentAccountId === currentUserId;
  const activeTeam = teamAccounts.find((t) => t.account_owner_id === currentAccountId);
  const hasOptions = teamAccounts.length > 0;

  if (!hasOptions && isPersonal) return null;

  const currentLabel = isPersonal ? 'Personal Account' : activeTeam?.owner_name || 'Team Account';
  const currentSub = isPersonal ? 'Owner' : activeTeam?.owner_email || '';

  const handleSelect = (accountId: string) => {
    if (accountId !== currentAccountId) switchAccount(accountId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card hover:bg-muted/60 transition-all',
            'p-2.5 text-left shadow-sm hover:shadow-md'
          )}
        >
          <div
            className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
              isPersonal
                ? 'bg-gradient-to-br from-primary to-purple-600 text-white'
                : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
            )}
          >
            {isPersonal ? <Building className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{currentLabel}</p>
            <p className="text-[11px] text-muted-foreground truncate">{currentSub}</p>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2" sideOffset={8}>
        <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Switch workspace
        </div>

        {/* Personal */}
        <button
          type="button"
          onClick={() => handleSelect(currentUserId)}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg p-2.5 transition-colors text-left',
            currentAccountId === currentUserId ? 'bg-primary/10' : 'hover:bg-muted'
          )}
        >
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white">
            <Building className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Personal Account</p>
            <p className="text-[11px] text-muted-foreground">Your own workspace</p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
            <Crown className="h-3 w-3" />
            Owner
          </Badge>
          {currentAccountId === currentUserId && <Check className="h-4 w-4 text-primary ml-1" />}
        </button>

        {teamAccounts.length > 0 && (
          <>
            <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Team accounts
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {teamAccounts.map((team) => {
                const meta = roleMeta[team.role] || roleMeta.viewer;
                const RoleIcon = meta.icon;
                const active = currentAccountId === team.account_owner_id;
                return (
                  <button
                    key={team.account_owner_id}
                    type="button"
                    onClick={() => handleSelect(team.account_owner_id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg p-2.5 transition-colors text-left',
                      active ? 'bg-primary/10' : 'hover:bg-muted'
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{team.owner_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{team.owner_email}</p>
                    </div>
                    <Badge variant="outline" className={cn('gap-1', meta.className)}>
                      <RoleIcon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                    {active && <Check className="h-4 w-4 text-primary ml-1" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {teamAccounts.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No team accounts yet. Accept a team invitation in Settings to see them here.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ModernTeamSwitcher;
