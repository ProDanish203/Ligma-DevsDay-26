'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { TOKEN_KEY } from '@/lib/constants';
import { useAuthStore } from '@/store/auth.store';
import { getCurrentUser } from '@/API/user.api';
import { currentUserQueryKey } from '@/components/shell/user-menu';
import type { UserSchema } from '@/schema/user.schema';

function OAuthTokenSyncInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setToken, setUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    const dedupeKey = `oauth_sync_${token}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, '1');

    localStorage.setItem(TOKEN_KEY, token);
    setToken(token);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('token');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    void getCurrentUser().then((result) => {
      if (result.success && result.response) {
        const user = result.response as UserSchema;
        setUser(user);
        queryClient.setQueryData(currentUserQueryKey, user);
        toast.success('Welcome back!');
      }
    });
  }, [searchParams, pathname, router, queryClient, setToken, setUser]);

  return null;
}

export function OAuthTokenSync() {
  return (
    <Suspense fallback={null}>
      <OAuthTokenSyncInner />
    </Suspense>
  );
}
