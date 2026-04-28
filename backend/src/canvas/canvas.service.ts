import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { throwError } from '../common/utils/helpers';
import { ApiResponse } from '../common/types/type';
import { canvasNodeSelect, CanvasNodeSelect, canvasEdgeSelect, CanvasEdgeSelect } from './queries';
import { AddNodeDto, DeleteNodeDto, UpdateNodeDto, AddEdgeDto, DeleteEdgeDto } from './dto/canvas.dto';
import { AiService } from 'src/ai/ai.service';
import { NodeIntent, User } from '@db';
import { TaskBoardService } from 'src/task-board/task-board.service';
import { CanvasUser } from './types';

@Injectable()
export class CanvasService {
  constructor(private readonly prisma: PrismaService, private readonly aiService: AiService, private readonly taskBoardService: TaskBoardService) { }

  async getCanvasNodes(projectId: string): Promise<ApiResponse<CanvasNodeSelect[]>> {
    try {
      const nodes = await this.prisma.canvasNode.findMany({
        where: { projectId, deletedAt: null },
        select: canvasNodeSelect,
        orderBy: { createdAt: 'asc' },
      });
      return { message: 'Canvas nodes fetched', success: true, data: nodes };
    } catch (error) {
      throw throwError('Failed to fetch canvas nodes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addNode(userId: string, dto: AddNodeDto): Promise<ApiResponse<CanvasNodeSelect>> {
    try {
      const node = await this.prisma.canvasNode.create({
        data: {
          projectId: dto.projectId,
          type: dto.type,
          positionX: dto.positionX,
          positionY: dto.positionY,
          width: dto.width,
          height: dto.height,
          data: dto.data,
          createdById: userId,
        },
        select: canvasNodeSelect,
      });
      return { message: 'Node created', success: true, data: node };
    } catch (error) {
      throw throwError('Failed to create node', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async classificationStickyNode(nodeId: string, dto: UpdateNodeDto, user: CanvasUser) {
    if (!dto.data?.label) return;
    console.log(dto.data.label)
    const { intent, title, description } = await this.aiService.classifyIntent(dto.data.label);
    console.log(intent)
    if (intent === NodeIntent.ACTION_ITEM) {
      await this.taskBoardService.createTask(user as unknown as User, dto.projectId, {
        title: title ?? dto.data.label,
        description: description ?? undefined,
        canvasNodeId: nodeId,
      });
    }
  }

  async updateNode(user: CanvasUser, dto: UpdateNodeDto): Promise<ApiResponse<CanvasNodeSelect>> {
    try {
      const existing = await this.prisma.canvasNode.findFirst({
        where: { id: dto.nodeId, projectId: dto.projectId, deletedAt: null },
        select: { id: true, type: true, data: true },
      });
      if (!existing) throw throwError('Node not found', HttpStatus.NOT_FOUND);

      const updateData: any = {};
      if (dto.positionX !== undefined) updateData.positionX = dto.positionX;
      if (dto.positionY !== undefined) updateData.positionY = dto.positionY;
      if (dto.width !== undefined) updateData.width = dto.width;
      if (dto.height !== undefined) updateData.height = dto.height;
      if (dto.data !== undefined) updateData.data = dto.data;

      const node = await this.prisma.canvasNode.update({
        where: { id: dto.nodeId },
        data: updateData,
        select: canvasNodeSelect,
      });
      console.log("existing data", (existing as any).data?.label)
      console.log("new data", dto.data?.label)
      if (existing.type === 'sticky' && dto.data?.label && (existing as any).data?.label !== dto.data.label) {
        console.log('starting generation')
        await this.classificationStickyNode(node.id, dto, user)
      }
      return { message: 'Node updated', success: true, data: node };
    } catch (error: any) {
      console.log(error)
      if (error?.status) throw error;
      throw throwError('Failed to update node', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCanvasEdges(projectId: string): Promise<ApiResponse<CanvasEdgeSelect[]>> {
    try {
      const edges = await this.prisma.canvasEdge.findMany({
        where: { projectId, deletedAt: null },
        select: canvasEdgeSelect,
        orderBy: { createdAt: 'asc' },
      });
      return { message: 'Canvas edges fetched', success: true, data: edges };
    } catch {
      throw throwError('Failed to fetch canvas edges', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addEdge(userId: string, dto: AddEdgeDto): Promise<ApiResponse<CanvasEdgeSelect>> {
    try {
      const edge = await this.prisma.canvasEdge.create({
        data: {
          projectId: dto.projectId,
          sourceNodeId: dto.sourceNodeId,
          targetNodeId: dto.targetNodeId,
          sourceHandle: dto.sourceHandle,
          targetHandle: dto.targetHandle,
          label: dto.label,
          color: dto.color ?? '#374151',
          createdById: userId,
        },
        select: canvasEdgeSelect,
      });
      return { message: 'Edge created', success: true, data: edge };
    } catch {
      throw throwError('Failed to create edge', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteEdge(userId: string, dto: DeleteEdgeDto): Promise<ApiResponse<void>> {
    try {
      const existing = await this.prisma.canvasEdge.findFirst({
        where: { id: dto.edgeId, projectId: dto.projectId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw throwError('Edge not found', HttpStatus.NOT_FOUND);
      await this.prisma.canvasEdge.update({
        where: { id: dto.edgeId },
        data: { deletedAt: new Date() },
      });
      return { message: 'Edge deleted', success: true };
    } catch (err: any) {
      if (err?.status) throw err;
      throw throwError('Failed to delete edge', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteNode(userId: string, dto: DeleteNodeDto): Promise<ApiResponse<void>> {
    try {
      const existing = await this.prisma.canvasNode.findFirst({
        where: { id: dto.nodeId, projectId: dto.projectId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw throwError('Node not found', HttpStatus.NOT_FOUND);

      await this.prisma.canvasNode.update({
        where: { id: dto.nodeId },
        data: { deletedAt: new Date() },
      });
      return { message: 'Node deleted', success: true };
    } catch (error: any) {
      if (error?.status) throw error;
      throw throwError('Failed to delete node', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
