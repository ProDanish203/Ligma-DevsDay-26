import { z } from 'zod';

export const canvasNodeDataSchema = z.object({
  label: z.string(),
  color: z.string(),
  shape: z.enum(['rect', 'circle']).optional(),
});

export type CanvasNodeDataSchema = z.infer<typeof canvasNodeDataSchema>;

export const canvasNodeSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  type: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number(),
  height: z.number(),
  data: canvasNodeDataSchema,
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CanvasNodeSchema = z.infer<typeof canvasNodeSchema>;

export const canvasEdgeSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  color: z.string(),
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CanvasEdgeSchema = z.infer<typeof canvasEdgeSchema>;
