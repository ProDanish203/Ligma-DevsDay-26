import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@db';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CanvasService } from './canvas.service';

@Controller('canvas')
@ApiTags('Canvas')
@UseGuards(AuthGuard)
export class CanvasController {
  constructor(private readonly canvasService: CanvasService) {}

  @Roles(...Object.values(UserRole))
  @Get(':projectId/summary')
  async exportSummary(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.canvasService.exportProjectSummary(user.id, projectId);
  }
}
