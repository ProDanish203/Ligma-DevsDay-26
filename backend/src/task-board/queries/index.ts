import { Prisma } from '@db';

export const taskSelect = {
  id: true,
  title: true,
  description: true,
  canvasNodeId: true,
  createdById: true,
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

export type TaskSelect = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export const taskBoardSelect = {
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  tasks: {
    where: { deletedAt: null },
    select: taskSelect,
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.TaskBoardSelect;

export type TaskBoardSelect = Prisma.TaskBoardGetPayload<{ select: typeof taskBoardSelect }>;