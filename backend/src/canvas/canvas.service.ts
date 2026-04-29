import { HttpStatus, Injectable } from '@nestjs/common';
import { User, UserAccessLevel, UserAccessType } from '@db';
import { PrismaService } from '../common/services/prisma.service';
import { throwError } from '../common/utils/helpers';
import { ApiResponse } from '../common/types/type';
import { canvasNodeSelect, CanvasNodeSelect, canvasEdgeSelect, CanvasEdgeSelect, nodeAccessSelect, NodeAccessSelect } from './queries';
import { AddNodeDto, DeleteNodeDto, UpdateNodeDto, AddEdgeDto, DeleteEdgeDto, GrantNodeAccessDto, RevokeNodeAccessDto } from './dto/canvas.dto';
import { AiService } from '../ai/ai.service';
import { NodeIntent } from '@db';
import { CanvasSummary } from '../ai/schema';
import { TaskBoardService } from 'src/task-board/task-board.service';
import { CanvasUser } from './types';

@Injectable()
export class CanvasService {
  constructor(private readonly prisma: PrismaService, private readonly aiService: AiService, private readonly taskBoardService: TaskBoardService) { }

  // ── Project access helper ────────────────────────────────────────────

  async getMyProjectAccess(userId: string, projectId: string): Promise<'OWNER' | UserAccessLevel | null> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { userId: true },
    });
    if (!project) return null;
    if (project.userId === userId) return 'OWNER';

    const access = await this.prisma.userAccess.findFirst({
      where: { userId, entityType: UserAccessType.PROJECT, entityId: projectId, deletedAt: null },
      select: { accessLevel: true },
    });
    return access?.accessLevel ?? null;
  }

  // ── Node permission check ────────────────────────────────────────────

  async canUserMutateNode(
    userId: string,
    nodeId: string,
    projectId: string,
    action: 'update' | 'delete',
  ): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { userId: true },
    });
    if (!project) return false;

    // Project owner always allowed
    if (project.userId === userId) return true;

    // Check project-level access
    const projectAccess = await this.prisma.userAccess.findFirst({
      where: { userId, entityType: UserAccessType.PROJECT, entityId: projectId, deletedAt: null },
      select: { accessLevel: true },
    });

    // Project LEAD always allowed
    if (projectAccess?.accessLevel === UserAccessLevel.LEAD) return true;

    // Fetch node (also validates it belongs to this project)
    const node = await this.prisma.canvasNode.findFirst({
      where: { id: nodeId, projectId, deletedAt: null },
      select: { createdById: true },
    });
    if (!node) return false;

    // Node creator always allowed
    if (node.createdById === userId) return true;

    // Check explicit NODE ACL entries for this node
    const nodeAcls = await this.prisma.userAccess.findMany({
      where: { entityType: UserAccessType.NODE, entityId: nodeId, deletedAt: null },
      select: { userId: true, accessLevel: true },
    });

    // Nodes are unrestricted by default — explicit ACL entries add per-user restrictions.
    const myNodeAccess = nodeAcls.find((a) => a.userId === userId);
    if (!myNodeAccess) {
      // No explicit restriction on this user — any project member can mutate.
      return projectAccess !== null;
    }

    // User has an explicit ACL entry — honour the restriction.
    return myNodeAccess.accessLevel === UserAccessLevel.EDITOR || myNodeAccess.accessLevel === UserAccessLevel.LEAD;
  }

  // ── Bulk fetch node accesses for a project (for canvas:state) ────────

  async getNodeAccessesForProject(projectId: string): Promise<Record<string, NodeAccessSelect[]>> {
    const nodes = await this.prisma.canvasNode.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    });
    if (nodes.length === 0) return {};

    const nodeIds = nodes.map((n) => n.id);
    const accesses = await this.prisma.userAccess.findMany({
      where: { entityType: UserAccessType.NODE, entityId: { in: nodeIds }, deletedAt: null },
      select: nodeAccessSelect,
    });

    const grouped: Record<string, NodeAccessSelect[]> = {};
    for (const access of accesses) {
      if (!grouped[access.entityId]) grouped[access.entityId] = [];
      grouped[access.entityId].push(access);
    }
    return grouped;
  }

  // ── Node access management ───────────────────────────────────────────

  async canUserManageNodeAccess(userId: string, nodeId: string, projectId: string): Promise<boolean> {
    const projectAccess = await this.getMyProjectAccess(userId, projectId);
    if (projectAccess === 'OWNER' || projectAccess === UserAccessLevel.LEAD) return true;

    const node = await this.prisma.canvasNode.findFirst({
      where: { id: nodeId, projectId, deletedAt: null },
      select: { createdById: true },
    });
    if (node?.createdById === userId) return true;

    const nodeAccess = await this.prisma.userAccess.findFirst({
      where: { userId, entityType: UserAccessType.NODE, entityId: nodeId, deletedAt: null },
      select: { accessLevel: true },
    });
    return nodeAccess?.accessLevel === UserAccessLevel.LEAD;
  }

  async getNodeAccess(nodeId: string, projectId: string): Promise<ApiResponse<NodeAccessSelect[]>> {
    try {
      const node = await this.prisma.canvasNode.findFirst({
        where: { id: nodeId, projectId, deletedAt: null },
        select: { id: true },
      });
      if (!node) throw throwError('Node not found', HttpStatus.NOT_FOUND);

      const accesses = await this.prisma.userAccess.findMany({
        where: { entityType: UserAccessType.NODE, entityId: nodeId, deletedAt: null },
        select: nodeAccessSelect,
      });
      return { message: 'Node access fetched', success: true, data: accesses };
    } catch (err: any) {
      if (err?.status) throw err;
      throw throwError('Failed to fetch node access', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async grantNodeAccess(
    granterId: string,
    dto: GrantNodeAccessDto,
  ): Promise<ApiResponse<NodeAccessSelect>> {
    try {
      const canManage = await this.canUserManageNodeAccess(granterId, dto.nodeId, dto.projectId);
      if (!canManage) throw throwError('Permission denied', HttpStatus.FORBIDDEN);

      const access = await this.prisma.userAccess.upsert({
        where: {
          userId_entityType_entityId: {
            userId: dto.userId,
            entityType: UserAccessType.NODE,
            entityId: dto.nodeId,
          },
        },
        create: {
          userId: dto.userId,
          entityType: UserAccessType.NODE,
          entityId: dto.nodeId,
          accessLevel: dto.accessLevel,
        },
        update: {
          accessLevel: dto.accessLevel,
          deletedAt: null,
        },
        select: nodeAccessSelect,
      });
      return { message: 'Node access granted', success: true, data: access };
    } catch (err: any) {
      if (err?.status) throw err;
      throw throwError('Failed to grant node access', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async revokeNodeAccess(
    revokerId: string,
    dto: RevokeNodeAccessDto,
  ): Promise<ApiResponse<void>> {
    try {
      const canManage = await this.canUserManageNodeAccess(revokerId, dto.nodeId, dto.projectId);
      if (!canManage) throw throwError('Permission denied', HttpStatus.FORBIDDEN);

      await this.prisma.userAccess.update({
        where: { id: dto.accessId },
        data: { deletedAt: new Date() },
      });
      return { message: 'Node access revoked', success: true };
    } catch (err: any) {
      if (err?.status) throw err;
      throw throwError('Failed to revoke node access', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Canvas nodes ─────────────────────────────────────────────────────

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
          data: dto.data as any,
          createdById: userId,
        },
        select: canvasNodeSelect,
      });
      return { message: 'Node created', success: true, data: node };
    } catch (error) {
      throw throwError('Failed to create node', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async classificationStickyNode(
    nodeId: string,
    dto: UpdateNodeDto,
    user: CanvasUser,
  ): Promise<{ taskCreated: boolean; updatedNode: CanvasNodeSelect }> {
    if (!dto.data?.label) {
      const node = await this.prisma.canvasNode.findFirstOrThrow({ where: { id: nodeId }, select: canvasNodeSelect });
      return { taskCreated: false, updatedNode: node };
    }

    const { intent, title, description } = await this.aiService.classifyIntent(dto.data.label);

    const updatedNode = await this.prisma.canvasNode.update({
      where: { id: nodeId },
      data: { intent },
      select: canvasNodeSelect,
    });

    if (intent === NodeIntent.ACTION_ITEM) {
      await this.taskBoardService.createTask(user as unknown as User, dto.projectId, {
        title: title ?? dto.data.label,
        description: description ?? undefined,
        canvasNodeId: nodeId,
      });
      return { taskCreated: true, updatedNode };
    }
    return { taskCreated: false, updatedNode };
  }

  async updateNode(
    user: CanvasUser,
    dto: UpdateNodeDto,
    classificationSignal?: { started: boolean; onDone?: (result: { taskCreated: boolean; updatedNode: CanvasNodeSelect }) => void },
  ): Promise<ApiResponse<CanvasNodeSelect>> {
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
      if (dto.data !== undefined) updateData.data = { ...(existing.data as Record<string, unknown> ?? {}), ...dto.data };

      const node = await this.prisma.canvasNode.update({
        where: { id: dto.nodeId },
        data: updateData,
        select: canvasNodeSelect,
      });

      const labelChanged = existing.type === 'sticky' && dto.data?.label && (existing as any).data?.label !== dto.data.label;
      if (labelChanged && classificationSignal) {
        classificationSignal.started = true;
        this.classificationStickyNode(node.id, dto, user)
          .then((result) => classificationSignal.onDone?.(result))
          .catch(() => classificationSignal.onDone?.({ taskCreated: false, updatedNode: node }));
      }

      return { message: 'Node updated', success: true, data: node };
    } catch (error: any) {
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

  async exportProjectSummary(
    userId: string,
    projectId: string,
  ): Promise<ApiResponse<{ summary: CanvasSummary; generatedAt: string; projectId: string }>> {
    try {
      const access = await this.getMyProjectAccess(userId, projectId);
      if (!access) throw throwError('Project not found or access denied', HttpStatus.FORBIDDEN);

      const nodes = await this.prisma.canvasNode.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true, type: true, intent: true, data: true },
        orderBy: { createdAt: 'asc' },
      });

      if (nodes.length === 0) throw throwError('No nodes on this canvas', HttpStatus.BAD_REQUEST);

      const aiNodes = nodes.map((n) => ({
        id: n.id,
        type: n.type,
        intent: n.intent,
        label: (n.data as Record<string, unknown>)?.label as string | undefined,
      }));

      const summary = await this.aiService.generateCanvasSummary(aiNodes);

      return {
        message: 'Canvas summary generated',
        success: true,
        data: { summary, generatedAt: new Date().toISOString(), projectId },
      };
    } catch (err: any) {
      if (err?.status) throw err;
      throw throwError('Failed to generate canvas summary', HttpStatus.INTERNAL_SERVER_ERROR);
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
