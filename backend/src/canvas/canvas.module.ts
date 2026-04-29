import { Module } from '@nestjs/common';
import { CanvasGateway } from './canvas.gateway';
import { CanvasService } from './canvas.service';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { LogsModule } from '../logs/logs.module';
import { AiModule } from '../ai/ai.module';
import { TaskBoardModule } from '../task-board/task-board.module';

@Module({
    imports: [LogsModule, AiModule, TaskBoardModule],
    providers: [CanvasGateway, CanvasService, PrismaService, RedisService],
})
export class CanvasModule {}
