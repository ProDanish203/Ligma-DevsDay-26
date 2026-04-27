'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import Avatar from 'boring-avatars';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/API/auth.api';
import { getCurrentUser } from '@/API/user.api';
import { useAuthStore } from '@/store/auth.store';
import { TOKEN_KEY, BRAND_AVATAR_PALETTE } from '@/lib/constants';
import type { UserSchema } from '@/schema/user.schema';

export const currentUserQueryKey = ['currentUser'] as const;

export function UserMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout: clearAuth, setUser } = useAuthStore();

  const { data, refetch } = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: async () => {
      const result = await getCurrentUser();
      if (!result.success) {
        throw new Error(typeof result.response === 'string' ? result.response : 'Failed to load user');
      }
      return result.response as UserSchema;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  const handleLogout = async () => {
    const result = await logout();
    clearAuth();
    localStorage.removeItem(TOKEN_KEY);
    queryClient.removeQueries({ queryKey: currentUserQueryKey });
    if (result.success) {
      toast.success('Logged out successfully');
    }
    router.push('/login');
  };

  const displayName = user?.name ?? 'User';
  const firstName = displayName.split(' ')[0];

  return (
    <DropdownMenu onOpenChange={(open) => open && void refetch()}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 outline-none transition-colors hover:bg-gray-50">
          <Avatar size={28} name={displayName} variant="beam" colors={BRAND_AVATAR_PALETTE} />
          <span className="hidden text-sm font-medium text-gray-600 md:block">{firstName}</span>
          <ChevronDown className="size-3.5 text-gray-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 border border-gray-100 bg-white text-gray-900 shadow-xl shadow-gray-100/50"
      >
        <DropdownMenuLabel className="flex items-center gap-3 p-3">
          <Avatar size={36} name={displayName} variant="beam" colors={BRAND_AVATAR_PALETTE} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="truncate text-xs text-gray-400">{user?.email ?? ''}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-gray-100" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer text-gray-600 focus:bg-gray-50 focus:text-gray-900"
            onClick={() => router.push('/settings')}
          >
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-100" />

        <DropdownMenuItem
          className="gap-2.5 cursor-pointer text-red-500/80 focus:bg-red-50 focus:text-red-500"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
