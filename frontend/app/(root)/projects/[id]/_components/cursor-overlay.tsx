'use client';

import { useReactFlow } from '@xyflow/react';
import { RemoteCursor } from '@/components/collaboration/remote-cursor';
import { getCursorColor } from '@/lib/cursor-utils';
import type { RemoteUser } from '@/hooks/use-canvas-socket';

interface CursorOverlayProps {
  cursors: Map<string, { x: number; y: number }>;
  remoteUsers: RemoteUser[];
}

export function CursorOverlay({ cursors, remoteUsers }: CursorOverlayProps) {
  const { flowToScreenPosition } = useReactFlow();
  const userMap = new Map(remoteUsers.map((u) => [u.id, u]));

  return (
    <>
      {Array.from(cursors.entries()).map(([userId, pos]) => {
        const user = userMap.get(userId);
        if (!user) return null;
        const screenPos = flowToScreenPosition({ x: pos.x, y: pos.y });
        return (
          <RemoteCursor
            key={userId}
            name={user.name}
            x={screenPos.x}
            y={screenPos.y}
            color={getCursorColor(userId)}
          />
        );
      })}
    </>
  );
}
