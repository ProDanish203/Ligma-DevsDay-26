import { LoginProvider, UserRole } from '@/lib/enums';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  loginProvider: z.nativeEnum(LoginProvider),
  hasNotifications: z.boolean(),
  isEmailVerified: z.boolean(),
  lastLoginAt: z.date().optional(),
  lastActiveAt: z.date().optional(),
  deletedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type UserSchema = z.infer<typeof userSchema>;

const minimalUserSchema = userSchema.pick({
  id: true,
  name: true,
  email: true,
  role: true,
});

type MinimalUserSchema = z.infer<typeof minimalUserSchema>;

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
});

type UpdateUserSchema = z.infer<typeof updateUserSchema>;

export {
  userSchema,
  type UserSchema,
  minimalUserSchema,
  type MinimalUserSchema,
  updateUserSchema,
  type UpdateUserSchema,
};
