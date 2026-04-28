import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppGateway } from './gateway';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { AuthService } from 'src/auth/auth.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        const expiresIn = configService.getOrThrow<string>('JWT_EXPIRY');

        return {
          secret,
          signOptions: {
            expiresIn,
          } as any,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AppGateway, WsAuthGuard, PrismaService, RedisService, AuthService],
  exports: [AppGateway],
})
export class GatewayModule {}
