import { Prisma } from '@db';

export const nodeAccessSelect = {
  id: true,
  userId: true,
  entityId: true,
  accessLevel: true,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.UserAccessSelect;

export type NodeAccessSelect = Prisma.UserAccessGetPayload<{
  select: typeof nodeAccessSelect;
}>;

export const canvasNodeSelect = {
  id: true,
  projectId: true,
  type: true,
  positionX: true,
  positionY: true,
  width: true,
  height: true,
  data: true,
  intent: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CanvasNodeSelect;

export type CanvasNodeSelect = Prisma.CanvasNodeGetPayload<{
  select: typeof canvasNodeSelect;
}>;

export const canvasEdgeSelect = {
  id: true,
  projectId: true,
  sourceNodeId: true,
  targetNodeId: true,
  sourceHandle: true,
  targetHandle: true,
  label: true,
  color: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CanvasEdgeSelect;

export type CanvasEdgeSelect = Prisma.CanvasEdgeGetPayload<{
  select: typeof canvasEdgeSelect;
}>;
