'use client';

import { MousePointer2, Radio } from 'lucide-react';
import { useSocket } from '@/hooks/use-socket';
import { useCollaborativeCursors } from '@/hooks/use-collaborative-cursors';
import { CollaborativeCursors } from '@/components/collaboration/collaborative-cursors';
import { RemoteCursor } from '@/components/collaboration/remote-cursor';
import { useAuthStore } from '@/store/auth.store';
import { getCursorColor } from '@/lib/cursor-utils';

const DUMMY_PROJECT_ID = '467cef74-7958-49d3-ae50-66ed84fdfb83';

export default function CollabDemoPage() {
  const { socket, connected } = useSocket();
  const { remoteCursors, localPosition, handleMouseMove } = useCollaborativeCursors(socket, DUMMY_PROJECT_ID);
  const user = useAuthStore((s) => s.user);

  return (
    <div
      className="relative flex h-full w-full cursor-none flex-col items-center justify-center overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"
      onMouseMove={handleMouseMove}
    >
      <CollaborativeCursors cursors={remoteCursors} />
      {localPosition && user && (
        <RemoteCursor
          name="You"
          x={localPosition.x}
          y={localPosition.y}
          color={getCursorColor(user.id)}
        />
      )}

      {/* Status badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs shadow-sm">
        <span
          className={`relative flex h-2 w-2`}
        >
          {connected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-gray-300'}`}
          />
        </span>
        <span className="text-gray-600">{connected ? 'Live' : 'Connecting...'}</span>
      </div>

      {/* Center content */}
      <div className="pointer-events-none flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-100 bg-white shadow-md shadow-pink-50">
          <MousePointer2 className="size-6 text-brand-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Collaborative Canvas</h1>
          <p className="mt-2 text-sm text-gray-400">Move your mouse — others in this room see your cursor in real time</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 text-xs text-gray-500 shadow-sm">
          <Radio className="size-3 text-brand-primary" />
          {remoteCursors.size === 0
            ? 'No one else is here yet'
            : `${remoteCursors.size} other${remoteCursors.size !== 1 ? 's' : ''} online`}
        </div>
      </div>
    </div>
  );
}
