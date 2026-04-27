'use client';

import { RemoteCursor } from './remote-cursor';
import type { RemoteCursor as CursorState } from '@/hooks/use-collaborative-cursors';
import { getCursorColor } from '@/lib/cursor-utils';

interface CollaborativeCursorsProps {
  cursors: Map<string, CursorState>;
}

export function CollaborativeCursors({ cursors }: CollaborativeCursorsProps) {
  return (
    <>
      {Array.from(cursors.values()).map((cursor) => (
        <RemoteCursor
          key={cursor.userId}
          name={cursor.name}
          x={cursor.x}
          y={cursor.y}
          color={getCursorColor(cursor.userId)}
        />
      ))}
    </>
  );
}
