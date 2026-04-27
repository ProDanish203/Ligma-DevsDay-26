import { UserAccessLevel } from '@db';
import { PaginationInfo } from 'src/common/types/type';
import { ProjectSelect } from '../queries';

export type ProjectWithMyAccess = ProjectSelect & {
  myAccess: 'OWNER' | UserAccessLevel;
};

export interface GetAllProjectResponse {
  projects: ProjectWithMyAccess[];
  pagination: PaginationInfo;
}

export interface ProjectMemberRow {
  userAccessId: string;
  userId: string;
  name: string;
  email: string;
  accessLevel: UserAccessLevel;
}

export interface ProjectOwnerSummary {
  id: string;
  name: string;
  email: string;
}

export interface GetProjectMembersResponse {
  owner: ProjectOwnerSummary;
  members: ProjectMemberRow[];
}

export interface DashboardRecentProject {
  id: string;
  name: string;
  updatedAt: Date;
  collaborators: string[];
}

export interface DashboardStatsResponse {
  totalProjects: number;
  totalMembers: number;
  sharedWithMe: number;
  thisMonth: number;
  recentProjects: DashboardRecentProject[];
}
