import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@db';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QueryParams } from '../common/types/type';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { ProjectService } from './project.service';

@Controller('project')
@ApiTags('Project')
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Create Project',
    description: 'Create a new project with name and optional description',
    type: CreateProjectDto,
  })
  @Post('create')
  async createProject(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    return this.projectService.createProject(user, dto);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Get All Projects',
    description: 'Retrieve all projects with pagination and query params',
  })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sort', type: String, required: false })
  @ApiQuery({ name: 'filter', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @Get('all')
  async getAllProjects(@CurrentUser() user: User, @Query() query: QueryParams) {
    return this.projectService.getAllProjects(user, query);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Get Project Members',
    description: 'List project owner and members with access levels',
  })
  @Get(':projectId/members')
  async getProjectMembers(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projectService.getProjectMembers(user, projectId);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Update Member Access Level',
    description: 'Update a collaborator role (owner or lead rules apply)',
    type: UpdateProjectMemberDto,
  })
  @Patch(':projectId/members/:userAccessId')
  async updateProjectMemberAccess(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('userAccessId') userAccessId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projectService.updateProjectMemberAccess(user, projectId, userAccessId, dto);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Update Project',
    description: 'Update project name and description',
    type: UpdateProjectDto,
  })
  @Patch(':projectId')
  async updateProject(@CurrentUser() user: User, @Param('projectId') projectId: string, @Body() dto: UpdateProjectDto) {
    return this.projectService.updateProject(user, projectId, dto);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Get Project By Id',
    description: 'Retrieve a project by its id',
  })
  @Get(':projectId')
  async getProjectById(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projectService.getProjectById(user, projectId);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Delete Project',
    description: 'Delete a project by its id',
  })
  @Delete(':projectId')
  async deleteProject(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projectService.deleteProject(user, projectId);
  }
}
