import { Module } from '@nestjs/common';
import { ProjectInvitationsController } from './project-invitations.controller';
import { ProjectInvitationsService } from './project-invitations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [ProjectInvitationsController],
  providers: [ProjectInvitationsService, PrismaService],
  exports: [ProjectInvitationsService],
})
export class ProjectInvitationsModule {}
