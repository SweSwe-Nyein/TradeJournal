import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  CalendarDays,
  BarChart3,
  BookOpen,
  Target,
  Settings,
  Upload,
  LogOut,
  LineChart,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/hooks/useAuth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Trades', href: '/trades', icon: Layers },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Journal', href: '/journal', icon: BookOpen },
  { name: 'Strategies', href: '/strategies', icon: Target },
];

export function Sidebar({ className }: { className?: string }) {
  const { user, profile, signOut, isDemoMode, isConfigured } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Trader';
  const displayEmail = user?.email || 'trader@journal.internal';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'TJ';

  return (
    <aside
      className={cn(
        'w-64 bg-zinc-950 border-r border-zinc-850 flex flex-col justify-between shrink-0 h-screen select-none sticky top-0',
        className
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-zinc-850">
          <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-750 flex items-center justify-center text-zinc-100 shadow-xs">
            <LineChart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-zinc-100 font-sans">
              TradeJournal
            </span>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
              Analytics Core
            </span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="p-3 space-y-1">
          <div className="px-2 pb-1.5 pt-1 text-[11px] font-mono font-medium text-zinc-400 tracking-wider uppercase">
            Platform
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-zinc-850 text-zinc-50 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Settings & Profile */}
      <div className="p-3 border-t border-zinc-850 space-y-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              isActive
                ? 'bg-zinc-850 text-zinc-50 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70'
            )
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="truncate">Settings</span>
        </NavLink>

        {/* Mode info */}
        <div className="px-2.5 py-1.5 rounded bg-zinc-900/60 border border-zinc-850/80 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 font-mono">Backend:</span>
          <span className="font-mono text-zinc-300">
            {isConfigured ? 'Supabase Live' : isDemoMode ? 'Sandbox Local' : 'Supabase Demo'}
          </span>
        </div>

        {/* User Card */}
        <div className="pt-1 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-zinc-850 border border-zinc-700/60 flex items-center justify-center text-zinc-200 text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-200 truncate leading-none">
                {displayName}
              </p>
              <p className="text-[11px] text-zinc-400 truncate font-mono mt-0.5">
                {displayEmail}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
