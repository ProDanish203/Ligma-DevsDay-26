'use client';

import { useViewport } from '@xyflow/react';
import { getCursorColor } from '@/lib/cursor-utils';
import type { RemoteUser } from '@/hooks/use-canvas-socket';
import { RemoteCursor } from '@/components/collaboration/remote-cursor';

interface CursorOverlayProps {
  cursors: Map<string, { x: number; y: number }>;
  remoteUsers: RemoteUser[];
}

export function CursorOverlay({ cursors, remoteUsers }: CursorOverlayProps) {
  const viewport = useViewport();
  const userMap = new Map(remoteUsers.map((u) => [u.id, u]));

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {Array.from(cursors.entries()).map(([userId, pos]) => {
          const user = userMap.get(userId);
          if (!user) return null;

          return (
            <RemoteCursor
              key={userId}
              name={user.name}
              x={pos.x}
              y={pos.y}
              color={getCursorColor(userId)}
              zoom={viewport.zoom}
            />
          );
        })}
      </div>
    </div>
  );
}
