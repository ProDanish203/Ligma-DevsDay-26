'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NodeResizer, Handle, Position, type NodeProps } from '@xyflow/react';
import { Lock, Loader2 } from 'lucide-react';
import { NodeIntent } from '@/lib/enums';
import { useCanvasYDoc } from '../canvas-yjs-context';

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

const INTENT_TAG: Record<string, { label: string; cls: string }> = {
  [NodeIntent.ACTION_ITEM]:  { label: 'Action Item',   cls: 'bg-rose-500 text-white' },
  [NodeIntent.DECISION]:     { label: 'Decision',      cls: 'bg-blue-500 text-white' },
  [NodeIntent.OPEN_QUESTION]:{ label: 'Open Question', cls: 'bg-amber-400 text-gray-900' },
  [NodeIntent.REFERENCE]:    { label: 'Reference',     cls: 'bg-violet-500 text-white' },
};

export interface StickyNodeData {
  label: string;
  color: string;
  canEdit?: boolean;
  aiClassifying?: boolean;
  intent?: NodeIntent | string;
  onUpdate?: (nodeId: string, data: Partial<{ label: string; color: string }>) => void;
  onManagePermissions?: (nodeId: string) => void;
  onResize?: (nodeId: string, params: { x: number; y: number; width: number; height: number }) => void;
  [key: string]: unknown;
}

/** Compute a minimal diff between two strings and apply it to a Y.Text. */
function applyDiff(ytext: import('yjs').Text, oldStr: string, newStr: string) {
  let start = 0;
  while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) start++;

  let endOld = oldStr.length;
  let endNew = newStr.length;
  while (endOld > start && endNew > start && oldStr[endOld - 1] === newStr[endNew - 1]) {
    endOld--;
    endNew--;
  }

  if (endOld > start) ytext.delete(start, endOld - start);
  if (endNew > start) ytext.insert(start, newStr.slice(start, endNew));
}

export function StickyNode({ id, data, selected }: NodeProps) {
  const d = data as StickyNodeData;
  const canEdit = d.canEdit !== false;
  const aiClassifying = d.aiClassifying === true;
  const intentTag = d.intent && d.intent !== NodeIntent.UNCLASSIFIED ? INTENT_TAG[d.intent] : null;

  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const prevTextRef = useRef<string>(d.label ?? '');

  // ── Yjs binding ──────────────────────────────────────────────────────
  const ydoc = useCanvasYDoc();
  const yText = useMemo(() => (ydoc ? ydoc.getText(`node:${id}`) : null), [ydoc, id]);

  // Track displayed label — authoritative source is Y.Text when available, else DB label
  const [displayLabel, setDisplayLabel] = useState<string>(d.label ?? '');

  // Initialize Y.Text from DB label when Y.Text is first available and empty
  useEffect(() => {
    if (!yText) return;
    const current = yText.toString();
    if (current.length === 0 && d.label) {
      yText.insert(0, d.label);
    }
    const val = yText.toString();
    setDisplayLabel(val);
    prevTextRef.current = val;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yText]); // intentionally only on yText identity change (new doc or new node)

  // Observe remote Y.Text changes and mirror them into the textarea DOM
  useEffect(() => {
    if (!yText) return;

    const observer = () => {
      const newVal = yText.toString();
      setDisplayLabel(newVal);
      prevTextRef.current = newVal;

      if (textRef.current) {
        const { selectionStart, selectionEnd } = textRef.current;
        textRef.current.value = newVal;
        try { textRef.current.setSelectionRange(selectionStart, selectionEnd); } catch { /* ignore */ }
      }
    };

    yText.observe(observer);
    return () => yText.unobserve(observer);
  }, [yText]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleColorChange = useCallback((color: string) => {
    if (!canEdit) return;
    d.onUpdate?.(id, { color });
  }, [id, d, canEdit]);

  // When editing opens, sync prevTextRef to the current Y.Text value
  const handleStartEdit = useCallback(() => {
    if (!canEdit) return;
    const current = yText ? yText.toString() : d.label ?? '';
    prevTextRef.current = current;
    setEditing(true);
  }, [canEdit, yText, d.label]);

  // Apply diff to Y.Text on each keystroke; keep DB persistence on blur
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!yText) return;
      const newVal = e.target.value;
      const oldVal = prevTextRef.current;
      if (oldVal === newVal) return;
      prevTextRef.current = newVal;
      applyDiff(yText, oldVal, newVal);
    },
    [yText],
  );

  // Persist to DB on blur (existing flow — reads from textarea DOM value)
  const handleBlur = useCallback(() => {
    setEditing(false);
    if (textRef.current) d.onUpdate?.(id, { label: textRef.current.value });
  }, [id, d]);

  return (
    <div
      className="relative flex h-full w-full flex-col rounded-md shadow-md"
      style={{ backgroundColor: d.color || '#FEF08A', opacity: canEdit ? 1 : 0.85 }}
    >
      {canEdit && <NodeResizer minWidth={120} minHeight={80} isVisible={selected} />}
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

      {!canEdit && !aiClassifying && (
        <div className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/20 p-0.5">
          <Lock className="size-3 text-white/80" />
        </div>
      )}

      {aiClassifying && (
        <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1 rounded-full bg-black/30 px-1.5 py-0.5">
          <Loader2 className="size-3 animate-spin text-white" />
          <span className="text-[9px] font-medium text-white">AI</span>
        </div>
      )}

      {/* Color swatches */}
      <div className="flex items-center gap-1 p-2">
        {canEdit && COLOR_OPTIONS.map((c) => (
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
            defaultValue={yText ? yText.toString() : d.label}
            onBlur={handleBlur}
            onChange={handleTextareaChange}
            autoFocus
            className="h-full w-full resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500"
            placeholder="Type here…"
          />
        ) : (
          <p
            className={`break-words whitespace-pre-wrap text-sm text-gray-800 min-h-[2rem] ${canEdit ? 'cursor-text' : 'cursor-default'}`}
            onDoubleClick={canEdit ? handleStartEdit : undefined}
          >
            {displayLabel || <span className="text-gray-400/80 text-xs">{canEdit ? 'Double-click to edit…' : 'Read-only'}</span>}
          </p>
        )}
      </div>

      {/* Intent tag */}
      {intentTag && (
        <div className="px-2 pb-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${intentTag.cls}`}>
            {intentTag.label}
          </span>
        </div>
      )}
    </div>
  );
}
