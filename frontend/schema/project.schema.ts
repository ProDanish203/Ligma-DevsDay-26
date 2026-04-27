import { ProjectVisibility } from '@/lib/enums';
import { paginationSchema } from '@/schema/common.schema';
import { z } from 'zod';

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

const getAllProjectsDataSchema = z.object({
  projects: z.array(projectSchema),
  pagination: paginationSchema,
});

type GetAllProjectsDataSchema = z.infer<typeof getAllProjectsDataSchema>;

export {
  createProjectSchema,
  type CreateProjectSchema,
  updateProjectSchema,
  type UpdateProjectSchema,
  projectSchema,
  type ProjectSchema,
  getAllProjectsDataSchema,
  type GetAllProjectsDataSchema,
};
