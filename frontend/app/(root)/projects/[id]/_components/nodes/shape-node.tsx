'use client';

import { useCallback, useRef, useState } from 'react';
import { NodeResizer, Handle, Position, type NodeProps } from '@xyflow/react';
import { Lock } from 'lucide-react';

export interface ShapeNodeData {
  label: string;
  color: string;
  shape?: 'rect' | 'circle';
  canEdit?: boolean;
  onUpdate?: (nodeId: string, data: Partial<{ label: string; color: string }>) => void;
  onManagePermissions?: (nodeId: string) => void;
  onResize?: (nodeId: string, params: { x: number; y: number; width: number; height: number }) => void;
  [key: string]: unknown;
}

const handleStyle = {
  width: 10,
  height: 10,
  background: '#F43F7A',
  border: '2px solid #fff',
  zIndex: 20,
};

export function ShapeNode({ id, data, selected }: NodeProps) {
  const d = data as ShapeNodeData;
  const isCircle = d.shape === 'circle';
  const canEdit = d.canEdit !== false;
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (textRef.current) d.onUpdate?.(id, { label: textRef.current.value });
  }, [id, d]);

  return (
    <div className="relative h-full w-full">
      {canEdit && <NodeResizer minWidth={60} minHeight={60} isVisible={selected} />}
      <NodeResizer
        minWidth={60}
        minHeight={60}
        isVisible={selected}
        onResizeEnd={(_, params) => {
          d.onResize?.(id, {
            x: params.x,
            y: params.y,
            width: params.width,
            height: params.height,
          });
        }}
      />

      <Handle type="source" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="left" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={handleStyle} />

      {!canEdit && (
        <div className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/30 p-0.5">
          <Lock className="size-3 text-white/80" />
        </div>
      )}

      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          backgroundColor: d.color || '#FDA4C4',
          borderRadius: isCircle ? '50%' : '8px',
          outline: selected ? `2px solid ${d.color}` : '2px solid transparent',
          outlineOffset: 2,
          opacity: canEdit ? 1 : 0.85,
          cursor: canEdit ? 'default' : 'default',
        }}
        onDoubleClick={canEdit ? () => setEditing(true) : undefined}
      >
        {editing ? (
          <textarea
            ref={textRef}
            defaultValue={d.label}
            onBlur={handleBlur}
            autoFocus
            className="w-[85%] resize-none bg-transparent text-center text-sm font-medium text-white outline-none placeholder:text-white/50"
            style={{ maxHeight: '80%' }}
            placeholder="Type here…"
          />
        ) : (
          <span className="max-w-[90%] break-words px-2 text-center text-sm font-medium text-white drop-shadow-sm select-none">
            {d.label || (canEdit && <span className="text-white/40 text-xs">Double-click to edit…</span>)}
          </span>
        )}
      </div>
    </div>
  );
}
