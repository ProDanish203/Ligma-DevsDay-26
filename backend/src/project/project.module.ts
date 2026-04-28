import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { PrismaService } from '../common/services/prisma.service';
import { LogsModule } from '../logs/logs.module';
import { AuthModule } from 'src/auth/auth.module';
import { TaskBoardModule } from 'src/task-board/task-board.module';

@Module({
  imports: [LogsModule, AuthModule, forwardRef(() => TaskBoardModule)],
  controllers: [ProjectController],
  providers: [ProjectService, PrismaService],
  exports: [ProjectService],
})
export class ProjectModule {}
