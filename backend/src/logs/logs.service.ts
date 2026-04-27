import { HttpStatus, Injectable } from '@nestjs/common';
import { LogEntityType, LogLevel, Prisma, User, UserAccessType, UserRole } from '@db';
import { PrismaService } from 'src/common/services/prisma.service';
import { ApiResponse, QueryParams } from 'src/common/types/type';
import { throwError } from 'src/common/utils/helpers';
import { logSelect, LogSelect } from './queries';
import { GetAllEntityLogsResponse } from './types';

@Injectable()
export class LogsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createLog(input: {
    action: string;
    message: string;
    entityType: LogEntityType;
    entityId: string;
    level?: LogLevel;
    actorUserId?: string;
    targetUserId?: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<LogSelect | null> {
    try {
      return await this.prismaService.log.create({
        data: {
          action: input.action,
          message: input.message,
          entityType: input.entityType,
          entityId: input.entityId,
          level: input.level || LogLevel.INFO,
          actorUserId: input.actorUserId,
          targetUserId: input.targetUserId,
          metadata: input.metadata,
        },
        select: logSelect,
      });
    } catch (error: any) {
      console.error('Failed to create activity log:', error?.message || error);
      return null;
    }
  }

  async getLogsByEntity(
    user: User,
    entityType: LogEntityType,
    entityId: string,
    query?: QueryParams,
  ): Promise<ApiResponse<GetAllEntityLogsResponse>> {
    try {
      const hasAccess = await this.canReadEntityLogs(user, entityType, entityId);

      if (!hasAccess) throw throwError('Forbidden Access', HttpStatus.FORBIDDEN);

      const { page = 1, limit = 20, search = '', filter = '', sort = '' } = query || {};
      const where: Prisma.LogWhereInput = {
        entityType,
        entityId,
      };
      const orderBy: Prisma.LogOrderByWithRelationInput = {};

      if (search) {
        where.OR = [
          {
            message: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            action: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      if (filter) orderBy[filter] = 'asc';
      if (sort) orderBy[sort] = 'desc';

      const [logs, totalCount] = await Promise.all([
        this.prismaService.log.findMany({
          where,
          orderBy,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          select: logSelect,
        }),
        this.prismaService.log.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / Number(limit));

      return {
        message: 'Logs retrieved successfully',
        success: true,
        data: {
          logs,
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
      throw throwError(err.message || 'Failed to retrieve logs', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async canReadEntityLogs(user: User, entityType: LogEntityType, entityId: string): Promise<boolean> {
    if (user.role === UserRole.ADMIN) return true;

    switch (entityType) {
      case LogEntityType.PROJECT: {
        const project = await this.prismaService.project.findFirst({
          where: {
            id: entityId,
            deletedAt: null,
          },
          select: { userId: true },
        });

        if (!project) return false;
        if (project.userId === user.id) return true;

        const access = await this.prismaService.userAccess.findFirst({
          where: {
            userId: user.id,
            entityType: UserAccessType.PROJECT,
            entityId,
            deletedAt: null,
          },
          select: { id: true },
        });
        return Boolean(access);
      }
      case LogEntityType.NODE: {
        const access = await this.prismaService.userAccess.findFirst({
          where: {
            userId: user.id,
            entityType: UserAccessType.NODE,
            entityId,
            deletedAt: null,
          },
          select: { id: true },
        });
        return Boolean(access);
      }
      case LogEntityType.PROJECT_INVITATION: {
        const invitation = await this.prismaService.projectInvitation.findFirst({
          where: {
            id: entityId,
            deletedAt: null,
          },
          select: {
            email: true,
            project: {
              select: {
                userId: true,
              },
            },
          },
        });

        if (!invitation) return false;
        return invitation.email === user.email || invitation.project.userId === user.id;
      }
      case LogEntityType.USER_ACCESS: {
        const access = await this.prismaService.userAccess.findFirst({
          where: { id: entityId },
          select: {
            userId: true,
            entityType: true,
            entityId: true,
          },
        });

        if (!access) return false;
        if (access.userId === user.id) return true;

        if (access.entityType === UserAccessType.PROJECT) {
          const project = await this.prismaService.project.findFirst({
            where: {
              id: access.entityId,
              userId: user.id,
              deletedAt: null,
            },
            select: { id: true },
          });
          return Boolean(project);
        }

        return false;
      }
      case LogEntityType.USER:
        return entityId === user.id;
      default:
        return false;
    }
  }
}
