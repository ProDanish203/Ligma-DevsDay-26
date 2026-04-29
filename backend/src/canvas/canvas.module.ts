import { Module } from '@nestjs/common';
import { CanvasGateway } from './canvas.gateway';
import { CanvasService } from './canvas.service';
import { CanvasController } from './canvas.controller';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { LogsModule } from '../logs/logs.module';
import { AiModule } from '../ai/ai.module';
import { TaskBoardModule } from '../task-board/task-board.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [LogsModule, AiModule, TaskBoardModule, AuthModule],
    controllers: [CanvasController],
    providers: [CanvasGateway, CanvasService, PrismaService, RedisService],
})
export class CanvasModule { }
