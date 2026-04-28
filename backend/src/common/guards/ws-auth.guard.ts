import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);
    if (!token) throw new WsException('Unauthorized');

    try {
      const user = await this.authService.verifyTokenAndGetUser(token);
      if (!user) throw new WsException('Unauthorized');

      client.data.user = user;
      return true;
    } catch (error: unknown) {
      throw new WsException(error instanceof Error ? error.message : 'Unauthorized');
    }
  }

  private extractToken(client: Socket): string | null {
    const { token } = client.handshake.auth;
    if (token) return token as string;

    const auth = client.handshake.headers['authorization'];
    if (auth?.startsWith('Bearer ')) return auth.slice(7);

    return null;
  }
}
