'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { getTaskBoard } from '@/API/task-board.api';
import type { TaskSchema } from '@/schema/task-board.schema';

import { TaskCard } from './_components/task-card';
import { EditTaskModal } from './_components/edit-task-modal';

export default function TaskBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [tasks, setTasks] = useState<TaskSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState<TaskSchema | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    const result = await getTaskBoard(projectId);
    setLoading(false);
    if (result.success && result.response && typeof result.response === 'object' && 'tasks' in result.response) {
      setTasks((result.response as { tasks: TaskSchema[] }).tasks);
    } else if (!result.success) {
      toast.error(result.response as string);
    }
  }, [projectId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadBoard();
    });
  }, [loadBoard]);

  const handleTaskUpdated = (updated: TaskSchema) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/projects/${projectId}`}
          className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="Back to canvas"
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div>
          <h1 className="text-xl font-semibold text-gray-900">Task Board</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {loading ? 'Loading…' : `${tasks.length} action item${tasks.length === 1 ? '' : 's'} from canvas`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-10 animate-spin text-gray-300" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-pink-50">
            <ClipboardList className="size-6 text-brand-primary" />
          </div>
          <p className="text-sm font-medium text-gray-700">No tasks yet</p>
          <p className="mt-1 max-w-xs text-xs text-gray-400">
            Add sticky notes to the canvas — action items are automatically detected and appear here.
          </p>
          <Link
            href={`/projects/${projectId}`}
            className="mt-4 text-xs font-medium text-brand-primary hover:underline"
          >
            Go to canvas
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              onEdit={setEditTask}
              onDeleted={handleTaskDeleted}
            />
          ))}
        </div>
      )}

      <EditTaskModal
        open={!!editTask}
        onOpenChange={(o) => !o && setEditTask(null)}
        task={editTask}
        projectId={projectId}
        onUpdated={handleTaskUpdated}
      />
    </div>
  );
}
