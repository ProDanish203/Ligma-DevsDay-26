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

@Controller('project-invitations')
@ApiTags('Project Invitations')
@UseGuards(AuthGuard)
export class ProjectInvitationsController {
  constructor(private readonly projectInvitationsService: ProjectInvitationsService) {}

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
    return this.projectInvitationsService.getCurrentUserInvitations(user, query);
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
    return this.projectInvitationsService.getProjectInvitations(user, projectId, query);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Invite User To Project',
    description: 'Invite a user by email with selected access scope',
    type: InviteUserDto,
  })
  @Post('invite')
  async inviteUser(@CurrentUser() user: User, @Body() dto: InviteUserDto) {
    return this.projectInvitationsService.inviteUser(user, dto);
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
    return this.projectInvitationsService.updateInvitationStatus(user, invitationId, dto);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Revoke Invitation',
    description: 'Delete a pending invitation',
  })
  @Delete(':invitationId/revoke')
  async revokeInvitation(@CurrentUser() user: User, @Param('invitationId') invitationId: string) {
    return this.projectInvitationsService.revokeInvitation(user, invitationId);
  }
}
