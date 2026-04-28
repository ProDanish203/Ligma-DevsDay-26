'use client';

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
        className="flex h-full w-full cursor-default items-center justify-center select-none"
        style={{
          backgroundColor: d.color || '#FDA4C4',
          borderRadius: isCircle ? '50%' : '8px',
          outline: selected ? `2px solid ${d.color}` : '2px solid transparent',
          outlineOffset: 2,
          opacity: canEdit ? 1 : 0.85,
        }}
      >
        <span className="max-w-[90%] break-words px-2 text-center text-sm font-medium text-white drop-shadow-sm">
          {d.label}
        </span>
      </div>
    </div>
  );
}
