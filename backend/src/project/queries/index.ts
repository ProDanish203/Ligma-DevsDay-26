import { Prisma } from '@db';

export const projectSelect = {
  id: true,
  name: true,
  description: true,
  userId: true,
  visibility: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

export type ProjectSelect = Prisma.ProjectGetPayload<{
  select: typeof projectSelect;
}>;
