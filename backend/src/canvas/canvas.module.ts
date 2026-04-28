import { Module } from '@nestjs/common';
import { CanvasGateway } from './canvas.gateway';
import { CanvasService } from './canvas.service';
import { PrismaService } from '../common/services/prisma.service';
import { AiModule } from 'src/ai/ai.module';
import { TaskBoardModule } from 'src/task-board/task-board.module';

@Module({
  imports: [AiModule, TaskBoardModule],
  providers: [CanvasGateway, CanvasService, PrismaService],
})
export class CanvasModule { }
