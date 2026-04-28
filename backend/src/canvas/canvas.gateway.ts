import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { PrismaService } from '../common/services/prisma.service';
import { CanvasService } from './canvas.service';
import { RedisService } from '../common/services/redis.service';
import {
  JoinCanvasDto,
  CursorMoveDto,
  AddNodeDto,
  UpdateNodeDto,
  DeleteNodeDto,
  AddEdgeDto,
  DeleteEdgeDto,
} from './dto/canvas.dto';
import { CanvasUser } from './types';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/canvas',
  pingTimeout: 30000,
  pingInterval: 25000,
})
export class CanvasGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CanvasGateway.name);
  private redisPubClient: Redis | null = null;
  private redisSubClient: Redis | null = null;
  private adapterInitialized = false;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly canvasService: CanvasService,
    private readonly redisService: RedisService,
  ) {}

  async afterInit(server: Server) {
    await this.setupRedisAdapter(server);
  }

  private async setupRedisAdapter(serverOrNamespace: Server) {
    if (this.adapterInitialized) return;

    try {
      const ioServer = this.resolveIoServer(serverOrNamespace);
      const redisClient = this.redisService.getClient();
      this.redisPubClient = redisClient.duplicate();
      this.redisSubClient = redisClient.duplicate();

      await Promise.all([this.redisPubClient.ping(), this.redisSubClient.ping()]);
      ioServer.adapter(createAdapter(this.redisPubClient, this.redisSubClient));
      this.adapterInitialized = true;
      this.logger.log('Redis adapter initialized for /canvas namespace');
    } catch (error) {
      this.logger.warn(
        `Redis adapter not initialized for /canvas; falling back to single-instance mode: ${
          (error as Error).message
        }`,
      );
    }
  }

  private resolveIoServer(serverOrNamespace: Server): Server {
    const maybeNamespace = serverOrNamespace as unknown as { server?: Server; adapter?: unknown };
    if (typeof maybeNamespace.adapter === 'function') {
      return serverOrNamespace;
    }

    if (maybeNamespace.server && typeof maybeNamespace.server.adapter === 'function') {
      return maybeNamespace.server;
    }

    throw new Error('Unable to resolve Socket.IO server instance');
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.redisPubClient?.quit(),
      this.redisSubClient?.quit(),
    ]);
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) || client.handshake.headers['authorization']?.replace('Bearer ', '');

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
      client.data.projectIds = new Set<string>();
    } catch (err) {
      this.logger.warn(`Canvas auth failed for ${client.id}: ${(err as Error).message}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Canvas client disconnected: ${client.id}`);
    const user: CanvasUser | undefined = client.data.user;
    const projectIds = Array.from((client.data.projectIds as Set<string> | undefined) ?? []);

    if (!user || projectIds.length === 0) return;

    for (const projectId of projectIds) {
      const users = await this.getProjectUsers(projectId);
      this.server.to(projectId).emit('canvas:user-left', {
        userId: user.id,
        users,
      });
    }
  }

  @SubscribeMessage('canvas:join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() dto: JoinCanvasDto) {
    const user: CanvasUser = client.data.user;
    if (!user) {
      client.emit('canvas:error', { message: 'Not authenticated' });
      return;
    }

    const { projectId } = dto;
    const joinedProjects = (client.data.projectIds as Set<string> | undefined) ?? new Set<string>();
    for (const existingProjectId of joinedProjects) {
      if (existingProjectId === projectId) continue;
      await client.leave(existingProjectId);
      const users = await this.getProjectUsers(existingProjectId);
      this.server.to(existingProjectId).emit('canvas:user-left', {
        userId: user.id,
        users,
      });
      joinedProjects.delete(existingProjectId);
    }

    await client.join(projectId);
    client.data.projectIds = joinedProjects;
    joinedProjects.add(projectId);

    try {
      const [nodesResult, edgesResult] = await Promise.all([
        this.canvasService.getCanvasNodes(projectId),
        this.canvasService.getCanvasEdges(projectId),
      ]);
      const users = await this.getProjectUsers(projectId);

      if (!client.connected) return;

      client.emit('canvas:state', {
        nodes: nodesResult.data ?? [],
        edges: edgesResult.data ?? [],
        users,
      });
    } catch (error) {
      this.logger.error(`Failed to load canvas state for project ${projectId}`, error);
      const users = await this.getProjectUsers(projectId);
      client.emit('canvas:state', {
        nodes: [],
        edges: [],
        users,
      });
    }

    const users = await this.getProjectUsers(projectId);
    client.to(projectId).emit('canvas:user-joined', {
      user,
      users,
    });
  }

  @SubscribeMessage('canvas:leave')
  async handleLeave(@ConnectedSocket() client: Socket, @MessageBody() dto: JoinCanvasDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    const { projectId } = dto;
    await client.leave(projectId);
    const joinedProjects = (client.data.projectIds as Set<string> | undefined) ?? new Set<string>();
    joinedProjects.delete(projectId);
    client.data.projectIds = joinedProjects;

    const users = await this.getProjectUsers(projectId);
    this.server.to(projectId).emit('canvas:user-left', {
      userId: user.id,
      users,
    });
  }

  @SubscribeMessage('canvas:cursor-move')
  handleCursorMove(@ConnectedSocket() client: Socket, @MessageBody() dto: CursorMoveDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

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
    } catch (error) {
      client.emit('canvas:error', { message: 'Failed to add node' });
    }
  }

  @SubscribeMessage('canvas:node-update')
  async handleNodeUpdate(@ConnectedSocket() client: Socket, @MessageBody() dto: UpdateNodeDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    try {
      const result = await this.canvasService.updateNode(user.id, dto);
      this.server.to(dto.projectId).emit('canvas:node-updated', result.data);
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
    } catch {
      client.emit('canvas:error', { message: 'Failed to delete edge' });
    }
  }

  @SubscribeMessage('canvas:node-delete')
  async handleNodeDelete(@ConnectedSocket() client: Socket, @MessageBody() dto: DeleteNodeDto) {
    const user: CanvasUser = client.data.user;
    if (!user) return;

    try {
      await this.canvasService.deleteNode(user.id, dto);
      this.server.to(dto.projectId).emit('canvas:node-deleted', { nodeId: dto.nodeId });
    } catch (error) {
      client.emit('canvas:error', { message: 'Failed to delete node' });
    }
  }

  private async getProjectUsers(projectId: string): Promise<CanvasUser[]> {
    const sockets = await this.server.in(projectId).fetchSockets();
    const uniqueUsers = new Map<string, CanvasUser>();

    sockets.forEach((socket) => {
      const user = socket.data.user as CanvasUser | undefined;
      if (user && !uniqueUsers.has(user.id)) {
        uniqueUsers.set(user.id, user);
      }
    });

    return Array.from(uniqueUsers.values());
  }
}
