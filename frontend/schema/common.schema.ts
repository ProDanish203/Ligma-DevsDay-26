import z from 'zod';

export const paginationSchema = z.object({
  totalCount: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type PaginationSchema = z.infer<typeof paginationSchema>;

export const apiListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  sort: z.string().optional(),
  filter: z.string().optional(),
  search: z.string().optional(),
});

export type ApiListQuerySchema = z.infer<typeof apiListQuerySchema>;
