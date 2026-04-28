import { Module } from '@nestjs/common';
import { ProjectInvitationsController } from './project-invitations.controller';
import { ProjectInvitationsService } from './project-invitations.service';
import { PrismaService } from '../common/services/prisma.service';
import { LogsModule } from '../logs/logs.module';
import { AuthModule } from 'src/auth/auth.module';
import { RedisService } from '../common/services/redis.service';

@Module({
  imports: [LogsModule, AuthModule],
  controllers: [ProjectInvitationsController],
  providers: [ProjectInvitationsService, PrismaService, RedisService],
  exports: [ProjectInvitationsService],
})
export class ProjectInvitationsModule {}
