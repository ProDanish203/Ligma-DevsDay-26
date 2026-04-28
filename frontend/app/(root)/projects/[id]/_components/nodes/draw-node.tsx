import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface DrawNodeProps {
  data: {
    color?: string;
    points?: number[];
  };
  selected?: boolean;
}

export const DrawNode = memo(({ data, selected }: DrawNodeProps) => {
  const { color = '#10B981', points = [] } = data;

  // We need to construct an SVG path string from the points array
  // points array format: [x1, y1, x2, y2, x3, y3, ...]
  let pathD = '';
  if (points.length >= 2) {
    pathD = `M ${points[0]} ${points[1]}`;
    for (let i = 2; i < points.length; i += 2) {
      pathD += ` L ${points[i]} ${points[i + 1]}`;
    }
  }

  return (
    <>
      <div 
        className="relative flex items-center justify-center w-full h-full"
      >
        <svg
          width="100%"
          height="100%"
          style={{ overflow: 'visible', width: '100%', height: '100%' }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        {/* We keep standard connection handles for consistency, even on draw nodes */}
        <Handle type="target" position={Position.Top} className="!bg-brand-primary !size-2 !border-2 !border-white opacity-0 hover:opacity-100" />
        <Handle type="source" position={Position.Right} className="!bg-brand-primary !size-2 !border-2 !border-white opacity-0 hover:opacity-100" />
        <Handle type="source" position={Position.Bottom} className="!bg-brand-primary !size-2 !border-2 !border-white opacity-0 hover:opacity-100" />
        <Handle type="target" position={Position.Left} className="!bg-brand-primary !size-2 !border-2 !border-white opacity-0 hover:opacity-100" />

        {selected && (
          <div className="absolute -inset-1 rounded border-2 border-brand-primary border-dashed pointer-events-none" />
        )}
      </div>
    </>
  );
});

DrawNode.displayName = 'DrawNode';
