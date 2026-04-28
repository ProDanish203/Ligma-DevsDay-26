'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Circle, Group, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useCanvasSocket, type RemoteUser, type CanvasConnectionStatus } from '@/hooks/use-canvas-socket';
import type { CanvasNodeSchema, CanvasEdgeSchema } from '@/schema/canvas.schema';
import { CanvasToolbar, type ToolMode } from './canvas-toolbar';
import { RemoteCursor } from '@/components/collaboration/remote-cursor';
import { getCursorColor } from '@/lib/cursor-utils';
import { Loader2, Wifi, WifiOff, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react';

const STICKY_COLORS = ['#FEF08A', '#FDA4C4', '#BAE6FD', '#BBF7D0', '#DDD6FE'];
const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const CONN_HANDLE_RADIUS = 6;

type HandleId = 'top' | 'bottom' | 'left' | 'right';

function getHandlePos(node: CanvasNodeSchema, handle: HandleId) {
  switch (handle) {
    case 'top':    return { x: node.positionX + node.width / 2, y: node.positionY };
    case 'bottom': return { x: node.positionX + node.width / 2, y: node.positionY + node.height };
    case 'left':   return { x: node.positionX, y: node.positionY + node.height / 2 };
    case 'right':  return { x: node.positionX + node.width, y: node.positionY + node.height / 2 };
  }
}

function getEdgePath(
  src: CanvasNodeSchema,
  tgt: CanvasNodeSchema,
  srcHandle?: string | null,
  tgtHandle?: string | null,
) {
  const sh = (srcHandle as HandleId) || 'right';
  const th = (tgtHandle as HandleId) || 'left';
  const sp = getHandlePos(src, sh);
  const tp = getHandlePos(tgt, th);
  const offset = Math.max(Math.abs(tp.x - sp.x) * 0.4, 50);

  let cp1x = sp.x, cp1y = sp.y, cp2x = tp.x, cp2y = tp.y;
  if (sh === 'right')  cp1x = sp.x + offset;
  else if (sh === 'left')   cp1x = sp.x - offset;
  else if (sh === 'bottom') cp1y = sp.y + offset;
  else if (sh === 'top')    cp1y = sp.y - offset;
  if (th === 'left')   cp2x = tp.x - offset;
  else if (th === 'right')  cp2x = tp.x + offset;
  else if (th === 'top')    cp2y = tp.y - offset;
  else if (th === 'bottom') cp2y = tp.y + offset;

  return { sp, tp, cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y } };
}

function arrowAngle(from: { x: number; y: number }, to: { x: number; y: number }) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

/* ── Connection badge ─────────────────────────────────────────────────── */
function ConnectionBadge({ status }: { status: CanvasConnectionStatus }) {
  if (status === 'connected') return null;
  const badge = {
    connecting:   { icon: <Loader2 className="size-3.5 animate-spin" />,  label: 'Connecting…',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    reconnecting: { icon: <Wifi className="size-3.5 animate-pulse" />,    label: 'Reconnecting…',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    disconnected: { icon: <WifiOff className="size-3.5" />,               label: 'Disconnected',     cls: 'bg-red-50 text-red-700 border-red-200' },
    error:        { icon: <AlertTriangle className="size-3.5" />,         label: 'Connection error', cls: 'bg-red-50 text-red-700 border-red-200' },
  }[status];
  return (
    <div className={`absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm ${badge.cls}`}>
      {badge.icon}
      {badge.label}
    </div>
  );
}

/* ── Loading skeleton ─────────────────────────────────────────────────── */
function CanvasLoadingSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-brand-primary" />
        <p className="text-sm font-medium text-gray-500">Loading canvas…</p>
      </div>
    </div>
  );
}

/* ── Inner canvas ─────────────────────────────────────────────────────── */
interface CanvasInnerProps {
  dbNodes: CanvasNodeSchema[];
  dbEdges: CanvasEdgeSchema[];
  remoteUsers: RemoteUser[];
  cursors: Map<string, { x: number; y: number }>;
  status: CanvasConnectionStatus;
  emitCursorMove: (x: number, y: number) => void;
  emitNodeMove: (nodeId: string, positionX: number, positionY: number) => void;
  createNode: (payload: { type: string; positionX: number; positionY: number; width: number; height: number; data: { label: string; color: string; shape?: 'rect' | 'circle'; points?: number[]; fontSize?: number } }) => void;
  updateNode: (payload: { nodeId: string; positionX?: number; positionY?: number; width?: number; height?: number; data?: Partial<{ label: string; color: string; shape?: 'rect' | 'circle'; points?: number[]; fontSize?: number }> }) => void;
  deleteNode: (nodeId: string) => void;
  createEdge: (payload: { sourceNodeId: string; targetNodeId: string; sourceHandle?: string; targetHandle?: string }) => void;
  deleteEdge: (edgeId: string) => void;
}

function CanvasInner({
  dbNodes, dbEdges,
  remoteUsers, cursors, status,
  emitCursorMove, emitNodeMove, createNode, updateNode, deleteNode, createEdge, deleteEdge,
}: CanvasInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const connLineRef = useRef<Konva.Line>(null);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'node' | 'edge' | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<{ nodeId: string; handle: HandleId } | null>(null);
  const [editingNode, setEditingNode] = useState<{ id: string; label: string } | null>(null);
  const [localNodes, setLocalNodes] = useState<CanvasNodeSchema[]>(dbNodes);
  const [localEdges, setLocalEdges] = useState<CanvasEdgeSchema[]>(dbEdges);

  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; handle: HandleId; x: number; y: number } | null>(null);
  const connectingFromRef = useRef(connectingFrom);
  connectingFromRef.current = connectingFrom;

  /* ── Freehand drawing state ──────────────────────────────────────────── */
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<number[]>([]);
  const [drawColor] = useState('#10B981'); // emerald-500
  const [drawStrokeWidth] = useState(3);

  /* ── Text-block editing state ────────────────────────────────────────── */
  const [editingTextNode, setEditingTextNode] = useState<{ id: string; label: string } | null>(null);

  /* ── Resize observer for stage ──────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageSize({ width: el.offsetWidth, height: el.offsetHeight }));
    ro.observe(el);
    setStageSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  /* ── Sync db → local ────────────────────────────────────────────────── */
  const isSeededNodes = useRef(true);
  const isSeededEdges = useRef(true);

  useEffect(() => {
    if (isSeededNodes.current) { isSeededNodes.current = false; return; }
    setLocalNodes(dbNodes);
  }, [dbNodes]);

  useEffect(() => {
    if (isSeededEdges.current) { isSeededEdges.current = false; return; }
    setLocalEdges(dbEdges);
  }, [dbEdges]);

  /* ── Transformer attachment ─────────────────────────────────────────── */
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (selectedId && selectedType === 'node') {
      const konvaNode = nodeRefs.current.get(selectedId);
      if (konvaNode) { tr.nodes([konvaNode]); tr.getLayer()?.batchDraw(); }
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, selectedType]);

  /* ── Keyboard ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolMode('select');
        setConnectingFrom(null);
        connectingFromRef.current = null;
        setEditingNode(null);
        setEditingTextNode(null);
        setIsDrawing(false);
        setDrawPoints([]);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editingNode && !editingTextNode) {
        if (selectedId && selectedType === 'node') {
          setLocalNodes((prev) => prev.filter((n) => n.id !== selectedId));
          deleteNode(selectedId);
          setSelectedId(null);
        } else if (selectedId && selectedType === 'edge') {
          setLocalEdges((prev) => prev.filter((ed) => ed.id !== selectedId));
          deleteEdge(selectedId);
          setSelectedId(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, selectedType, editingNode, editingTextNode, deleteNode, deleteEdge]);

  /* ── Wheel zoom ─────────────────────────────────────────────────────── */
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current!;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition()!;
    const factor = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * factor));
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - ((pointer.x - stage.x()) / oldScale) * newScale,
      y: pointer.y - ((pointer.y - stage.y()) / oldScale) * newScale,
    });
    stage.batchDraw();
  }, []);

  /* ── Zoom buttons ───────────────────────────────────────────────────── */
  const zoom = useCallback((factor: number) => {
    const stage = stageRef.current!;
    const oldScale = stage.scaleX();
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * factor));
    const cx = stageSize.width / 2;
    const cy = stageSize.height / 2;
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: cx - ((cx - stage.x()) / oldScale) * newScale,
      y: cy - ((cy - stage.y()) / oldScale) * newScale,
    });
    stage.batchDraw();
  }, [stageSize]);

  /* ── Canvas → screen conversion (for remote cursors) ───────────────── */
  const toScreen = useCallback((cx: number, cy: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const scale = stage.scaleX();
    const pos = stage.position();
    const rect = containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return { x: cx * scale + pos.x + rect.left, y: cy * scale + pos.y + rect.top };
  }, []);

  /* ── Stage mouse handlers ───────────────────────────────────────────── */
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return;

    /* ── Draw mode: start a freehand stroke ── */
    if (toolMode === 'draw') {
      const pos = stageRef.current!.getRelativePointerPosition()!;
      setIsDrawing(true);
      setDrawPoints([pos.x, pos.y]);
      return;
    }

    /* ── Text mode: place a text block ── */
    if (toolMode === 'text') {
      const pos = stageRef.current!.getRelativePointerPosition()!;
      const w = 220, h = 40;
      createNode({
        type: 'text',
        positionX: pos.x - w / 2,
        positionY: pos.y - h / 2,
        width: w,
        height: h,
        data: { label: 'Text', color: '#1f2937', fontSize: 18 },
      });
      setToolMode('select');
      return;
    }

    if (toolMode !== 'select') {
      const pos = stageRef.current!.getRelativePointerPosition()!;
      const w = toolMode === 'sticky' ? 200 : toolMode === 'circle' ? 120 : 160;
      const h = toolMode === 'sticky' ? 150 : toolMode === 'circle' ? 120 : 100;
      createNode({
        type: toolMode === 'sticky' ? 'sticky' : 'shape',
        positionX: pos.x - w / 2,
        positionY: pos.y - h / 2,
        width: w,
        height: h,
        data: toolMode === 'sticky'
          ? { label: '', color: '#FEF08A' }
          : toolMode === 'rect'
          ? { label: '', color: '#F43F7A', shape: 'rect' }
          : { label: '', color: '#818CF8', shape: 'circle' },
      });
      setToolMode('select');
    } else {
      setSelectedId(null);
      setSelectedType(null);
    }
  }, [toolMode, createNode]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = stageRef.current!.getRelativePointerPosition()!;
    emitCursorMove(pos.x, pos.y);

    /* ── Drawing: accumulate points ── */
    if (isDrawing && toolMode === 'draw') {
      setDrawPoints((prev) => [...prev, pos.x, pos.y]);
      return;
    }

    if (connectingFromRef.current && connLineRef.current) {
      const from = connectingFromRef.current;
      connLineRef.current.points([from.x, from.y, pos.x, pos.y]);
      connLineRef.current.getLayer()?.batchDraw();
    }
  }, [emitCursorMove, isDrawing, toolMode]);

  const handleStageMouseUp = useCallback(() => {
    /* ── Drawing: finish the stroke and persist as a node ── */
    if (isDrawing && drawPoints.length >= 4) {
      // Compute bounding box of the stroke
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < drawPoints.length; i += 2) {
        const px = drawPoints[i], py = drawPoints[i + 1];
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
      const pad = 4;
      const bx = minX - pad, by = minY - pad;
      const bw = Math.max(maxX - minX + pad * 2, 10);
      const bh = Math.max(maxY - minY + pad * 2, 10);

      // Normalise points relative to bounding box origin
      const relPoints = drawPoints.map((v, i) => (i % 2 === 0 ? v - bx : v - by));

      createNode({
        type: 'draw',
        positionX: bx,
        positionY: by,
        width: bw,
        height: bh,
        data: { label: '', color: drawColor, points: relPoints },
      });
    }
    setIsDrawing(false);
    setDrawPoints([]);

    if (connectingFromRef.current) {
      setConnectingFrom(null);
      connectingFromRef.current = null;
      if (connLineRef.current) {
        connLineRef.current.points([]);
        connLineRef.current.getLayer()?.batchDraw();
      }
    }
  }, [isDrawing, drawPoints, drawColor, createNode]);

  /* ── Connection handle callbacks ────────────────────────────────────── */
  const startConnecting = useCallback((nodeId: string, handle: HandleId, pos: { x: number; y: number }) => {
    const val = { nodeId, handle, ...pos };
    connectingFromRef.current = val;
    setConnectingFrom(val);
  }, []);

  const finishConnecting = useCallback((targetNodeId: string, targetHandle: HandleId) => {
    const from = connectingFromRef.current;
    if (!from || from.nodeId === targetNodeId) {
      setConnectingFrom(null);
      connectingFromRef.current = null;
      return;
    }
    createEdge({ sourceNodeId: from.nodeId, targetNodeId, sourceHandle: from.handle, targetHandle });
    setConnectingFrom(null);
    connectingFromRef.current = null;
    if (connLineRef.current) {
      connLineRef.current.points([]);
      connLineRef.current.getLayer()?.batchDraw();
    }
  }, [createEdge]);

  /* ── Connection handles renderer ────────────────────────────────────── */
  const renderConnectionHandles = (node: CanvasNodeSchema) => {
    const handles: HandleId[] = ['top', 'bottom', 'left', 'right'];
    return handles.map((handle) => {
      const abs = getHandlePos(node, handle);
      const rx = abs.x - node.positionX;
      const ry = abs.y - node.positionY;
      const isHov = hoveredHandle?.nodeId === node.id && hoveredHandle?.handle === handle;
      return (
        <Circle
          key={handle}
          x={rx}
          y={ry}
          radius={CONN_HANDLE_RADIUS}
          fill={isHov ? '#F43F7A' : '#fff'}
          stroke="#F43F7A"
          strokeWidth={2}
          onMouseEnter={() => setHoveredHandle({ nodeId: node.id, handle })}
          onMouseLeave={() => setHoveredHandle(null)}
          onMouseDown={(e) => { e.cancelBubble = true; startConnecting(node.id, handle, abs); }}
          onMouseUp={(e) => { e.cancelBubble = true; finishConnecting(node.id, handle); }}
        />
      );
    });
  };

  /* ── Editing textarea overlay ───────────────────────────────────────── */
  const renderEditingOverlay = () => {
    if (!editingNode) return null;
    const node = localNodes.find((n) => n.id === editingNode.id);
    if (!node) return null;
    const stage = stageRef.current;
    if (!stage) return null;
    const scale = stage.scaleX();
    const pos = stage.position();
    const sx = node.positionX * scale + pos.x;
    const sy = (node.positionY + 28) * scale + pos.y;
    const sw = node.width * scale;
    const sh = (node.height - 32) * scale;
    return (
      <div style={{ position: 'absolute', left: sx, top: sy, width: sw, height: sh, zIndex: 50 }}>
        <textarea
          autoFocus
          defaultValue={editingNode.label}
          className="h-full w-full resize-none bg-transparent text-gray-800 outline-none placeholder:text-gray-500 px-2 py-1"
          style={{ fontSize: `${Math.max(10, 13 * scale)}px` }}
          placeholder="Type here…"
          onBlur={(e) => {
            const newLabel = e.target.value;
            setLocalNodes((prev) => prev.map((n) =>
              n.id === editingNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n,
            ));
            updateNode({ nodeId: editingNode.id, data: { label: newLabel } });
            setEditingNode(null);
          }}
        />
      </div>
    );
  };

  const cursorClass = toolMode !== 'select' ? 'cursor-crosshair' : '';

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${cursorClass}`}
      style={{
        background: '#f9fafb',
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        draggable={toolMode === 'select' && !connectingFrom && !isDrawing}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        {/* ── Edges ── */}
        <Layer>
          {localEdges.map((edge) => {
            const src = localNodes.find((n) => n.id === edge.sourceNodeId);
            const tgt = localNodes.find((n) => n.id === edge.targetNodeId);
            if (!src || !tgt) return null;
            const { sp, tp, cp1, cp2 } = getEdgePath(src, tgt, edge.sourceHandle, edge.targetHandle);
            const isSelected = selectedId === edge.id;
            const color = isSelected ? '#F43F7A' : (edge.color || '#374151');
            const angle = arrowAngle(cp2, tp);
            const r = 10;
            const a1 = (angle - 150) * (Math.PI / 180);
            const a2 = (angle + 150) * (Math.PI / 180);
            return (
              <Group key={edge.id} onClick={(e) => { e.cancelBubble = true; setSelectedId(edge.id); setSelectedType('edge'); }}>
                <Line
                  points={[sp.x, sp.y, cp1.x, cp1.y, cp2.x, cp2.y, tp.x, tp.y]}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  bezier
                  hitStrokeWidth={12}
                />
                <Line
                  points={[
                    tp.x + Math.cos(a1) * r, tp.y + Math.sin(a1) * r,
                    tp.x, tp.y,
                    tp.x + Math.cos(a2) * r, tp.y + Math.sin(a2) * r,
                  ]}
                  stroke={color}
                  strokeWidth={2}
                  closed
                  fill={color}
                  listening={false}
                />
              </Group>
            );
          })}
          {/* Temp connection line while dragging from a handle */}
          <Line ref={connLineRef} points={[]} stroke="#F43F7A" strokeWidth={2} dash={[8, 4]} listening={false} />
        </Layer>

        {/* ── Nodes ── */}
        <Layer>
          {localNodes.map((node) => {
            const isSelected = selectedId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const showHandles = (isSelected || isHovered) && toolMode === 'select';
            const d = node.data as { label: string; color: string; shape?: 'rect' | 'circle'; points?: number[]; fontSize?: number };

            return (
              <Group
                key={node.id}
                id={node.id}
                x={node.positionX}
                y={node.positionY}
                draggable={toolMode === 'select' && !connectingFrom}
                ref={(el) => {
                  if (el) nodeRefs.current.set(node.id, el);
                  else nodeRefs.current.delete(node.id);
                }}
                onClick={(e) => { e.cancelBubble = true; setSelectedId(node.id); setSelectedType('node'); }}
                onDblClick={() => {
                  if (node.type === 'sticky') setEditingNode({ id: node.id, label: d.label });
                  if (node.type === 'text') setEditingTextNode({ id: node.id, label: d.label });
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onDragMove={(e) => {
                  const newX = e.target.x(), newY = e.target.y();
                  setLocalNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, positionX: newX, positionY: newY } : n));
                  emitNodeMove(node.id, newX, newY);
                }}
                onDragEnd={(e) => {
                  const newX = e.target.x(), newY = e.target.y();
                  setLocalNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, positionX: newX, positionY: newY } : n));
                  updateNode({ nodeId: node.id, positionX: newX, positionY: newY });
                }}
                onTransformEnd={(e) => {
                  const t = e.target as Konva.Group;
                  const newW = Math.max(60, node.width * t.scaleX());
                  const newH = Math.max(60, node.height * t.scaleY());
                  const newX = t.x(), newY = t.y();
                  t.scaleX(1); t.scaleY(1);
                  setLocalNodes((prev) => prev.map((n) =>
                    n.id === node.id ? { ...n, positionX: newX, positionY: newY, width: newW, height: newH } : n,
                  ));
                  updateNode({ nodeId: node.id, positionX: newX, positionY: newY, width: newW, height: newH });
                }}
              >
                {/* ── Draw node (freehand stroke) ── */}
                {node.type === 'draw' && d.points ? (
                  <>
                    {/* Invisible hit rect so the whole bounding box is selectable */}
                    <Rect width={node.width} height={node.height} fill="transparent" />
                    <Line
                      points={d.points}
                      stroke={d.color || '#10B981'}
                      strokeWidth={3}
                      lineCap="round"
                      lineJoin="round"
                      tension={0.4}
                      listening={false}
                    />
                    {isSelected && (
                      <Rect
                        width={node.width}
                        height={node.height}
                        stroke="#F43F7A"
                        strokeWidth={1.5}
                        dash={[4, 3]}
                        fill="transparent"
                        listening={false}
                      />
                    )}
                  </>
                ) : node.type === 'text' ? (
                  /* ── Text block node ── */
                  <>
                    <Rect
                      width={node.width}
                      height={node.height}
                      fill="transparent"
                      stroke={isSelected ? '#0EA5E9' : 'transparent'}
                      strokeWidth={1.5}
                      dash={isSelected ? [4, 3] : []}
                    />
                    {editingTextNode?.id !== node.id && (
                      <Text
                        x={4}
                        y={4}
                        width={node.width - 8}
                        height={node.height - 8}
                        text={d.label || 'Double-click to edit…'}
                        fontSize={d.fontSize || 18}
                        fill={d.color || '#1f2937'}
                        wrap="word"
                        verticalAlign="middle"
                      />
                    )}
                  </>
                ) : node.type === 'sticky' ? (
                  <>
                    <Rect
                      width={node.width}
                      height={node.height}
                      fill={d.color || '#FEF08A'}
                      cornerRadius={8}
                      shadowColor="rgba(0,0,0,0.12)"
                      shadowBlur={8}
                      shadowOffsetY={2}
                      stroke={isSelected ? '#F43F7A' : 'transparent'}
                      strokeWidth={2}
                    />
                    {/* Color swatches */}
                    {STICKY_COLORS.map((c, i) => (
                      <Circle
                        key={c}
                        x={14 + i * 22}
                        y={14}
                        radius={7}
                        fill={c}
                        stroke="rgba(0,0,0,0.1)"
                        strokeWidth={1}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          setLocalNodes((prev) => prev.map((n) =>
                            n.id === node.id ? { ...n, data: { ...n.data, color: c } } : n,
                          ));
                          updateNode({ nodeId: node.id, data: { color: c } });
                        }}
                      />
                    ))}
                    {editingNode?.id !== node.id && (
                      <Text
                        x={8}
                        y={30}
                        width={node.width - 16}
                        height={node.height - 38}
                        text={d.label || 'Double-click to edit…'}
                        fontSize={13}
                        fill={d.label ? '#1f2937' : '#9ca3af'}
                        wrap="word"
                        ellipsis
                      />
                    )}
                  </>
                ) : (
                  <>
                    {d.shape === 'circle' ? (
                      <Ellipse
                        x={node.width / 2}
                        y={node.height / 2}
                        radiusX={node.width / 2}
                        radiusY={node.height / 2}
                        fill={d.color || '#818CF8'}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth={2}
                        shadowColor="rgba(0,0,0,0.15)"
                        shadowBlur={6}
                        shadowOffsetY={2}
                      />
                    ) : (
                      <Rect
                        width={node.width}
                        height={node.height}
                        fill={d.color || '#F43F7A'}
                        cornerRadius={8}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth={2}
                        shadowColor="rgba(0,0,0,0.15)"
                        shadowBlur={6}
                        shadowOffsetY={2}
                      />
                    )}
                    <Text
                      x={4}
                      y={0}
                      width={node.width - 8}
                      height={node.height}
                      text={d.label}
                      fontSize={13}
                      fontStyle="bold"
                      fill="#fff"
                      align="center"
                      verticalAlign="middle"
                      wrap="word"
                    />
                  </>
                )}
                {showHandles && renderConnectionHandles(node)}
              </Group>
            );
          })}

          <Transformer
            ref={transformerRef}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            rotateEnabled={false}
            borderStroke="#F43F7A"
            borderStrokeWidth={1.5}
            anchorStroke="#F43F7A"
            anchorFill="#fff"
            anchorSize={8}
            anchorCornerRadius={2}
          />

          {/* ── Live freehand drawing preview ── */}
          {isDrawing && drawPoints.length >= 4 && (
            <Line
              points={drawPoints}
              stroke={drawColor}
              strokeWidth={drawStrokeWidth}
              lineCap="round"
              lineJoin="round"
              tension={0.4}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      {/* ── Editing textarea overlay (sticky notes) ── */}
      {renderEditingOverlay()}

      {/* ── Editing overlay for text blocks ── */}
      {editingTextNode && (() => {
        const node = localNodes.find((n) => n.id === editingTextNode.id);
        if (!node) return null;
        const stage = stageRef.current;
        if (!stage) return null;
        const scale = stage.scaleX();
        const pos = stage.position();
        const nd = node.data as { label: string; color: string; fontSize?: number };
        const sx = node.positionX * scale + pos.x;
        const sy = node.positionY * scale + pos.y;
        const sw = node.width * scale;
        const sh = node.height * scale;
        return (
          <div style={{ position: 'absolute', left: sx, top: sy, width: sw, height: sh, zIndex: 50 }}>
            <input
              autoFocus
              defaultValue={editingTextNode.label}
              className="h-full w-full bg-transparent outline-none px-1"
              style={{ fontSize: `${Math.max(10, (nd.fontSize || 18) * scale)}px`, color: nd.color || '#1f2937' }}
              onBlur={(e) => {
                const newLabel = e.target.value;
                setLocalNodes((prev) => prev.map((n) =>
                  n.id === editingTextNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n,
                ));
                updateNode({ nodeId: editingTextNode.id, data: { label: newLabel } });
                setEditingTextNode(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
        );
      })()}

      {/* ── Remote cursors ── */}
      {Array.from(cursors.entries()).map(([userId, pos]) => {
        const user = remoteUsers.find((u) => u.id === userId);
        if (!user) return null;
        const screen = toScreen(pos.x, pos.y);
        return <RemoteCursor key={userId} name={user.name} x={screen.x} y={screen.y} color={getCursorColor(userId)} />;
      })}

      <ConnectionBadge status={status} />
      <CanvasToolbar toolMode={toolMode} onToolChange={setToolMode} />

      {/* ── Zoom controls ── */}
      <div className="absolute bottom-6 left-16 z-20 flex flex-col gap-0.5 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
        <button
          onClick={() => zoom(1.25)}
          className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          title="Zoom in"
        >
          <ZoomIn className="size-4" />
        </button>
        <div className="mx-1 h-px bg-gray-100" />
        <button
          onClick={() => zoom(1 / 1.25)}
          className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          title="Zoom out"
        >
          <ZoomOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Outer wrapper ────────────────────────────────────────────────────── */
export function CanvasView({ projectId, user }: { projectId: string; user: RemoteUser | null }) {
  const {
    nodes, edges, remoteUsers, cursors,
    status, initialLoadDone,
    emitCursorMove, emitNodeMove, createNode, updateNode, deleteNode, createEdge, deleteEdge,
  } = useCanvasSocket({ projectId, user });

  if (!initialLoadDone) {
    return (
      <div className="h-full w-full overflow-hidden">
        <CanvasLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <CanvasInner
        dbNodes={nodes}
        dbEdges={edges}
        remoteUsers={remoteUsers}
        cursors={cursors}
        status={status}
        emitCursorMove={emitCursorMove}
        emitNodeMove={emitNodeMove}
        createNode={createNode}
        updateNode={updateNode}
        deleteNode={deleteNode}
        createEdge={createEdge}
        deleteEdge={deleteEdge}
      />
    </div>
  );
}
