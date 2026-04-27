'use client';

import { useCallback, useEffect, useState } from 'react';
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

import { useCanvasSocket, type RemoteUser } from '@/hooks/use-canvas-socket';
import type { CanvasNodeSchema, CanvasEdgeSchema } from '@/schema/canvas.schema';

import { StickyNode } from './nodes/sticky-node';
import { ShapeNode } from './nodes/shape-node';
import { CursorOverlay } from './cursor-overlay';
import { CanvasToolbar, type ToolMode } from './canvas-toolbar';

const nodeTypes = { sticky: StickyNode, shape: ShapeNode };

function dbNodeToFlow(dbNode: CanvasNodeSchema, onUpdate: (nodeId: string, data: any) => void): Node {
  return {
    id: dbNode.id,
    type: dbNode.type,
    position: { x: dbNode.positionX, y: dbNode.positionY },
    style: { width: dbNode.width, height: dbNode.height },
    data: { ...(dbNode.data as object), onUpdate },
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

function CanvasInner({ projectId, user }: { projectId: string; user: RemoteUser | null }) {
  const { screenToFlowPosition } = useReactFlow();
  const [toolMode, setToolMode] = useState<ToolMode>('select');

  const { nodes: dbNodes, edges: dbEdges, remoteUsers, cursors, emitCursorMove, createNode, updateNode, deleteNode, createEdge, deleteEdge } =
    useCanvasSocket({ projectId, user });

  const [nodes, setNodes, onNodesChangeLocal] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeLocal] = useEdgesState<Edge>([]);

  // Sync DB nodes → local React Flow state (skip dragging nodes to avoid snapping)
  useEffect(() => {
    setNodes((prev) => {
      const draggingIds = new Set(prev.filter((n) => n.dragging).map((n) => n.id));
      const onUpdate = (nodeId: string, data: any) => updateNode({ nodeId, data });
      return dbNodes.map((dbNode) => {
        if (draggingIds.has(dbNode.id)) {
          return prev.find((n) => n.id === dbNode.id) ?? dbNodeToFlow(dbNode, onUpdate);
        }
        return dbNodeToFlow(dbNode, onUpdate);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbNodes]);

  // Sync DB edges → local React Flow state
  useEffect(() => {
    setEdges(dbEdges.map(dbEdgeToFlow));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbEdges]);

  // Escape key → back to select
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setToolMode('select'); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    // Always apply locally so React Flow state stays in sync (fixes drag)
    onNodesChangeLocal(changes);

    for (const change of changes) {
      if (change.type === 'position') {
        const c = change as NodePositionChange;
        // Emit only when drag finishes
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
    }
  }, [onNodesChangeLocal, updateNode]);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    onEdgesChangeLocal(changes);
  }, [onEdgesChangeLocal]);

  const onConnect = useCallback((connection: Connection) => {
    // Optimistically add edge to local state (will be replaced by server broadcast)
    setEdges((eds) => addEdge({
      ...connection,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#374151' },
      style: { stroke: '#374151', strokeWidth: 2 },
    }, eds));
    createEdge({
      sourceNodeId: connection.source,
      targetNodeId: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
    });
  }, [setEdges, createEdge]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    deleted.forEach((e) => deleteEdge(e.id));
  }, [deleteEdge]);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    deleted.forEach((n) => deleteNode(n.id));
  }, [deleteNode]);

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (toolMode === 'select') return;
    const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
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
  }, [toolMode, screenToFlowPosition, createNode]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    emitCursorMove(pos.x, pos.y);
  }, [screenToFlowPosition, emitCursorMove]);

  const cursorClass = toolMode !== 'select' ? 'canvas-crosshair' : '';

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
        fitView
        fitViewOptions={{ padding: 0.2 }}
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

      <CanvasToolbar toolMode={toolMode} onToolChange={setToolMode} />
    </div>
  );
}

export function CanvasView({ projectId, user }: { projectId: string; user: RemoteUser | null }) {
  return (
    <div className="h-full w-full overflow-hidden">
      <ReactFlowProvider>
        <CanvasInner projectId={projectId} user={user} />
      </ReactFlowProvider>
    </div>
  );
}
