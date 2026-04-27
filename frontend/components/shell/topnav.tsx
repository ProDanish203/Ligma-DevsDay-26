'use client';

import { usePathname } from 'next/navigation';
import { Bell, Plus } from 'lucide-react';
import { UserMenu } from './user-menu';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/settings': 'Settings',
};

export function Topnav() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? 'Dashboard';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white/90 px-6 backdrop-blur-md">
      <p className="text-sm font-semibold text-gray-500">{title}</p>

      <div className="flex items-center gap-2">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
          <Bell className="size-4" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
