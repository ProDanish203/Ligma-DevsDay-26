'use client';

import { TOKEN_KEY } from '@/lib/constants';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const PUBLIC_PATHS = ['/login', '/signup'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (isPublicPath && token) {
      router.replace('/');
      return;
    }

    if (!isPublicPath && !token) {
      router.replace('/login');
      return;
    }

    setIsReady(true);
  }, [pathname, router]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
