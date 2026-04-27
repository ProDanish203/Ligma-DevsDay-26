import { UserAccessLevel } from '@/lib/enums';
import type { ProjectMyAccessSchema } from '@/schema/project.schema';

export function canManageProjectAccess(myAccess: ProjectMyAccessSchema): boolean {
  return myAccess === 'OWNER' || myAccess === UserAccessLevel.LEAD;
}

export function canEditProjectDetails(myAccess: ProjectMyAccessSchema): boolean {
  return canManageProjectAccess(myAccess);
}

export function isProjectOwner(myAccess: ProjectMyAccessSchema): boolean {
  return myAccess === 'OWNER';
}

export function canChangeMemberRole(myAccess: ProjectMyAccessSchema, memberAccessLevel: UserAccessLevel): boolean {
  if (!canManageProjectAccess(myAccess)) return false;
  if (myAccess === 'OWNER') return true;
  return memberAccessLevel !== UserAccessLevel.LEAD;
}

export function accessLevelOptionsForInvite(isOwner: boolean): UserAccessLevel[] {
  const base = [UserAccessLevel.VIEWER, UserAccessLevel.COMMENTATOR, UserAccessLevel.EDITOR, UserAccessLevel.LEAD];
  if (isOwner) return base;
  return base.filter((l) => l !== UserAccessLevel.LEAD);
}

export function accessLevelOptionsForMemberSelect(isOwner: boolean): UserAccessLevel[] {
  return accessLevelOptionsForInvite(isOwner);
}
