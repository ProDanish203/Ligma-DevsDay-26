import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { LogEntityType } from '@db';
import { PrismaService } from '../common/services/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CanvasService } from './canvas.service';
import {
  JoinCanvasDto,
  CursorMoveDto,
  AddNodeDto,
  UpdateNodeDto,
  DeleteNodeDto,
  AddEdgeDto,
  DeleteEdgeDto,
  GrantNodeAccessDto,
  RevokeNodeAccessDto,
} from './dto/canvas.dto';
import { CanvasUser, CursorPosition } from './types';

interface RoomUser {
  user: CanvasUser;
  cursor: CursorPosition;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/canvas',
  pingTimeout: 30000,
  pingInterval: 25000,
})
export class CanvasGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CanvasGateway.name);
  private readonly rooms = new Map<string, Map<string, RoomUser>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly canvasService: CanvasService,
    private readonly logsService: LogsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        client.handshake.headers['authorization']?.replace('Bearer ', '');

      if (!token) throw new Error('No token');

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET as string,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, name: true, email: true },
      });

      if (!user) throw new Error('User not found');

      client.data.user = user;
      this.logger.log(`Canvas client connected: ${client.id} (${user.email})`);

      // Signal the client that auth is complete — the client MUST wait for
      // this event before emitting canvas:join to avoid the race condition
      // where handleJoin runs before handleConnection finishes.
      client.emit('canvas:authenticated');
    } catch (err) {
      this.logger.warn(`Canvas auth failed for ${client.id}: ${(err as Error).message}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Canvas client disconnected: ${client.id}`);
    this.rooms.forEach((roomUsers, projectId) => {
      if (roomUsers.has(client.id)) {
        const roomUser = roomUsers.get(client.id)!;
        roomUsers.delete(client.id);
        this.server.to(projectId).emit('canvas:user-left', {
          userId: roomUser.user.id,
          users: Array.from(roomUsers.values()).map((u) => u.user),
        });
        if (roomUsers.size === 0) {
          this.rooms.delete(projectId);
        }
      }
    });
  }

  @SubscribeMessage('canvas:join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() dto: JoinCanvasDto) {
    const user: CanvasUser = client.data.user;
    if (!user) {
      client.emit('canvas:error', { message: 'Not authenticated' });
      return;
    }

    const { projectId } = dto;

    // Verify the user is a member of this project
    const myProjectAccess = await this.canvasService.getMyProjectAccess(user.id, projectId);
    if (!myProjectAccess) {
      client.emit('canvas:error', { message: 'Not a project member' });
      return;
    }

    // Leave any existing rooms first (handles reconnect/re-join without stale data)
    this.rooms.forEach((roomUsers, existingProjectId) => {
      if (roomUsers.has(client.id)) {
        roomUsers.delete(client.id);
        this.server.to(existingProjectId).emit('canvas:user-left', {
          userId: user.id,
          users: Array.from(roomUsers.values()).map((u) => u.user),
        });
        client.leave(existingProjectId);
        if (roomUsers.size === 0) {
          this.rooms.delete(existingProjectId);
        }
      }
    });

    await client.join(projectId);

    if (!this.rooms.has(projectId)) {
      this.rooms.set(projectId, new Map());
    }
    const roomUsers = this.rooms.get(projectId)!;
    roomUsers.set(client.id, { user, cursor: { x: 0, y: 0 } });

    try {
      const [nodesResult, edgesResult, nodeAccesses] = await Promise.all([
        this.canvasService.getCanvasNodes(projectId),
        this.canvasService.getCanvasEdges(projectId),
        this.canvasService.getNodeAccessesForProject(projectId),
      ]);

      if (!client.connected) return;

      client.emit('canvas:state', {
        nodes: nodesResult.data ?? [],
        edges: edgesResult.data ?? [],
        users: Array.from(roomUsers.values()).map((u) => u.user),
        nodeAccesses,
        myProjectAccess,
      });
    } catch (error) {
      this.logger.error(`Failed to load canvas state for project ${projectId}`, error);
      client.emit('canvas:state', {
        nodes: [],
        edges: [],
        users: Array.from(roomUsers.values()).map((u) => u.user),
        nodeAccesses: {},
        myProjectAccess,
      });
    }

    client.to(projectId).emit('canvas:user-joined', {
      user,
      users: Array.from(roomUsers.values()).map((u) => u.user),
    });
  }

  @SubscribeMessage('canvas:leave')
  async handleLeave(@ConnectedSocket() client: Socket, @MessageBody() dto: JoinCanvasDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    const { projectId } = dto;
    await client.leave(projectId);

    const roomUsers = this.rooms.get(projectId);
    if (roomUsers) {
      roomUsers.delete(client.id);
      this.server.to(projectId).emit('canvas:user-left', {
        userId: user.id,
        users: Array.from(roomUsers.values()).map((u) => u.user),
      });
      if (roomUsers.size === 0) {
        this.rooms.delete(projectId);
      }
    }
  }

  @SubscribeMessage('canvas:cursor-move')
  handleCursorMove(@ConnectedSocket() client: Socket, @MessageBody() dto: CursorMoveDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    const roomUsers = this.rooms.get(dto.projectId);
    if (roomUsers?.has(client.id)) {
      roomUsers.get(client.id)!.cursor = { x: dto.x, y: dto.y };
    }

    client.to(dto.projectId).emit('canvas:cursor-moved', {
      userId: user.id,
      x: dto.x,
      y: dto.y,
    });
  }

  @SubscribeMessage('canvas:node-add')
  async handleNodeAdd(@ConnectedSocket() client: Socket, @MessageBody() dto: AddNodeDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    try {
      const result = await this.canvasService.addNode(user.id, dto);
      this.server.to(dto.projectId).emit('canvas:node-added', result.data);

      const node = result.data!;
      const log = await this.logsService.createLog({
        action: 'NODE_ADDED',
        message: `${user.name} added a new node`,
        entityType: LogEntityType.PROJECT,
        entityId: dto.projectId,
        actorUserId: user.id,
        metadata: { nodeId: node.id, nodeType: node.type },
      });
      if (log) this.server.to(dto.projectId).emit('canvas:log-added', log);
    } catch (error) {
      client.emit('canvas:error', { message: 'Failed to add node' });
    }
  }

  @SubscribeMessage('canvas:node-update')
  async handleNodeUpdate(@ConnectedSocket() client: Socket, @MessageBody() dto: UpdateNodeDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    try {
      const allowed = await this.canvasService.canUserMutateNode(user.id, dto.nodeId, dto.projectId, 'update');
      if (!allowed) {
        client.emit('canvas:error', { message: 'Permission denied: cannot edit this node' });
        return;
      }

      const result = await this.canvasService.updateNode(user.id, dto);
      this.server.to(dto.projectId).emit('canvas:node-updated', result.data);

      // Only log data changes (not position/dimension moves to avoid log spam)
      if (dto.data !== undefined) {
        const log = await this.logsService.createLog({
          action: 'NODE_UPDATED',
          message: `${user.name} updated node content`,
          entityType: LogEntityType.NODE,
          entityId: dto.nodeId,
          actorUserId: user.id,
          metadata: { projectId: dto.projectId },
        });
        if (log) this.server.to(dto.projectId).emit('canvas:log-added', log);

        // Also log to project stream
        this.logsService.createLog({
          action: 'NODE_UPDATED',
          message: `${user.name} updated a node`,
          entityType: LogEntityType.PROJECT,
          entityId: dto.projectId,
          actorUserId: user.id,
          metadata: { nodeId: dto.nodeId },
        });
      }
    } catch (error) {
      client.emit('canvas:error', { message: 'Failed to update node' });
    }
  }

  @SubscribeMessage('canvas:edge-add')
  async handleEdgeAdd(@ConnectedSocket() client: Socket, @MessageBody() dto: AddEdgeDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;
    try {
      const result = await this.canvasService.addEdge(user.id, dto);
      this.server.to(dto.projectId).emit('canvas:edge-added', result.data);

      const log = await this.logsService.createLog({
        action: 'EDGE_ADDED',
        message: `${user.name} connected two nodes`,
        entityType: LogEntityType.PROJECT,
        entityId: dto.projectId,
        actorUserId: user.id,
        metadata: { edgeId: result.data!.id },
      });
      if (log) this.server.to(dto.projectId).emit('canvas:log-added', log);
    } catch {
      client.emit('canvas:error', { message: 'Failed to add edge' });
    }
  }

  @SubscribeMessage('canvas:edge-delete')
  async handleEdgeDelete(@ConnectedSocket() client: Socket, @MessageBody() dto: DeleteEdgeDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;
    try {
      await this.canvasService.deleteEdge(user.id, dto);
      this.server.to(dto.projectId).emit('canvas:edge-deleted', { edgeId: dto.edgeId });

      const log = await this.logsService.createLog({
        action: 'EDGE_DELETED',
        message: `${user.name} removed a connection`,
        entityType: LogEntityType.PROJECT,
        entityId: dto.projectId,
        actorUserId: user.id,
        metadata: { edgeId: dto.edgeId },
      });
      if (log) this.server.to(dto.projectId).emit('canvas:log-added', log);
    } catch {
      client.emit('canvas:error', { message: 'Failed to delete edge' });
    }
  }

  @SubscribeMessage('canvas:node-delete')
  async handleNodeDelete(@ConnectedSocket() client: Socket, @MessageBody() dto: DeleteNodeDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    try {
      const allowed = await this.canvasService.canUserMutateNode(user.id, dto.nodeId, dto.projectId, 'delete');
      if (!allowed) {
        client.emit('canvas:error', { message: 'Permission denied: cannot delete this node' });
        return;
      }

      await this.canvasService.deleteNode(user.id, dto);
      this.server.to(dto.projectId).emit('canvas:node-deleted', { nodeId: dto.nodeId });

      const nodeLog = await this.logsService.createLog({
        action: 'NODE_DELETED',
        message: `${user.name} deleted a node`,
        entityType: LogEntityType.NODE,
        entityId: dto.nodeId,
        actorUserId: user.id,
        metadata: { projectId: dto.projectId },
      });
      if (nodeLog) this.server.to(dto.projectId).emit('canvas:log-added', nodeLog);

      this.logsService.createLog({
        action: 'NODE_DELETED',
        message: `${user.name} deleted a node`,
        entityType: LogEntityType.PROJECT,
        entityId: dto.projectId,
        actorUserId: user.id,
        metadata: { nodeId: dto.nodeId },
      });
    } catch (error) {
      client.emit('canvas:error', { message: 'Failed to delete node' });
    }
  }

  @SubscribeMessage('canvas:node-access-grant')
  async handleNodeAccessGrant(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: GrantNodeAccessDto,
  ) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    try {
      const result = await this.canvasService.grantNodeAccess(user.id, dto);
      const updatedAccesses = await this.canvasService.getNodeAccess(dto.nodeId, dto.projectId);

      this.server.to(dto.projectId).emit('canvas:node-access-updated', {
        nodeId: dto.nodeId,
        accesses: updatedAccesses.data ?? [],
      });

      const log = await this.logsService.createLog({
        action: 'NODE_ACCESS_GRANTED',
        message: `${user.name} granted node access`,
        entityType: LogEntityType.NODE,
        entityId: dto.nodeId,
        actorUserId: user.id,
        targetUserId: dto.userId,
        metadata: { projectId: dto.projectId, accessLevel: dto.accessLevel },
      });
      if (log) this.server.to(dto.projectId).emit('canvas:log-added', log);
    } catch (error: any) {
      client.emit('canvas:error', { message: error?.message || 'Failed to grant node access' });
    }
  }

  @SubscribeMessage('canvas:node-access-revoke')
  async handleNodeAccessRevoke(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: RevokeNodeAccessDto,
  ) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    try {
      await this.canvasService.revokeNodeAccess(user.id, dto);
      const updatedAccesses = await this.canvasService.getNodeAccess(dto.nodeId, dto.projectId);

      this.server.to(dto.projectId).emit('canvas:node-access-updated', {
        nodeId: dto.nodeId,
        accesses: updatedAccesses.data ?? [],
      });

      const log = await this.logsService.createLog({
        action: 'NODE_ACCESS_REVOKED',
        message: `${user.name} revoked node access`,
        entityType: LogEntityType.NODE,
        entityId: dto.nodeId,
        actorUserId: user.id,
        metadata: { projectId: dto.projectId, accessId: dto.accessId },
      });
      if (log) this.server.to(dto.projectId).emit('canvas:log-added', log);
    } catch (error: any) {
      client.emit('canvas:error', { message: error?.message || 'Failed to revoke node access' });
    }
  }
}
