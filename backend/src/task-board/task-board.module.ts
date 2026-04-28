import { Module, forwardRef } from '@nestjs/common';
import { TaskBoardController } from './task-board.controller';
import { TaskBoardService } from './task-board.service';
import { PrismaService } from '../common/services/prisma.service';
import { ProjectModule } from '../project/project.module';
import { AiModule } from 'src/ai/ai.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [forwardRef(() => ProjectModule), AiModule, AuthModule],
  controllers: [TaskBoardController],
  providers: [TaskBoardService, PrismaService],
  exports: [TaskBoardService],
})
export class TaskBoardModule { }
