import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@db';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@db';
import { QueryParams } from '../common/types/type';
import { UpdateUserDto } from './dto/update-user.dto';
import { RedisService } from '../common/services/redis.service';

@Controller('user')
@ApiTags('User')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  private readonly defaultCacheTtl = 300;

  private getCacheKey(userId: string, prefix: string, ...params: (string | number | boolean | undefined)[]): string {
    const keyParts = params.filter((p) => p !== undefined && p !== null && p !== '');
    return `user:${userId}:${prefix}:${keyParts.join(':')}`;
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const keys = await this.redisService.getClient().keys(`user:${userId}:*`);
    if (keys.length) {
      await this.redisService.deleteMany(keys);
    }
  }

  @Roles(UserRole.ADMIN)
  @ApiProperty({ title: 'Get All Users' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sort', type: String, required: false })
  @ApiQuery({ name: 'filter', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @Get('all')
  async getAllUsers(@CurrentUser() user: User, @Query() query: QueryParams) {
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

    const result = await this.userService.getAllUsers(user, query);
    await this.redisService.set(cacheKey, result, this.defaultCacheTtl);
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({ title: 'Get Current User' })
  @Get('me')
  async getCurrentUser(@CurrentUser() user: User) {
    const cacheKey = this.getCacheKey(user.id, 'me');
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const result = await this.userService.getCurrentUser(user);
    await this.redisService.set(cacheKey, result, this.defaultCacheTtl);
    return result;
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({ title: 'Update Current User Profile', type: UpdateUserDto })
  @Patch('me')
  async updateCurrentUser(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    const result = await this.userService.updateCurrentUser(user, updateUserDto);
    await this.invalidateUserCache(user.id);
    return result;
  }
}
