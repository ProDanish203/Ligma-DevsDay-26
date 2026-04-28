'use client';

import { useCallback, useRef, useState } from 'react';
import { NodeResizer, Handle, Position, type NodeProps } from '@xyflow/react';

const COLOR_OPTIONS = [
  { value: '#FEF08A', label: 'Yellow' },
  { value: '#FDA4C4', label: 'Pink' },
  { value: '#BAE6FD', label: 'Blue' },
  { value: '#BBF7D0', label: 'Green' },
  { value: '#DDD6FE', label: 'Purple' },
];

const handleStyle = {
  width: 10,
  height: 10,
  background: '#F43F7A',
  border: '2px solid #fff',
  zIndex: 20,
};

export interface StickyNodeData {
  label: string;
  color: string;
  onUpdate?: (nodeId: string, data: Partial<{ label: string; color: string }>) => void;
  onResize?: (nodeId: string, params: { x: number; y: number; width: number; height: number }) => void;
  [key: string]: unknown;
}

export function StickyNode({ id, data, selected }: NodeProps) {
  const d = data as StickyNodeData;
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleColorChange = useCallback(
    (color: string) => {
      d.onUpdate?.(id, { color });
    },
    [id, d],
  );

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (textRef.current) d.onUpdate?.(id, { label: textRef.current.value });
  }, [id, d]);

  return (
    <div
      className="relative flex h-full w-full flex-col rounded-md shadow-md"
      style={{ backgroundColor: d.color || '#FEF08A' }}
    >
      <NodeResizer
        minWidth={120}
        minHeight={80}
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

      {/* Color swatches */}
      <div className="flex items-center gap-1 p-2">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.value}
            className="size-4 rounded-full border border-black/10 transition-transform hover:scale-110"
            style={{ backgroundColor: c.value }}
            onClick={(e) => {
              e.stopPropagation();
              handleColorChange(c.value);
            }}
            title={c.label}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-2 pb-2">
        {editing ? (
          <textarea
            ref={textRef}
            defaultValue={d.label}
            onBlur={handleBlur}
            autoFocus
            className="h-full w-full resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500"
            placeholder="Type here…"
          />
        ) : (
          <p
            className="cursor-text break-words whitespace-pre-wrap text-sm text-gray-800 min-h-[2rem]"
            onDoubleClick={() => setEditing(true)}
          >
            {d.label || <span className="text-gray-400/80 text-xs">Double-click to edit…</span>}
          </p>
        )}
      </div>
    </div>
  );
}
