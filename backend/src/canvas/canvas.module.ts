import { Module } from '@nestjs/common';
import { CanvasGateway } from './canvas.gateway';
import { CanvasService } from './canvas.service';
import { PrismaService } from '../common/services/prisma.service';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  providers: [CanvasGateway, CanvasService, PrismaService],
})
export class CanvasModule {}
