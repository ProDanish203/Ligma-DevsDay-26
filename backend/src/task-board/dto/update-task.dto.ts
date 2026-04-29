import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ required: false })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiProperty({ required: false })
  description?: string;
}
