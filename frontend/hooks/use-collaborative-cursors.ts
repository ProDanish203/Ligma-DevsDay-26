'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

export interface RemoteCursor {
  userId: string;
  name: string;
  x: number;
  y: number;
}

const THROTTLE_MS = 50;

export function useCollaborativeCursors(socket: Socket | null, projectId: string) {
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [localPosition, setLocalPosition] = useState<{ x: number; y: number } | null>(null);
  const lastEmitRef = useRef<number>(0);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-project', { projectId });

    const handleCursorUpdate = (data: RemoteCursor) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    };

    socket.on('cursor-update', handleCursorUpdate);

    return () => {
      socket.emit('leave-project', { projectId });
      socket.off('cursor-update', handleCursorUpdate);
    };
  }, [socket, projectId]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!socket) return;
      const now = Date.now();
      if (now - lastEmitRef.current < THROTTLE_MS) return;
      lastEmitRef.current = now;
      socket.emit('mouse-move', { projectId, x: e.clientX, y: e.clientY });
      setLocalPosition({ x: e.clientX, y: e.clientY });
    },
    [socket, projectId],
  );

  return { remoteCursors, localPosition, handleMouseMove };
}
