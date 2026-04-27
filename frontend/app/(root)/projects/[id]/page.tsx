'use client';

import { use } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { CanvasView } from './_components/canvas-view';

export default function ProjectCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useAuthStore((s) => s.user);

  return <CanvasView projectId={id} user={user ? { id: user.id, name: user.name, email: user.email } : null} />;
}
