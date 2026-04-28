import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class JoinProjectDto {
  @ApiProperty({ name: 'projectId', type: String, description: 'ID of the project' })
  @IsUUID()
  projectId: string;
}
