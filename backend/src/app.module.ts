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
import { AiService } from './ai/ai.service';
import { AiModule } from './ai/ai.module';
import { TaskBoardModule } from './task-board/task-board.module';

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
    AiModule,
    TaskBoardModule,
  ],
  controllers: [AppController],
  providers: [AppService, AiService],
})
export class AppModule {}
