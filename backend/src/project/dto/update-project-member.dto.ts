import { UserAccessLevel } from '@db';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateProjectMemberDto {
  @IsEnum(UserAccessLevel, { message: 'Invalid access level' })
  @ApiProperty({ enum: UserAccessLevel, example: UserAccessLevel.EDITOR })
  accessLevel: UserAccessLevel;
}
