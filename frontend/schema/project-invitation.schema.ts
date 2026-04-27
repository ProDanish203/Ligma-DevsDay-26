import { InvitationStatus, ProjectVisibility, UserAccessLevel } from '@/lib/enums';
import { paginationSchema } from '@/schema/common.schema';
import { z } from 'zod';

const inviteUserSchema = z.object({
  email: z.string().min(1, { message: 'Email is required' }).email({ message: 'Invalid email' }),
  projectId: z.string().min(1, { message: 'Project id is required' }).uuid({ message: 'Invalid project id' }),
  accessLevel: z.nativeEnum(UserAccessLevel, { message: 'Invalid access scope' }),
});

type InviteUserSchema = z.infer<typeof inviteUserSchema>;

const updateInviteStatusSchema = z.object({
  status: z.enum([InvitationStatus.ACCEPTED, InvitationStatus.REJECTED], {
    message: 'Status must be ACCEPTED or REJECTED',
  }),
});

type UpdateInviteStatusSchema = z.infer<typeof updateInviteStatusSchema>;

const projectSummaryInInvitationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  userId: z.string().uuid(),
  visibility: z.nativeEnum(ProjectVisibility),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const projectInvitationSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  status: z.nativeEnum(InvitationStatus),
  projectId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  project: projectSummaryInInvitationSchema,
});

type ProjectInvitationSchema = z.infer<typeof projectInvitationSchema>;

const getAllProjectInvitationsDataSchema = z.object({
  invitations: z.array(projectInvitationSchema),
  pagination: paginationSchema,
});

type GetAllProjectInvitationsDataSchema = z.infer<typeof getAllProjectInvitationsDataSchema>;

export {
  inviteUserSchema,
  type InviteUserSchema,
  updateInviteStatusSchema,
  type UpdateInviteStatusSchema,
  projectInvitationSchema,
  type ProjectInvitationSchema,
  getAllProjectInvitationsDataSchema,
  type GetAllProjectInvitationsDataSchema,
};
