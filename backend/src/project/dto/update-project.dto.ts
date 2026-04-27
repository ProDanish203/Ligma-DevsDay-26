import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString({ message: 'Project name must be a string' })
  @MinLength(2, { message: 'Project name must be at least 2 characters long' })
  @MaxLength(120, { message: 'Project name must be at most 120 characters long' })
  @ApiProperty({
    type: String,
    required: false,
    example: 'Marketing Website Redesign',
    description: 'Project name',
  })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Project description must be a string' })
  @MaxLength(500, { message: 'Project description must be at most 500 characters long' })
  @ApiProperty({
    type: String,
    required: false,
    example: 'Updated description for the redesign scope.',
    description: 'Project description',
  })
  description?: string;
}
