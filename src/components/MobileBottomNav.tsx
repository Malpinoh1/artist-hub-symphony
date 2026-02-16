import { Link, useLocation } from 'react-router-dom';
import { Home, Disc3, BarChart3, DollarSign, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Releases', href: '/releases', icon: Disc3 },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Earnings', href: '/earnings', icon: DollarSign },
  { label: 'More', href: '/settings', icon: Menu },
];

const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Hide on public pages
  const publicPaths = ['/', '/auth', '/about', '/services', '/pricing', '/contact', '/faq', '/partners', '/terms', '/privacy', '/cookies', '/copyright', '/blog', '/resources', '/password-reset', '/reset-password'];
  if (publicPaths.includes(location.pathname)) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/releases' && location.pathname.startsWith('/releases'));
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(274,67%,46%)]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
