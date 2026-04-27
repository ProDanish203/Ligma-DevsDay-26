import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsUUID } from "class-validator";

export class MouseMoveDto {
    @ApiProperty({name: 'projectId', type: String, description: 'ID of the project'})
    @IsUUID()
    projectId: string;

    @ApiProperty({name: 'x', type: Number, description: 'X coordinate of the mouse'})
    @IsNumber()
    x: number;

    @ApiProperty({name: 'y', type: Number, description: 'Y coordinate of the mouse'})
    @IsNumber()
    y: number;
}