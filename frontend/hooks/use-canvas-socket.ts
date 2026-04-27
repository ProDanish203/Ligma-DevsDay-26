'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { TOKEN_KEY } from '@/lib/constants';
import type { CanvasNodeSchema, CanvasEdgeSchema } from '@/schema/canvas.schema';

export interface RemoteUser {
  id: string;
  name: string;
  email: string;
}

export function useCanvasSocket({ projectId, user }: { projectId: string; user: RemoteUser | null }) {
  const [nodes, setNodes] = useState<CanvasNodeSchema[]>([]);
  const [edges, setEdges] = useState<CanvasEdgeSchema[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number }>>(new Map());

  const socketRef = useRef<Socket | null>(null);
  const lastEmitRef = useRef<number>(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Guard against React 18 strict-mode double-mount
    if (!user || mountedRef.current) return;
    mountedRef.current = true;

    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

    const socket = io(`${socketUrl}/canvas`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('canvas:join', { projectId });
    });

    socket.on('canvas:state', ({ nodes: n, edges: e, users }: { nodes: CanvasNodeSchema[]; edges: CanvasEdgeSchema[]; users: RemoteUser[] }) => {
      setNodes(n);
      setEdges(e);
      setRemoteUsers(users.filter((u) => u.id !== user.id));
    });

    socket.on('canvas:user-joined', ({ users }: { users: RemoteUser[] }) => {
      setRemoteUsers(users.filter((u) => u.id !== user.id));
    });

    socket.on('canvas:user-left', ({ userId, users }: { userId: string; users: RemoteUser[] }) => {
      setRemoteUsers(users.filter((u) => u.id !== user.id));
      setCursors((prev) => { const m = new Map(prev); m.delete(userId); return m; });
    });

    socket.on('canvas:cursor-moved', ({ userId, x, y }: { userId: string; x: number; y: number }) => {
      setCursors((prev) => new Map(prev).set(userId, { x, y }));
    });

    socket.on('canvas:node-added', (node: CanvasNodeSchema) => {
      setNodes((prev) => prev.find((n) => n.id === node.id) ? prev : [...prev, node]);
    });

    socket.on('canvas:node-updated', (updated: CanvasNodeSchema) => {
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    });

    socket.on('canvas:node-deleted', ({ nodeId }: { nodeId: string }) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    });

    socket.on('canvas:edge-added', (edge: CanvasEdgeSchema) => {
      setEdges((prev) => prev.find((e) => e.id === edge.id) ? prev : [...prev, edge]);
    });

    socket.on('canvas:edge-deleted', ({ edgeId }: { edgeId: string }) => {
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    });

    return () => {
      mountedRef.current = false;
      socket.emit('canvas:leave', { projectId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, user]);

  const emitCursorMove = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastEmitRef.current < 33) return;
    lastEmitRef.current = now;
    socketRef.current?.emit('canvas:cursor-move', { projectId, x, y });
  }, [projectId]);

  const createNode = useCallback((payload: {
    type: string; positionX: number; positionY: number;
    width: number; height: number; data: { label: string; color: string; shape?: 'rect' | 'circle' };
  }) => {
    socketRef.current?.emit('canvas:node-add', { ...payload, projectId });
  }, [projectId]);

  const updateNode = useCallback((payload: {
    nodeId: string; positionX?: number; positionY?: number;
    width?: number; height?: number; data?: Partial<{ label: string; color: string; shape?: 'rect' | 'circle' }>;
  }) => {
    socketRef.current?.emit('canvas:node-update', { ...payload, projectId });
  }, [projectId]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    socketRef.current?.emit('canvas:node-delete', { projectId, nodeId });
  }, [projectId]);

  const createEdge = useCallback((payload: {
    sourceNodeId: string; targetNodeId: string;
    sourceHandle?: string; targetHandle?: string;
  }) => {
    socketRef.current?.emit('canvas:edge-add', { ...payload, projectId });
  }, [projectId]);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    socketRef.current?.emit('canvas:edge-delete', { projectId, edgeId });
  }, [projectId]);

  return { nodes, edges, remoteUsers, cursors, emitCursorMove, createNode, updateNode, deleteNode, createEdge, deleteEdge };
}
