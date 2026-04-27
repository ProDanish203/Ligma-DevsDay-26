import { HttpStatus, Injectable } from '@nestjs/common';
import { LogEntityType, Prisma, User, UserAccessLevel, UserAccessType } from '@db';
import { PrismaService } from '../common/services/prisma.service';
import { ApiResponse, QueryParams } from '../common/types/type';
import { throwError } from '../common/utils/helpers';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { ProjectSelect, projectSelect } from './queries';
import { DashboardStatsResponse, GetAllProjectResponse, GetProjectMembersResponse, ProjectWithMyAccess } from './types';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  private async isProjectOwner(userId: string, projectId: string): Promise<boolean> {
    const project = await this.prismaService.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { userId: true },
    });
    return project?.userId === userId;
  }

  private async isProjectLead(userId: string, projectId: string): Promise<boolean> {
    const access = await this.prismaService.userAccess.findFirst({
      where: {
        userId,
        entityId: projectId,
        entityType: UserAccessType.PROJECT,
        deletedAt: null,
        accessLevel: UserAccessLevel.LEAD,
      },
      select: { id: true },
    });
    return !!access;
  }

  async userCanManageProject(user: User, projectId: string): Promise<boolean> {
    return (await this.isProjectOwner(user.id, projectId)) || (await this.isProjectLead(user.id, projectId));
  }

  async userCanViewProject(user: User, projectId: string): Promise<boolean> {
    if (await this.isProjectOwner(user.id, projectId)) return true;
    const access = await this.prismaService.userAccess.findFirst({
      where: {
        userId: user.id,
        entityId: projectId,
        entityType: UserAccessType.PROJECT,
        deletedAt: null,
      },
      select: { id: true },
    });
    return !!access;
  }

  private async accessibleSharedProjectIds(userId: string): Promise<string[]> {
    const rows = await this.prismaService.userAccess.findMany({
      where: { userId, entityType: UserAccessType.PROJECT, deletedAt: null },
      select: { entityId: true },
    });
    return rows.map((r) => r.entityId);
  }

  async createProject(user: User, dto: CreateProjectDto): Promise<ApiResponse<ProjectSelect>> {
    try {
      const existingProject = await this.prismaService.project.findFirst({
        where: {
          userId: user.id,
          name: dto.name,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existingProject) throw throwError('Project with this name already exists', HttpStatus.BAD_REQUEST);

      const project = await this.prismaService.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          userId: user.id,
        },
        select: projectSelect,
      });

      if (!project) throw throwError('Failed to create project', HttpStatus.INTERNAL_SERVER_ERROR);

      this.logsService.createLog({
        action: 'PROJECT_CREATED',
        message: `Project "${project.name}" was created`,
        entityType: LogEntityType.PROJECT,
        entityId: project.id,
        actorUserId: user.id,
        metadata: {
          projectId: project.id,
          projectName: project.name,
        },
      });

      return {
        message: 'Project created successfully',
        success: true,
        data: project,
      };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to create project', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProject(user: User, projectId: string, dto: UpdateProjectDto): Promise<ApiResponse<ProjectSelect>> {
    try {
      const existingProject = await this.prismaService.project.findFirst({
        where: {
          id: projectId,
          deletedAt: null,
        },
        select: { id: true, userId: true },
      });

      if (!existingProject) throw throwError('Project not found', HttpStatus.NOT_FOUND);
      if (!(await this.userCanManageProject(user, projectId))) {
        throw throwError('Only the project owner or a lead can update this project', HttpStatus.FORBIDDEN);
      }

      if (!dto.name && dto.description === undefined) {
        throw throwError('At least one field is required to update project', HttpStatus.BAD_REQUEST);
      }

      if (dto.name) {
        const duplicateNameProject = await this.prismaService.project.findFirst({
          where: {
            id: { not: projectId },
            userId: existingProject.userId,
            name: dto.name,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (duplicateNameProject) throw throwError('Project with this name already exists', HttpStatus.BAD_REQUEST);
      }
      if (!(await this.userCanManageProject(user, projectId))) {
        throw throwError('Only the project owner or a lead can update this project', HttpStatus.FORBIDDEN);
      }
      const project = await this.prismaService.project.update({
        where: { id: projectId },
        data: {
          name: dto.name,
          description: dto.description,
        },
        select: projectSelect,
      });

      if (!project) throw throwError('Failed to update project', HttpStatus.INTERNAL_SERVER_ERROR);

      this.logsService.createLog({
        action: 'PROJECT_UPDATED',
        message: `Project "${project.name}" was updated`,
        entityType: LogEntityType.PROJECT,
        entityId: project.id,
        actorUserId: user.id,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          updatedFields: {
            name: dto.name !== undefined,
            description: dto.description !== undefined,
          },
        },
      });

      return {
        message: 'Project updated successfully',
        success: true,
        data: project,
      };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to update project', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAllProjects(user: User, query?: QueryParams): Promise<ApiResponse<GetAllProjectResponse>> {
    try {
      const { page = 1, limit = 20, search = '', filter = '', sort = '' } = query || {};

      const sharedIds = await this.accessibleSharedProjectIds(user.id);
      const orClause: Prisma.ProjectWhereInput[] = [{ userId: user.id }];
      if (sharedIds.length) {
        orClause.push({ id: { in: sharedIds } });
      }

      const where: Prisma.ProjectWhereInput = {
        deletedAt: null,
        OR: orClause,
      };
      const orderBy: Prisma.ProjectOrderByWithRelationInput = {};

      if (search) {
        where.AND = [
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      if (filter) orderBy[filter] = 'asc';
      if (sort) orderBy[sort] = 'desc';

      const [projects, totalCount] = await Promise.all([
        this.prismaService.project.findMany({
          where,
          orderBy,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          select: projectSelect,
        }),
        this.prismaService.project.count({ where }),
      ]);

      const accessRows = await this.prismaService.userAccess.findMany({
        where: {
          userId: user.id,
          entityType: UserAccessType.PROJECT,
          deletedAt: null,
          entityId: { in: projects.map((p) => p.id) },
        },
        select: { entityId: true, accessLevel: true },
      });
      const accessByProject = new Map(accessRows.map((r) => [r.entityId, r.accessLevel]));

      const projectsWithAccess: ProjectWithMyAccess[] = projects.map((p) => ({
        ...p,
        myAccess: p.userId === user.id ? 'OWNER' : (accessByProject.get(p.id) as UserAccessLevel),
      }));

      const totalPages = Math.ceil(totalCount / Number(limit));

      return {
        message: 'Projects retrieved successfully',
        success: true,
        data: {
          projects: projectsWithAccess,
          pagination: {
            totalCount,
            totalPages,
            page: Number(page),
            limit: Number(limit),
            hasNextPage: Number(page) < totalPages,
            hasPrevPage: Number(page) > 1,
          },
        },
      };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to retrieve projects', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getProjectById(
    user: User,
    projectId: string,
  ): Promise<ApiResponse<ProjectSelect & { myAccess: 'OWNER' | UserAccessLevel }>> {
    try {
      const project = await this.prismaService.project.findFirst({
        where: {
          id: projectId,
          deletedAt: null,
        },
        select: projectSelect,
      });

      if (!project) throw throwError('Project not found', HttpStatus.NOT_FOUND);
      if (!(await this.userCanViewProject(user, projectId))) {
        throw throwError('Project not found', HttpStatus.NOT_FOUND);
      }

      let myAccess: 'OWNER' | UserAccessLevel;
      if (project.userId === user.id) {
        myAccess = 'OWNER';
      } else {
        const accessRow = await this.prismaService.userAccess.findFirst({
          where: {
            userId: user.id,
            entityId: projectId,
            entityType: UserAccessType.PROJECT,
            deletedAt: null,
          },
          select: { accessLevel: true },
        });
        if (!accessRow) throw throwError('Project not found', HttpStatus.NOT_FOUND);
        myAccess = accessRow.accessLevel;
      }

      return {
        message: 'Project retrieved successfully',
        success: true,
        data: { ...project, myAccess },
      };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to retrieve project', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteProject(user: User, projectId: string): Promise<ApiResponse<void>> {
    try {
      const project = await this.prismaService.project.findFirst({
        where: {
          id: projectId,
          userId: user.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!project) throw throwError('Project not found', HttpStatus.NOT_FOUND);

      await this.prismaService.project.update({
        where: { id: projectId },
        data: { deletedAt: new Date() },
      });

      this.logsService.createLog({
        action: 'PROJECT_DELETED',
        message: 'Project was deleted',
        entityType: LogEntityType.PROJECT,
        entityId: projectId,
        actorUserId: user.id,
        metadata: {
          projectId,
        },
      });

      return {
        message: 'Project deleted successfully',
        success: true,
      };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to delete project', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getProjectMembers(user: User, projectId: string): Promise<ApiResponse<GetProjectMembersResponse>> {
    try {
      if (!(await this.userCanViewProject(user, projectId))) {
        throw throwError('Project not found', HttpStatus.NOT_FOUND);
      }

      const project = await this.prismaService.project.findFirst({
        where: { id: projectId, deletedAt: null },
        select: {
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!project) throw throwError('Project not found', HttpStatus.NOT_FOUND);

      const memberRows = await this.prismaService.userAccess.findMany({
        where: {
          entityId: projectId,
          entityType: UserAccessType.PROJECT,
          deletedAt: null,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      const members = memberRows.map((row) => ({
        userAccessId: row.id,
        userId: row.user.id,
        name: row.user.name,
        email: row.user.email,
        accessLevel: row.accessLevel,
      }));

      return {
        message: 'Project members retrieved successfully',
        success: true,
        data: {
          owner: {
            id: project.user.id,
            name: project.user.name,
            email: project.user.email,
          },
          members,
        },
      };
    } catch (err: any) {
      throw throwError(
        err.message || 'Failed to retrieve project members',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDashboardStats(user: User): Promise<ApiResponse<DashboardStatsResponse>> {
    try {
      const sharedIds = await this.accessibleSharedProjectIds(user.id);
      const orClause: Prisma.ProjectWhereInput[] = [{ userId: user.id }];
      if (sharedIds.length) {
        orClause.push({ id: { in: sharedIds } });
      }
      const where: Prisma.ProjectWhereInput = { deletedAt: null, OR: orClause };

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalProjects, thisMonth, allProjectIds, recentProjects] = await Promise.all([
        this.prismaService.project.count({ where }),
        this.prismaService.project.count({ where: { ...where, createdAt: { gte: startOfMonth } } }),
        this.prismaService.project.findMany({ where, select: { id: true } }).then((rows) => rows.map((r) => r.id)),
        this.prismaService.project.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: 4,
          select: { id: true, name: true, updatedAt: true },
        }),
      ]);

      const [uniqueMembers, memberRows] = await Promise.all([
        this.prismaService.userAccess.groupBy({
          by: ['userId'],
          where: { entityId: { in: allProjectIds }, entityType: UserAccessType.PROJECT, deletedAt: null },
        }),
        this.prismaService.userAccess.findMany({
          where: {
            entityId: { in: recentProjects.map((p) => p.id) },
            entityType: UserAccessType.PROJECT,
            deletedAt: null,
          },
          select: { entityId: true, user: { select: { name: true } } },
        }),
      ]);

      const membersByProject = new Map<string, string[]>();
      for (const row of memberRows) {
        const list = membersByProject.get(row.entityId) ?? [];
        list.push(row.user.name);
        membersByProject.set(row.entityId, list);
      }

      return {
        message: 'Dashboard stats retrieved successfully',
        success: true,
        data: {
          totalProjects,
          totalMembers: uniqueMembers.length,
          sharedWithMe: sharedIds.length,
          thisMonth,
          recentProjects: recentProjects.map((p) => ({
            id: p.id,
            name: p.name,
            updatedAt: p.updatedAt,
            collaborators: membersByProject.get(p.id) ?? [],
          })),
        },
      };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to retrieve dashboard stats', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProjectMemberAccess(
    user: User,
    projectId: string,
    userAccessId: string,
    dto: UpdateProjectMemberDto,
  ): Promise<ApiResponse<{ userAccessId: string; accessLevel: UserAccessLevel }>> {
    try {
      if (!(await this.userCanManageProject(user, projectId))) {
        throw throwError('Only the project owner or a lead can change member roles', HttpStatus.FORBIDDEN);
      }

      const project = await this.prismaService.project.findFirst({
        where: { id: projectId, deletedAt: null },
        select: { userId: true },
      });
      if (!project) throw throwError('Project not found', HttpStatus.NOT_FOUND);

      const target = await this.prismaService.userAccess.findFirst({
        where: {
          id: userAccessId,
          entityId: projectId,
          entityType: UserAccessType.PROJECT,
          deletedAt: null,
        },
        select: { id: true, userId: true, accessLevel: true },
      });

      if (!target) throw throwError('Member access record not found', HttpStatus.NOT_FOUND);
      if (target.userId === project.userId) {
        throw throwError('Cannot change the project owner access through this endpoint', HttpStatus.BAD_REQUEST);
      }

      const callerIsOwner = await this.isProjectOwner(user.id, projectId);

      if (!callerIsOwner) {
        if (dto.accessLevel === UserAccessLevel.LEAD) {
          throw throwError('Only the project owner can assign the lead role', HttpStatus.FORBIDDEN);
        }
        if (target.accessLevel === UserAccessLevel.LEAD) {
          throw throwError('Only the project owner can change a lead member', HttpStatus.FORBIDDEN);
        }
      }

      await this.prismaService.userAccess.update({
        where: { id: userAccessId },
        data: { accessLevel: dto.accessLevel },
      });

      return {
        message: 'Member access updated successfully',
        success: true,
        data: { userAccessId, accessLevel: dto.accessLevel },
      };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to update member access', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
