'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ConnectionMode,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeDimensionChange,
  type NodePositionChange,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasSocket, type RemoteUser, type CanvasConnectionStatus } from '@/hooks/use-canvas-socket';
import type { CanvasNodeSchema, CanvasEdgeSchema } from '@/schema/canvas.schema';

import { StickyNode } from './nodes/sticky-node';
import { ShapeNode } from './nodes/shape-node';
import { DrawNode } from './nodes/draw-node';
import { TextNode } from './nodes/text-node';
import { CursorOverlay } from './cursor-overlay';
import { CanvasToolbar, type ToolMode } from './canvas-toolbar';
import { LogPanel } from './log-panel';
import { NodePermissionsModal } from './node-permissions-modal';
import { Loader2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

const nodeTypes = { sticky: StickyNode, shape: ShapeNode, draw: DrawNode, text: TextNode };

function dbNodeToFlow(
  dbNode: CanvasNodeSchema,
  onUpdate: (nodeId: string, data: any) => void,
  canEdit: boolean,
  onManagePermissions: (nodeId: string) => void,
  onResize: (nodeId: string, params: { x: number; y: number; width: number; height: number }) => void,
): Node {
  return {
    id: dbNode.id,
    type: dbNode.type,
    position: { x: dbNode.positionX, y: dbNode.positionY },
    style: { width: dbNode.width, height: dbNode.height },
    draggable: canEdit,
    connectable: canEdit,
    deletable: canEdit,
    data: { ...(dbNode.data as object), intent: dbNode.intent, onUpdate, canEdit, onManagePermissions, onResize },
  };
}

function dbEdgeToFlow(dbEdge: CanvasEdgeSchema): Edge {
  return {
    id: dbEdge.id,
    source: dbEdge.sourceNodeId,
    target: dbEdge.targetNodeId,
    sourceHandle: dbEdge.sourceHandle ?? undefined,
    targetHandle: dbEdge.targetHandle ?? undefined,
    label: dbEdge.label ?? undefined,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: dbEdge.color || '#374151' },
    style: { stroke: dbEdge.color || '#374151', strokeWidth: 2 },
  };
}

/* ------------------------------------------------------------------ */
/* Connection status badge                                             */
/* ------------------------------------------------------------------ */
function ConnectionBadge({ status }: { status: CanvasConnectionStatus }) {
  if (status === 'connected') return null;

  const badge = {
    connecting: {
      icon: <Loader2 className="size-3.5 animate-spin" />,
      label: 'Connecting…',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    reconnecting: {
      icon: <Wifi className="size-3.5 animate-pulse" />,
      label: 'Reconnecting…',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    disconnected: {
      icon: <WifiOff className="size-3.5" />,
      label: 'Disconnected',
      cls: 'bg-red-50 text-red-700 border-red-200',
    },
    error: {
      icon: <AlertTriangle className="size-3.5" />,
      label: 'Connection error',
      cls: 'bg-red-50 text-red-700 border-red-200',
    },
  }[status];

  return (
    <div
      className={`absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm ${badge.cls}`}
    >
      {badge.icon}
      {badge.label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function CanvasLoadingSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-brand-primary" />
        </div>
        <p className="text-sm font-medium text-gray-500">Loading canvas…</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inner canvas — only mounts when data is ready                       */
/* ------------------------------------------------------------------ */

interface CanvasInnerProps {
  projectId: string;
  dbNodes: CanvasNodeSchema[];
  dbEdges: CanvasEdgeSchema[];
  remoteUsers: RemoteUser[];
  cursors: Map<string, { x: number; y: number }>;
  status: CanvasConnectionStatus;
  aiClassifyingNodeIds: Set<string>;
  focusNodeId?: string;
  emitCursorMove: (x: number, y: number) => void;
  createNode: (payload: {
    type: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    data: { label: string; color: string; shape?: 'rect' | 'circle'; points?: number[] };
  }) => void;
  updateNode: (payload: {
    nodeId: string;
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
    data?: Partial<{ label: string; color: string; shape?: 'rect' | 'circle'; points?: number[] }>;
  }) => void;
  deleteNode: (nodeId: string) => void;
  createEdge: (payload: {
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string;
    targetHandle?: string;
  }) => void;
  deleteEdge: (edgeId: string) => void;
  canViewNode: (nodeId: string, createdById: string) => boolean;
  canEditNode: (nodeId: string, createdById: string) => boolean;
  canManageNodeAccess: (nodeId: string, createdById: string) => boolean;
  nodeAccesses: Record<string, import('@/schema/canvas.schema').NodeAccessEntrySchema[]>;
  recentLogs: import('@/schema/logs.schema').LogSchema[];
  grantNodeAccess: (nodeId: string, userId: string, accessLevel: import('@/lib/enums').UserAccessLevel) => void;
  revokeNodeAccess: (nodeId: string, accessId: string) => void;
}

function CanvasInner({
  projectId,
  dbNodes,
  dbEdges,
  remoteUsers,
  cursors,
  status,
  aiClassifyingNodeIds,
  focusNodeId,
  emitCursorMove,
  createNode,
  updateNode,
  deleteNode,
  createEdge,
  deleteEdge,
  canViewNode,
  canEditNode,
  canManageNodeAccess,
  nodeAccesses,
  recentLogs,
  grantNodeAccess,
  revokeNodeAccess,
}: CanvasInnerProps) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [logPanelOpen, setLogPanelOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [permissionsNodeId, setPermissionsNodeId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [screenDrawPoints, setScreenDrawPoints] = useState<number[]>([]);
  const drawOverlayRef = useRef<HTMLDivElement>(null);

  // Stable onUpdate callback using a ref — prevents recreating node data on every render
  const updateNodeRef = useRef(updateNode);
  updateNodeRef.current = updateNode;
  const stableOnUpdate = useCallback((nodeId: string, data: any) => {
    updateNodeRef.current({ nodeId, data });
  }, []);

  const onManagePermissionsRef = useRef((nodeId: string) => setPermissionsNodeId(nodeId));
  const stableOnManagePermissions = useCallback((nodeId: string) => {
    onManagePermissionsRef.current(nodeId);
  }, []);

  // Build a lookup: nodeId → createdById (for permission checks)
  const nodeCreatorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const n of dbNodes) map[n.id] = n.createdById;
    return map;
  }, [dbNodes]);

  const stableOnResize = useCallback((nodeId: string, params: { x: number; y: number; width: number; height: number }) => {
    updateNodeRef.current({
      nodeId,
      positionX: params.x,
      positionY: params.y,
      width: params.width,
      height: params.height,
    });
  }, []);

  const visibleDbNodes = useMemo(
    () => dbNodes.filter((n) => canViewNode(n.id, n.createdById)),
    [dbNodes, canViewNode],
  );

  const visibleNodeIdSet = useMemo(
    () => new Set(visibleDbNodes.map((n) => n.id)),
    [visibleDbNodes],
  );

  const visibleDbEdges = useMemo(
    () => dbEdges.filter((e) => visibleNodeIdSet.has(e.sourceNodeId) && visibleNodeIdSet.has(e.targetNodeId)),
    [dbEdges, visibleNodeIdSet],
  );

  // ── Initialize local state from the already-available data ──────────
  const initialFlowNodes = useMemo(
    () => visibleDbNodes.map((n) => dbNodeToFlow(n, stableOnUpdate, canEditNode(n.id, n.createdById), stableOnManagePermissions, stableOnResize)),
    [visibleDbNodes, stableOnUpdate, canEditNode, stableOnManagePermissions, stableOnResize],
  );
  const initialFlowEdges = useMemo(
    () => visibleDbEdges.map(dbEdgeToFlow),
    [visibleDbEdges],
  );

  const [nodes, setNodes, onNodesChangeLocal] = useNodesState<Node>(initialFlowNodes);
  const [edges, setEdges, onEdgesChangeLocal] = useEdgesState<Edge>(initialFlowEdges);

  const isNodesSeeded = useRef(true);
  const isEdgesSeeded = useRef(true);

  // Fit view once after mount — zoom to focused node if specified
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (hasFittedRef.current) return;
    if (initialFlowNodes.length === 0) return;

    const timer = setTimeout(() => {
      if (focusNodeId) {
        // Zoom in and center on the specific node
        fitView({ nodes: [{ id: focusNodeId }], padding: 0.5, duration: 500, maxZoom: 1.5 });
        // Select the focused node so it's visually highlighted
        setSelectedNodeId(focusNodeId);
      } else {
        fitView({ padding: 0.2, duration: 300 });
      }
      hasFittedRef.current = true;
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync DB nodes → local ReactFlow state ────────────────────────────
  useEffect(() => {
    if (isNodesSeeded.current) {
      isNodesSeeded.current = false;
      return;
    }
    setNodes((prev) => {
      const draggingIds = new Set(prev.filter((n) => n.dragging).map((n) => n.id));
      const next = visibleDbNodes.map((dbNode) => {
        if (draggingIds.has(dbNode.id)) {
          return prev.find((n) => n.id === dbNode.id) ?? dbNodeToFlow(dbNode, stableOnUpdate, canEditNode(dbNode.id, dbNode.createdById), stableOnManagePermissions, stableOnResize);
        }
        return dbNodeToFlow(dbNode, stableOnUpdate, canEditNode(dbNode.id, dbNode.createdById), stableOnManagePermissions, stableOnResize);
      });
      if (prev.length === next.length && prev.every((n, i) => n.id === next[i].id)) {
        // Check if meaningful node fields actually changed.
        // Color/label updates live in node.data, so include data comparison too.
        const changed = next.some((n, i) => {
          const p = prev[i];
          return (
            p.position.x !== n.position.x ||
            p.position.y !== n.position.y ||
            p.style?.width !== n.style?.width ||
            p.style?.height !== n.style?.height ||
            p.draggable !== n.draggable ||
            p.connectable !== n.connectable ||
            p.deletable !== n.deletable ||
            JSON.stringify(p.data) !== JSON.stringify(n.data)
          );
        });
        if (!changed) return prev;
      }
      return next;
    });
  }, [visibleDbNodes, setNodes, stableOnUpdate, canEditNode, stableOnManagePermissions, stableOnResize]);

  useEffect(() => {
    if (isEdgesSeeded.current) {
      isEdgesSeeded.current = false;
      return;
    }
    setEdges((prev) => {
      const next = visibleDbEdges.map(dbEdgeToFlow);
      if (prev.length === next.length && prev.every((e, i) => e.id === next[i].id)) {
        return prev;
      }
      return next;
    });
  }, [visibleDbEdges, setEdges]);

  useEffect(() => {
    if (!selectedNodeId) return;
    if (!visibleNodeIdSet.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, visibleNodeIdSet]);

  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => {
        const classifying = aiClassifyingNodeIds.has(n.id);
        if ((n.data as any).aiClassifying === classifying) return n;
        return { ...n, data: { ...n.data, aiClassifying: classifying } };
      }),
    );
  }, [aiClassifyingNodeIds, setNodes]);

  // Escape key → back to select
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolMode('select');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChangeLocal(changes);

      for (const change of changes) {
        if (change.type === 'position') {
          const c = change as NodePositionChange;
          if (c.dragging === false && c.position) {
            updateNode({ nodeId: c.id, positionX: c.position.x, positionY: c.position.y });
          }
        }
        if (change.type === 'dimensions') {
          const c = change as NodeDimensionChange;
          if (!c.resizing && c.dimensions) {
            updateNode({ nodeId: c.id, width: c.dimensions.width, height: c.dimensions.height });
          }
        }
        if (change.type === 'select') {
          if (change.selected) {
            setSelectedNodeId(change.id);
          } else {
            setSelectedNodeId((prev) => (prev === change.id ? null : prev));
          }
        }
      }
    },
    [onNodesChangeLocal, updateNode],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      onEdgesChangeLocal(changes);
    },
    [onEdgesChangeLocal],
  );

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#374151' },
          style: { stroke: '#374151', strokeWidth: 2 },
        },
        eds,
      ),
    );
    createEdge({
      sourceNodeId: connection.source,
      targetNodeId: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
    });
  }, [setEdges, createEdge]);

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      deleted.forEach((e) => deleteEdge(e.id));
    },
    [deleteEdge],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((n) => deleteNode(n.id));
    },
    [deleteNode],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (toolMode === 'select' || toolMode === 'draw') return;
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const sizes: Record<string, { w: number; h: number }> = {
        sticky: { w: 200, h: 150 },
        circle: { w: 120, h: 120 },
        text:   { w: 200, h: 80 },
      };
      const { w, h } = sizes[toolMode] ?? { w: 160, h: 100 };

      const nodeData: Record<string, { type: string; data: Record<string, unknown> }> = {
        sticky: { type: 'sticky', data: { label: '', color: '#FEF08A' } },
        rect:   { type: 'shape',  data: { label: '', color: '#F43F7A', shape: 'rect' } },
        circle: { type: 'shape',  data: { label: '', color: '#818CF8', shape: 'circle' } },
        text:   { type: 'text',   data: { label: '', color: '#1f2937' } },
      };

      const { type, data } = nodeData[toolMode] ?? nodeData.rect;
      createNode({
        type,
        positionX: pos.x - w / 2,
        positionY: pos.y - h / 2,
        width: w,
        height: h,
        data: data as any,
      });
      setToolMode('select');
    },
    [toolMode, screenToFlowPosition, createNode],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      emitCursorMove(pos.x, pos.y);
    },
    [screenToFlowPosition, emitCursorMove],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (toolMode !== 'draw') return;
      setIsDrawing(true);
      setScreenDrawPoints([e.clientX, e.clientY]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [toolMode],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (toolMode !== 'draw' || !isDrawing) return;
      setScreenDrawPoints((prev) => [...prev, e.clientX, e.clientY]);
    },
    [toolMode, isDrawing],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (toolMode !== 'draw' || !isDrawing) return;
      setIsDrawing(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (screenDrawPoints.length >= 4) {
        const flowPoints: number[] = [];
        for (let i = 0; i < screenDrawPoints.length; i += 2) {
          const flowPos = screenToFlowPosition({ x: screenDrawPoints[i], y: screenDrawPoints[i + 1] });
          flowPoints.push(flowPos.x, flowPos.y);
        }

        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (let i = 0; i < flowPoints.length; i += 2) {
          if (flowPoints[i] < minX) minX = flowPoints[i];
          if (flowPoints[i + 1] < minY) minY = flowPoints[i + 1];
          if (flowPoints[i] > maxX) maxX = flowPoints[i];
          if (flowPoints[i + 1] > maxY) maxY = flowPoints[i + 1];
        }

        const pad = 4;
        const bx = minX - pad;
        const by = minY - pad;
        const bw = Math.max(maxX - minX + pad * 2, 10);
        const bh = Math.max(maxY - minY + pad * 2, 10);

        const relPoints = flowPoints.map((v, i) => (i % 2 === 0 ? v - bx : v - by));

        createNode({
          type: 'draw',
          positionX: bx,
          positionY: by,
          width: bw,
          height: bh,
          data: { label: '', color: '#10B981', points: relPoints },
        });
      }

      setScreenDrawPoints([]);
    },
    [toolMode, isDrawing, screenDrawPoints, createNode, screenToFlowPosition],
  );

  const cursorClass = toolMode !== 'select' ? 'canvas-crosshair' : '';

  const selectedNodeCreatedById = selectedNodeId ? nodeCreatorMap[selectedNodeId] ?? '' : '';
  const canManageSelected = selectedNodeId
    ? canManageNodeAccess(selectedNodeId, selectedNodeCreatedById)
    : false;

  const permissionsNodeAccesses = permissionsNodeId ? (nodeAccesses[permissionsNodeId] ?? []) : [];
  const permissionsNodeCreatedById = permissionsNodeId ? nodeCreatorMap[permissionsNodeId] ?? '' : '';
  const canManagePermissionsNode = permissionsNodeId
    ? canManageNodeAccess(permissionsNodeId, permissionsNodeCreatedById)
    : false;

  return (
    <div className={`relative h-full w-full ${cursorClass}`} onMouseMove={onMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onPaneClick={onPaneClick}
        panOnDrag={toolMode === 'select' ? true : [2]}
        minZoom={0.1}
        maxZoom={4}
        deleteKeyCode={['Delete', 'Backspace']}
        connectionMode={ConnectionMode.Loose}
        connectionLineStyle={{ stroke: '#F43F7A', strokeWidth: 2.5 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#374151' },
          style: { stroke: '#374151', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
        <MiniMap position="bottom-right" nodeColor={(n) => (n.data as any)?.color ?? '#FDA4C4'} />
        <Controls position="bottom-left" />
        <CursorOverlay cursors={cursors} remoteUsers={remoteUsers} />
      </ReactFlow>

      <ConnectionBadge status={status} />
      <CanvasToolbar
        projectId={projectId}
        toolMode={toolMode}
        onToolChange={setToolMode}
        logPanelOpen={logPanelOpen}
        onToggleLogPanel={() => setLogPanelOpen((v) => !v)}
        selectedNodeId={selectedNodeId}
        canManageSelectedNode={canManageSelected}
        onOpenPermissions={() => setPermissionsNodeId(selectedNodeId)}
      />

      <LogPanel
        projectId={projectId}
        selectedNodeId={selectedNodeId}
        recentLogs={recentLogs}
        isOpen={logPanelOpen}
        onClose={() => setLogPanelOpen(false)}
      />

      <NodePermissionsModal
        nodeId={permissionsNodeId}
        projectId={projectId}
        accesses={permissionsNodeAccesses}
        canManage={canManagePermissionsNode}
        onGrant={grantNodeAccess}
        onRevoke={revokeNodeAccess}
        onClose={() => setPermissionsNodeId(null)}
      />

      {toolMode === 'draw' && (
        <div
          ref={drawOverlayRef}
          className="absolute inset-0 z-10 cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {screenDrawPoints.length >= 4 && (
            <svg width="100%" height="100%" style={{ pointerEvents: 'none' }}>
              <path
                d={`M ${screenDrawPoints[0] - (drawOverlayRef.current?.getBoundingClientRect().left || 0)} ${screenDrawPoints[1] - (drawOverlayRef.current?.getBoundingClientRect().top || 0)} ${screenDrawPoints
                  .slice(2)
                  .map((p, i) => {
                    const offset =
                      i % 2 === 0
                        ? drawOverlayRef.current?.getBoundingClientRect().left || 0
                        : drawOverlayRef.current?.getBoundingClientRect().top || 0;
                    return (i % 2 === 0 ? 'L ' : '') + (p - offset);
                  })
                  .join(' ')}`}
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}
    </div >
  );
}

/* ------------------------------------------------------------------ */
/* Outer wrapper — calls socket hook and gates CanvasInner on data     */
/* ------------------------------------------------------------------ */
export function CanvasView({ projectId, user, focusNodeId }: { projectId: string; user: RemoteUser | null; focusNodeId?: string }) {
  const {
    nodes,
    edges,
    remoteUsers,
    cursors,
    status,
    initialLoadDone,
    nodeAccesses,
    recentLogs,
    aiClassifyingNodeIds,
    emitCursorMove,
    createNode,
    updateNode,
    deleteNode,
    createEdge,
    deleteEdge,
    canViewNode,
    canEditNode,
    canManageNodeAccess,
    grantNodeAccess,
    revokeNodeAccess,
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
      <ReactFlowProvider>
        <CanvasInner
          projectId={projectId}
          dbNodes={nodes}
          dbEdges={edges}
          remoteUsers={remoteUsers}
          cursors={cursors}
          status={status}
          aiClassifyingNodeIds={aiClassifyingNodeIds}
          focusNodeId={focusNodeId}
          emitCursorMove={emitCursorMove}
          createNode={createNode}
          updateNode={updateNode}
          deleteNode={deleteNode}
          createEdge={createEdge}
          deleteEdge={deleteEdge}
          canViewNode={canViewNode}
          canEditNode={canEditNode}
          canManageNodeAccess={canManageNodeAccess}
          nodeAccesses={nodeAccesses}
          recentLogs={recentLogs}
          grantNodeAccess={grantNodeAccess}
          revokeNodeAccess={revokeNodeAccess}
        />
      </ReactFlowProvider>
    </div>
  );
}
