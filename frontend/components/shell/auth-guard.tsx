'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TOKEN_KEY } from '@/lib/constants';
import { useAuthStore } from '@/store/auth.store';
import { getCurrentUser } from '@/API/user.api';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace('/login');
      return;
    }

    // User already in store (navigated client-side) — nothing to fetch
    if (user) {
      setReady(true);
      return;
    }

    // Token in localStorage but store is empty (page refresh) — restore user
    getCurrentUser().then((result) => {
      if (result.success) {
        setUser(result.response);
        setReady(true);
      } else {
        // Token is invalid/expired
        localStorage.removeItem(TOKEN_KEY);
        router.replace('/login');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
