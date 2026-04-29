'use client';

import { useCallback, useRef, useState } from 'react';
import { NodeResizer, Handle, Position, type NodeProps } from '@xyflow/react';
import { Lock } from 'lucide-react';

export interface TextNodeData {
  label: string;
  color?: string;
  canEdit?: boolean;
  onUpdate?: (nodeId: string, data: Partial<{ label: string; color: string }>) => void;
  onManagePermissions?: (nodeId: string) => void;
  onResize?: (nodeId: string, params: { x: number; y: number; width: number; height: number }) => void;
  [key: string]: unknown;
}

const handleStyle = {
  width: 8,
  height: 8,
  background: '#94a3b8',
  border: '2px solid #fff',
  zIndex: 20,
  opacity: 0,
};

const handleStyleVisible = { ...handleStyle, opacity: 1 };

export function TextNode({ id, data, selected }: NodeProps) {
  const d = data as TextNodeData;
  const canEdit = d.canEdit !== false;
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (textRef.current) d.onUpdate?.(id, { label: textRef.current.value });
  }, [id, d]);

  return (
    <div
      className="relative h-full w-full"
      style={{
        outline: selected ? '1.5px dashed #94a3b8' : '1.5px dashed transparent',
        borderRadius: 4,
      }}
    >
      {canEdit && (
        <NodeResizer
          minWidth={80}
          minHeight={36}
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
      )}

      <Handle type="source" position={Position.Top} id="top" style={selected ? handleStyleVisible : handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={selected ? handleStyleVisible : handleStyle} />
      <Handle type="source" position={Position.Left} id="left" style={selected ? handleStyleVisible : handleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={selected ? handleStyleVisible : handleStyle} />

      {!canEdit && (
        <div className="absolute right-1 top-1 z-10 rounded-full bg-black/10 p-0.5">
          <Lock className="size-3 text-gray-400" />
        </div>
      )}

      {editing ? (
        <textarea
          ref={textRef}
          defaultValue={d.label}
          onBlur={handleBlur}
          autoFocus
          className="h-full w-full resize-none bg-transparent p-1 text-sm leading-snug outline-none"
          style={{ color: d.color || '#1f2937' }}
          placeholder="Type here…"
        />
      ) : (
        <div
          className={`h-full w-full overflow-hidden p-1 text-sm leading-snug break-words whitespace-pre-wrap ${canEdit ? 'cursor-text' : 'cursor-default'}`}
          style={{ color: d.color || '#1f2937' }}
          onDoubleClick={canEdit ? () => setEditing(true) : undefined}
        >
          {d.label || (
            canEdit && <span className="text-gray-300 text-xs select-none">Double-click to type…</span>
          )}
        </div>
      )}
    </div>
  );
}
