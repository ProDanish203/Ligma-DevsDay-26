'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderOpen, Settings, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/projects', icon: FolderOpen, label: 'Projects', exact: false },
  { href: '/invitations', icon: Mail, label: 'Invitations', exact: false },
];

const BOTTOM_ITEMS = [{ href: '/settings', icon: Settings, label: 'Settings', exact: false }];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-gray-100 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-gray-100 px-4',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-primary to-brand-secondary text-[11px] font-bold text-white shadow-sm">
            L
          </div>
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-gray-900">Ligma</span>}
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="text-gray-300 transition-colors hover:text-gray-500">
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-pink-50 text-brand-primary font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              )}
            >
              <item.icon className="size-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="flex flex-col gap-0.5 border-t border-gray-100 p-2">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-pink-50 text-brand-primary font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              )}
            >
              <item.icon className="size-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="mt-1 flex items-center justify-center rounded-lg py-2 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-500"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
