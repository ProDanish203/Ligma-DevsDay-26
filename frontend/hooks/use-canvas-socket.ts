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

export type CanvasConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export function useCanvasSocket({ projectId, user }: { projectId: string; user: RemoteUser | null }) {
  const [nodes, setNodes] = useState<CanvasNodeSchema[]>([]);
  const [edges, setEdges] = useState<CanvasEdgeSchema[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [status, setStatus] = useState<CanvasConnectionStatus>('connecting');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const lastEmitRef = useRef<number>(0);
  const lastMoveEmitRef = useRef<number>(0);

  // Keep a ref to the user so the effect only depends on user.id (a stable string),
  // not the user object reference. This prevents socket teardown on parent re-renders.
  const userRef = useRef(user);
  userRef.current = user;

  // Derive a stable primitive for the dependency array
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setStatus('error');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';
    let alive = true;

    // Reset state for fresh connection
    setStatus('connecting');
    setInitialLoadDone(false);

    const socket = io(`${socketUrl}/canvas`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // ── Connection lifecycle ──────────────────────────────────────────

    socket.on('canvas:authenticated', () => {
      if (!alive) return;
      setStatus('connected');
      socket.emit('canvas:join', { projectId });
    });

    socket.on('disconnect', (reason) => {
      if (!alive) return;
      if (reason === 'io server disconnect') {
        setStatus('error');
      } else {
        setStatus('reconnecting');
      }
    });

    socket.io.on('reconnect_attempt', () => {
      if (!alive) return;
      setStatus('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      if (!alive) return;
      setStatus('error');
    });

    socket.on('connect_error', () => {
      if (!alive) return;
      setStatus('error');
    });

    // ── Canvas data events ────────────────────────────────────────────

    socket.on('canvas:state', ({ nodes: n, edges: e, users }: { nodes: CanvasNodeSchema[]; edges: CanvasEdgeSchema[]; users: RemoteUser[] }) => {
      if (!alive) return;
      const currentUser = userRef.current;
      setNodes(n);
      setEdges(e);
      setRemoteUsers(users.filter((u) => u.id !== currentUser?.id));
      setInitialLoadDone(true);
    });

    socket.on('canvas:user-joined', ({ users }: { users: RemoteUser[] }) => {
      if (!alive) return;
      const currentUser = userRef.current;
      setRemoteUsers(users.filter((u) => u.id !== currentUser?.id));
    });

    socket.on('canvas:user-left', ({ userId: leftUserId, users }: { userId: string; users: RemoteUser[] }) => {
      if (!alive) return;
      const currentUser = userRef.current;
      setRemoteUsers(users.filter((u) => u.id !== currentUser?.id));
      setCursors((prev) => {
        const m = new Map(prev);
        m.delete(leftUserId);
        return m;
      });
    });

    socket.on('canvas:cursor-moved', ({ userId: cursorUserId, x, y }: { userId: string; x: number; y: number }) => {
      if (!alive) return;
      setCursors((prev) => new Map(prev).set(cursorUserId, { x, y }));
    });

    socket.on('canvas:node-added', (node: CanvasNodeSchema) => {
      if (!alive) return;
      setNodes((prev) => (prev.find((n) => n.id === node.id) ? prev : [...prev, node]));
    });

    socket.on('canvas:node-updated', (updated: CanvasNodeSchema) => {
      if (!alive) return;
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    });

    socket.on('canvas:node-deleted', ({ nodeId }: { nodeId: string }) => {
      if (!alive) return;
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    });

    socket.on('canvas:node-moved', ({ nodeId, positionX, positionY }: { nodeId: string; positionX: number; positionY: number }) => {
      if (!alive) return;
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, positionX, positionY } : n)));
    });

    socket.on('canvas:edge-added', (edge: CanvasEdgeSchema) => {
      if (!alive) return;
      setEdges((prev) => (prev.find((e) => e.id === edge.id) ? prev : [...prev, edge]));
    });

    socket.on('canvas:edge-deleted', ({ edgeId }: { edgeId: string }) => {
      if (!alive) return;
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    });

    return () => {
      alive = false;
      socket.emit('canvas:leave', { projectId });
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      // NOTE: Do NOT reset initialLoadDone or status here.
      // Resetting them causes the CanvasInner to unmount (showing the loader)
      // and then immediately remount when the new socket reconnects — that's the "flash".
      // The next effect run will set them fresh via setStatus('connecting') above.
    };
  }, [projectId, userId]);

  const emitCursorMove = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastEmitRef.current < 33) return;
    lastEmitRef.current = now;
    socketRef.current?.emit('canvas:cursor-move', { projectId, x, y });
  }, [projectId]);

  const createNode = useCallback((payload: {
    type: string; positionX: number; positionY: number;
    width: number; height: number; data: { label: string; color: string; shape?: 'rect' | 'circle'; points?: number[]; fontSize?: number };
  }) => {
    socketRef.current?.emit('canvas:node-add', { ...payload, projectId });
  }, [projectId]);

  const updateNode = useCallback((payload: {
    nodeId: string; positionX?: number; positionY?: number;
    width?: number; height?: number; data?: Partial<{ label: string; color: string; shape?: 'rect' | 'circle'; points?: number[]; fontSize?: number }>;
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

  const emitNodeMove = useCallback((nodeId: string, positionX: number, positionY: number) => {
    const now = Date.now();
    if (now - lastMoveEmitRef.current < 33) return; // ~30fps throttle
    lastMoveEmitRef.current = now;
    socketRef.current?.emit('canvas:node-move', { projectId, nodeId, positionX, positionY });
  }, [projectId]);

  return {
    nodes, edges, remoteUsers, cursors,
    status, initialLoadDone,
    emitCursorMove, emitNodeMove, createNode, updateNode, deleteNode, createEdge, deleteEdge,
  };
}
