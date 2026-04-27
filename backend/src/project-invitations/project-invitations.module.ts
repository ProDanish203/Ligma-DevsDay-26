import { Module } from '@nestjs/common';
import { ProjectInvitationsController } from './project-invitations.controller';
import { ProjectInvitationsService } from './project-invitations.service';
import { PrismaService } from '../common/services/prisma.service';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  controllers: [ProjectInvitationsController],
  providers: [ProjectInvitationsService, PrismaService],
  exports: [ProjectInvitationsService],
})
export class ProjectInvitationsModule {}
