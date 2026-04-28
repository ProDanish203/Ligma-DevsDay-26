export interface CanvasUser {
  id: string;
  name: string;
  email: string;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface CanvasNodeData {
  label: string;
  color: string;
  shape?: 'rect' | 'circle';
  /** Flat array [x1,y1, x2,y2, …] for freehand drawing nodes */
  points?: number[];
  /** Font size for text-block nodes */
  fontSize?: number;
}
