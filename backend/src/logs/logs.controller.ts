import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LogEntityType, User, UserRole } from '@db';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { QueryParams } from 'src/common/types/type';
import { LogsService } from './logs.service';

@Controller('logs')
@ApiTags('Logs')
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Roles(...Object.values(UserRole))
  @ApiProperty({
    title: 'Get Logs By Entity',
    description: 'Get logs for an entity type and entity id',
  })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sort', type: String, required: false })
  @ApiQuery({ name: 'filter', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @Get(':entityType/:entityId')
  async getLogsByEntity(
    @CurrentUser() user: User,
    @Param('entityType') entityType: LogEntityType,
    @Param('entityId') entityId: string,
    @Query() query: QueryParams,
  ) {
    return this.logsService.getLogsByEntity(user, entityType, entityId, query);
  }
}
