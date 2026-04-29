import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ example: 'Implement login page' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiProperty({ required: false })
  description?: string;

  @IsUUID()
  @ApiProperty({ required: true })
  canvasNodeId: string;
}
