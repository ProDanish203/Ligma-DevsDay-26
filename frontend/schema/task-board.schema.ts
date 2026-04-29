import { z } from 'zod';

const taskCreatedBySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  canvasNodeId: z.string().uuid(),
  createdById: z.string().uuid(),
  createdBy: taskCreatedBySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

type TaskSchema = z.infer<typeof taskSchema>;

const taskBoardSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  tasks: z.array(taskSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type TaskBoardSchema = z.infer<typeof taskBoardSchema>;

const updateTaskSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255, 'Title is too long').optional(),
    description: z.string().max(2000, 'Description is too long').optional(),
  })
  .refine((d) => d.title !== undefined || d.description !== undefined, {
    message: 'At least one field is required',
    path: ['title'],
  });

type UpdateTaskSchema = z.infer<typeof updateTaskSchema>;

export {
  taskSchema,
  type TaskSchema,
  taskBoardSchema,
  type TaskBoardSchema,
  updateTaskSchema,
  type UpdateTaskSchema,
};
