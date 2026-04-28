'use client';

import { useState } from 'react';
import { Pencil, Trash2, FileText } from 'lucide-react';
import Avatar from 'boring-avatars';
import { toast } from 'sonner';

import { deleteTask } from '@/API/task-board.api';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatRelativeTime } from '@/lib/format-relative';
import { BRAND_AVATAR_PALETTE } from '@/lib/constants';
import type { TaskSchema } from '@/schema/task-board.schema';

type TaskCardProps = {
  task: TaskSchema;
  projectId: string;
  onEdit: (task: TaskSchema) => void;
  onDeleted: (taskId: string) => void;
};

export function TaskCard({ task, projectId, onEdit, onDeleted }: TaskCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteTask(projectId, task.id);
    setDeleting(false);
    if (result.success) {
      toast.success('Task deleted');
      onDeleted(task.id);
    } else {
      toast.error(result.response as string);
    }
  };

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-150 hover:border-pink-200 hover:shadow-md hover:shadow-pink-50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-pink-50">
            <FileText className="size-3.5 text-brand-primary" />
          </div>
          <p className="line-clamp-2 text-sm font-medium text-gray-900">{task.title}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onEdit(task)}
            className="size-7 text-gray-400 hover:text-gray-700"
            title="Edit task"
          >
            <Pencil className="size-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-7 text-gray-400 hover:text-red-500"
                title="Delete task"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete task?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove &ldquo;{task.title}&rdquo;. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {task.description && (
        <p className="line-clamp-3 text-xs leading-relaxed text-gray-500">{task.description}</p>
      )}

      <div className="flex items-center gap-2 border-t border-gray-50 pt-2">
        <Avatar
          size={18}
          name={task.createdBy.name}
          variant="beam"
          colors={BRAND_AVATAR_PALETTE}
        />
        <span className="text-xs text-gray-400">{task.createdBy.name}</span>
        <span className="ml-auto text-xs text-gray-300">{formatRelativeTime(task.createdAt)}</span>
      </div>
    </div>
  );
}
