import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@db';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TaskBoardService } from './task-board.service';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('task-board')
@ApiTags('Task Board')
@UseGuards(AuthGuard)
export class TaskBoardController {
  constructor(private readonly taskBoardService: TaskBoardService) {}

  @Roles(...Object.values(UserRole))
  @Get(':projectId')
  async getTaskBoard(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.taskBoardService.getTaskBoard(user, projectId);
  }

  @Roles(...Object.values(UserRole))
  @Patch(':projectId/task/:taskId')
  async updateTask(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskBoardService.updateTask(user, projectId, taskId, dto);
  }

  @Roles(...Object.values(UserRole))
  @Delete(':projectId/task/:taskId')
  async deleteTask(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskBoardService.deleteTask(user, projectId, taskId);
  }
}
