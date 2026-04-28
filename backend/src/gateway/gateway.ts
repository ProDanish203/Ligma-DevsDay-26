import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Logger, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { PrismaService } from '../common/services/prisma.service';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';
import { MouseMoveDto } from './dto/mouse-move.dto';
import { JoinProjectDto } from './dto/join-project.dto';
import { LeaveProjectDto } from './dto/leave-project.dto';
import { RedisService } from '../common/services/redis.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/ws',
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AppGateway.name);
  private redisPubClient: Redis | null = null;
  private redisSubClient: Redis | null = null;
  private adapterInitialized = false;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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
      this.logger.log('Redis adapter initialized for /ws namespace');
    } catch (error) {
      this.logger.warn(
        `Redis adapter not initialized for /ws; falling back to single-instance mode: ${
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
        select: { id: true, role: true, email: true, name: true },
      });

      if (!user) throw new Error('User not found');

      client.data.user = user;
      this.logger.log(`Client connected: ${client.id} (user: ${user.email})`);
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('join-project')
  async handleJoinProject(@ConnectedSocket() client: Socket, @MessageBody() data: JoinProjectDto) {
    const user = client.data.user;

    const hasAccess = await this.checkHasProjectAccess(user.id, data.projectId);
    if (!hasAccess) {
      client.emit('error', { message: 'Forbidden: No access to this project' });
      return;
    }

    const room = `project:${data.projectId}`;
    await client.join(room);
    client.emit('joined-project', { projectId: data.projectId });
    this.logger.log(`${user.email} joined room ${room}`);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('leave-project')
  async handleLeaveProject(@ConnectedSocket() client: Socket, @MessageBody() data: LeaveProjectDto) {
    const room = `project:${data.projectId}`;
    await client.leave(room);
    client.emit('left-project', { projectId: data.projectId });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('mouse-move')
  handleMouseMove(@ConnectedSocket() client: Socket, @MessageBody() data: MouseMoveDto) {
    const user = client.data.user;
    const room = `project:${data.projectId}`;

    if (!client.rooms.has(room)) {
      return;
    }

    client.to(room).emit('cursor-update', {
      userId: user.id,
      name: user.name,
      x: data.x,
      y: data.y,
    });
  }

  broadcastToProject(projectId: string, event: string, payload: unknown) {
    this.server.to(`project:${projectId}`).emit(event, payload);
  }

  private async checkHasProjectAccess(userId: string, projectId: string) {
    const isOwner = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });

    if (isOwner) return true;

    const access = await this.prisma.userAccess.findFirst({
      where: { entityId: projectId, userId },
      select: { id: true },
    });

    return !!access;
  }
}
