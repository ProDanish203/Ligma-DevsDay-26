import { HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { User } from '@db';
import { PrismaService } from '../common/services/prisma.service';
import { ProjectService } from '../project/project.service';
import { ApiResponse } from '../common/types/type';
import { throwError } from '../common/utils/helpers';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskBoardSelect, TaskSelect, taskBoardSelect, taskSelect } from './queries';

@Injectable()
export class TaskBoardService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => ProjectService)) private readonly projectService: ProjectService,
  ) { }

  private async getOrCreateBoard(projectId: string): Promise<{ id: string }> {
    const existing = await this.prismaService.taskBoard.findUnique({
      where: { projectId },
      select: { id: true },
    });
    if (existing) return existing;

    return this.prismaService.taskBoard.create({
      data: { projectId },
      select: { id: true },
    });
  }

  async getTaskBoard(user: User, projectId: string): Promise<ApiResponse<TaskBoardSelect>> {
    try {
      if (!(await this.projectService.userCanViewProject(user, projectId))) {
        throw throwError('Project not found', HttpStatus.NOT_FOUND);
      }

      const board = await this.getOrCreateBoard(projectId);

      const result = await this.prismaService.taskBoard.findUnique({
        where: { id: board.id },
        select: taskBoardSelect,
      });

      if (!result) {
        throw throwError('Task board not found', HttpStatus.NOT_FOUND);
      }

      return { message: 'Task board retrieved successfully', success: true, data: result };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to retrieve task board', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createTask(user: User, projectId: string, dto: CreateTaskDto): Promise<ApiResponse<TaskSelect>> {
    try {
      if (!(await this.projectService.userCanViewProject(user, projectId))) {
        throw throwError('Project not found', HttpStatus.NOT_FOUND);
      }

      const board = await this.getOrCreateBoard(projectId);

      const task = await this.prismaService.task.create({
        data: {
          taskBoardId: board.id,
          canvasNodeId: dto.canvasNodeId,
          title: dto.title,
          description: dto.description,
          createdById: user.id,
        },
        select: taskSelect,
      });

      return { message: 'Task created successfully', success: true, data: task };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to create task', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateTask(user: User, projectId: string, taskId: string, dto: UpdateTaskDto): Promise<ApiResponse<TaskSelect>> {
    try {
      if (!(await this.projectService.userCanViewProject(user, projectId))) {
        throw throwError('Project not found', HttpStatus.NOT_FOUND);
      }

      const board = await this.prismaService.taskBoard.findUnique({
        where: { projectId },
        select: { id: true },
      });
      if (!board) throw throwError('Task board not found', HttpStatus.NOT_FOUND);

      const existing = await this.prismaService.task.findFirst({
        where: { id: taskId, taskBoardId: board.id, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw throwError('Task not found', HttpStatus.NOT_FOUND);

      if (!dto.title && dto.description === undefined) {
        throw throwError('At least one field is required to update task', HttpStatus.BAD_REQUEST);
      }

      const task = await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          title: dto.title,
          description: dto.description,
        },
        select: taskSelect,
      });

      return { message: 'Task updated successfully', success: true, data: task };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to update task', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteTask(user: User, projectId: string, taskId: string): Promise<ApiResponse<null>> {
    try {
      if (!(await this.projectService.userCanViewProject(user, projectId))) {
        throw throwError('Project not found', HttpStatus.NOT_FOUND);
      }

      const board = await this.prismaService.taskBoard.findUnique({
        where: { projectId },
        select: { id: true },
      });
      if (!board) throw throwError('Task board not found', HttpStatus.NOT_FOUND);

      const existing = await this.prismaService.task.findFirst({
        where: { id: taskId, taskBoardId: board.id, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw throwError('Task not found', HttpStatus.NOT_FOUND);

      await this.prismaService.task.update({
        where: { id: taskId },
        data: { deletedAt: new Date() },
      });

      return { message: 'Task deleted successfully', success: true, data: null };
    } catch (err: any) {
      throw throwError(err.message || 'Failed to delete task', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}