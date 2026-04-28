'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { LogEntityType, LogLevel } from '@/lib/enums';
import { getLogsByEntity } from '@/API/logs.api';
import type { LogSchema } from '@/schema/logs.schema';

function sortLogsNewestFirst(logs: LogSchema[]): LogSchema[] {
  return [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface LogPanelProps {
  projectId: string;
  selectedNodeId: string | null;
  recentLogs: LogSchema[];
  isOpen: boolean;
  onClose: () => void;
}

function levelBadgeClass(level: LogLevel) {
  switch (level) {
    case LogLevel.WARN:
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case LogLevel.ERROR:
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function LogEntry({ log }: { log: LogSchema }) {
  return (
    <div className="border-b border-gray-100 px-4 py-3 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={cn(
                'inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide',
                levelBadgeClass(log.level),
              )}
            >
              {log.level}
            </span>
            <span className="truncate text-xs font-medium text-gray-800">{log.action.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-xs text-gray-600 leading-snug">{log.message}</p>
          {log.actorUser && <p className="mt-0.5 text-[11px] text-gray-400">by {log.actorUser.name}</p>}
        </div>
        <span className="shrink-0 text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(new Date(log.createdAt))}</span>
      </div>
    </div>
  );
}

function LogList({
  entityType,
  entityId,
  recentLogs,
  enabled,
}: {
  entityType: LogEntityType;
  entityId: string;
  recentLogs: LogSchema[];
  enabled: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['logs', entityType, entityId],
    queryFn: async () => {
      const result = await getLogsByEntity(entityType, entityId, { limit: 50 });
      return result.success ? (result.response as { logs: LogSchema[] }).logs : [];
    },
    enabled,
    staleTime: 30_000,
  });

  // Merge real-time logs (filtered to this entity) with historical data
  const merged = useMemo(() => {
    const historical: LogSchema[] = data ?? [];
    const live = recentLogs.filter((l) => l.entityType === entityType && l.entityId === entityId);
    const existingIds = new Set(historical.map((l) => l.id));
    const newLive = live.filter((l) => !existingIds.has(l.id));
    return sortLogsNewestFirst([...newLive, ...historical]);
  }, [data, recentLogs, entityType, entityId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (merged.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="mb-2 size-7 text-gray-300" />
        <p className="text-sm text-gray-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {merged.map((log) => (
        <LogEntry key={log.id} log={log} />
      ))}
    </div>
  );
}

export function LogPanel({ projectId, selectedNodeId, recentLogs, isOpen, onClose }: LogPanelProps) {
  const [tab, setTab] = useState<'project' | 'node'>('project');

  // Auto-switch to node tab when a node is selected
  useEffect(() => {
    if (selectedNodeId) setTab('node');
    else setTab('project');
  }, [selectedNodeId]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="flex w-[360px] flex-col p-0 sm:max-w-[360px]">
        <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="size-4 text-brand-primary" />
            Activity Log
          </SheetTitle>
        </SheetHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'project' | 'node')}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-3 mb-1 h-8 w-auto justify-start rounded-md bg-gray-100 p-0.5">
            <TabsTrigger value="project" className="h-7 px-3 text-xs">
              Project
            </TabsTrigger>
            <TabsTrigger value="node" className="h-7 px-3 text-xs" disabled={!selectedNodeId}>
              Node
              {selectedNodeId && (
                <span className="ml-1 rounded bg-brand-primary/10 px-1 py-0 text-[10px] text-brand-primary">
                  selected
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="project" className="flex flex-1 flex-col overflow-hidden mt-0">
            <LogList
              entityType={LogEntityType.PROJECT}
              entityId={projectId}
              recentLogs={recentLogs}
              enabled={isOpen && tab === 'project'}
            />
          </TabsContent>

          <TabsContent value="node" className="flex flex-1 flex-col overflow-hidden mt-0">
            {selectedNodeId ? (
              <LogList
                entityType={LogEntityType.NODE}
                entityId={selectedNodeId}
                recentLogs={recentLogs}
                enabled={isOpen && tab === 'node' && !!selectedNodeId}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-gray-400">Click a node to view its activity</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
