export interface CanvasUser {
  id: string;
  name: string;
  email: string;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export type CanvasNodeData = {
  label: string;
  color: string;
  shape?: 'rect' | 'circle';
  points?: number[];
}
