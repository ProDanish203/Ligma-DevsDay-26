import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../common/services/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { RedisService } from '../common/services/redis.service';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService, PrismaService, RedisService],
  exports: [UserService],
})
export class UserModule {}
