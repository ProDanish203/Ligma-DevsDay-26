'use client';

import { use, useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { CanvasView } from './_components/canvas-view';

export default function ProjectCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useAuthStore((s) => s.user);

  const stableUser = useMemo(
    () => (user ? { id: user.id, name: user.name, email: user.email } : null),
    [user?.id, user?.name, user?.email],
  );

  if (!stableUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return <CanvasView projectId={id} user={stableUser} />;
}
