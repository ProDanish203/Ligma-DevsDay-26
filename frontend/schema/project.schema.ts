import { ProjectVisibility, UserAccessLevel } from '@/lib/enums';
import { paginationSchema } from '@/schema/common.schema';
import { z } from 'zod';

const projectMyAccessSchema = z.union([z.literal('OWNER'), z.nativeEnum(UserAccessLevel)]);

type ProjectMyAccessSchema = z.infer<typeof projectMyAccessSchema>;

const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Project name is required' })
    .min(2, { message: 'Project name must be at least 2 characters long' })
    .max(120, { message: 'Project name must be at most 120 characters long' }),
  description: z.string().max(500, { message: 'Project description must be at most 500 characters long' }).optional(),
});

type CreateProjectSchema = z.infer<typeof createProjectSchema>;

const updateProjectSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: 'Project name must be at least 2 characters long' })
      .max(120, { message: 'Project name must be at most 120 characters long' })
      .optional(),
    description: z.string().max(500, { message: 'Project description must be at most 500 characters long' }).optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'At least one field is required to update the project',
    path: ['name'],
  });

type UpdateProjectSchema = z.infer<typeof updateProjectSchema>;

const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  userId: z.string().uuid(),
  visibility: z.nativeEnum(ProjectVisibility),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

type ProjectSchema = z.infer<typeof projectSchema>;

const projectWithMyAccessSchema = projectSchema.extend({
  myAccess: projectMyAccessSchema,
});

type ProjectWithMyAccessSchema = z.infer<typeof projectWithMyAccessSchema>;

const getAllProjectsDataSchema = z.object({
  projects: z.array(projectWithMyAccessSchema),
  pagination: paginationSchema,
});

type GetAllProjectsDataSchema = z.infer<typeof getAllProjectsDataSchema>;

const projectOwnerSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

const projectMemberRowSchema = z.object({
  userAccessId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  accessLevel: z.nativeEnum(UserAccessLevel),
});

const getProjectMembersDataSchema = z.object({
  owner: projectOwnerSummarySchema,
  members: z.array(projectMemberRowSchema),
});

type GetProjectMembersDataSchema = z.infer<typeof getProjectMembersDataSchema>;

const updateProjectMemberSchema = z.object({
  accessLevel: z.nativeEnum(UserAccessLevel),
});

type UpdateProjectMemberSchema = z.infer<typeof updateProjectMemberSchema>;

export {
  createProjectSchema,
  type CreateProjectSchema,
  updateProjectSchema,
  type UpdateProjectSchema,
  projectSchema,
  type ProjectSchema,
  projectMyAccessSchema,
  type ProjectMyAccessSchema,
  projectWithMyAccessSchema,
  type ProjectWithMyAccessSchema,
  getAllProjectsDataSchema,
  type GetAllProjectsDataSchema,
  getProjectMembersDataSchema,
  type GetProjectMembersDataSchema,
  updateProjectMemberSchema,
  type UpdateProjectMemberSchema,
};
