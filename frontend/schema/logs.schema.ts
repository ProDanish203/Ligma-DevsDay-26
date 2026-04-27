import { LogEntityType, LogLevel, UserRole } from '@/lib/enums';
import { paginationSchema } from '@/schema/common.schema';
import { z } from 'zod';

const logUserSnippetSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(UserRole),
});

type LogUserSnippetSchema = z.infer<typeof logUserSnippetSchema>;

const logSchema = z.object({
  id: z.string().uuid(),
  level: z.nativeEnum(LogLevel),
  action: z.string(),
  message: z.string(),
  entityId: z.string().uuid(),
  entityType: z.nativeEnum(LogEntityType),
  metadata: z.unknown().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  actorUser: logUserSnippetSchema.nullable().optional(),
  targetUser: logUserSnippetSchema.nullable().optional(),
});

type LogSchema = z.infer<typeof logSchema>;

const getAllEntityLogsDataSchema = z.object({
  logs: z.array(logSchema),
  pagination: paginationSchema,
});

type GetAllEntityLogsDataSchema = z.infer<typeof getAllEntityLogsDataSchema>;

export {
  logUserSnippetSchema,
  type LogUserSnippetSchema,
  logSchema,
  type LogSchema,
  getAllEntityLogsDataSchema,
  type GetAllEntityLogsDataSchema,
};
