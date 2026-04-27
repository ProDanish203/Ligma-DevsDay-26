import { HttpStatus, Injectable } from '@nestjs/common';
import { InvitationStatus, LogEntityType, Prisma, User, UserAccessLevel, UserAccessType } from '@db';
import { PrismaService } from '../common/services/prisma.service';
import { ApiResponse, QueryParams } from '../common/types/type';
import { throwError } from '../common/utils/helpers';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateInviteStatusDto } from './dto/update-invite-status.dto';
import { ProjectInvitationSelect, projectInvitationSelect } from './queries';
import { GetAllProjectInvitationsResponse } from './types';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class ProjectInvitationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  private async userCanManageProjectInvitations(userId: string, projectId: string): Promise<boolean> {
    const project = await this.prismaService.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { userId: true },
    });
    if (!project) return false;
    if (project.userId === userId) return true;
    const lead = await this.prismaService.userAccess.findFirst({
      where: {
        userId,
        entityId: projectId,
        entityType: UserAccessType.PROJECT,
        deletedAt: null,
        accessLevel: UserAccessLevel.LEAD,
      },
      select: { id: true },
    });
    return !!lead;
  }

  async getCurrentUserInvitations(
    user: User,
    query?: QueryParams,
  ): Promise<ApiResponse<GetAllProjectInvitationsResponse>> {
    try {
      const { page = 1, limit = 20, search = '', filter = '', sort = '' } = query || {};

      const where: Prisma.ProjectInvitationWhereInput = {
        email: user.email,
        deletedAt: null,
        project: { deletedAt: null },
      };
      const orderBy: Prisma.ProjectInvitationOrderByWithRelationInput = {};

      if (search) {
        where.project = {
          ...(where.project as Prisma.ProjectWhereInput),
          name: {
            contains: search,
            mode: 'insensitive',
          },
        };
      }

      if (filter) orderBy[filter] = 'asc';
      if (sort) orderBy[sort] = 'desc';

      const [invitations, totalCount] = await Promise.all([
        this.prismaService.projectInvitation.findMany({
          where,
          orderBy,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          select: projectInvitationSelect,
        }),
        this.prismaService.projectInvitation.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / Number(limit));

      return {
        message: 'Project invitations retrieved successfully',
        success: true,
        data: {
          invitations,
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
      throw throwError(
        err.message || 'Failed to retrieve current user invitations',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProjectInvitations(
    user: User,
    projectId: string,
    query?: QueryParams,
  ): Promise<ApiResponse<GetAllProjectInvitationsResponse>> {
    try {
      const { page = 1, limit = 20, search = '', filter = '', sort = '' } = query || {};

      if (!(await this.userCanManageProjectInvitations(user.id, projectId))) {
        throw throwError('Project not found', HttpStatus.NOT_FOUND);
      }

      const where: Prisma.ProjectInvitationWhereInput = {
        projectId,
        deletedAt: null,
      };
      const orderBy: Prisma.ProjectInvitationOrderByWithRelationInput = {};

      if (search) {
        where.email = {
          contains: search,
          mode: 'insensitive',
        };
      }

      if (filter) orderBy[filter] = 'asc';
      if (sort) orderBy[sort] = 'desc';

      const [invitations, totalCount] = await Promise.all([
        this.prismaService.projectInvitation.findMany({
          where,
          orderBy,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          select: projectInvitationSelect,
        }),
        this.prismaService.projectInvitation.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / Number(limit));

      return {
        message: 'Project invitations retrieved successfully',
        success: true,
        data: {
          invitations,
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
      throw throwError(
        err.message || 'Failed to retrieve project invitations',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async inviteUser(user: User, dto: InviteUserDto): Promise<ApiResponse<ProjectInvitationSelect>> {
    try {
      if (!(await this.userCanManageProjectInvitations(user.id, dto.projectId))) {
        throw throwError('Project not found', HttpStatus.NOT_FOUND);
      }
      if (dto.email === user.email) throw throwError('You cannot invite yourself', HttpStatus.BAD_REQUEST);

      const invitedUser = await this.prismaService.user.findFirst({
        where: {
          email: dto.email,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!invitedUser) throw throwError('User not found', HttpStatus.NOT_FOUND);

      const existingPendingInvitation = await this.prismaService.projectInvitation.findFirst({
        where: {
          projectId: dto.projectId,
          email: dto.email,
          status: InvitationStatus.PENDING,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existingPendingInvitation) throw throwError('Pending invitation already exists', HttpStatus.BAD_REQUEST);

      const existingAccess = await this.prismaService.userAccess.findFirst({
        where: {
          userId: invitedUser.id,
          entityId: dto.projectId,
          entityType: UserAccessType.PROJECT,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existingAccess) throw throwError('User already has access to this project', HttpStatus.BAD_REQUEST);

      const invitation = await this.prismaService.projectInvitation.upsert({
        where: {
          projectId_email: {
            projectId: dto.projectId,
            email: dto.email,
          },
        },
        create: {
          email: dto.email,
          projectId: dto.projectId,
          accessLevel: dto.accessLevel,
        },
        update: {
          accessLevel: dto.accessLevel,
          status: InvitationStatus.PENDING,
          deletedAt: null,
        },
        select: projectInvitationSelect,
      });

      await this.logsService.createLog({
        action: 'INVITATION_SENT',
        message: `Invitation sent to ${dto.email}`,
        entityType: LogEntityType.PROJECT,
        entityId: dto.projectId,
        actorUserId: user.id,
        targetUserId: invitedUser.id,
        metadata: {
          projectId: dto.projectId,
          invitationId: invitation.id,
          invitedEmail: dto.email,
          accessLevel: dto.accessLevel,
        },
      });

      return {
        message: 'Invitation sent successfully',
        success: true,
        data: invitation,
      };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to send invitation', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateInvitationStatus(
    user: User,
    invitationId: string,
    dto: UpdateInviteStatusDto,
  ): Promise<ApiResponse<ProjectInvitationSelect>> {
    try {
      if (dto.status === InvitationStatus.PENDING) {
        throw throwError('Only ACCEPTED or REJECTED status is allowed', HttpStatus.BAD_REQUEST);
      }

      const invitation = await this.prismaService.projectInvitation.findFirst({
        where: {
          id: invitationId,
          email: user.email,
          status: InvitationStatus.PENDING,
          deletedAt: null,
          project: { deletedAt: null },
        },
        select: {
          id: true,
          projectId: true,
          email: true,
          accessLevel: true,
        },
      });

      if (!invitation) throw throwError('Pending invitation not found', HttpStatus.NOT_FOUND);

      if (dto.status === InvitationStatus.ACCEPTED) {
        await this.prismaService.userAccess.upsert({
          where: {
            userId_entityType_entityId: {
              userId: user.id,
              entityType: UserAccessType.PROJECT,
              entityId: invitation.projectId,
            },
          },
          create: {
            userId: user.id,
            entityType: UserAccessType.PROJECT,
            entityId: invitation.projectId,
            accessLevel: invitation.accessLevel,
            deletedAt: null,
          },
          update: {
            accessLevel: invitation.accessLevel,
            deletedAt: null,
          },
        });

        this.logsService.createLog({
          action: 'INVITATION_ACCEPTED',
          message: `Invitation accepted by ${user.email}`,
          entityType: LogEntityType.PROJECT,
          entityId: invitation.projectId,
          actorUserId: user.id,
          targetUserId: user.id,
          metadata: {
            invitationId: invitation.id,
            invitedEmail: invitation.email,
            status: InvitationStatus.ACCEPTED,
          },
        });
      } else if (dto.status === InvitationStatus.REJECTED) {
        await this.prismaService.userAccess.deleteMany({
          where: {
            userId: user.id,
            entityType: UserAccessType.PROJECT,
            entityId: invitation.projectId,
            deletedAt: { not: null },
          },
        });

        this.logsService.createLog({
          action: 'INVITATION_REJECTED',
          message: `Invitation rejected by ${user.email}`,
          entityType: LogEntityType.PROJECT,
          entityId: invitation.projectId,
          actorUserId: user.id,
          targetUserId: user.id,
          metadata: {
            invitationId: invitation.id,
            invitedEmail: invitation.email,
            status: InvitationStatus.REJECTED,
          },
        });
      }

      const updatedInvitation = await this.prismaService.projectInvitation.update({
        where: { id: invitationId },
        data: {
          status: dto.status,
        },
        select: projectInvitationSelect,
      });

      return {
        message: `Invitation ${dto.status.toLowerCase()} successfully`,
        success: true,
        data: updatedInvitation,
      };
    } catch (err: any) {
      throw throwError(
        err.message || 'Failed to update invitation status',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async revokeInvitation(user: User, invitationId: string): Promise<ApiResponse<void>> {
    try {
      const invitation = await this.prismaService.projectInvitation.findFirst({
        where: {
          id: invitationId,
          status: InvitationStatus.PENDING,
          deletedAt: null,
          project: { deletedAt: null },
        },
        select: {
          id: true,
          email: true,
          projectId: true,
        },
      });

      if (!invitation) throw throwError('Pending invitation not found', HttpStatus.NOT_FOUND);

      if (!(await this.userCanManageProjectInvitations(user.id, invitation.projectId))) {
        throw throwError('Pending invitation not found', HttpStatus.NOT_FOUND);
      }

      await this.prismaService.projectInvitation.delete({
        where: { id: invitationId },
      });

      const invitedUser = await this.prismaService.user.findFirst({
        where: {
          email: invitation.email,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (invitedUser) {
        await this.prismaService.userAccess.deleteMany({
          where: {
            userId: invitedUser.id,
            entityType: UserAccessType.PROJECT,
            entityId: invitation.projectId,
            deletedAt: { not: null },
          },
        });
      }

      this.logsService.createLog({
        action: 'INVITATION_REVOKED',
        message: `Invitation revoked for ${invitation.email}`,
        entityType: LogEntityType.PROJECT,
        entityId: invitation.projectId,
        actorUserId: user.id,
        targetUserId: invitedUser?.id,
        metadata: {
          invitationId: invitation.id,
          invitedEmail: invitation.email,
          projectId: invitation.projectId,
        },
      });

      return {
        message: 'Invitation revoked successfully',
        success: true,
      };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to revoke invitation', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
