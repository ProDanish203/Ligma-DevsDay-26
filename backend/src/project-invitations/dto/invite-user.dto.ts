import { UserAccessLevel } from '@db';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class InviteUserDto {
  @IsEmail({}, { message: 'Invalid email' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value.trim().toLowerCase())
  @ApiProperty({ type: String, required: true, example: 'john.doe@example.com' })
  email: string;

  @IsString({ message: 'Project id must be a string' })
  @IsNotEmpty({ message: 'Project id is required' })
  @ApiProperty({ type: String, required: true, example: '0ef4adfd-4f13-4ae5-927c-df1eb6409ec9' })
  projectId: string;

  @IsEnum(UserAccessLevel, { message: 'Invalid access scope' })
  @ApiProperty({ enum: UserAccessLevel, required: true, example: UserAccessLevel.VIEWER })
  accessLevel: UserAccessLevel;
}
