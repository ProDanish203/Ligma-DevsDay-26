import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString({ message: 'Project name must be a string' })
  @IsNotEmpty({ message: 'Project name is required' })
  @MinLength(2, { message: 'Project name must be at least 2 characters long' })
  @MaxLength(120, { message: 'Project name must be at most 120 characters long' })
  @ApiProperty({
    type: String,
    required: true,
    example: 'Marketing Website Redesign',
    description: 'Project name',
  })
  name: string;

  @IsOptional()
  @IsString({ message: 'Project description must be a string' })
  @MaxLength(500, { message: 'Project description must be at most 500 characters long' })
  @ApiProperty({
    type: String,
    required: false,
    example: 'Redesign landing pages and improve conversion flow.',
    description: 'Project description',
  })
  description?: string;
}
