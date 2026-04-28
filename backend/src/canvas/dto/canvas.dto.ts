import { IsString, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CanvasNodeData } from '../types';

export class JoinCanvasDto {
  @IsString()
  projectId: string;
}

export class CursorMoveDto {
  @IsString()
  projectId: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class AddNodeDto {
  @IsString()
  projectId: string;

  @IsString()
  type: string;

  @IsNumber()
  positionX: number;

  @IsNumber()
  positionY: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsObject()
  data: CanvasNodeData;
}

export class UpdateNodeDto {
  @IsString()
  projectId: string;

  @IsString()
  nodeId: string;

  @IsNumber()
  @IsOptional()
  positionX?: number;

  @IsNumber()
  @IsOptional()
  positionY?: number;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsObject()
  @IsOptional()
  data?: Partial<CanvasNodeData>;
}

export class DeleteNodeDto {
  @IsString()
  projectId: string;

  @IsString()
  nodeId: string;
}

export class AddEdgeDto {
  @IsString()
  projectId: string;

  @IsString()
  sourceNodeId: string;

  @IsString()
  targetNodeId: string;

  @IsString()
  @IsOptional()
  sourceHandle?: string;

  @IsString()
  @IsOptional()
  targetHandle?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class DeleteEdgeDto {
  @IsString()
  projectId: string;

  @IsString()
  edgeId: string;
}

export class MoveNodeDto {
  @IsString()
  projectId: string;

  @IsString()
  nodeId: string;

  @IsNumber()
  positionX: number;

  @IsNumber()
  positionY: number;
}
