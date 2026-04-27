import { Prisma } from '@db';

export const logSelect = {
  id: true,
  level: true,
  action: true,
  message: true,
  entityId: true,
  entityType: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  actorUser: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  targetUser: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.LogSelect;

export type LogSelect = Prisma.LogGetPayload<{
  select: typeof logSelect;
}>;
