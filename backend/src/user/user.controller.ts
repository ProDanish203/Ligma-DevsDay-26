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

@Controller('user')
@ApiTags('User')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(UserRole.ADMIN)
  @ApiProperty({ title: 'Get All Users' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sort', type: String, required: false })
  @ApiQuery({ name: 'filter', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @Get('all')
  async getAllUsers(@CurrentUser() user: User, @Query() query: QueryParams) {
    return await this.userService.getAllUsers(user, query);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({ title: 'Get Current User' })
  @Get('me')
  async getCurrentUser(@CurrentUser() user: User) {
    return this.userService.getCurrentUser(user);
  }

  @Roles(...Object.values(UserRole))
  @ApiProperty({ title: 'Update Current User Profile', type: UpdateUserDto })
  @Patch('me')
  async updateCurrentUser(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateCurrentUser(user, updateUserDto);
  }
}
