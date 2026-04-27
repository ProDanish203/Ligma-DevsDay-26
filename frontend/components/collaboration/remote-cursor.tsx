'use client';

interface RemoteCursorProps {
  name: string;
  x: number;
  y: number;
  color: string;
}

export function RemoteCursor({ name, x, y, color }: RemoteCursorProps) {
  return (
    <div
      className="pointer-events-none fixed z-50 select-none"
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
        transition: 'left 60ms linear, top 60ms linear',
      }}
    >
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 2L2 15.5L5.5 12L8 18.5L10 17.5L7.5 11L12.5 11L2 2Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="ml-3 mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
}
