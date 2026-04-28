'use client';

import { ArrowLeft, Circle, ClipboardList, MousePointer, Shield, Square, StickyNote } from 'lucide-react';
import Link from 'next/link';

export type ToolMode = 'select' | 'sticky' | 'rect' | 'circle';

interface ToolBtn {
  mode: ToolMode;
  icon: React.ReactNode;
  title: string;
  activeClass: string;
}

const TOOLS: ToolBtn[] = [
  { mode: 'select',  icon: <MousePointer className="size-4" />, title: 'Select / Move',  activeClass: 'bg-gray-100 text-gray-900' },
  { mode: 'sticky',  icon: <StickyNote   className="size-4" />, title: 'Sticky note',    activeClass: 'bg-yellow-100 text-yellow-700' },
  { mode: 'rect',    icon: <Square       className="size-4" />, title: 'Rectangle',      activeClass: 'bg-pink-100 text-brand-primary' },
  { mode: 'circle',  icon: <Circle       className="size-4" />, title: 'Circle',         activeClass: 'bg-indigo-100 text-indigo-600' },
];

interface CanvasToolbarProps {
  toolMode: ToolMode;
  onToolChange: (mode: ToolMode) => void;
  logPanelOpen: boolean;
  onToggleLogPanel: () => void;
  selectedNodeId: string | null;
  canManageSelectedNode: boolean;
  onOpenPermissions: () => void;
}

export function CanvasToolbar({
  toolMode,
  onToolChange,
  logPanelOpen,
  onToggleLogPanel,
  selectedNodeId,
  canManageSelectedNode,
  onOpenPermissions,
}: CanvasToolbarProps) {
  return (
    <div className="absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
      <Link
        href="/projects"
        className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        title="Back to projects"
      >
        <ArrowLeft className="size-4" />
      </Link>

      <div className="mx-1 h-px bg-gray-100" />

      {TOOLS.map(({ mode, icon, title, activeClass }) => (
        <button
          key={mode}
          onClick={() => onToolChange(mode)}
          title={title}
          className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
            toolMode === mode
              ? activeClass
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {icon}
        </button>
      ))}

      {toolMode !== 'select' && (
        <>
          <div className="mx-1 h-px bg-gray-100" />
          <div className="px-1 py-0.5 text-center text-[10px] font-medium text-gray-400">
            Click canvas
          </div>
        </>
      )}

      <div className="mx-1 h-px bg-gray-100" />

      {/* Node permissions button — visible when a manageable node is selected */}
      {selectedNodeId && canManageSelectedNode && (
        <button
          onClick={onOpenPermissions}
          title="Manage node permissions"
          className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-purple-50 hover:text-purple-600"
        >
          <Shield className="size-4" />
        </button>
      )}

      {/* Activity log toggle */}
      <button
        onClick={onToggleLogPanel}
        title="Activity log"
        className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
          logPanelOpen
            ? 'bg-brand-secondary/30 text-brand-primary'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <ClipboardList className="size-4" />
      </button>
    </div>
  );
}
