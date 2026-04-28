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
import { RedisService } from '../common/services/redis.service';

@Controller('project')
@ApiTags('Project')
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly redisService: RedisService,
  ) {}

  private readonly defaultCacheTtl = 300;

  private getCacheKey(userId: string, prefix: string, ...params: (string | number | boolean | undefined)[]): string {
    const keyParts = params.filter((p) => p !== undefined && p !== null && p !== '');
    return `project:${userId}:${prefix}:${keyParts.join(':')}`;
  }

  private async invalidateProjectCache(): Promise<void> {
    const keys = await this.redisService.getClient().keys('project:*');
    if (keys.length) {
      await this.redisService.deleteMany(keys);
    }
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Create Project',
    description: 'Create a new project with name and optional description',
    type: CreateProjectDto,
  })
  @Post('create')
  async createProject(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    const result = await this.projectService.createProject(user, dto);
    await this.invalidateProjectCache();
    return result;
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
    const cacheKey = this.getCacheKey(
      user.id,
      'all',
      query?.page,
      query?.limit,
      query?.search,
      query?.filter,
      query?.sort,
    );
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const result = await this.projectService.getAllProjects(user, query);
    await this.redisService.set(cacheKey, result, this.defaultCacheTtl);
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Get Dashboard Stats',
    description: 'Aggregate stats and recent projects for the dashboard',
  })
  @Get('dashboard-stats')
  async getDashboardStats(@CurrentUser() user: User) {
    const cacheKey = this.getCacheKey(user.id, 'dashboard-stats');
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const result = await this.projectService.getDashboardStats(user);
    await this.redisService.set(cacheKey, result, this.defaultCacheTtl);
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Get Project Members',
    description: 'List project owner and members with access levels',
  })
  @Get(':projectId/members')
  async getProjectMembers(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    const cacheKey = this.getCacheKey(user.id, 'members', projectId);
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const result = await this.projectService.getProjectMembers(user, projectId);
    await this.redisService.set(cacheKey, result, this.defaultCacheTtl);
    return result;
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
    const result = await this.projectService.updateProjectMemberAccess(user, projectId, userAccessId, dto);
    await this.invalidateProjectCache();
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Remove Project Member',
    description: 'Remove a member from a project (owner only)',
  })
  @Delete(':projectId/members/:userAccessId')
  async removeProjectMember(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('userAccessId') userAccessId: string,
  ) {
    const result = await this.projectService.removeProjectMember(user, projectId, userAccessId);
    await this.invalidateProjectCache();
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Update Project',
    description: 'Update project name and description',
    type: UpdateProjectDto,
  })
  @Patch(':projectId')
  async updateProject(@CurrentUser() user: User, @Param('projectId') projectId: string, @Body() dto: UpdateProjectDto) {
    const result = await this.projectService.updateProject(user, projectId, dto);
    await this.invalidateProjectCache();
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Get Project By Id',
    description: 'Retrieve a project by its id',
  })
  @Get(':projectId')
  async getProjectById(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    const cacheKey = this.getCacheKey(user.id, 'by-id', projectId);
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const result = await this.projectService.getProjectById(user, projectId);
    await this.redisService.set(cacheKey, result, this.defaultCacheTtl);
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Delete Project',
    description: 'Delete a project by its id',
  })
  @Delete(':projectId')
  async deleteProject(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    const result = await this.projectService.deleteProject(user, projectId);
    await this.invalidateProjectCache();
    return result;
  }
}
