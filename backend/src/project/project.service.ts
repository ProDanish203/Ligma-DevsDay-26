import { HttpStatus, Injectable } from '@nestjs/common';
import { LogEntityType, Prisma, User } from '@db';
import { PrismaService } from '../common/services/prisma.service';
import { ApiResponse, QueryParams } from '../common/types/type';
import { throwError } from '../common/utils/helpers';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectSelect, projectSelect } from './queries';
import { GetAllProjectResponse } from './types';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logsService: LogsService,
  ) {}

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
          userId: user.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!existingProject) throw throwError('Project not found', HttpStatus.NOT_FOUND);

      if (!dto.name && dto.description === undefined) {
        throw throwError('At least one field is required to update project', HttpStatus.BAD_REQUEST);
      }

      if (dto.name) {
        const duplicateNameProject = await this.prismaService.project.findFirst({
          where: {
            id: { not: projectId },
            userId: user.id,
            name: dto.name,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (duplicateNameProject) throw throwError('Project with this name already exists', HttpStatus.BAD_REQUEST);
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

      const where: Prisma.ProjectWhereInput = {
        userId: user.id,
        deletedAt: null,
      };
      const orderBy: Prisma.ProjectOrderByWithRelationInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
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

      const totalPages = Math.ceil(totalCount / Number(limit));

      return {
        message: 'Projects retrieved successfully',
        success: true,
        data: {
          projects,
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

  async getProjectById(user: User, projectId: string): Promise<ApiResponse<ProjectSelect>> {
    try {
      const project = await this.prismaService.project.findFirst({
        where: {
          id: projectId,
          userId: user.id,
          deletedAt: null,
        },
        select: projectSelect,
      });

      if (!project) throw throwError('Project not found', HttpStatus.NOT_FOUND);

      return {
        message: 'Project retrieved successfully',
        success: true,
        data: project,
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
}
