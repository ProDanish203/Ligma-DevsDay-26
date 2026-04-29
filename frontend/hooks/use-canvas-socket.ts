'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { TOKEN_KEY } from '@/lib/constants';
import { UserAccessLevel } from '@/lib/enums';
import type { CanvasNodeSchema, CanvasEdgeSchema, NodeAccessEntrySchema } from '@/schema/canvas.schema';
import type { LogSchema } from '@/schema/logs.schema';

export interface RemoteUser {
  id: string;
  name: string;
  email: string;
}

export type CanvasConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export type MyProjectAccess = 'OWNER' | UserAccessLevel | null;

function sortLogsNewestFirst(logs: LogSchema[]): LogSchema[] {
  return [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function useCanvasSocket({ projectId, user }: { projectId: string; user: RemoteUser | null }) {
  const [nodes, setNodes] = useState<CanvasNodeSchema[]>([]);
  const [edges, setEdges] = useState<CanvasEdgeSchema[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [status, setStatus] = useState<CanvasConnectionStatus>('connecting');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [nodeAccesses, setNodeAccesses] = useState<Record<string, NodeAccessEntrySchema[]>>({});
  const [myProjectAccess, setMyProjectAccess] = useState<MyProjectAccess>(null);
  const [recentLogs, setRecentLogs] = useState<LogSchema[]>([]);
  const [aiClassifyingNodeIds, setAiClassifyingNodeIds] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);
  const lastEmitRef = useRef<number>(0);

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

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000';
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

    socket.on('canvas:state', ({
      nodes: n,
      edges: e,
      users,
      nodeAccesses: na,
      myProjectAccess: mpa,
    }: {
      nodes: CanvasNodeSchema[];
      edges: CanvasEdgeSchema[];
      users: RemoteUser[];
      nodeAccesses?: Record<string, NodeAccessEntrySchema[]>;
      myProjectAccess?: MyProjectAccess;
    }) => {
      if (!alive) return;
      const currentUser = userRef.current;
      setNodes(n);
      setEdges(e);
      setRemoteUsers(users.filter((u) => u.id !== currentUser?.id));
      setNodeAccesses(na ?? {});
      setMyProjectAccess(mpa ?? null);
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
      setNodeAccesses((prev) => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
    });

    socket.on('canvas:edge-added', (edge: CanvasEdgeSchema) => {
      if (!alive) return;
      setEdges((prev) => (prev.find((e) => e.id === edge.id) ? prev : [...prev, edge]));
    });

    socket.on('canvas:edge-deleted', ({ edgeId }: { edgeId: string }) => {
      if (!alive) return;
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    });

    socket.on('canvas:node-access-updated', ({ nodeId, accesses }: { nodeId: string; accesses: NodeAccessEntrySchema[] }) => {
      if (!alive) return;
      setNodeAccesses((prev) => ({ ...prev, [nodeId]: accesses }));
    });

    socket.on('canvas:log-added', (log: LogSchema) => {
      if (!alive) return;
      setRecentLogs((prev) => sortLogsNewestFirst([log, ...prev]).slice(0, 200));
    });

    socket.on('canvas:ai-classifying', ({ nodeId }: { nodeId: string }) => {
      if (!alive) return;
      setAiClassifyingNodeIds((prev) => new Set(prev).add(nodeId));
    });

    socket.on('canvas:ai-task-created', ({ nodeId }: { nodeId: string }) => {
      if (!alive) return;
      setAiClassifyingNodeIds((prev) => { const s = new Set(prev); s.delete(nodeId); return s; });
      toast.success('Task created from sticky note');
    });

    socket.on('canvas:ai-done', ({ nodeId }: { nodeId: string }) => {
      if (!alive) return;
      setAiClassifyingNodeIds((prev) => { const s = new Set(prev); s.delete(nodeId); return s; });
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

  const emitCursorMove = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastEmitRef.current < 33) return;
      lastEmitRef.current = now;
      socketRef.current?.emit('canvas:cursor-move', { projectId, x, y });
    },
    [projectId],
  );

  const createNode = useCallback(
    (payload: {
      type: string;
      positionX: number;
      positionY: number;
      width: number;
      height: number;
      data: { label: string; color: string; shape?: 'rect' | 'circle' };
    }) => {
      socketRef.current?.emit('canvas:node-add', { ...payload, projectId });
    },
    [projectId],
  );

  const updateNode = useCallback(
    (payload: {
      nodeId: string;
      positionX?: number;
      positionY?: number;
      width?: number;
      height?: number;
      data?: Partial<{ label: string; color: string; shape?: 'rect' | 'circle' }>;
    }) => {
      socketRef.current?.emit('canvas:node-update', { ...payload, projectId });
    },
    [projectId],
  );

  const deleteNode = useCallback((nodeId: string) => {
    // No optimistic removal — let canvas:node-deleted broadcast drive the UI
    // so we can cleanly revert if the server denies the operation (RBAC).
    socketRef.current?.emit('canvas:node-delete', { projectId, nodeId });
  }, [projectId]);

  const createEdge = useCallback(
    (payload: { sourceNodeId: string; targetNodeId: string; sourceHandle?: string; targetHandle?: string }) => {
      socketRef.current?.emit('canvas:edge-add', { ...payload, projectId });
    },
    [projectId],
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
      socketRef.current?.emit('canvas:edge-delete', { projectId, edgeId });
    },
    [projectId],
  );

  const grantNodeAccess = useCallback((nodeId: string, targetUserId: string, accessLevel: UserAccessLevel) => {
    socketRef.current?.emit('canvas:node-access-grant', { projectId, nodeId, userId: targetUserId, accessLevel });
  }, [projectId]);

  const revokeNodeAccess = useCallback((nodeId: string, accessId: string) => {
    socketRef.current?.emit('canvas:node-access-revoke', { projectId, nodeId, accessId });
  }, [projectId]);

  // Compute whether the current user can edit a given node
  const canEditNode = useCallback((nodeId: string, createdById: string): boolean => {
    if (!userId) return false;
    if (myProjectAccess === 'OWNER' || myProjectAccess === UserAccessLevel.LEAD) return true;
    if (userId === createdById) return true;

    const acl = nodeAccesses[nodeId] ?? [];
    if (acl.length === 0) {
      return myProjectAccess === UserAccessLevel.EDITOR;
    }
    const myEntry = acl.find((e) => e.userId === userId);
    if (!myEntry) return false;
    return myEntry.accessLevel === UserAccessLevel.EDITOR || myEntry.accessLevel === UserAccessLevel.LEAD;
  }, [userId, myProjectAccess, nodeAccesses]);

  const canViewNode = useCallback((nodeId: string, createdById: string): boolean => {
    if (!userId) return false;
    if (myProjectAccess === 'OWNER' || myProjectAccess === UserAccessLevel.LEAD) return true;
    if (userId === createdById) return true;

    const acl = nodeAccesses[nodeId] ?? [];
    if (acl.length === 0) {
      return myProjectAccess !== null;
    }

    const myEntry = acl.find((e) => e.userId === userId);
    if (!myEntry) return false;
    // Node ACL is explicit. Any listed role can view.
    return true;
  }, [userId, myProjectAccess, nodeAccesses]);

  const canManageNodeAccess = useCallback((nodeId: string, createdById: string): boolean => {
    if (!userId) return false;
    if (myProjectAccess === 'OWNER' || myProjectAccess === UserAccessLevel.LEAD) return true;
    if (userId === createdById) return true;
    const acl = nodeAccesses[nodeId] ?? [];
    const myEntry = acl.find((e) => e.userId === userId);
    return myEntry?.accessLevel === UserAccessLevel.LEAD;
  }, [userId, myProjectAccess, nodeAccesses]);

  return {
    nodes, edges, remoteUsers, cursors,
    status, initialLoadDone,
    nodeAccesses, myProjectAccess, recentLogs, aiClassifyingNodeIds,
    emitCursorMove, createNode, updateNode, deleteNode, createEdge, deleteEdge,
    grantNodeAccess, revokeNodeAccess, canViewNode, canEditNode, canManageNodeAccess,
  };
}
