import { Prisma } from '@db';

export const userSelect = {
  id: true,
  email: true,
  role: true,
  name: true,
  loginProvider: true,
  hasNotifications: true,
  isEmailVerified: true,
  lastLoginAt: true,
  lastActiveAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserSelect = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

export const minimalUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
} satisfies Prisma.UserSelect;

export type MinimalUserSelect = Prisma.UserGetPayload<{
  select: typeof minimalUserSelect;
}>;
