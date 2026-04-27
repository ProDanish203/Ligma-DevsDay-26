import { InvitationStatus } from '@db';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateInviteStatusDto {
  @IsEnum(InvitationStatus, { message: 'Invalid invitation status' })
  @ApiProperty({ enum: InvitationStatus, required: true, example: InvitationStatus.ACCEPTED })
  status: InvitationStatus;
}
