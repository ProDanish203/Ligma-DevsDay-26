import z from 'zod';

export const querySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
  sort: z.string().optional(),
  filter: z.string().optional(),
  search: z.string().optional(),
});

export type QuerySchema = z.infer<typeof querySchema>;

export const paginationSchema = z.object({
  totalCount: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type PaginationSchema = z.infer<typeof paginationSchema>;
