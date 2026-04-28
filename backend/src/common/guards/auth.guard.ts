import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@db';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Unauthorized Access');

    try {
      const user = await this.authService.verifyTokenAndGetUser(token);
      if (!user) throw new UnauthorizedException('Unauthorized Access');

      const roles = this.reflector.get<UserRole[]>(ROLES_KEY, context.getHandler());
      if (roles && !roles.includes(user.role as UserRole)) throw new ForbiddenException('Forbidden Access');

      (request as any).user = user;
      return true;
    } catch (error: unknown) {
      throw new UnauthorizedException(error instanceof Error ? error.message : 'Unauthorized Access');
    }
  }

  private extractToken(request: Request): string | null {
    let token = '';
    if (request.cookies?.token) {
      token = request.cookies.token;
    }

    const authorization = request.headers['authorization'];
    if (!token && authorization && authorization.startsWith('Bearer ')) {
      token = authorization.replace('Bearer ', '');
    }

    return token;
  }
}
