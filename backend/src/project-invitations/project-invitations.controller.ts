import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InvitationStatus, User, UserRole } from '@db';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { QueryParams } from '../common/types/type';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateInviteStatusDto } from './dto/update-invite-status.dto';
import { ProjectInvitationsService } from './project-invitations.service';
import { RedisService } from '../common/services/redis.service';

@Controller('project-invitations')
@ApiTags('Project Invitations')
@UseGuards(AuthGuard)
export class ProjectInvitationsController {
  constructor(
    private readonly projectInvitationsService: ProjectInvitationsService,
    private readonly redisService: RedisService,
  ) {}

  private readonly defaultCacheTtl = 300;

  private getCacheKey(userId: string, prefix: string, ...params: (string | number | boolean | undefined)[]): string {
    const keyParts = params.filter((p) => p !== undefined && p !== null && p !== '');
    return `project-invitations:${userId}:${prefix}:${keyParts.join(':')}`;
  }

  private async invalidateProjectInvitationsCache(): Promise<void> {
    const [invitationKeys, projectKeys] = await Promise.all([
      this.redisService.getClient().keys('project-invitations:*'),
      this.redisService.getClient().keys('project:*'),
    ]);
    const keys = [...invitationKeys, ...projectKeys];
    if (keys.length) {
      await this.redisService.deleteMany(keys);
    }
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Get Current User Invitations',
    description: 'Get all project invitations for current user',
  })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sort', type: String, required: false })
  @ApiQuery({ name: 'filter', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @Get('me')
  async getCurrentUserInvitations(@CurrentUser() user: User, @Query() query: QueryParams) {
    const cacheKey = this.getCacheKey(
      user.id,
      'me',
      query?.page,
      query?.limit,
      query?.search,
      query?.filter,
      query?.sort,
    );
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const result = await this.projectInvitationsService.getCurrentUserInvitations(user, query);
    await this.redisService.set(cacheKey, result, this.defaultCacheTtl);
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Get Project Invitations',
    description: 'Get all invitations for a project',
  })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sort', type: String, required: false })
  @ApiQuery({ name: 'filter', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @Get('project/:projectId')
  async getProjectInvitations(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Query() query: QueryParams,
  ) {
    const cacheKey = this.getCacheKey(
      user.id,
      'project',
      projectId,
      query?.page,
      query?.limit,
      query?.search,
      query?.filter,
      query?.sort,
    );
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const result = await this.projectInvitationsService.getProjectInvitations(user, projectId, query);
    await this.redisService.set(cacheKey, result, this.defaultCacheTtl);
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Invite User To Project',
    description: 'Invite a user by email with selected access scope',
    type: InviteUserDto,
  })
  @Post('invite')
  async inviteUser(@CurrentUser() user: User, @Body() dto: InviteUserDto) {
    const result = await this.projectInvitationsService.inviteUser(user, dto);
    await this.invalidateProjectInvitationsCache();
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Update Invitation Status',
    description: 'Accept or reject a pending invitation',
    type: UpdateInviteStatusDto,
  })
  @Patch(':invitationId/status')
  async updateInvitationStatus(
    @CurrentUser() user: User,
    @Param('invitationId') invitationId: string,
    @Body() dto: UpdateInviteStatusDto,
  ) {
    const result = await this.projectInvitationsService.updateInvitationStatus(user, invitationId, dto);
    await this.invalidateProjectInvitationsCache();
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Revoke Invitation',
    description: 'Delete a pending invitation',
  })
  @Delete(':invitationId/revoke')
  async revokeInvitation(@CurrentUser() user: User, @Param('invitationId') invitationId: string) {
    const result = await this.projectInvitationsService.revokeInvitation(user, invitationId);
    await this.invalidateProjectInvitationsCache();
    return result;
  }
}
