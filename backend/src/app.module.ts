import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { ProjectInvitationsModule } from './project-invitations/project-invitations.module';
import { LogsModule } from './logs/logs.module';
import { GatewayModule } from './gateway/gateway.module';
import { CanvasModule } from './canvas/canvas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    ProjectModule,
    ProjectInvitationsModule,
    LogsModule,
    GatewayModule,
    CanvasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
