import { Prisma } from '@db';

export const projectInvitationSelect = {
  id: true,
  email: true,
  status: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      name: true,
      description: true,
      userId: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ProjectInvitationSelect;

export type ProjectInvitationSelect = Prisma.ProjectInvitationGetPayload<{
  select: typeof projectInvitationSelect;
}>;
